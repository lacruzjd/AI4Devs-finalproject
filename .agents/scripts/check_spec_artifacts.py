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

Once gates:
  kpi          Cada KPI está en una tabla con fuente, línea base, umbral, ventana y fecha de revisión.
  resultado    Cada OUT-NNN (SK-39) tiene veredicto por KPI sostenido por datos del repo y una
               recomendación coherente con su estado; un KPI con la fecha de revisión vencida y sin
               informe es un hallazgo: así se detecta que el ciclo no se cerró.
  release      Cada vX.Y.Z (workflow 10) tiene tickets cerrados, notas de versión, plan de rollback,
               estrategia justificada, migraciones clasificadas (un contract solo tras su expand
               desplegado), flags con ticket de retirada, ensayo de rollback si hay migración o cambio
               de despliegue y, si se desplegó, etiqueta git y sección de CHANGELOG coincidentes.
  operacion    Un servicio con un release desplegado tiene SLOs de disponibilidad y latencia, cada uno
               con alerta y runbook ensayado con éxito, y backup con RPO/RTO y un simulacro de
               restauración exitoso de hace menos de 90 días que cumple el RTO (SK-40).
  mantenimiento Cada MNT-NNN (workflow 11) cerrado traza sus hallazgos; con algo desplegado, pasar 30 días
               sin una revisión cerrada es un hallazgo.
  retirada     Cada RET-NNN (SK-41) completado tiene aviso de al menos 30 días, tickets de eliminación
               cerrados e historias con retired_by; la retención vencida exige registrar el borrado.
  postmortem   Cada PM-NNN (SK-38) tiene línea de tiempo con horas, análisis de por qué ningún gate lo
               detectó y, si está cerrado, acciones trazadas; uno crítico o alto sin cerrar pasados
               5 días desde la resolución es un hallazgo.
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
from datetime import date, datetime, timedelta

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

# Resultados (etapa 11, SK-39) y postmortems (etapa 10, SK-38).
OUTCOMES_DIR = "docs/01_product_definition/outcomes"
OUTCOME_STATUS = ("draft", "closed")
OUTCOME_RECOMMENDATIONS = ("pendiente", "mantener", "iterar", "pivotar", "retirar")
OUTCOME_VERDICTS = ("cumplido", "no_cumplido", "no_concluyente", "no_medible")
POSTMORTEMS_DIR = "docs/06_release_and_operations/postmortems"
POSTMORTEM_STATUS = ("draft", "closed")
SEVERITIES = ("critica", "alta", "media", "baja")
MANDATORY_SEVERITIES = ("critica", "alta")
POSTMORTEM_DEADLINE_DAYS = 5
POSTMORTEM_SECTIONS = {
    "Resumen": ("resumen",),
    "Impacto": ("impacto",),
    "Línea de tiempo": ("linea de tiempo",),
    "Causas contribuyentes": ("causas",),
    "Por qué ningún gate lo detectó": ("por que ningun gate",),
    "Acciones": ("acciones",),
}

# Release (etapa 8, workflow 10).
RELEASES_DIR = "docs/06_release_and_operations/releases"
RELEASE_STATUS = ("planned", "deployed", "rolled_back", "cancelled")
RELEASE_STRATEGIES = ("completo", "flag", "canary")
YES_NO = ("si", "no")
MIGRATION_KINDS = ("expand", "contract", "datos")
RELEASE_SECTIONS = {
    "Tickets incluidos": ("tickets incluidos",),
    "Notas de versión": ("notas de version",),
    "Verificación previa al despliegue": ("verificacion previa",),
    "Plan de rollback": ("plan de rollback",),
}
# Convención de versiones de momoy (workflow 10): CHANGELOG.md en la raíz y etiquetas git vX.Y.Z.
CHANGELOG = "CHANGELOG.md"

# Mantenimiento y retirada (etapa 12, workflow 11 y SK-41).
MAINTENANCE_DIR = "docs/06_release_and_operations/maintenance"
MAINTENANCE_STATUS = ("draft", "closed")
MAINTENANCE_CADENCE_DAYS = 30
MAINTENANCE_SECTIONS = {
    "Dependencias y vulnerabilidades": ("dependencias",),
    "Deuda técnica": ("deuda tecnica",),
    "Feature flags pendientes de retirar": ("feature flags",),
    "Operación": ("operacion",),
    "Especificaciones y ciclo": ("especificaciones",),
    "Hallazgos": ("hallazgos",),
}
RETIREMENTS_DIR = "docs/06_release_and_operations/retirements"
RETIREMENT_STATUS = ("planned", "announced", "completed", "cancelled")
RETIREMENT_NOTICE_DAYS = 30
RETIREMENT_SECTIONS = {
    "Motivo": ("motivo",),
    "Impacto": ("impacto",),
    "Historias retiradas": ("historias retiradas",),
    "Aviso a usuarios": ("aviso a usuarios",),
    "Tratamiento de datos": ("tratamiento de datos",),
    "Tickets de eliminación": ("tickets de eliminacion",),
}

# Operación (etapa 9, SK-40).
OPS_DIR = "docs/06_release_and_operations"
SLOS_DOC = f"{OPS_DIR}/slos.md"
BACKUP_DOC = f"{OPS_DIR}/backup_and_recovery.md"
RUNBOOKS_DIR = f"{OPS_DIR}/runbooks"
DRILLS_DIR = f"{OPS_DIR}/drills"
SLO_COLUMNS = ("slo", "sli", "objetivo", "ventana", "fuente", "alerta", "presupuesto")
BUDGET_STATES = ("disponible", "en_riesgo", "agotado")
DRILL_TYPES = ("restauracion", "alerta", "runbook", "rollback")
DRILL_RESULTS = ("exitoso", "parcial", "fallido")
RESTORE_DRILL_MAX_AGE_DAYS = 90
RUNBOOK_SECTIONS = {"Síntoma": ("sintoma",), "Diagnóstico": ("diagnostico",), "Mitigación": ("mitigacion",), "Escalado": ("escalado",)}
DRILL_SECTIONS = {"Objetivo": ("objetivo",), "Procedimiento seguido": ("procedimiento",), "Resultado": ("resultado",), "Evidencia": ("evidencia",)}
BACKUP_SECTIONS = {"Mecanismo de backup": ("mecanismo",), "Procedimiento de restauración": ("procedimiento de restauracion",)}

KPI_DOCS = ("docs/01_product_definition/01_product_discovery.md", "docs/01_product_definition/02_prd.md")
STORIES_DIR = "docs/05_agile_planning/11_user_stories"
TICKETS_DIR = "docs/05_agile_planning/12_tickets"
MATRIX = "docs/05_agile_planning/13_matriz_trazabilidad.md"
ADR_DIR = "docs/02_architecture_design/adr"
GLOSSARY = "docs/01_product_definition/01_glosario_y_reglas_negocio.md"
INVARIANT_ID = re.compile(r"\bINV-\d+\b")
STACK_MANIFEST = "docs/00_stack_manifest.md"
# Mecanismos de operación que usan release, smoke y operación (SK-04): nombre legible y palabras de la fila.
OPERATIONS_MECHANISMS = (
    ("despliegue", ("despliegue", "deploy")),
    ("vuelta a la versión anterior", ("rollback", "version anterior", "vuelta atras")),
    ("monitorización y alertas", ("monitoriz", "alerta", "observabilidad")),
    ("backups", ("backup", "copia de seguridad", "respaldo")),
)
ADR_PENDING_DAYS = 30

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
RELEASE_FILE = re.compile(r"^v(\d+\.\d+\.\d+)(?:-[a-z0-9-]+)?\.md$")
RELEASE_REF = re.compile(r"\bv(\d+\.\d+\.\d+)\b")
MAINTENANCE_FILE = re.compile(r"^(MNT-\d+).*\.md$")
RETIREMENT_FILE = re.compile(r"^(RET-\d+).*\.md$")
RETIREMENT_ID = re.compile(r"RET-\d+")
OUTCOME_ID = re.compile(r"OUT-\d+")
RUNBOOK_FILE = re.compile(r"^(RB-\d+).*\.md$")
DRILL_FILE = re.compile(r"^(DRILL-\d+).*\.md$")
RUNBOOK_ID = re.compile(r"RB-\d+")
DURATION = re.compile(r"^(\d+(?:[.,]\d+)?)\s*(s|min|h|d)$")
OUTCOME_FILE = re.compile(r"^(OUT-\d+).*\.md$")
POSTMORTEM_FILE = re.compile(r"^(PM-\d+).*\.md$")
ISO_DATETIME = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$")
CLOCK_TIME = re.compile(r"\b\d{1,2}:\d{2}\b")
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


def section_lines(text, options):
    """Líneas del cuerpo de la primera sección cuyo título empieza por alguna de las opciones."""
    lines, inside, level = [], False, 0
    for line in text.splitlines():
        match = HEADING.match(line)
        if match:
            hashes = len(line.lstrip()) - len(line.lstrip().lstrip("#"))
            title = re.sub(r"^[0-9 ]+", "", norm(match.group(1)))
            if inside and hashes <= level:
                break
            if not inside and any(title.startswith(o) for o in options):
                inside, level = True, hashes
                continue
        if inside:
            lines.append(line)
    return lines


def untraced_items(items, ticket_ids):
    """Para acciones o hallazgos que deben apuntar a un ticket existente o declararse
    `sin acción — motivo`: devuelve [("missing", ticket) | ("untraced", texto)]."""
    problems = []
    for item in items:
        referenced = TICKET_ID.findall(item)
        if referenced:
            problems.extend(("missing", ticket) for ticket in referenced if ticket not in ticket_ids)
        else:
            reason = norm(item).split("sin accion", 1)
            if len(reason) < 2 or len(reason[1].strip()) < 10:
                problems.append(("untraced", item[:60]))
    return problems


def list_top_level(root, rel_dir, pattern):
    base = os.path.join(root, rel_dir)
    if not os.path.isdir(base):
        return []
    return sorted(os.path.join(rel_dir, f) for f in os.listdir(base)
                  if pattern.match(f) and os.path.isfile(os.path.join(base, f)))


def files_under(path):
    return [os.path.join(dp, f) for dp, _, fs in os.walk(path) for f in fs] if os.path.isdir(path) else []


def markdown_tables(text):
    tables, current = [], []
    for line in text.splitlines():
        if line.strip().startswith("|"):
            current.append(line.strip())
        elif current:
            tables.append(current)
            current = []
    if current:
        tables.append(current)
    return tables


def table_cells(row):
    return [c.strip() for c in row.strip("|").split("|")]


def table_rows(table):
    return [r for r in table[1:] if not re.fullmatch(r"\|?[\s:|-]+\|?", r)]


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

def check_kpis(root, doc, findings, today=None, measured_kpis=frozenset()):
    tables = markdown_tables(read(os.path.join(root, doc)))
    kpi_tables = [t for t in tables if set(KPI_COLUMNS) <= {norm(c) for c in table_cells(t[0])}]
    if not kpi_tables:
        findings.add("kpi", doc, "sin tabla de KPIs medible",
                     "columnas requeridas: KPI | Fuente de datos | Línea base | Umbral de éxito | Ventana | Fecha de revisión")
        return
    for table in kpi_tables:
        header = [norm(c) for c in table_cells(table[0])]
        rows = table_rows(table)
        if not rows:
            findings.add("kpi", doc, "tabla de KPIs vacía")
        for row in rows:
            values = dict(zip(header, table_cells(row)))
            name = values.get("kpi", "?") or "?"
            for column in KPI_COLUMNS:
                if not values.get(column, "").strip():
                    findings.add("kpi", doc, f"KPI sin '{column}'", name)
            review = values.get("fecha de revision", "").strip()
            if review and not ISO_DATE.match(review):
                findings.add("kpi", doc, "fecha de revisión no es AAAA-MM-DD", f"{name}: {review}")
            elif review and today and date.fromisoformat(review) <= today and norm(name) not in measured_kpis:
                findings.add("resultado", doc, "KPI con fecha de revisión vencida sin informe de resultados", name)


# ---------------------------------------------------------- gate: resultado

def verdict_tables(text):
    required = {"kpi", "valor medido", "veredicto"}
    return [t for t in markdown_tables(text) if required <= {norm(c) for c in table_cells(t[0])}]


def measured_kpi_names(root):
    names = set()
    for path in list_top_level(root, OUTCOMES_DIR, OUTCOME_FILE):
        for table in verdict_tables(read(os.path.join(root, path))):
            header = [norm(c) for c in table_cells(table[0])]
            for row in table_rows(table):
                names.add(norm(dict(zip(header, table_cells(row))).get("kpi", "")))
    return frozenset(names)


def check_outcome(root, path, findings):
    text = read(os.path.join(root, path))
    fm = frontmatter(text)
    if fm is None:
        findings.add("resultado", path, "sin frontmatter")
        return
    file_id = OUTCOME_FILE.match(os.path.basename(path)).group(1)
    if fm.get("document") != "outcome_report":
        findings.add("resultado", path, "document distinto de 'outcome_report'", fm.get("document", "(ausente)"))
    if fm.get("id") != file_id:
        findings.add("resultado", path, "id ausente o distinto del nombre de archivo", fm.get("id", "(ausente)"))
    if not SEMVER.match(fm.get("version", "")):
        findings.add("resultado", path, "version ausente o no es X.Y.Z", fm.get("version", "(ausente)"))
    for field, allowed in (("status", OUTCOME_STATUS), ("recommendation", OUTCOME_RECOMMENDATIONS)):
        if fm.get(field) not in allowed:
            findings.add("resultado", path, f"{field} fuera del vocabulario", fm.get(field, "(ausente)"))
    if not ISO_DATE.match(fm.get("measured_on", "")):
        findings.add("resultado", path, "measured_on no es AAAA-MM-DD", fm.get("measured_on", "(ausente)"))
    source = fm.get("source_doc", "")
    if not source or not os.path.isfile(os.path.join(root, source)):
        findings.add("resultado", path, "source_doc no existe", source or "(ausente)")
    if fm.get("status") == "closed" and fm.get("recommendation") == "pendiente":
        findings.add("resultado", path, "informe cerrado sin recomendación")
    if fm.get("status") == "draft" and fm.get("recommendation") not in ("pendiente", None):
        findings.add("resultado", path, "recomendación escrita antes de cerrar el informe", fm.get("recommendation"))

    data_dir = os.path.join(root, OUTCOMES_DIR, "data", file_id)
    has_data = bool(files_under(data_dir))
    tables = verdict_tables(text)
    if not tables:
        findings.add("resultado", path, "sin tabla de veredicto por KPI", "columnas requeridas: KPI | Valor medido | Veredicto")
    for table in tables:
        header = [norm(c) for c in table_cells(table[0])]
        for row in table_rows(table):
            values = dict(zip(header, table_cells(row)))
            name = values.get("kpi", "?") or "?"
            verdict = values.get("veredicto", "").strip()
            if verdict not in OUTCOME_VERDICTS:
                findings.add("resultado", path, "veredicto fuera del vocabulario", f"{name}: {verdict or '(vacío)'}")
                continue
            if verdict == "no_medible":
                continue
            if not values.get("valor medido", "").strip():
                findings.add("resultado", path, "veredicto sin valor medido", name)
            if not has_data:
                findings.add("resultado", path, f"veredicto sin datos en outcomes/data/{file_id}/", name)
    for data_file in files_under(data_dir):
        content = read(data_file)
        if EMAIL.search(content) or PHONE.search(content):
            findings.add("resultado", path, "posibles datos personales en los datos (correo o teléfono)", os.path.basename(data_file))


# ------------------------------------------------------------ gate: release

def semver_key(version):
    return tuple(int(part) for part in version.split("."))


def bullets(lines):
    return [l.strip()[2:].strip() for l in lines if l.strip().startswith(("- ", "* "))]


def release_statuses(root):
    statuses = {}
    for path in list_top_level(root, RELEASES_DIR, RELEASE_FILE):
        fm = frontmatter(read(os.path.join(root, path))) or {}
        statuses[RELEASE_FILE.match(os.path.basename(path)).group(1)] = fm.get("status")
    return statuses


def check_release(root, path, tickets, releases, findings, tags=None, budget_exhausted=False):
    text = read(os.path.join(root, path))
    fm = frontmatter(text)
    if fm is None:
        findings.add("release", path, "sin frontmatter")
        return
    file_version = RELEASE_FILE.match(os.path.basename(path)).group(1)
    release = fm.get("release", "")
    status = fm.get("status")
    if fm.get("document") != "release":
        findings.add("release", path, "document distinto de 'release'", fm.get("document", "(ausente)"))
    if release != file_version:
        findings.add("release", path, "release distinto de la versión del nombre de archivo", release or "(ausente)")
    if not SEMVER.match(fm.get("version", "")):
        findings.add("release", path, "version ausente o no es X.Y.Z", fm.get("version", "(ausente)"))
    for field, allowed in (("status", RELEASE_STATUS), ("strategy", RELEASE_STRATEGIES),
                           ("includes_migration", YES_NO), ("changes_deploy_config", YES_NO)):
        if fm.get(field) not in allowed:
            findings.add("release", path, f"{field} fuera del vocabulario", fm.get(field, "(ausente)"))
    if not ISO_DATE.match(fm.get("planned_on", "")):
        findings.add("release", path, "planned_on no es AAAA-MM-DD", fm.get("planned_on", "(ausente)"))
    if fm.get("strategy") == "completo" and len(fm.get("strategy_justification", "").strip()) < 10:
        findings.add("release", path, "estrategia 'completo' sin justificación")

    found = headings(text)
    for label, options in RELEASE_SECTIONS.items():
        if not has_section(found, options):
            findings.add("release", path, f"sin sección '{label}'")

    def section_text(options):
        return " ".join(l.strip() for l in section_lines(text, options)).strip()

    if has_section(found, ("notas de version",)) and len(section_text(("notas de version",))) < 20:
        findings.add("release", path, "notas de versión vacías")
    if has_section(found, ("plan de rollback",)) and len(section_text(("plan de rollback",))) < 20:
        findings.add("release", path, "plan de rollback vacío")

    if status != "cancelled":
        included = [tid for line in bullets(section_lines(text, ("tickets incluidos",))) for tid in TICKET_ID.findall(line)]
        if not included:
            findings.add("release", path, "release sin tickets incluidos")
        for ticket in included:
            if ticket not in tickets:
                findings.add("release", path, "ticket incluido que no existe", ticket)
            elif tickets[ticket].get("status") != "done":
                findings.add("release", path, "ticket incluido sin cerrar", f"{ticket}: {tickets[ticket].get('status')}")
            elif budget_exhausted and status == "planned" and STORY_ID.search(tickets[ticket].get("related_story", "")):
                findings.add("release", path, "presupuesto de error agotado: el release incluye funcionalidades", ticket)

    if fm.get("includes_migration") == "si":
        migrations = bullets(section_lines(text, ("migraciones",)))
        if not migrations:
            findings.add("release", path, "migraciones sin clasificar (expand, contract o datos)", "sección vacía o ausente")
        for migration in migrations:
            kind = norm(migration).split(" ", 1)[0]
            if kind not in MIGRATION_KINDS:
                findings.add("release", path, "migración sin clasificar (expand, contract o datos)", migration)
            elif kind == "contract":
                earlier = [v for v in RELEASE_REF.findall(migration)
                           if SEMVER.match(release) and semver_key(v) < semver_key(release) and releases.get(v) == "deployed"]
                if not earlier:
                    cited = ", ".join(f"v{v}" for v in RELEASE_REF.findall(migration)) or "(sin versión citada)"
                    findings.add("release", path, "contract sin su expand desplegado en un release anterior", cited)

    if fm.get("strategy") == "flag":
        flags = bullets(section_lines(text, ("feature flags",)))
        if not flags:
            findings.add("release", path, "estrategia 'flag' sin flags declarados")
        for flag in flags:
            removal = [tid for tid in TICKET_ID.findall(flag) if tid in tickets]
            if not removal:
                findings.add("release", path, "flag sin ticket de retirada", flag)

    deployed = status in ("deployed", "rolled_back")
    deployed_at = fm.get("deployed_at", "")
    if deployed and not ISO_DATETIME.match(deployed_at):
        findings.add("release", path, "release desplegado sin deployed_at con fecha, hora y zona", deployed_at or "(ausente)")
    needs_rehearsal = "si" in (fm.get("includes_migration"), fm.get("changes_deploy_config"))
    rehearsed = fm.get("rollback_rehearsed_on", "")
    if needs_rehearsal and status in ("planned", "deployed", "rolled_back"):
        if not ISO_DATE.match(rehearsed):
            findings.add("release", path, "requiere ensayo de rollback (hay migración o cambio de despliegue)")
        elif deployed and ISO_DATETIME.match(deployed_at) and rehearsed > deployed_at[:10]:
            findings.add("release", path, "ensayo de rollback posterior al despliegue", f"{rehearsed} > {deployed_at[:10]}")

    if deployed:
        if len(section_text(("verificacion posterior",))) < 20:
            findings.add("release", path, "release desplegado sin verificación posterior")
        if tags is not None and f"v{release}" not in tags:
            findings.add("release", path, f"release desplegado sin etiqueta git v{release}")
        changelog = os.path.join(root, CHANGELOG)
        if not (os.path.isfile(changelog) and re.search(rf"^##\s*\[{re.escape(release)}\]", read(changelog), re.M)):
            findings.add("release", path, f"release desplegado sin sección en {CHANGELOG}")


# ---------------------------------------------------------- gate: operacion

def duration_minutes(value):
    match = DURATION.match(value.strip())
    if not match:
        return None
    amount = float(match.group(1).replace(",", "."))
    return amount * {"s": 1 / 60, "min": 1, "h": 60, "d": 1440}[match.group(2)]


def slo_rows(root):
    path = os.path.join(root, SLOS_DOC)
    if not os.path.isfile(path):
        return []
    rows = []
    for table in markdown_tables(read(path)):
        header = [norm(c) for c in table_cells(table[0])]
        if set(SLO_COLUMNS) <= set(header):
            rows.extend(dict(zip(header, table_cells(r))) for r in table_rows(table))
    return rows


def error_budget_exhausted(root):
    return any(row.get("presupuesto", "").strip() == "agotado" for row in slo_rows(root))


def check_operations(root, findings, deployed, today=None):
    """Devuelve cuántos artefactos de operación revisó."""
    checked = 0
    runbooks = list_top_level(root, RUNBOOKS_DIR, RUNBOOK_FILE)
    drills = list_top_level(root, DRILLS_DIR, DRILL_FILE)
    runbook_ids = {RUNBOOK_FILE.match(os.path.basename(p)).group(1) for p in runbooks}

    drill_records = []
    for path in drills:
        checked += 1
        text = read(os.path.join(root, path))
        fm = frontmatter(text)
        if fm is None:
            findings.add("operacion", path, "sin frontmatter")
            continue
        drill_id = DRILL_FILE.match(os.path.basename(path)).group(1)
        if fm.get("document") != "drill":
            findings.add("operacion", path, "document distinto de 'drill'", fm.get("document", "(ausente)"))
        if fm.get("id") != drill_id:
            findings.add("operacion", path, "id ausente o distinto del nombre de archivo", fm.get("id", "(ausente)"))
        for field, allowed in (("type", DRILL_TYPES), ("result", DRILL_RESULTS)):
            if fm.get(field) not in allowed:
                findings.add("operacion", path, f"{field} fuera del vocabulario", fm.get(field, "(ausente)"))
        if not ISO_DATE.match(fm.get("executed_on", "")):
            findings.add("operacion", path, "executed_on no es AAAA-MM-DD", fm.get("executed_on", "(ausente)"))
        if not fm.get("environment", "").strip():
            findings.add("operacion", path, "simulacro sin entorno declarado")
        kind, target = fm.get("type"), fm.get("target", "").strip()
        coherent = ((kind == "restauracion" and target == "backup")
                    or (kind in ("alerta", "runbook") and RUNBOOK_ID.fullmatch(target) and target in runbook_ids)
                    or (kind == "rollback" and RELEASE_REF.fullmatch(target)))
        if kind in DRILL_TYPES and not coherent:
            findings.add("operacion", path, "target incoherente con el tipo de simulacro", f"{kind} → {target or '(vacío)'}")
        if kind == "restauracion" and duration_minutes(fm.get("measured_rto", "")) is None:
            findings.add("operacion", path, "simulacro de restauración sin measured_rto")
        found = headings(text)
        for label, options in DRILL_SECTIONS.items():
            if not has_section(found, options):
                findings.add("operacion", path, f"sin sección '{label}'")
        evidence = files_under(os.path.join(root, DRILLS_DIR, "evidence", drill_id))
        if not evidence:
            findings.add("operacion", path, f"simulacro sin evidencia en drills/evidence/{drill_id}/")
        for evidence_file in evidence:
            content = read(evidence_file)
            if EMAIL.search(content) or PHONE.search(content):
                findings.add("operacion", path, "posibles datos personales en la evidencia (correo o teléfono)", os.path.basename(evidence_file))
        drill_records.append(fm)

    successful = [d for d in drill_records if d.get("result") == "exitoso" and ISO_DATE.match(d.get("executed_on", ""))]

    slos_path = os.path.join(root, SLOS_DOC)
    if os.path.isfile(slos_path):
        checked += 1
        text = read(slos_path)
        fm = frontmatter(text) or {}
        if fm.get("document") != "slos":
            findings.add("operacion", SLOS_DOC, "document distinto de 'slos'", fm.get("document", "(ausente)"))
        rows = slo_rows(root)
        if not rows:
            findings.add("operacion", SLOS_DOC, "sin tabla de SLOs", "columnas: SLO | SLI | Objetivo | Ventana | Fuente | Alerta | Presupuesto")
        names = " ".join(norm(r.get("slo", "")) for r in rows)
        for required in ("disponibilidad", "latencia"):
            if rows and required not in names:
                findings.add("operacion", SLOS_DOC, f"falta SLO de {required}")
        for row in rows:
            name = row.get("slo", "?") or "?"
            for column in ("sli", "objetivo", "ventana", "fuente"):
                if not row.get(column, "").strip():
                    findings.add("operacion", SLOS_DOC, f"SLO sin '{column}'", name)
            alerts = RUNBOOK_ID.findall(row.get("alerta", ""))
            if not alerts:
                findings.add("operacion", SLOS_DOC, "SLO sin alerta que lo mida", name)
            for alert in alerts:
                if alert not in runbook_ids:
                    findings.add("operacion", SLOS_DOC, "alerta apunta a un runbook que no existe", f"{name}: {alert}")
            if row.get("presupuesto", "").strip() not in BUDGET_STATES:
                findings.add("operacion", SLOS_DOC, "presupuesto fuera del vocabulario", f"{name}: {row.get('presupuesto', '').strip() or '(vacío)'}")
        if not has_section(headings(text), ("politica de presupuesto",)):
            findings.add("operacion", SLOS_DOC, "sin sección 'Política de presupuesto de error'")
    elif deployed:
        findings.add("operacion", SLOS_DOC, "servicio desplegado sin slos.md")

    for path in runbooks:
        checked += 1
        text = read(os.path.join(root, path))
        fm = frontmatter(text)
        if fm is None:
            findings.add("operacion", path, "sin frontmatter")
            continue
        rb_id = RUNBOOK_FILE.match(os.path.basename(path)).group(1)
        if fm.get("document") != "runbook":
            findings.add("operacion", path, "document distinto de 'runbook'", fm.get("document", "(ausente)"))
        if fm.get("id") != rb_id:
            findings.add("operacion", path, "id ausente o distinto del nombre de archivo", fm.get("id", "(ausente)"))
        if fm.get("severity") not in SEVERITIES:
            findings.add("operacion", path, "severity fuera del vocabulario", fm.get("severity", "(ausente)"))
        if not fm.get("alert", "").strip():
            findings.add("operacion", path, "runbook sin alerta asociada")
        found = headings(text)
        for label, options in RUNBOOK_SECTIONS.items():
            if not has_section(found, options):
                findings.add("operacion", path, f"sin sección '{label}'")
        if not any(d.get("type") in ("alerta", "runbook") and d.get("target", "").strip() == rb_id for d in successful):
            findings.add("operacion", path, "runbook nunca ensayado con éxito")

    backup_path = os.path.join(root, BACKUP_DOC)
    if os.path.isfile(backup_path):
        checked += 1
        text = read(backup_path)
        fm = frontmatter(text) or {}
        if fm.get("document") != "backup_recovery":
            findings.add("operacion", BACKUP_DOC, "document distinto de 'backup_recovery'", fm.get("document", "(ausente)"))
        rto = duration_minutes(fm.get("rto", ""))
        for field in ("rpo", "rto"):
            if duration_minutes(fm.get(field, "")) is None:
                findings.add("operacion", BACKUP_DOC, f"{field} no es un número con unidad (s, min, h, d)", fm.get(field, "(ausente)"))
        found = headings(text)
        for label, options in BACKUP_SECTIONS.items():
            if not has_section(found, options):
                findings.add("operacion", BACKUP_DOC, f"sin sección '{label}'")
        restores = sorted((d for d in successful if d.get("type") == "restauracion"), key=lambda d: d["executed_on"])
        if not restores:
            findings.add("operacion", BACKUP_DOC, "backup sin simulacro de restauración exitoso")
        else:
            latest = restores[-1]
            if today and today - date.fromisoformat(latest["executed_on"]) > timedelta(days=RESTORE_DRILL_MAX_AGE_DAYS):
                findings.add("operacion", BACKUP_DOC, f"último simulacro de restauración exitoso hace más de {RESTORE_DRILL_MAX_AGE_DAYS} días",
                             latest["executed_on"])
            measured = duration_minutes(latest.get("measured_rto", ""))
            if rto is not None and measured is not None and measured > rto:
                findings.add("operacion", BACKUP_DOC, "restauración más lenta que el RTO", f"{latest.get('measured_rto')} > {fm.get('rto')}")
    elif deployed:
        findings.add("operacion", BACKUP_DOC, "servicio desplegado sin backup_and_recovery.md")
    return checked


def operations_finding_in_scope(root, item, scope, releases_in_scope):
    """Con --changed, un hallazgo de operación solo cuenta si toca lo cambiado: su propio archivo, el
    simulacro cambiado que lo verifica (runbook o backup), o el release cambiado que exige slos y backup."""
    _, path, kind, _ = item
    if path in scope:
        return True
    changed_drills = []
    for changed in scope:
        match = DRILL_FILE.match(os.path.basename(changed)) if changed.startswith(DRILLS_DIR + "/") else None
        evidence = re.match(rf"^{re.escape(DRILLS_DIR)}/evidence/(DRILL-\d+)/", changed)
        drill_id = match.group(1) if match else (evidence.group(1) if evidence else None)
        if drill_id:
            paths = list_top_level(root, DRILLS_DIR, re.compile(rf"^{drill_id}\b.*\.md$"))
            changed_drills.extend(frontmatter(read(os.path.join(root, p))) or {} for p in paths)
    runbook = RUNBOOK_FILE.match(os.path.basename(path)) if path.startswith(RUNBOOKS_DIR + "/") else None
    if runbook and any(d.get("target", "").strip() == runbook.group(1) for d in changed_drills):
        return True
    if path == BACKUP_DOC and any(d.get("type") == "restauracion" for d in changed_drills):
        return True
    return releases_in_scope and path in (SLOS_DOC, BACKUP_DOC) and "desplegado" in kind


# ------------------------------------------------- gates: mantenimiento y retirada

def check_maintenance(root, path, ticket_ids, findings):
    text = read(os.path.join(root, path))
    fm = frontmatter(text)
    if fm is None:
        findings.add("mantenimiento", path, "sin frontmatter")
        return None
    review_id = MAINTENANCE_FILE.match(os.path.basename(path)).group(1)
    if fm.get("document") != "maintenance_review":
        findings.add("mantenimiento", path, "document distinto de 'maintenance_review'", fm.get("document", "(ausente)"))
    if fm.get("id") != review_id:
        findings.add("mantenimiento", path, "id ausente o distinto del nombre de archivo", fm.get("id", "(ausente)"))
    if fm.get("status") not in MAINTENANCE_STATUS:
        findings.add("mantenimiento", path, "status fuera del vocabulario", fm.get("status", "(ausente)"))
    if not ISO_DATE.match(fm.get("reviewed_on", "")):
        findings.add("mantenimiento", path, "reviewed_on no es AAAA-MM-DD", fm.get("reviewed_on", "(ausente)"))
    found = headings(text)
    for label, options in MAINTENANCE_SECTIONS.items():
        if not has_section(found, options):
            findings.add("mantenimiento", path, f"sin sección '{label}'")
    if fm.get("status") == "closed":
        lines = section_lines(text, ("hallazgos",))
        items = bullets(lines)
        if not items and not " ".join(l.strip() for l in lines).lower().startswith("sin hallazgos"):
            findings.add("mantenimiento", path, "revisión cerrada sin hallazgos trazados ni 'Sin hallazgos.'")
        for problem, detail in untraced_items(items, ticket_ids):
            kind = "hallazgo apunta a un ticket que no existe" if problem == "missing" else "hallazgo sin ticket ni 'sin acción — motivo'"
            findings.add("mantenimiento", path, kind, detail)
    return fm


def first_deployment_date(root):
    """Fecha del primer despliegue registrado, o None si ninguno declara deployed_at válido."""
    dates = []
    for path in list_top_level(root, RELEASES_DIR, RELEASE_FILE):
        fm = frontmatter(read(os.path.join(root, path))) or {}
        if fm.get("status") in ("deployed", "rolled_back") and ISO_DATETIME.match(fm.get("deployed_at", "")):
            dates.append(date.fromisoformat(fm["deployed_at"][:10]))
    return min(dates) if dates else None


def check_maintenance_cadence(findings, reviews, deployed, today, first_deployed=None):
    if not deployed:
        return
    closed = sorted(fm["reviewed_on"] for fm in reviews if fm.get("status") == "closed" and ISO_DATE.match(fm.get("reviewed_on", "")))
    if not closed and first_deployed and today:
        # La primera revisión vence 30 días después del primer despliegue, no el mismo día (workflow 11).
        if (today - first_deployed).days > MAINTENANCE_CADENCE_DAYS:
            findings.add("mantenimiento", MAINTENANCE_DIR,
                         f"servicio desplegado hace más de {MAINTENANCE_CADENCE_DAYS} días sin revisión de mantenimiento",
                         f"primer despliegue el {first_deployed.isoformat()}")
    elif not closed:
        findings.add("mantenimiento", MAINTENANCE_DIR, "servicio desplegado sin revisión de mantenimiento")
    elif today and (today - date.fromisoformat(closed[-1])).days > MAINTENANCE_CADENCE_DAYS:
        findings.add("mantenimiento", MAINTENANCE_DIR, f"revisión de mantenimiento vencida (más de {MAINTENANCE_CADENCE_DAYS} días)",
                     f"última cerrada el {closed[-1]}")


def check_retirement(root, path, stories, tickets, outcome_ids, findings, today=None):
    text = read(os.path.join(root, path))
    fm = frontmatter(text)
    if fm is None:
        findings.add("retirada", path, "sin frontmatter")
        return
    ret_id = RETIREMENT_FILE.match(os.path.basename(path)).group(1)
    status = fm.get("status")
    if fm.get("document") != "retirement":
        findings.add("retirada", path, "document distinto de 'retirement'", fm.get("document", "(ausente)"))
    if fm.get("id") != ret_id:
        findings.add("retirada", path, "id ausente o distinto del nombre de archivo", fm.get("id", "(ausente)"))
    if status not in RETIREMENT_STATUS:
        findings.add("retirada", path, "status fuera del vocabulario", status or "(ausente)")
    reason = fm.get("reason", "").strip()
    if not reason:
        findings.add("retirada", path, "retirada sin motivo")
    for outcome in OUTCOME_ID.findall(reason):
        if outcome not in outcome_ids:
            findings.add("retirada", path, "reason apunta a un informe de resultados que no existe", outcome)
    retention = fm.get("data_retention_until", "").strip()
    if retention != "no_aplica" and not ISO_DATE.match(retention):
        findings.add("retirada", path, "data_retention_until no es AAAA-MM-DD ni no_aplica", retention or "(ausente)")
    found = headings(text)
    for label, options in RETIREMENT_SECTIONS.items():
        if not has_section(found, options):
            findings.add("retirada", path, f"sin sección '{label}'")

    retired = [sid for line in bullets(section_lines(text, ("historias retiradas",))) for sid in STORY_ID.findall(line)]
    removals = [tid for line in bullets(section_lines(text, ("tickets de eliminacion",))) for tid in TICKET_ID.findall(line)]
    if status != "cancelled":
        if not retired:
            findings.add("retirada", path, "retirada sin historias retiradas")
        if not removals:
            findings.add("retirada", path, "retirada sin tickets de eliminación")
    for story in retired:
        if story not in stories:
            findings.add("retirada", path, "historia retirada que no existe", story)
    for ticket in removals:
        if ticket not in tickets:
            findings.add("retirada", path, "ticket de eliminación que no existe", ticket)

    announced = fm.get("announced_on", "")
    if status in ("announced", "completed") and not ISO_DATE.match(announced):
        findings.add("retirada", path, "retirada anunciada sin announced_on", announced or "(ausente)")
    if status == "completed":
        completed = fm.get("completed_on", "")
        if not ISO_DATE.match(completed):
            findings.add("retirada", path, "retirada completada sin completed_on", completed or "(ausente)")
        elif ISO_DATE.match(announced) and (date.fromisoformat(completed) - date.fromisoformat(announced)).days < RETIREMENT_NOTICE_DAYS:
            findings.add("retirada", path, f"aviso con menos de {RETIREMENT_NOTICE_DAYS} días de antelación", f"{announced} → {completed}")
        for ticket in removals:
            if ticket in tickets and tickets[ticket].get("status") != "done":
                findings.add("retirada", path, "ticket de eliminación sin cerrar", f"{ticket}: {tickets[ticket].get('status')}")
        for story in retired:
            if story in stories and stories[story].get("retired_by") != ret_id:
                findings.add("retirada", path, f"historia retirada sin retired_by: {ret_id}", story)
    if (status != "cancelled" and ISO_DATE.match(retention) and today and today > date.fromisoformat(retention)
            and not ISO_DATE.match(fm.get("data_disposed_on", ""))):
        findings.add("retirada", path, "retención vencida sin registrar la anonimización o eliminación de los datos", retention)


# --------------------------------------------------------- gate: postmortem

def check_postmortem(root, path, ticket_ids, findings, today=None):
    text = read(os.path.join(root, path))
    fm = frontmatter(text)
    if fm is None:
        findings.add("postmortem", path, "sin frontmatter")
        return
    file_id = POSTMORTEM_FILE.match(os.path.basename(path)).group(1)
    if fm.get("document") != "postmortem":
        findings.add("postmortem", path, "document distinto de 'postmortem'", fm.get("document", "(ausente)"))
    if fm.get("id") != file_id:
        findings.add("postmortem", path, "id ausente o distinto del nombre de archivo", fm.get("id", "(ausente)"))
    if not SEMVER.match(fm.get("version", "")):
        findings.add("postmortem", path, "version ausente o no es X.Y.Z", fm.get("version", "(ausente)"))
    for field, allowed in (("status", POSTMORTEM_STATUS), ("severity", SEVERITIES)):
        if fm.get(field) not in allowed:
            findings.add("postmortem", path, f"{field} fuera del vocabulario", fm.get(field, "(ausente)"))
    moments = {}
    for field in ("detected_at", "resolved_at"):
        value = fm.get(field, "")
        if ISO_DATETIME.match(value):
            moments[field] = datetime.fromisoformat(value.replace("Z", "+00:00"))
        else:
            findings.add("postmortem", path, f"{field} no es fecha y hora ISO 8601 con zona", value or "(ausente)")
    if len(moments) == 2 and moments["resolved_at"] < moments["detected_at"]:
        findings.add("postmortem", path, "resolved_at anterior a detected_at")

    found = headings(text)
    for label, options in POSTMORTEM_SECTIONS.items():
        if not has_section(found, options):
            findings.add("postmortem", path, f"sin sección '{label}'")
    if has_section(found, POSTMORTEM_SECTIONS["Línea de tiempo"]):
        timed = [l for l in section_lines(text, POSTMORTEM_SECTIONS["Línea de tiempo"]) if CLOCK_TIME.search(l)]
        if len(timed) < 2:
            findings.add("postmortem", path, "línea de tiempo con menos de 2 hitos con hora")
    if has_section(found, POSTMORTEM_SECTIONS["Por qué ningún gate lo detectó"]):
        body = " ".join(l.strip() for l in section_lines(text, POSTMORTEM_SECTIONS["Por qué ningún gate lo detectó"]))
        if len(body) < 20:
            findings.add("postmortem", path, "análisis de gates vacío")

    if fm.get("status") == "closed":
        actions = [l.strip()[2:] for l in section_lines(text, POSTMORTEM_SECTIONS["Acciones"]) if l.strip().startswith(("- ", "* "))]
        if not actions:
            findings.add("postmortem", path, "postmortem cerrado sin acciones")
        for problem, detail in untraced_items(actions, ticket_ids):
            kind = "acción apunta a un ticket que no existe" if problem == "missing" else "acción sin ticket ni 'sin acción — motivo'"
            findings.add("postmortem", path, kind, detail)
    elif (fm.get("severity") in MANDATORY_SEVERITIES and today and "resolved_at" in moments
          and today > moments["resolved_at"].date() + timedelta(days=POSTMORTEM_DEADLINE_DAYS)):
        findings.add("postmortem", path, f"postmortem obligatorio sin cerrar pasados {POSTMORTEM_DEADLINE_DAYS} días de la resolución",
                     f"resuelto el {moments['resolved_at'].date()}")


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
        # Spec antes que código: una remediación técnica se traza a su auditoría (AUDIT-XXX) o a un N/A justificado.
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


def check_adr(root, path, story_ids, ticket_ids, findings, today=None):
    text = read(os.path.join(root, path))
    fm = frontmatter(text) or {}
    if norm(fm.get("status", "")) != "accepted":
        return
    line = next((l for l in text.splitlines() if "implementado por" in norm(l)), "")
    references = STORY_ID.findall(line) + TICKET_ID.findall(line)
    decided = fm.get("date", "").strip()
    if not references and "pendiente de cascada" in norm(line) and ISO_DATE.match(decided) and today:
        # SK-36 admite "pendiente de cascada" durante un plazo: el ADR suele preceder a sus tickets.
        if (today - date.fromisoformat(decided)).days > ADR_PENDING_DAYS:
            findings.add("trazabilidad", path, f"ADR aceptado pendiente de cascada hace más de {ADR_PENDING_DAYS} días", decided)
    elif not references:
        findings.add("trazabilidad", path, "ADR aceptado huérfano: 'Implementado por' no nombra historias ni tickets")
    for ref in references:
        if ref not in story_ids and ref not in ticket_ids:
            findings.add("trazabilidad", path, "ADR aceptado apunta a un artefacto que no existe", ref)


def check_invariants(root, story_and_ticket_paths, findings):
    """Toda invariante INV-NN del glosario la cita alguna historia o ticket (SK-01, SK-11, SK-12)."""
    text = read(os.path.join(root, GLOSSARY))
    declared = sorted(set(INVARIANT_ID.findall(text)), key=lambda i: int(i.split("-")[1]))
    if not declared:
        if any("invariante" in norm(h) for h in headings(text)) or "invariante" in norm(text):
            findings.add("trazabilidad", GLOSSARY, "invariantes sin identificador INV-NN: no se pueden trazar")
        return
    cited = set()
    for path in story_and_ticket_paths:
        cited.update(INVARIANT_ID.findall(read(os.path.join(root, path))))
    for invariant in declared:
        if invariant not in cited:
            findings.add("trazabilidad", GLOSSARY, "invariante que ninguna historia ni ticket cita", invariant)


def check_operations_mechanisms(root, findings):
    """Con releases registrados, el manifest declara cómo se despliega, se vuelve atrás, se vigila y se respalda."""
    if not os.path.isfile(os.path.join(root, STACK_MANIFEST)):
        findings.add("release", STACK_MANIFEST, "release registrado sin docs/00_stack_manifest.md")
        return
    rows = [table_cells(row) for table in markdown_tables(read(os.path.join(root, STACK_MANIFEST))) for row in table_rows(table)]
    for name, words in OPERATIONS_MECHANISMS:
        matching = [cells for cells in rows if cells and any(w in norm(cells[0]) for w in words)]
        if not matching:
            findings.add("release", STACK_MANIFEST, "mecanismo de operación sin declarar en el stack manifest", name)
        elif all("pendiente de decidir" in norm(" ".join(cells[1:])) for cells in matching):
            findings.add("release", STACK_MANIFEST, "mecanismo de operación pendiente de decidir en el stack manifest", name)


# ------------------------------------------------------------------ runner

def git_tags(root):
    out = subprocess.run(["git", "tag", "--list"], cwd=root, capture_output=True, text=True)
    if out.returncode != 0:
        raise RuntimeError(f"no se pudo listar las etiquetas git: {out.stderr.strip()}")
    return {line.strip() for line in out.stdout.splitlines() if line.strip()}


def changed_files(root):
    commands = (["git", "diff", "--name-only", "HEAD"], ["git", "ls-files", "--others", "--exclude-standard"])
    result = set()
    for cmd in commands:
        out = subprocess.run(cmd, cwd=root, capture_output=True, text=True)
        if out.returncode != 0:
            raise RuntimeError(f"no se pudo ejecutar {' '.join(cmd)}: {out.stderr.strip()}")
        result.update(line.strip() for line in out.stdout.splitlines() if line.strip())
    return result


def run_checks(root, scope=None, ticket=None, today=None, tags=None):
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
            findings.add("ready", ticket, "el ticket no existe: primero la cascada de spec")
            return findings, 0
        for path in matches:
            check_ticket(root, path, story_ids, findings)
            check_matrix_membership(path, ticket, linked, matrix_text, findings)
        return findings, len(matches)

    def in_scope(path):
        return scope is None or path in scope

    measured = measured_kpi_names(root)
    for doc in KPI_DOCS:
        if os.path.isfile(os.path.join(root, doc)) and in_scope(doc):
            check_kpis(root, doc, findings, today, measured)
            checked += 1
    for path in list_top_level(root, OUTCOMES_DIR, OUTCOME_FILE):
        data_prefix = f"{OUTCOMES_DIR}/data/{OUTCOME_FILE.match(os.path.basename(path)).group(1)}/"
        if in_scope(path) or (scope is not None and any(s.startswith(data_prefix) for s in scope)):
            check_outcome(root, path, findings)
            checked += 1
    for path in list_top_level(root, POSTMORTEMS_DIR, POSTMORTEM_FILE):
        if in_scope(path):
            check_postmortem(root, path, ticket_ids, findings, today)
            checked += 1
    releases = release_statuses(root)
    ticket_info = {ticket_id(p): frontmatter(read(os.path.join(root, p))) or {} for p in tickets}
    exhausted = error_budget_exhausted(root)
    for path in list_top_level(root, RELEASES_DIR, RELEASE_FILE):
        if in_scope(path):
            check_release(root, path, ticket_info, releases, findings, tags, exhausted)
            checked += 1
    deployed_any = any(status in ("deployed", "rolled_back") for status in releases.values())
    reviews = []
    for path in list_top_level(root, MAINTENANCE_DIR, MAINTENANCE_FILE):
        if in_scope(path):
            fm = check_maintenance(root, path, ticket_ids, findings)
            checked += 1
        else:
            fm = frontmatter(read(os.path.join(root, path)))
        if fm:
            reviews.append(fm)
    if scope is None or any(s.startswith(MAINTENANCE_DIR + "/") for s in scope):
        check_maintenance_cadence(findings, reviews, deployed_any, today, first_deployment_date(root))
    story_info = {story_id(p): frontmatter(read(os.path.join(root, p))) or {} for p in stories}
    outcome_ids = {OUTCOME_FILE.match(os.path.basename(p)).group(1) for p in list_top_level(root, OUTCOMES_DIR, OUTCOME_FILE)}
    retirement_paths = list_top_level(root, RETIREMENTS_DIR, RETIREMENT_FILE)
    retirement_ids = {RETIREMENT_FILE.match(os.path.basename(p)).group(1) for p in retirement_paths}
    for path in retirement_paths:
        if in_scope(path):
            check_retirement(root, path, story_info, ticket_info, outcome_ids, findings, today)
            checked += 1
    for path in stories:
        retired_by = story_info[story_id(path)].get("retired_by", "")
        if retired_by and in_scope(path) and not any(r in retirement_ids for r in RETIREMENT_ID.findall(retired_by)):
            findings.add("retirada", path, "retired_by apunta a una retirada que no existe", retired_by)
    ops_prefixes = (SLOS_DOC, BACKUP_DOC, RUNBOOKS_DIR + "/", DRILLS_DIR + "/")
    releases_in_scope = scope is not None and any(s.startswith(RELEASES_DIR + "/") for s in scope)
    if scope is None or releases_in_scope or any(s.startswith(ops_prefixes) for s in scope):
        deployed = any(status in ("deployed", "rolled_back") for status in releases.values())
        ops_findings = Findings()
        ops_checked = check_operations(root, ops_findings, deployed, today)
        # Un release cambiado solo consulta la operación de la que depende: no la cuenta como revisada.
        if scope is None or any(s.startswith(ops_prefixes) for s in scope):
            checked += ops_checked
        for item in ops_findings.items:
            if scope is None or operations_finding_in_scope(root, item, scope, releases_in_scope):
                findings.items.append(item)
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
            check_adr(root, path, story_ids, ticket_ids, findings, today)
            checked += 1
    if os.path.isfile(os.path.join(root, GLOSSARY)) and in_scope(GLOSSARY):
        check_invariants(root, stories + tickets, findings)
        checked += 1
    release_paths = list_top_level(root, RELEASES_DIR, RELEASE_FILE)
    if release_paths and (scope is None or STACK_MANIFEST in scope or any(p in scope for p in release_paths)):
        check_operations_mechanisms(root, findings)
    if in_scope(MATRIX):
        for target in broken:
            findings.add("trazabilidad", MATRIX, "enlace roto en la matriz", target)
        checked += 1 if linked is not None else 0

    return findings, checked


def iso_date(value):
    try:
        return date.fromisoformat(value)
    except ValueError as err:
        raise argparse.ArgumentTypeError(f"fecha no válida, usa AAAA-MM-DD: {value}") from err


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description="Gates deterministas de especificación de momoy.")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--changed", action="store_true", help="solo artefactos modificados o nuevos (bloquea)")
    group.add_argument("--ticket", metavar="TK-XXX", help="Definition of Ready de un ticket (bloquea)")
    parser.add_argument("--strict", action="store_true", help="en el informe completo, falla si hay hallazgos")
    parser.add_argument("--verbose", action="store_true", help="lista cada hallazgo del informe completo")
    parser.add_argument("--today", type=iso_date, metavar="AAAA-MM-DD",
                        help="evalúa los plazos como si hoy fuera esta fecha (simulacros, auditorías retroactivas)")
    return parser.parse_args(argv)


def main():
    args = parse_args()

    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    scope = changed_files(root) if args.changed else None
    today = args.today or date.today()
    findings, checked = run_checks(root, scope=scope, ticket=args.ticket, today=today, tags=git_tags(root))
    blocking = args.changed or args.ticket is not None or args.strict
    marker = "❌" if blocking else "⚠️"

    if blocking or args.verbose:
        for gate, path, kind, detail in findings.items:
            print(f"{marker} [{gate}] {path}: {kind}" + (f" — {detail}" if detail else ""))
    else:
        by_gate = Counter(gate for gate, *_ in findings.items)
        by_kind = Counter((gate, kind) for gate, _, kind, _ in findings.items)
        for gate in ("kpi", "resultado", "experimento", "historia", "ready", "trazabilidad", "release", "operacion", "mantenimiento", "retirada", "postmortem"):
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
