#!/usr/bin/env python3
"""Gates deterministas de las especificaciones que generan las skills de momoy (ola 0).

Hasta ahora los artefactos de descubrimiento y planificación — KPIs, historias, tickets,
matriz de trazabilidad, ADRs — solo se revisaban con juicio (workflow 03). Las propiedades
que sí son mecánicas quedaban sin verificar, y en un proyecto real derivaron sin que nadie
lo notara: dos esquemas de frontmatter conviviendo, estados fuera de vocabulario, tickets
de más de 5 puntos o que mezclan backend y frontend, secciones obligatorias ausentes y
KPIs sin fuente de datos. Este script comprueba exactamente lo que las plantillas de
SK-01/SK-02 (KPIs), SK-11 (historias), SK-12 (tickets), SK-13 (matriz) y SK-36 (ADRs)
declaran obligatorio. Solo depende de la taxonomía fija de docs/ que momoy impone, no del
stack del proyecto (CONTRIBUTING.md, regla de .agents/scripts/).

Cinco gates:
  kpi          Cada KPI está en una tabla con fuente, línea base, umbral, ventana y fecha de revisión.
  experimento  Cada EXP-NNN (SK-37) tiene criterio de éxito fijado antes del resultado, y si está
               concluido: muestra, evidencia en el repo sin datos personales evidentes y decisión.
  historia     Frontmatter de SK-11, estado válido, al menos 3 escenarios Given/When/Then,
               precondiciones y NFRs; si está abierta, riesgo de valor y validación declarados.
  ready        Definition of Ready de SK-12: frontmatter, estado, puntos, tipo, historia
               existente y secciones obligatorias.
  trazabilidad Cada historia y ticket aparece en la matriz, sus enlaces resuelven y cada ADR
               aceptado apunta a historias o tickets que existen.

Modos:
  (sin argumentos)   Informe del repositorio completo. No bloquea: la deuda documental previa
                     es información, no un fallo del trabajo actual. --strict lo vuelve bloqueante.
  --changed          Solo los artefactos modificados o nuevos según git. Bloquea.
  --ticket TK-XXX    Definition of Ready de un ticket antes de implementarlo. Bloquea.
"""
import argparse
import os
import re
import subprocess
import sys
import unicodedata
from collections import Counter

STATUS_ENUM = ("backlog", "approved", "in_progress", "done", "cancelled")
KPI_COLUMNS = ("kpi", "fuente de datos", "linea base", "umbral de exito", "ventana", "fecha de revision")
TICKET_TYPES = ("backend", "frontend")
TICKET_POINTS = ("1", "2", "3", "5")
MIN_SCENARIOS = 3
STORY_SECTIONS = {
    "precondiciones": ("precondiciones",),
    "NFRs": ("criterios de aceptacion no funcionales", "nfr", "requisitos no funcionales"),
}
# Se comprueba que la sección exista, no su nombre literal: un título abreviado ("Alcance
# (Hexagonal)", "DoD") cumple la plantilla; decir que "falta" una sección presente sería un
# hallazgo falso, peor que no tener gate.
TICKET_SECTIONS = {
    "Descripción": ("descripcion",),
    "Alcance de Modificación": ("alcance",),
    "Mitigación de Riesgos Técnicos": ("mitigacion de riesgos", "riesgos tecnicos"),
    "Criterios de Aceptación & DoD": ("criterios de aceptacion", "dod", "definition of done"),
    "Instrucciones de Ejecución Autónoma": ("instrucciones de ejecucion",),
}

# Validación (etapa 2, SK-37). Una historia abierta declara su riesgo de valor y su validación: un
# experimento o una exención con motivo, que no vale con riesgo alto. Las historias done/cancelled
# son historial y no se les exige retroactivamente.
OPEN_STATUSES = ("backlog", "approved", "in_progress")
VALUE_RISKS = ("alto", "medio", "bajo")
EXPERIMENT_STATUS = ("designed", "running", "concluded", "cancelled")
EXPERIMENT_RISKS = ("valor", "usabilidad", "factibilidad", "viabilidad")
EXPERIMENT_METHODS = ("entrevista", "prototipo", "puerta_falsa", "concierge", "encuesta", "analitica", "otro")
EXPERIMENT_DECISIONS = ("pendiente", "seguir", "pivotar", "descartar", "no_concluyente")
EXPERIMENT_SECTIONS = {
    "Hipótesis": ("hipotesis",),
    "Criterio de éxito": ("criterio de exito",),
    "Método y muestra": ("metodo",),
}
CONCLUDED_SECTIONS = {"Resultado": ("resultado",), "Evidencia": ("evidencia",), "Decisión": ("decision",)}
EXPERIMENTS_DIR = "docs/01_product_definition/experiments"

KPI_DOCS = ("docs/01_product_definition/01_product_discovery.md", "docs/01_product_definition/02_prd.md")
STORIES_DIR = "docs/05_agile_planning/11_user_stories"
TICKETS_DIR = "docs/05_agile_planning/12_tickets"
MATRIX = "docs/05_agile_planning/13_matriz_trazabilidad.md"
ADR_DIR = "docs/02_architecture_design/adr"

FRONTMATTER = re.compile(r"^---\n(.*?)\n---\n", re.S)
TOP_LEVEL_KEY = re.compile(r"^([A-Za-z0-9_-]+):(.*)$")
HEADING = re.compile(r"^\s{0,3}#{1,6}\s+(.*)$")
STORY_ID = re.compile(r"US-\d+")
AUDIT_ID = re.compile(r"AUDIT-[A-Z]+-\d+")
EXPERIMENT_ID = re.compile(r"EXP-\d+")
EXPERIMENT_FILE = re.compile(r"^(EXP-\d+).*\.md$")
# Detección mínima de datos personales: correos y teléfonos en formato internacional. No prueba
# que la evidencia esté anonimizada; solo atrapa el descuido más común.
EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")
PHONE = re.compile(r"\+\d{1,3}[\s.-]?\d{2,4}(?:[\s.-]?\d{2,4}){2,4}")
TICKET_ID = re.compile(r"TK-\d+(?:-[A-Z0-9]+)*")
STORY_FILE = re.compile(r"^(US-\d+)")
TICKET_FILE = re.compile(r"^(TK-\d+(?:-[A-Z0-9]+)*)\.md$")
ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
SEMVER = re.compile(r"^\d+\.\d+\.\d+$")
LINK = re.compile(r"\]\(([^)\s]+)\)")
GIVEN = re.compile(r"\b(given|dado)\b", re.I)
WHEN = re.compile(r"\b(when|cuando)\b", re.I)
THEN = re.compile(r"\b(then|entonces)\b", re.I)


def norm(text):
    """Minúsculas, sin acentos, sin emojis ni puntuación: compara títulos de artefactos
    antiguos (con pictogramas) y nuevos (sin ellos) por su texto real."""
    decomposed = unicodedata.normalize("NFKD", text)
    stripped = "".join(c for c in decomposed if not unicodedata.combining(c))
    cleaned = re.sub(r"[^a-z0-9 ]+", " ", stripped.lower())
    return re.sub(r"\s+", " ", cleaned).strip()


def read(path):
    with open(path, encoding="utf-8", errors="ignore") as f:
        return f.read()


def frontmatter(text):
    match = FRONTMATTER.match(text)
    if not match:
        return None
    fields = {}
    for line in match.group(1).splitlines():
        key_match = TOP_LEVEL_KEY.match(line)
        if key_match:
            fields[key_match.group(1)] = key_match.group(2).strip().strip('"').strip("'")
    return fields


def headings(text):
    """Títulos normalizados, sin la numeración inicial ("3. Visión" → "vision")."""
    found = []
    for line in text.splitlines():
        match = HEADING.match(line)
        if match:
            found.append(re.sub(r"^[0-9 ]+", "", norm(match.group(1))))
    return found


def has_section(found_headings, options):
    return any(h.startswith(option) for h in found_headings for option in options)


def list_files(root, rel_dir, pattern):
    base = os.path.join(root, rel_dir)
    result = []
    for dirpath, _, files in os.walk(base):
        for fname in files:
            if pattern.match(fname):
                result.append(os.path.relpath(os.path.join(dirpath, fname), root))
    return sorted(result)


class Findings:
    def __init__(self):
        self.items = []

    def add(self, gate, path, kind, detail=""):
        self.items.append((gate, path, kind, detail))


# ---------------------------------------------------------------- gate: kpi

def check_kpis(root, doc, findings):
    text = read(os.path.join(root, doc))
    tables, current = [], []
    for line in text.splitlines():
        if line.strip().startswith("|"):
            current.append(line.strip())
        elif current:
            tables.append(current)
            current = []
    if current:
        tables.append(current)

    def cells(row):
        return [c.strip() for c in row.strip("|").split("|")]

    kpi_tables = [t for t in tables if set(KPI_COLUMNS) <= {norm(c) for c in cells(t[0])}]
    if not kpi_tables:
        findings.add("kpi", doc, "sin tabla de KPIs medible",
                     "columnas requeridas: KPI | Fuente de datos | Línea base | Umbral de éxito | Ventana | Fecha de revisión")
        return
    for table in kpi_tables:
        header = [norm(c) for c in cells(table[0])]
        rows = [r for r in table[1:] if not re.fullmatch(r"\|?[\s:|-]+\|?", r)]
        if not rows:
            findings.add("kpi", doc, "tabla de KPIs vacía")
        for row in rows:
            values = dict(zip(header, cells(row)))
            name = values.get("kpi", "?") or "?"
            for column in KPI_COLUMNS:
                if not values.get(column, "").strip():
                    findings.add("kpi", doc, f"KPI sin '{column}'", name)
            date = values.get("fecha de revision", "").strip()
            if date and not ISO_DATE.match(date):
                findings.add("kpi", doc, "fecha de revisión no es AAAA-MM-DD", f"{name}: {date}")


# -------------------------------------------------------- gate: experimento

def list_experiments(root):
    base = os.path.join(root, EXPERIMENTS_DIR)
    if not os.path.isdir(base):
        return []
    return sorted(os.path.join(EXPERIMENTS_DIR, f) for f in os.listdir(base)
                  if EXPERIMENT_FILE.match(f) and os.path.isfile(os.path.join(base, f)))


def evidence_dir(root, experiment_id):
    return os.path.join(root, EXPERIMENTS_DIR, "evidence", experiment_id)


def check_experiment(root, path, findings):
    text = read(os.path.join(root, path))
    fm = frontmatter(text)
    if fm is None:
        findings.add("experimento", path, "sin frontmatter")
        return
    file_id = EXPERIMENT_FILE.match(os.path.basename(path)).group(1)
    if fm.get("document") != "experiment":
        findings.add("experimento", path, "document distinto de 'experiment'", fm.get("document", "(ausente)"))
    if fm.get("id") != file_id:
        findings.add("experimento", path, "id ausente o distinto del nombre de archivo", fm.get("id", "(ausente)"))
    if not SEMVER.match(fm.get("version", "")):
        findings.add("experimento", path, "version ausente o no es X.Y.Z", fm.get("version", "(ausente)"))
    for field, allowed in (("status", EXPERIMENT_STATUS), ("risk", EXPERIMENT_RISKS),
                           ("method", EXPERIMENT_METHODS), ("decision", EXPERIMENT_DECISIONS)):
        if fm.get(field) not in allowed:
            findings.add("experimento", path, f"{field} fuera del vocabulario", fm.get(field, "(ausente)"))
    locked = fm.get("criteria_locked_on", "")
    if not ISO_DATE.match(locked):
        findings.add("experimento", path, "criteria_locked_on no es AAAA-MM-DD", locked or "(ausente)")
    target = fm.get("sample_target", "")
    if not target.isdigit() or int(target) < 1:
        findings.add("experimento", path, "sample_target no es un entero positivo", target or "(ausente)")

    found = headings(text)
    for label, options in EXPERIMENT_SECTIONS.items():
        if not has_section(found, options):
            findings.add("experimento", path, f"sin sección '{label}'")

    decision = fm.get("decision")
    if fm.get("status") != "concluded":
        if decision not in ("pendiente", None):
            findings.add("experimento", path, "decisión tomada antes de concluir el experimento", decision)
    else:
        obtained = fm.get("sample_obtained", "")
        result_on = fm.get("result_on", "")
        if not obtained.isdigit():
            findings.add("experimento", path, "experimento concluido sin sample_obtained")
        if not ISO_DATE.match(result_on):
            findings.add("experimento", path, "experimento concluido sin result_on AAAA-MM-DD", result_on or "(ausente)")
        elif ISO_DATE.match(locked) and result_on < locked:
            findings.add("experimento", path, "resultado anterior a la fecha en que se fijó el criterio", f"{result_on} < {locked}")
        if decision == "pendiente":
            findings.add("experimento", path, "experimento concluido sin decisión")
        if (decision in ("seguir", "pivotar", "descartar") and obtained.isdigit() and target.isdigit()
                and int(obtained) < int(target)):
            findings.add("experimento", path, "muestra menor que la objetivo: la decisión debe ser 'no_concluyente'",
                         f"{obtained} de {target}")
        for label, options in CONCLUDED_SECTIONS.items():
            if not has_section(found, options):
                findings.add("experimento", path, f"experimento concluido sin sección '{label}'")
        evidence = evidence_dir(root, file_id)
        files = [os.path.join(dp, f) for dp, _, fs in os.walk(evidence) for f in fs] if os.path.isdir(evidence) else []
        if not files:
            findings.add("experimento", path, f"experimento concluido sin evidencia en experiments/evidence/{file_id}/")

    evidence = evidence_dir(root, file_id)
    if os.path.isdir(evidence):
        for dirpath, _, fnames in os.walk(evidence):
            for fname in sorted(fnames):
                content = read(os.path.join(dirpath, fname))
                if EMAIL.search(content) or PHONE.search(content):
                    findings.add("experimento", path, "posibles datos personales en la evidencia (correo o teléfono)", fname)


def experiment_decisions(root):
    decisions = {}
    for path in list_experiments(root):
        fm = frontmatter(read(os.path.join(root, path))) or {}
        decisions[EXPERIMENT_FILE.match(os.path.basename(path)).group(1)] = fm.get("decision", "(ausente)")
    return decisions


def check_validation(path, fm, experiments, findings):
    status = fm.get("status")
    if status not in OPEN_STATUSES:
        return
    value_risk = fm.get("value_risk", "")
    if value_risk not in VALUE_RISKS:
        findings.add("historia", path, "value_risk fuera de alto/medio/bajo", value_risk or "(ausente)")
    validation = fm.get("validation", "").strip()
    if not validation:
        findings.add("historia", path, "sin validation: declara un EXP-NNN o 'exenta — motivo'")
        return
    referenced = EXPERIMENT_ID.findall(validation)
    if referenced:
        for experiment in referenced:
            if experiment not in experiments:
                findings.add("historia", path, "validation apunta a un experimento que no existe", experiment)
            elif status in ("approved", "in_progress") and experiments[experiment] != "seguir":
                findings.add("historia", path, "historia aprobada con un experimento cuya decisión no es 'seguir'",
                             f"{experiment}: {experiments[experiment]}")
    elif norm(validation).startswith("exenta"):
        reason = re.sub(r"^\s*exenta\s*[—–:\-]*\s*", "", validation, flags=re.I).strip()
        if len(reason) < 10:
            findings.add("historia", path, "exención sin motivo")
        if value_risk == "alto":
            findings.add("historia", path, "riesgo de valor alto exige un experimento: la exención no vale")
    else:
        findings.add("historia", path, "validation con formato no reconocido", validation)


# ----------------------------------------------------------- gate: historia

def check_story(root, path, findings, experiments=None):
    text = read(os.path.join(root, path))
    fm = frontmatter(text)
    if fm is None:
        findings.add("historia", path, "sin frontmatter")
        return
    if fm.get("document") != "user_story":
        findings.add("historia", path, "document distinto de 'user_story'", fm.get("document", "(ausente)"))
    file_id = STORY_FILE.match(os.path.basename(path))
    if fm.get("id") != (file_id.group(1) if file_id else None):
        findings.add("historia", path, "id ausente o distinto del nombre de archivo", fm.get("id", "(ausente)"))
    if not SEMVER.match(fm.get("version", "")):
        findings.add("historia", path, "version ausente o no es X.Y.Z", fm.get("version", "(ausente)"))
    if fm.get("status") not in STATUS_ENUM:
        findings.add("historia", path, "status fuera del vocabulario", fm.get("status", "(ausente)"))
    check_validation(path, fm, experiments or {}, findings)

    body = text[text.find("\n---\n", 4) + 5:] if text.startswith("---\n") else text
    scenarios = sum(1 for line in body.splitlines()
                    if re.sub(r"^[#*>\s-]+", "", norm(line)).startswith(("escenario", "scenario")))
    if scenarios < MIN_SCENARIOS:
        findings.add("historia", path, f"menos de {MIN_SCENARIOS} escenarios", str(scenarios))
    if not (GIVEN.search(body) and WHEN.search(body) and THEN.search(body)):
        findings.add("historia", path, "escenarios sin Given/When/Then")
    found = headings(body)
    for label, options in STORY_SECTIONS.items():
        if not has_section(found, options):
            findings.add("historia", path, f"sin sección de {label}")


# -------------------------------------------------------------- gate: ready

def check_ticket(root, path, story_ids, findings):
    text = read(os.path.join(root, path))
    fm = frontmatter(text)
    if fm is None:
        findings.add("ready", path, "sin frontmatter")
        return
    if fm.get("document") != "technical_ticket":
        findings.add("ready", path, "document distinto de 'technical_ticket'", fm.get("document", "(ausente)"))
    file_id = TICKET_FILE.match(os.path.basename(path))
    if fm.get("id") != (file_id.group(1) if file_id else None):
        findings.add("ready", path, "id ausente o distinto del nombre de archivo", fm.get("id", "(ausente)"))
    if fm.get("status") not in STATUS_ENUM:
        findings.add("ready", path, "status fuera del vocabulario", fm.get("status", "(ausente)"))
    if fm.get("points") not in TICKET_POINTS:
        findings.add("ready", path, "points fuera de 1/2/3/5 (máximo 5, SK-12)", fm.get("points", "(ausente)"))
    if fm.get("type") not in TICKET_TYPES:
        findings.add("ready", path, "type distinto de backend/frontend (SK-12 no mezcla capas)", fm.get("type", "(ausente)"))

    related = fm.get("related_story", "")
    referenced = STORY_ID.findall(related)
    if not related:
        findings.add("ready", path, "related_story ausente")
    elif referenced:
        for story in referenced:
            if story not in story_ids:
                findings.add("ready", path, "related_story apunta a una historia que no existe", story)
    elif not (norm(related).startswith("n a") or AUDIT_ID.search(related)):
        # Guard 26: una remediación técnica se traza a su auditoría (AUDIT-XXX) o a un N/A justificado.
        findings.add("ready", path, "related_story sin historia, auditoría ni 'N/A' justificado", related)

    found = headings(text)
    for label, options in TICKET_SECTIONS.items():
        if not has_section(found, options):
            findings.add("ready", path, f"sin sección '{label}'")


# ------------------------------------------------------- gate: trazabilidad

def matrix_links(root):
    matrix_path = os.path.join(root, MATRIX)
    if not os.path.isfile(matrix_path):
        return None, [], ""
    text = read(matrix_path)
    linked, broken = set(), []
    for target in LINK.findall(text):
        if target.startswith(("http://", "https://", "#", "mailto:")):
            continue
        clean = target.split("#")[0]
        resolved = os.path.normpath(os.path.join(os.path.dirname(matrix_path), clean))
        if os.path.exists(resolved):
            linked.add(os.path.relpath(resolved, root))
        else:
            broken.append(target)
    return linked, broken, text


def check_matrix_membership(path, artifact_id, linked, matrix_text, findings):
    if linked is None:
        findings.add("trazabilidad", path, "no existe la matriz de trazabilidad", MATRIX)
    elif path in linked:
        return
    elif artifact_id and re.search(rf"(?<![\w-]){re.escape(artifact_id)}(?![\w-])", matrix_text):
        findings.add("trazabilidad", path, "aparece en la matriz sin enlace a su archivo")
    else:
        findings.add("trazabilidad", path, "no aparece en la matriz de trazabilidad")


def check_adr(root, path, story_ids, ticket_ids, findings):
    text = read(os.path.join(root, path))
    fm = frontmatter(text) or {}
    if norm(fm.get("status", "")) != "accepted":
        return
    line = next((l for l in text.splitlines() if "implementado por" in norm(l)), "")
    references = STORY_ID.findall(line) + TICKET_ID.findall(line)
    if not references:
        findings.add("trazabilidad", path, "ADR aceptado huérfano: 'Implementado por' no nombra historias ni tickets")
    for ref in references:
        if ref not in story_ids and ref not in ticket_ids:
            findings.add("trazabilidad", path, "ADR aceptado apunta a un artefacto que no existe", ref)


# ------------------------------------------------------------------ runner

def changed_files(root):
    commands = (["git", "diff", "--name-only", "HEAD"], ["git", "ls-files", "--others", "--exclude-standard"])
    result = set()
    for cmd in commands:
        out = subprocess.run(cmd, cwd=root, capture_output=True, text=True)
        if out.returncode != 0:
            raise RuntimeError(f"no se pudo ejecutar {' '.join(cmd)}: {out.stderr.strip()}")
        result.update(line.strip() for line in out.stdout.splitlines() if line.strip())
    return result


def run_checks(root, scope=None, ticket=None):
    """Aplica los gates. `scope` es un conjunto de rutas relativas a revisar (None = todo el
    repositorio); `ticket` limita la revisión a la Definition of Ready de ese ticket.

    Devuelve (Findings, checked_count) sin imprimir ni salir del proceso."""
    findings = Findings()
    stories = list_files(root, STORIES_DIR, re.compile(r"^US-\d+.*\.md$"))
    tickets = list_files(root, TICKETS_DIR, TICKET_FILE)
    adrs = list_files(root, ADR_DIR, re.compile(r"^ADR-\d+.*\.md$"))
    story_ids = {STORY_FILE.match(os.path.basename(p)).group(1) for p in stories}
    ticket_ids = {TICKET_FILE.match(os.path.basename(p)).group(1) for p in tickets}
    linked, broken, matrix_text = matrix_links(root)

    def story_id(path):
        return STORY_FILE.match(os.path.basename(path)).group(1)

    def ticket_id(path):
        return TICKET_FILE.match(os.path.basename(path)).group(1)
    checked = 0

    if ticket is not None:
        matches = [p for p in tickets if TICKET_FILE.match(os.path.basename(p)).group(1) == ticket]
        if not matches:
            findings.add("ready", ticket, "el ticket no existe: primero la cascada de spec (Guard 26)")
            return findings, 0
        for path in matches:
            check_ticket(root, path, story_ids, findings)
            check_matrix_membership(path, ticket, linked, matrix_text, findings)
        return findings, len(matches)

    def in_scope(path):
        return scope is None or path in scope

    for doc in KPI_DOCS:
        if os.path.isfile(os.path.join(root, doc)) and in_scope(doc):
            check_kpis(root, doc, findings)
            checked += 1
    experiments = experiment_decisions(root)
    for path in list_experiments(root):
        experiment_id = EXPERIMENT_FILE.match(os.path.basename(path)).group(1)
        evidence_prefix = f"{EXPERIMENTS_DIR}/evidence/{experiment_id}/"
        if in_scope(path) or (scope is not None and any(s.startswith(evidence_prefix) for s in scope)):
            check_experiment(root, path, findings)
            checked += 1
    for path in stories:
        if in_scope(path):
            check_story(root, path, findings, experiments)
            check_matrix_membership(path, story_id(path), linked, matrix_text, findings)
            checked += 1
    for path in tickets:
        if in_scope(path):
            check_ticket(root, path, story_ids, findings)
            check_matrix_membership(path, ticket_id(path), linked, matrix_text, findings)
            checked += 1
    for path in adrs:
        if in_scope(path):
            check_adr(root, path, story_ids, ticket_ids, findings)
            checked += 1
    if in_scope(MATRIX):
        for target in broken:
            findings.add("trazabilidad", MATRIX, "enlace roto en la matriz", target)
        checked += 1 if linked is not None else 0

    return findings, checked


def main():
    parser = argparse.ArgumentParser(description="Gates deterministas de especificación de momoy.")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--changed", action="store_true", help="solo artefactos modificados o nuevos (bloquea)")
    group.add_argument("--ticket", metavar="TK-XXX", help="Definition of Ready de un ticket (bloquea)")
    parser.add_argument("--strict", action="store_true", help="en el informe completo, falla si hay hallazgos")
    parser.add_argument("--verbose", action="store_true", help="lista cada hallazgo del informe completo")
    args = parser.parse_args()

    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    scope = changed_files(root) if args.changed else None
    findings, checked = run_checks(root, scope=scope, ticket=args.ticket)
    blocking = args.changed or args.ticket is not None or args.strict
    marker = "❌" if blocking else "⚠️"

    if blocking or args.verbose:
        for gate, path, kind, detail in findings.items:
            print(f"{marker} [{gate}] {path}: {kind}" + (f" — {detail}" if detail else ""))
    else:
        by_gate = Counter(gate for gate, *_ in findings.items)
        by_kind = Counter((gate, kind) for gate, _, kind, _ in findings.items)
        for gate in ("kpi", "experimento", "historia", "ready", "trazabilidad"):
            print(f"\n[{gate}] {by_gate.get(gate, 0)} hallazgos")
            for (g, kind), count in sorted(by_kind.items(), key=lambda kv: -kv[1]):
                if g == gate:
                    print(f"  {count:4d}  {kind}")
        print("\nUsa --verbose para ver cada archivo.")

    mode = f"ticket {args.ticket}" if args.ticket else ("cambios" if args.changed else "repositorio completo")
    print(f"\nArtefactos revisados ({mode}): {checked}")
    print(f"Hallazgos: {len(findings.items)}")

    if findings.items and blocking:
        sys.exit(1)
    if not findings.items:
        print("✅ Las especificaciones cumplen los gates de momoy.")


if __name__ == "__main__":
    main()
