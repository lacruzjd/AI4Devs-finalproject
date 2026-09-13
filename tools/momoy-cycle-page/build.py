#!/usr/bin/env python3
"""Genera la página «Ciclo completo de momoy»: matriz de 6 condiciones × 12 etapas e historial de versiones.

Los datos (STAGES, EVOLUTION, WAVES) se actualizan a mano tras cada ola, con evidencia en .agents/ o en una
ejecución real. Uso: python3 tools/momoy-cycle-page/build.py [salida.html]  (por defecto dist/ciclo-momoy.html,
ignorado por git).
"""
import math
import pathlib
import sys

OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(__file__).parent / "dist" / "ciclo-momoy.html"

VERSION = "2.22.0"
MEASURED = "13 sep 2026"

PHASES = {
    "discover": ("Descubrir", "¿Estamos construyendo lo correcto?"),
    "deliver": ("Entregar", "¿Lo estamos construyendo correctamente?"),
    "operate": ("Operar y aprender", "¿Funcionó y sigue funcionando?"),
}
CRITERIA = [
    ("proc", "Procedimiento", "Un workflow o skill dice cómo trabajar la etapa."),
    ("art", "Artefacto", "Deja un documento versionado en docs/."),
    ("gate", "Gate", "Algo verifica el resultado: un script si la propiedad es mecánica, revisión adversarial si es juicio."),
    ("hitl", "Pausa humana", "Las decisiones de la etapa las confirma una persona."),
    ("cmd", "Comando", "Se puede lanzar con un comando /momoy-*."),
    ("real", "Probado en real", "Se ejecutó sobre un proyecto de verdad, no solo se escribió."),
]
MARK = {2: ("●", "cumple"), 1: ("◐", "parcial"), 0: ("○", "no")}
LEVELS = {"strong": "Fuerte", "near": "Casi", "partial": "Parcial", "missing": "Ausente"}


def level(scores):
    total = sum(scores.values()) / 2
    if total >= 6:
        return "strong"
    if total >= 5:
        return "near"
    if total >= 2:
        return "partial"
    return "missing"


def S(proc, art, gate, hitl, cmd, real):
    return dict(proc=proc, art=art, gate=gate, hitl=hitl, cmd=cmd, real=real)


STAGES = [
    dict(n=1, short="Problema", title="Problema y oportunidad", phase="discover",
         q="¿Qué problema existe, para quién y cuánto duele?",
         now=S(2, 2, 2, 2, 2, 1), before=S(2, 2, 1, 2, 2, 2),
         today="<code>SK-01</code> y <code>SK-02</code> exigen los KPIs en una tabla de 6 columnas (fuente de datos, línea base, umbral, ventana, fecha de revisión) y el gate <code>kpi</code> lo verifica.",
         todo=["Estrenar la plantilla nueva en un artefacto real: los KPIs de RestoStock siguen en prosa, así que el gate está probado pero la tabla todavía no.",
               "Matriz obligatoria de los cuatro riesgos (valor, usabilidad, factibilidad, viabilidad) por capacidad."],
         cmds="/momoy-greenfield · /momoy-brownfield · /momoy-spec"),
    dict(n=2, short="Validación", title="Validación de la idea", phase="discover",
         q="¿Hay evidencia de que la idea funciona antes de especificarla?",
         now=S(2, 2, 2, 2, 2, 0), before=S(1, 0, 0, 0, 0, 0),
         today="<code>SK-37</code> diseña el experimento más barato con el criterio de éxito fijado antes y registra la evidencia real anonimizada; el humano decide. El gate <code>experimento</code> lo verifica, toda historia abierta declara <code>value_risk</code> y <code>validation</code>, y el workflow 01 se detiene ante una capacidad de riesgo alto sin experimento.",
         todo=["Probarlo en real: diseñar, ejecutar con usuarios reales y concluir un primer experimento con evidencia en el repo. Ningún gate puede sustituir ese paso."],
         cmds="/momoy-experiment · /momoy-spec (fase 1.5)"),
    dict(n=3, short="Requisitos", title="Especificación de requisitos", phase="discover",
         q="¿Qué debe hacer el sistema, sin decir cómo?",
         now=S(2, 2, 2, 2, 2, 2), before=S(2, 2, 1, 2, 2, 2),
         today="<code>SK-02</code>, <code>SK-11</code> y Guard 28. El gate <code>historia</code> verifica frontmatter, estado cerrado, al menos 3 escenarios Given/When/Then, precondiciones y NFRs; en RestoStock encontró 114 hallazgos reales. Desde 2.22.0 exige también que cada historia abierta declare su riesgo de valor y su validación.",
         todo=["Refuerzo: enlazar cada requisito no funcional medible con el SLI que lo vigilará en producción (etapa 9)."],
         cmds="/momoy-spec · /momoy-audit-spec"),
    dict(n=4, short="Diseño", title="Diseño y arquitectura", phase="deliver",
         q="¿Cómo se construye a alto nivel, y por qué así?",
         now=S(2, 2, 2, 2, 2, 2), before=S(2, 2, 1, 2, 2, 2),
         today="<code>SK-03</code> a <code>SK-08</code> y <code>SK-36</code>. Gates de drift de esquema, contrato y migraciones, más el gate <code>trazabilidad</code> sobre ADRs aceptados. <code>/momoy-adr</code> registra decisiones con tres opciones y elección humana.",
         todo=["Refuerzo: modelado de amenazas (STRIDE) obligatorio cuando la capacidad toca datos personales o autenticación.",
               "Refuerzo: diseñar para operar, declarando qué métricas y logs emite cada componente."],
         cmds="/momoy-spec · /momoy-adr"),
    dict(n=5, short="Planificación", title="Planificación", phase="deliver",
         q="¿En qué piezas pequeñas se divide y en qué orden?",
         now=S(2, 2, 2, 2, 2, 2), before=S(2, 2, 1, 2, 2, 2),
         today="<code>SK-12</code> a <code>SK-14</code>. El gate <code>ready</code> es la Definition of Ready y bloquea <code>/momoy-dev</code> si el ticket no está listo; el workflow 01 ahora sí actualiza la matriz de trazabilidad.",
         todo=["Refuerzo: todo ticket que introduce un feature flag nace con su ticket gemelo de retirada."],
         cmds="/momoy-spec · /momoy-dev (Definition of Ready)"),
    dict(n=6, short="Construcción", title="Construcción", phase="deliver",
         q="¿El código implementa la especificación, y solo eso?",
         now=S(2, 2, 2, 2, 2, 2), before=S(2, 2, 2, 2, 2, 2),
         today="<code>SK-16</code> a <code>SK-19</code>, workflow 02, TDD estricto, commit atómico por ticket y gates acotados al diff. <code>SK-24</code> congela código legado con pausa humana antes de refactorizar.",
         todo=["Nada pendiente para ser fuerte."],
         cmds="/momoy-dev · /momoy-characterize"),
    dict(n=7, short="Verificación", title="Verificación", phase="deliver",
         q="¿Hay evidencia de que funciona y de que los tests detectan fallos?",
         now=S(2, 2, 2, 2, 2, 2), before=S(2, 2, 2, 2, 2, 2),
         today="<code>SK-09</code>, <code>SK-20</code>, <code>SK-21</code>, <code>SK-24</code>, <code>SK-25</code>, <code>SK-29</code>, <code>SK-32</code>, <code>SK-34</code>; workflows 04, 05, 06 y 09; mutation score ≥ 70%. <code>SK-25</code> ya está cableada en las auditorías 04 y 06.",
         todo=["Refuerzo: pruebas de operación como pruebas de primera clase (una alerta dispara, un backup se restaura)."],
         cmds="/momoy-audit-dev · /momoy-tdd · /momoy-qa · /momoy-verify-live"),
    dict(n=8, short="Release", title="Release y despliegue", phase="deliver",
         q="¿Cómo llega a producción sin riesgo, y cómo se deshace?",
         now=S(1, 1, 1, 1, 1, 1), before=S(1, 1, 1, 1, 1, 1),
         today="<code>SK-10</code> (CI/CD), <code>SK-06</code> (migraciones sin tiempo de inactividad), workflow 08 (smoke test y rollback) y <code>SK-23</code>; gates generados de contenedores, dependencias e IaC. RestoStock está desplegado en Render.",
         todo=["Workflow y comando <code>/momoy-release</code>: estrategia de liberación por ticket (flag, canary o todo a la vez justificado).",
               "Rollback ensayado en staging, migraciones expand-contract verificadas y notas de versión en lenguaje de usuario."],
         cmds="/momoy-smoke · /momoy-deps · (ola 2) /momoy-release"),
    dict(n=9, short="Operación", title="Operación y observabilidad", phase="operate",
         q="¿Sabemos que funciona antes de que un usuario nos avise?",
         now=S(0, 0, 0, 0, 0, 0), before=S(0, 0, 0, 0, 0, 0),
         today="Nada: cero SLO, SLI, presupuesto de error, backups, runbooks o costes en momoy.",
         todo=["Workflow y comando <code>/momoy-operate</code>: SLI y SLO derivados de los NFRs, presupuesto de error con política escrita.",
               "Alertas como código sobre síntomas, cada una con su runbook; simulacro real de restauración de backup; presupuesto de coste."],
         cmds="(ola 3) /momoy-operate"),
    dict(n=10, short="Incidentes", title="Incidentes y postmortems", phase="operate",
         q="Cuando algo falla, ¿qué aprende el sistema para que no se repita?",
         now=S(1, 1, 0, 2, 1, 0), before=S(1, 1, 0, 2, 1, 0),
         today="Workflow 07 y <code>/momoy-incident</code>: la incidencia se convierte en escenario BDD, test de regresión en borrador con checkpoint humano y ticket. No hay postmortems.",
         todo=["Workflow y comando <code>/momoy-postmortem</code>: línea de tiempo, impacto contra el SLO y causas del sistema, no de personas.",
               "Pregunta obligatoria «¿por qué ningún gate lo detectó?», con las lecciones sistémicas convertidas en reglas permanentes."],
         cmds="/momoy-incident · (ola 1) /momoy-postmortem"),
    dict(n=11, short="Resultados", title="Medición de resultados", phase="operate",
         q="¿Se cumplió lo que prometimos en la etapa 1?",
         now=S(0, 0, 0, 0, 0, 0), before=S(0, 0, 0, 0, 0, 0),
         today="Nada. Desde la ola 0 los KPIs ya son medibles —tienen fuente y fecha de revisión—, pero nada los mide tras el lanzamiento: el ciclo sigue sin cerrarse.",
         todo=["Workflow y comando <code>/momoy-outcomes</code>: en la fecha de revisión, veredicto por hipótesis (validada, refutada o no concluyente, con tamaño de muestra).",
               "Recomendación explícita: iterar, pivotar o retirar; un KPI sin datos se reporta como no medible, nunca como cumplido."],
         cmds="(ola 1) /momoy-outcomes"),
    dict(n=12, short="Mantenimiento", title="Mantenimiento y retirada", phase="operate",
         q="¿Cómo envejece bien, y cómo se apaga lo que ya no sirve?",
         now=S(1, 1, 1, 1, 1, 1), before=S(1, 1, 1, 1, 1, 1),
         today="<code>SK-19</code>, <code>SK-23</code> (<code>/momoy-deps</code>), <code>SK-30</code>, <code>SK-31</code> y <code>SK-24</code> (<code>/momoy-characterize</code>). Nada sobre retirar funciones.",
         todo=["Comando <code>/momoy-maintain</code> con cadencia e informe de dependencias, deuda y vulnerabilidades.",
               "<code>/momoy-retire</code>: retirada como cascada inversa, respetando la retención legal de datos."],
         cmds="/momoy-deps · /momoy-characterize · (ola 4) /momoy-maintain · /momoy-retire"),
]
for s in STAGES:
    s["cov"] = level(s["now"])
    s["cov_before"] = level(s["before"])

EVOLUTION = [
    ("2.15.0", "Punto de partida", "«.agents / VSDD Governance Framework»: 36 skills y 12 workflows, invocados con prompts @workflow copiados a mano.", "0", "22"),
    ("2.16.0", "Nace momoy", "Nombre y subtítulo propios; fuera el eslogan y el vínculo con el programa de origen; se corrigen tres afirmaciones que no se sostenían.", "0", "22"),
    ("2.17.0", "Sin emojis decorativos", "De 647 emojis quedan solo 8 marcadores semánticos; un check impide que vuelvan.", "0", "35"),
    ("2.18.0", "Comandos", "13 comandos /momoy-* como Agent Skills, descubribles por Antigravity, Codex, Gemini CLI y Claude Code.", "13", "56"),
    ("2.19.0", "Filtro de comandos", "17 candidatos pasan un filtro de cuatro preguntas: entran 4, se descartan 5 y SK-25 se cablea en vez de ser comando.", "17", "59"),
    ("2.20.0", "Ola 0: gates de especificación", "Problema, requisitos y planificación pasan a verificarse con un script; 384 hallazgos reales en RestoStock y tres causas raíz corregidas en momoy.", "17", "77"),
    ("2.21.0", "Pulido", "Comandos delgados verificados por el check; fuera duplicaciones, una referencia rota y código muerto.", "17", "80"),
    ("2.22.0", "Etapa 2: validación", "SK-37 y /momoy-experiment: experimentos con criterio fijado antes, evidencia anonimizada y decisión humana; toda historia abierta declara su validación. Primer cambio de momoy escrito con TDD.", "18", "93"),
]

WAVES = [
    ("Ola 0", "Verificar lo que ya existe", "Etapas 1, 3, 4 y 5", "done", "Hecha en 2.20.0: gates kpi, historia, ready y trazabilidad."),
    ("Ola 1", "Cerrar el ciclo", "Etapas 11 y 10", "next", "/momoy-outcomes y /momoy-postmortem. Solo documentos y bajo riesgo."),
    ("Ola 2", "Liberar con seguridad", "Etapa 8", "todo", "/momoy-release con rollback ensayado en Render."),
    ("Ola 3", "Operar", "Etapa 9", "todo", "/momoy-operate con simulacro de restauración y alerta que dispara."),
    ("Ola 4", "Completar los bordes", "Etapas 2 y 12", "partial", "Etapa 2 hecha en 2.22.0, salvo probarla en real. Quedan /momoy-maintain y /momoy-retire."),
]

GLOSSARY = [
    ("Discovery / Delivery", "Los dos tipos de trabajo del modelo <em>dual-track</em>: decidir qué construir y construirlo bien."),
    ("Output / Outcome", "Output es lo que entregas; outcome es el cambio que produces en el usuario o el negocio."),
    ("Gate determinista", "Una verificación que ejecuta un script y da siempre el mismo resultado sobre los mismos archivos."),
    ("Definition of Ready", "Lo que un ticket debe cumplir antes de empezar a implementarlo."),
    ("Desplegar / Liberar", "Desplegar pone el código en producción; liberar hace que el usuario lo vea."),
    ("Feature flag", "Interruptor que mantiene una función desplegada pero apagada, o encendida solo para algunos usuarios."),
    ("Expand-contract", "Migración en tres pasos compatibles: añadir lo nuevo, migrar los datos, quitar lo viejo."),
    ("SLI / SLO", "El indicador que mides (porcentaje de peticiones exitosas) y el objetivo que te pones (99,5% en 30 días)."),
    ("Presupuesto de error", "El margen que deja el SLO. Mientras quede, se puede arriesgar; si se agota, manda la estabilidad."),
    ("RPO / RTO", "Cuántos datos puedes perder y cuánto tiempo puedes estar caído tras un desastre."),
    ("Runbook", "Instrucciones paso a paso para responder a una alerta concreta."),
    ("Postmortem sin culpa", "Análisis de un incidente centrado en por qué el sistema lo permitió, no en quién se equivocó."),
]

# ---------------------------------------------------------------- SVG
W, H = 640, 540
CX, CY, R, NR, LR = 320, 270, 186, 17, 226


def pos(i, radius):
    a = math.radians(-90 + (i - 1) * 30)
    return CX + radius * math.cos(a), CY + radius * math.sin(a)


def arc(i0, i1, radius):
    a0 = math.radians(-90 + (i0 - 1) * 30)
    a1 = math.radians(-90 + (i1 - 1) * 30)
    x0, y0 = CX + radius * math.cos(a0), CY + radius * math.sin(a0)
    x1, y1 = CX + radius * math.cos(a1), CY + radius * math.sin(a1)
    large = 1 if (a1 - a0) % (2 * math.pi) > math.pi else 0
    return f"M{x0:.1f} {y0:.1f} A{radius} {radius} 0 {large} 1 {x1:.1f} {y1:.1f}"


counts = {k: sum(1 for s in STAGES if s["cov"] == k) for k in LEVELS}
before = {k: sum(1 for s in STAGES if s["cov_before"] == k) for k in LEVELS}

svg = [f'<svg class="cycle" viewBox="0 0 {W} {H}" role="img" aria-labelledby="cycle-title cycle-desc">',
       '<title id="cycle-title">Ciclo de vida del software en 12 etapas</title>',
       f'<desc id="cycle-desc">Doce etapas en tres fases. Fuertes: {counts["strong"]}; casi fuertes: {counts["near"]}; '
       f'parciales: {counts["partial"]}; ausentes: {counts["missing"]}. El retorno de resultados a problema no se cierra hoy.</desc>',
       '<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
       '<path class="gap-fill" d="M0 0 L10 5 L0 10 z"/></marker></defs>']
for phase, (a, b) in {"discover": (1, 3.5), "deliver": (3.5, 8.5), "operate": (8.5, 13)}.items():
    svg.append(f'<path class="ring ring-{phase}" d="{arc(a + 0.12, b - 0.12, R)}"/>')
x11, y11 = pos(11, R - NR - 6)
x1, y1 = pos(1, R - NR - 6)
svg.append(f'<path class="loop" d="M{x11:.1f} {y11:.1f} Q{CX - 40} {CY - 40} {x1:.1f} {y1:.1f}" marker-end="url(#arrow)"/>')
svg.append(f'<text class="loop-label" x="{CX - 46}" y="{CY - 44}" text-anchor="middle">el ciclo</text>')
svg.append(f'<text class="loop-label" x="{CX - 46}" y="{CY - 28}" text-anchor="middle">no se cierra hoy</text>')
svg.append(f'<text class="center-name" x="{CX}" y="{CY + 22}" text-anchor="middle">momoy</text>')
svg.append(f'<text class="center-meta" x="{CX}" y="{CY + 44}" text-anchor="middle">{VERSION} · 37 SK · 18 comandos</text>')
for s in STAGES:
    x, y = pos(s["n"], R)
    lx, ly = pos(s["n"], LR)
    anchor = "middle" if abs(lx - CX) < 8 else ("start" if lx > CX else "end")
    dy = 5 if abs(ly - CY) < 150 else (-2 if ly < CY else 12)
    svg.append(f'<a href="#etapa-{s["n"]}" class="node node-{s["cov"]} node-{s["phase"]}">'
               f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{NR}"/>'
               f'<text class="node-n" x="{x:.1f}" y="{y + 4.5:.1f}" text-anchor="middle">{s["n"]}</text>'
               f'<text class="node-label" x="{lx:.1f}" y="{ly + dy:.1f}" text-anchor="{anchor}">{s["short"]}</text></a>')
svg.append("</svg>")
SVG = "\n".join(svg)


def pill(cov):
    return f'<span class="cov cov-{cov}"><span class="cov-dot" aria-hidden="true"></span>{LEVELS[cov]}</span>'


def marks(scores):
    return "".join(f'<td class="mk" title="{label}: {MARK[scores[k]][1]}">'
                   f'<span class="dot dot-{scores[k]}" aria-hidden="true"></span><span class="sr">{MARK[scores[k]][1]}</span></td>'
                   for k, label, _ in CRITERIA)


matrix_rows = "".join(
    f'<tr data-phase="{s["phase"]}"><th scope="row"><a href="#etapa-{s["n"]}"><span class="mx-n">{s["n"]}</span>{s["short"]}</a></th>'
    f'{marks(s["now"])}<td>{pill(s["cov"])}</td>'
    f'<td class="mx-before">{LEVELS[s["cov_before"]] if s["cov_before"] != s["cov"] else "—"}</td></tr>'
    for s in STAGES)
criteria_head = "".join(f'<th scope="col" title="{desc}">{label}</th>' for _, label, desc in CRITERIA)
criteria_list = "".join(f"<li><b>{label}</b><span>{desc}</span></li>" for _, label, desc in CRITERIA)


def stage_section(s):
    todo = "".join(f"<li>{t}</li>" for t in s["todo"])
    chips = "".join(f'<li class="chip"><span class="dot dot-{s["now"][k]}" aria-hidden="true"></span>{label}'
                    f'<span class="sr">: {MARK[s["now"][k]][1]}</span></li>' for k, label, _ in CRITERIA)
    return f"""
<section class="stage" id="etapa-{s['n']}">
  <header class="stage-head">
    <span class="stage-n">{s['n']:02d}</span>
    <div class="stage-titles">
      <h3>{s['title']}</h3>
      <p class="stage-q">{s['q']}</p>
    </div>
    {pill(s['cov'])}
  </header>
  <ul class="chips" aria-label="Condiciones de fuerte">{chips}</ul>
  <dl class="stage-body">
    <div class="row"><dt>Hoy en momoy</dt><dd>{s['today']}</dd></div>
    <div class="row"><dt>Para ser fuerte</dt><dd><ul>{todo}</ul></dd></div>
    <div class="row"><dt>Comandos</dt><dd><code class="cmd">{s['cmds']}</code></dd></div>
  </dl>
</section>"""


phase_blocks = []
for key, (name, question) in PHASES.items():
    stages = [s for s in STAGES if s["phase"] == key]
    phase_blocks.append(f"""
<div class="phase" data-phase="{key}">
  <div class="phase-head">
    <p class="eyebrow">Etapas {stages[0]['n']}–{stages[-1]['n']}</p>
    <h2>{name}</h2>
    <p class="phase-q">{question}</p>
  </div>
  {''.join(stage_section(s) for s in stages)}
</div>""")

index_items = "".join(
    f'<li data-phase="{s["phase"]}"><a href="#etapa-{s["n"]}"><span class="ix-n">{s["n"]}</span>'
    f'<span class="ix-name">{s["short"]}</span><span class="ix-cov ix-{s["cov"]}" title="{LEVELS[s["cov"]]}"></span></a></li>'
    for s in STAGES)
evolution_rows = "".join(
    f'<tr{" class=\"is-current\"" if v == VERSION else ""}><th scope="row"><code>{v}</code></th><td><b>{t}</b><span>{d}</span></td>'
    f'<td class="num">{c}</td><td class="num">{n}</td></tr>'
    for v, t, d, c, n in EVOLUTION)
wave_items = "".join(
    f'<li class="wave wave-{st}"><p class="wave-label">{lab}<span class="wave-status">'
    f'{ {"done": "Hecha", "next": "Siguiente", "partial": "En curso"}.get(st, "Pendiente") }</span></p>'
    f'<h4>{t}</h4><p class="wave-scope">{sc}</p><p class="wave-why">{why}</p></li>'
    for lab, t, sc, st, why in WAVES)
gloss = "".join(f"<div><dt>{t}</dt><dd>{d}</dd></div>" for t, d in GLOSSARY)
delta = counts["strong"] - before["strong"]

PAGE = f"""<title>Ciclo completo de momoy</title>
<meta name="description" content="Las 12 etapas del desarrollo de software, cuáles ya son fuertes en momoy y cómo evoluciona versión a versión.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root {{
  --ground: #F2F4F1; --surface: #FAFBF9; --ink: #18201C; --ink-2: #4D5953; --ink-3: #6E7A73;
  --rule: #D2D9D3; --rule-strong: #B7C1BA; --accent: #1E6B58;
  --discover: #A0621A; --deliver: #1E6B58; --operate: #3B5B96;
  --gap: #B3412E; --gap-soft: #F4E1DC; --code-bg: #E6EBE6; --done: #1E6B58;
  --font-display: "Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif;
  --font-body: "Newsreader", "Iowan Old Style", Georgia, serif;
  --font-mono: "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;
  --step--1: 0.8125rem; --step-0: 1.0625rem; --step-1: 1.25rem; --step-2: 1.625rem; --step-3: 2.25rem; --step-4: 3.25rem;
}}
@media (prefers-color-scheme: dark) {{
  :root:not([data-theme="light"]) {{
    --ground: #111613; --surface: #171E1A; --ink: #E1E8E3; --ink-2: #A3AEA8; --ink-3: #85918A;
    --rule: #28312C; --rule-strong: #3A4540; --accent: #62B89F;
    --discover: #D49C52; --deliver: #62B89F; --operate: #8CA8DF;
    --gap: #E4806A; --gap-soft: #3A221D; --code-bg: #1F2823; --done: #62B89F;
  }}
}}
:root[data-theme="dark"] {{
  --ground: #111613; --surface: #171E1A; --ink: #E1E8E3; --ink-2: #A3AEA8; --ink-3: #85918A;
  --rule: #28312C; --rule-strong: #3A4540; --accent: #62B89F;
  --discover: #D49C52; --deliver: #62B89F; --operate: #8CA8DF;
  --gap: #E4806A; --gap-soft: #3A221D; --code-bg: #1F2823; --done: #62B89F;
}}
*, *::before, *::after {{ box-sizing: border-box; }}
html {{ scroll-behavior: smooth; }}
@media (prefers-reduced-motion: reduce) {{ html {{ scroll-behavior: auto; }} }}
body {{ margin: 0; background: var(--ground); color: var(--ink); font-family: var(--font-body); font-size: var(--step-0); line-height: 1.6; -webkit-font-smoothing: antialiased; }}
a {{ color: inherit; }}
a:focus-visible {{ outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 2px; }}
code {{ font-family: var(--font-mono); font-size: 0.84em; background: var(--code-bg); padding: 0.08em 0.35em; border-radius: 3px; }}
h1, h2, h3, h4 {{ font-family: var(--font-display); text-wrap: balance; margin: 0; letter-spacing: -0.01em; }}
p {{ margin: 0; }}
.sr {{ position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }}
.eyebrow {{ font-family: var(--font-display); font-size: var(--step--1); font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3); }}
.wrap {{ max-width: 1180px; margin: 0 auto; padding: 0 clamp(1rem, 4vw, 2.5rem); }}

.masthead {{ padding: clamp(2rem, 5vw, 3.5rem) 0 1.5rem; border-bottom: 1px solid var(--rule); }}
.masthead .meta {{ display: flex; flex-wrap: wrap; gap: 0.35rem 1.25rem; font-family: var(--font-mono); font-size: var(--step--1); color: var(--ink-3); margin-top: 1.25rem; }}
.masthead h1 {{ font-size: clamp(2.25rem, 5.4vw, var(--step-4)); font-weight: 700; line-height: 1.04; margin-top: 0.6rem; max-width: 18ch; }}
.masthead .dek {{ font-size: var(--step-1); color: var(--ink-2); max-width: 60ch; margin-top: 1rem; line-height: 1.5; }}

.thesis {{ display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: clamp(1.5rem, 4vw, 3.5rem); align-items: center; padding: 2.5rem 0 3rem; border-bottom: 1px solid var(--rule); }}
.figure {{ margin: 0; overflow-x: auto; }}
.cycle {{ width: 100%; min-width: 440px; height: auto; display: block; }}
.ring {{ fill: none; stroke-width: 7; stroke-linecap: round; }}
.ring-discover {{ stroke: var(--discover); }} .ring-deliver {{ stroke: var(--deliver); }} .ring-operate {{ stroke: var(--operate); }}
.loop {{ fill: none; stroke: var(--gap); stroke-width: 2; stroke-dasharray: 6 5; }}
.gap-fill {{ fill: var(--gap); }}
.loop-label {{ font-family: var(--font-display); font-size: 12.5px; font-weight: 600; fill: var(--gap); }}
.center-name {{ font-family: var(--font-display); font-size: 44px; font-weight: 700; fill: var(--ink); letter-spacing: -0.02em; }}
.center-meta {{ font-family: var(--font-mono); font-size: 11.5px; fill: var(--ink-3); }}
.node circle {{ stroke-width: 2.5; }}
.node-n {{ font-family: var(--font-display); font-size: 13px; font-weight: 700; }}
.node-label {{ font-family: var(--font-display); font-size: 13.5px; font-weight: 600; fill: var(--ink); }}
.node-discover {{ --c: var(--discover); }} .node-deliver {{ --c: var(--deliver); }} .node-operate {{ --c: var(--operate); }}
.node-strong circle {{ fill: var(--c); stroke: var(--c); }}
.node-strong .node-n {{ fill: var(--surface); }}
.node-near circle {{ fill: color-mix(in srgb, var(--c) 35%, var(--surface)); stroke: var(--c); }}
.node-near .node-n {{ fill: var(--ink); }}
.node-partial circle {{ fill: var(--surface); stroke: var(--c); }}
.node-partial .node-n {{ fill: var(--c); }}
.node-missing circle {{ fill: var(--gap-soft); stroke: var(--gap); stroke-dasharray: 4 3; }}
.node-missing .node-n, .node-missing .node-label {{ fill: var(--gap); }}
.node:hover circle, .node:focus-visible circle {{ stroke-width: 4; }}
.legend {{ display: flex; flex-wrap: wrap; gap: 0.5rem 1.25rem; margin-top: 0.75rem; font-family: var(--font-display); font-size: var(--step--1); color: var(--ink-2); }}
.legend span {{ display: inline-flex; align-items: center; gap: 0.4rem; }}
.sw {{ width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--ink-2); display: inline-block; }}
.sw-strong {{ background: var(--ink-2); }}
.sw-near {{ background: color-mix(in srgb, var(--ink-2) 35%, var(--ground)); }}
.sw-partial {{ background: transparent; }}
.sw-missing {{ background: var(--gap-soft); border: 2px dashed var(--gap); }}

.verdict h2 {{ font-size: var(--step-3); line-height: 1.1; }}
.verdict .lede {{ margin-top: 1rem; font-size: var(--step-1); line-height: 1.5; }}
.tally {{ display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 1.5rem 0 0.5rem; border-top: 1px solid var(--rule-strong); border-bottom: 1px solid var(--rule-strong); }}
.tally div {{ padding: 0.8rem 0.75rem; }}
.tally div + div {{ border-left: 1px solid var(--rule); }}
.tally b {{ display: block; font-family: var(--font-display); font-size: var(--step-3); font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; }}
.tally span {{ font-family: var(--font-display); font-size: var(--step--1); color: var(--ink-2); }}
.tally .t-missing b {{ color: var(--gap); }}
.tally-note {{ font-family: var(--font-display); font-size: var(--step--1); color: var(--ink-3); }}
.tally-note b {{ color: var(--done); }}

.criteria {{ padding: 3rem 0; border-bottom: 1px solid var(--rule); display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); gap: clamp(1.5rem, 4vw, 3.5rem); }}
.criteria h2, .matrix-sec h2, .closing h2 {{ font-size: var(--step-3); line-height: 1.1; }}
.intro {{ color: var(--ink-2); max-width: 64ch; margin-top: 0.6rem; }}
.criteria ol {{ margin: 0; padding: 0; list-style: none; counter-reset: c; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 2rem; }}
.criteria li {{ counter-increment: c; padding: 0.8rem 0; border-top: 1px solid var(--rule); display: grid; gap: 0.15rem; }}
.criteria li b {{ font-family: var(--font-display); font-weight: 600; }}
.criteria li b::before {{ content: counter(c) ". "; color: var(--ink-3); }}
.criteria li span {{ color: var(--ink-2); font-size: 0.98rem; }}

.matrix-sec {{ padding: 3rem 0; border-bottom: 1px solid var(--rule); }}
.table-wrap {{ overflow-x: auto; margin-top: 1.25rem; }}
table {{ border-collapse: collapse; width: 100%; font-size: 0.98rem; }}
th, td {{ text-align: left; vertical-align: top; padding: 0.6rem 0.9rem 0.6rem 0; border-bottom: 1px solid var(--rule); }}
thead th {{ font-family: var(--font-display); font-size: var(--step--1); font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ink-3); border-bottom: 1px solid var(--rule-strong); vertical-align: bottom; }}
tbody th {{ font-family: var(--font-display); font-weight: 600; white-space: nowrap; }}
.matrix {{ min-width: 820px; }}
.matrix tbody th a {{ text-decoration: none; display: inline-flex; gap: 0.6rem; padding-left: 0.6rem; border-left: 3px solid var(--c); }}
.matrix tr[data-phase="discover"] {{ --c: var(--discover); }} .matrix tr[data-phase="deliver"] {{ --c: var(--deliver); }} .matrix tr[data-phase="operate"] {{ --c: var(--operate); }}
.mx-n {{ color: var(--ink-3); font-variant-numeric: tabular-nums; min-width: 1.4rem; }}
.mk {{ text-align: center; padding-right: 0.9rem; }}
.dot {{ display: inline-block; width: 12px; height: 12px; border-radius: 50%; border: 2px solid currentColor; vertical-align: -1px; }}
.dot-2 {{ color: var(--done); background: currentColor; }}
.dot-1 {{ color: var(--ink-2); background: linear-gradient(90deg, currentColor 50%, transparent 50%); }}
.dot-0 {{ color: var(--gap); }}
.dot-legend {{ display: flex; flex-wrap: wrap; gap: 0.3rem 1rem; align-items: center; }}
.dot-legend span {{ display: inline-flex; align-items: center; gap: 0.4rem; }}
.matrix thead th:not(:first-child):not(:nth-last-child(-n+2)) {{ text-align: center; }}
.mx-before {{ font-family: var(--font-display); font-size: var(--step--1); color: var(--ink-3); white-space: nowrap; }}

.cov {{ display: inline-flex; align-items: center; gap: 0.45rem; font-family: var(--font-display); font-size: var(--step--1); font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; padding: 0.2rem 0.6rem; border: 1px solid var(--rule-strong); border-radius: 999px; white-space: nowrap; color: var(--ink-2); }}
.cov-dot {{ width: 9px; height: 9px; border-radius: 50%; border: 2px solid currentColor; }}
.cov-strong {{ color: var(--done); border-color: var(--done); }}
.cov-strong .cov-dot {{ background: currentColor; }}
.cov-near .cov-dot {{ background: color-mix(in srgb, currentColor 40%, transparent); }}
.cov-missing {{ color: var(--gap); border-color: var(--gap); background: var(--gap-soft); }}
.cov-missing .cov-dot {{ border-style: dashed; }}

.body {{ display: grid; grid-template-columns: 13rem minmax(0, 1fr); gap: clamp(1.5rem, 4vw, 3.5rem); padding: 3rem 0 2rem; }}
.index {{ position: sticky; top: 1.25rem; align-self: start; }}
.index ol {{ list-style: none; margin: 0.75rem 0 0; padding: 0; display: grid; gap: 1px; }}
.index a {{ display: grid; grid-template-columns: 1.75rem 1fr auto; align-items: center; gap: 0.5rem; padding: 0.35rem 0.5rem; text-decoration: none; font-family: var(--font-display); font-size: 0.9rem; border-left: 3px solid transparent; }}
.index li[data-phase="discover"] a {{ border-left-color: var(--discover); }} .index li[data-phase="deliver"] a {{ border-left-color: var(--deliver); }} .index li[data-phase="operate"] a {{ border-left-color: var(--operate); }}
.index a:hover {{ background: var(--surface); }}
.ix-n {{ font-variant-numeric: tabular-nums; color: var(--ink-3); font-weight: 600; }}
.ix-cov {{ width: 10px; height: 10px; border-radius: 50%; border: 2px solid var(--ink-2); }}
.ix-strong {{ background: var(--done); border-color: var(--done); }}
.ix-near {{ background: color-mix(in srgb, var(--ink-2) 35%, var(--ground)); }}
.ix-missing {{ border: 2px dashed var(--gap); background: var(--gap-soft); }}

.phase {{ --c: var(--accent); }}
.phase[data-phase="discover"] {{ --c: var(--discover); }} .phase[data-phase="deliver"] {{ --c: var(--deliver); }} .phase[data-phase="operate"] {{ --c: var(--operate); }}
.phase + .phase {{ margin-top: 3.5rem; }}
.phase-head {{ padding-bottom: 1rem; border-bottom: 3px solid var(--c); }}
.phase-head .eyebrow {{ color: var(--c); }}
.phase-head h2 {{ font-size: var(--step-3); line-height: 1.1; margin-top: 0.25rem; }}
.phase-q {{ font-style: italic; color: var(--ink-2); font-size: var(--step-1); margin-top: 0.25rem; }}
.stage {{ padding: 1.75rem 0; border-bottom: 1px solid var(--rule); scroll-margin-top: 1rem; }}
.stage-head {{ display: grid; grid-template-columns: 3.25rem minmax(0, 1fr) auto; gap: 1rem; align-items: start; }}
.stage-n {{ font-family: var(--font-display); font-size: var(--step-2); font-weight: 700; color: var(--c); font-variant-numeric: tabular-nums; line-height: 1.1; }}
.stage-titles h3 {{ font-size: var(--step-2); line-height: 1.15; font-weight: 700; }}
.stage-q {{ color: var(--ink-2); margin-top: 0.2rem; }}
.chips {{ list-style: none; margin: 1rem 0 0 4.25rem; padding: 0; display: flex; flex-wrap: wrap; gap: 0.4rem 1rem; font-family: var(--font-display); font-size: var(--step--1); color: var(--ink-2); }}
.chip {{ display: inline-flex; align-items: center; gap: 0.4rem; }}
.stage-body {{ margin: 1rem 0 0 4.25rem; }}
.row {{ display: grid; grid-template-columns: 9.5rem minmax(0, 1fr); gap: 1.25rem; padding: 0.6rem 0; border-top: 1px solid var(--rule); }}
.row dt {{ font-family: var(--font-display); font-size: var(--step--1); font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ink-3); padding-top: 0.2rem; }}
.row dd {{ margin: 0; max-width: 66ch; }}
.row ul {{ margin: 0; padding-left: 1.1rem; display: grid; gap: 0.4rem; }}
code.cmd {{ font-size: 0.8rem; word-break: break-word; color: var(--c); background: transparent; border: 1px solid var(--rule-strong); }}

.closing {{ border-top: 1px solid var(--rule); padding: 3rem 0; display: grid; gap: 3.5rem; }}
.evolution {{ min-width: 720px; }}
.evolution td span {{ display: block; color: var(--ink-2); }}
.evolution td b {{ font-family: var(--font-display); font-weight: 600; }}
.evolution .num {{ font-family: var(--font-display); font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }}
.evolution thead th.num {{ text-align: right; }}
.evolution tr.is-current th code {{ background: var(--done); color: var(--surface); }}
.waves {{ list-style: none; margin: 1.5rem 0 0; padding: 0; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); border-top: 3px solid var(--ink); }}
.wave {{ padding: 1rem 1.1rem 0 0; display: grid; align-content: start; gap: 0.45rem; }}
.wave + .wave {{ padding-left: 1.1rem; border-left: 1px solid var(--rule); }}
.wave-label {{ font-family: var(--font-display); font-size: var(--step--1); font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3); display: flex; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; }}
.wave-status {{ letter-spacing: 0.04em; }}
.wave-done .wave-status {{ color: var(--done); }}
.wave-next .wave-status {{ color: var(--ink); }}
.wave-partial .wave-status {{ color: var(--accent); }}
.wave h4 {{ font-size: var(--step-1); line-height: 1.2; }}
.wave-scope {{ font-family: var(--font-display); font-size: 0.9rem; font-weight: 600; color: var(--accent); }}
.wave-why {{ color: var(--ink-2); font-size: 0.96rem; }}
.wave-done h4 {{ color: var(--ink-2); }}
.gloss {{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 2.5rem; margin: 1.25rem 0 0; }}
.gloss div {{ padding: 0.75rem 0; border-top: 1px solid var(--rule); }}
.gloss dt {{ font-family: var(--font-display); font-weight: 600; }}
.gloss dd {{ margin: 0.15rem 0 0; color: var(--ink-2); }}
.method {{ font-family: var(--font-mono); font-size: var(--step--1); color: var(--ink-3); border-top: 1px solid var(--rule); padding: 1.5rem 0 3rem; max-width: 90ch; line-height: 1.7; }}

@media (max-width: 960px) {{
  .thesis, .criteria, .body {{ grid-template-columns: 1fr; }}
  .index {{ position: static; }}
  .index ol {{ grid-template-columns: repeat(auto-fill, minmax(10.5rem, 1fr)); }}
  .waves {{ grid-template-columns: repeat(2, minmax(0, 1fr)); row-gap: 1.5rem; }}
  .wave:nth-child(odd) {{ padding-left: 0; border-left: 0; }}
}}
@media (max-width: 640px) {{
  .stage-head {{ grid-template-columns: 2.5rem minmax(0, 1fr); }}
  .stage-head .cov {{ grid-column: 2; justify-self: start; }}
  .chips, .stage-body {{ margin-left: 0; }}
  .row {{ grid-template-columns: 1fr; gap: 0.2rem; }}
  .criteria ol, .gloss {{ grid-template-columns: 1fr; }}
  .tally {{ grid-template-columns: repeat(2, minmax(0, 1fr)); }}
  .tally div:nth-child(3) {{ border-left: 0; }}
  .waves {{ grid-template-columns: 1fr; }}
  .wave + .wave {{ padding-left: 0; border-left: 0; border-top: 1px solid var(--rule); }}
}}
</style>

<div class="wrap">
  <header class="masthead">
    <p class="eyebrow">momoy · referencia de estudio y marcador de progreso</p>
    <h1>Ciclo completo de momoy</h1>
    <p class="dek">Las doce etapas del desarrollo de software, del problema a la retirada de una función: cuáles ya son fuertes en momoy, qué falta en cada una y cómo va evolucionando versión a versión.</p>
    <div class="meta"><span>framework {VERSION}</span><span>rama momoy</span><span>medido el {MEASURED}</span></div>
  </header>

  <section class="thesis" aria-labelledby="verdict-title">
    <figure class="figure">
      {SVG}
      <figcaption class="legend">
        <span><i class="sw sw-strong"></i>Fuerte</span>
        <span><i class="sw sw-near"></i>Casi</span>
        <span><i class="sw sw-partial"></i>Parcial</span>
        <span><i class="sw sw-missing"></i>Ausente</span>
      </figcaption>
    </figure>
    <div class="verdict">
      <p class="eyebrow">Estado actual</p>
      <h2 id="verdict-title">{counts['strong']} de 12 etapas ya son fuertes</h2>
      <p class="lede">Propósito final: que momoy sea fuerte en las doce. La mitad izquierda del ciclo ya casi lo es; la derecha —operar y aprender— sigue siendo el hueco, y la medición de resultados todavía no cierra el círculo.</p>
      <div class="tally" role="list">
        <div role="listitem"><b>{counts['strong']}</b><span>fuertes</span></div>
        <div role="listitem"><b>{counts['near']}</b><span>casi</span></div>
        <div role="listitem"><b>{counts['partial']}</b><span>parciales</span></div>
        <div role="listitem" class="t-missing"><b>{counts['missing']}</b><span>ausentes</span></div>
      </div>
      <p class="tally-note">Antes de la ola 0, con el mismo criterio: {before['strong']} fuertes, {before['near']} casi, {before['partial']} parciales y {before['missing']} ausentes. <b>+{delta} etapas fuertes.</b></p>
    </div>
  </section>

  <section class="criteria" aria-labelledby="criteria-title">
    <div>
      <p class="eyebrow">Criterio</p>
      <h2 id="criteria-title">Qué significa «fuerte»</h2>
      <p class="intro">La primera versión de esta página llamaba fuerte a una etapa con solo tener un procedimiento. El valor de momoy es verificar, así que una etapa es fuerte cuando cumple las seis condiciones. Con cinco es «casi»; con dos a cuatro y media, «parcial».</p>
    </div>
    <ol>{criteria_list}</ol>
  </section>

  <section class="matrix-sec" aria-labelledby="matrix-title">
    <p class="eyebrow">Matriz</p>
    <h2 id="matrix-title">Las seis condiciones, etapa por etapa</h2>
    <p class="intro dot-legend"><span><i class="dot dot-2"></i>cumple</span> <span><i class="dot dot-1"></i>parcial</span> <span><i class="dot dot-0"></i>no</span> — la última columna indica el nivel antes de la ola 0 (2.19.0), cuando cambió.</p>
    <div class="table-wrap">
      <table class="matrix">
        <thead><tr><th scope="col">Etapa</th>{criteria_head}<th scope="col">Nivel</th><th scope="col">Antes</th></tr></thead>
        <tbody>{matrix_rows}</tbody>
      </table>
    </div>
  </section>

  <div class="body">
    <nav class="index" aria-label="Etapas">
      <p class="eyebrow">Etapas</p>
      <ol>{index_items}</ol>
    </nav>
    <main>
      {''.join(phase_blocks)}
    </main>
  </div>

  <div class="closing">
    <section aria-labelledby="evo-title">
      <p class="eyebrow">Historial</p>
      <h2 id="evo-title">Cómo va evolucionando momoy</h2>
      <p class="intro">Cada fila es una versión del framework en la rama momoy. Los tests son los de las propias herramientas de momoy, que corre <code>validate_agents.sh</code>.</p>
      <div class="table-wrap">
        <table class="evolution">
          <thead><tr><th scope="col">Versión</th><th scope="col">Qué cambió</th><th scope="col" class="num">Comandos</th><th scope="col" class="num">Tests</th></tr></thead>
          <tbody>{evolution_rows}</tbody>
        </table>
      </div>
    </section>

    <section aria-labelledby="waves-title">
      <p class="eyebrow">Hoja de ruta</p>
      <h2 id="waves-title">Olas hacia las doce etapas</h2>
      <p class="intro">Cada ola es una versión MINOR que no rompe nada. Una etapa solo pasa a fuerte cuando cumple las seis condiciones y hay evidencia de su ejecución real.</p>
      <ol class="waves">{wave_items}</ol>
    </section>

    <section aria-labelledby="gloss-title">
      <p class="eyebrow">Glosario</p>
      <h2 id="gloss-title">Conceptos clave</h2>
      <dl class="gloss">{gloss}</dl>
    </section>
  </div>

  <p class="method">Método: cada condición marcada como cumplida se respalda en un archivo de .agents/ {VERSION} o en una ejecución real sobre el proyecto consumidor (RestoStock). «Probado en real» exige ejecución, no solo escritura; por eso la etapa 1 queda en «casi» aunque su gate funcione: la plantilla nueva de KPIs aún no produjo un artefacto real. La primera versión de esta página usaba un criterio más laxo (tener procedimiento) y contaba 6 etapas fuertes.</p>
</div>
"""

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(PAGE, encoding="utf-8")
print(OUT, counts, before)
