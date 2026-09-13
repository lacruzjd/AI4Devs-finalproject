#!/usr/bin/env python3
import os
import sys
import shutil
import tempfile
import unittest
from datetime import date

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(__file__), "..")))
from check_spec_artifacts import run_checks  # noqa: E402

KPI_TABLE = """# PRD

## Objetivos de Negocio y KPIs

| KPI | Fuente de datos | Línea base | Umbral de éxito | Ventana | Fecha de revisión |
|---|---|---|---|---|---|
| Merma desconocida | Auditoría física semanal | 12% | -30% | 90 días | 2099-12-10 |
"""

STORY = """---
document: user_story
id: US-001
version: 1.0.0
status: approved
value_risk: bajo
validation: exenta — mejora interna sin riesgo de valor
inputs:
  - docs/01_product_definition/02_prd.md
---

# US-001: Registrar extracción

## Precondiciones
- Usuario autenticado.

## Criterios de Aceptación (BDD Gherkin)

### Escenario 1: Happy path
- **Given** stock disponible
- **When** registra la extracción
- **Then** el stock baja

### Escenario 2: Error
- **Given** stock insuficiente
- **When** registra la extracción
- **Then** recibe un error RFC 7807

### Escenario 3: Borde
- **Given** cantidad decimal
- **When** registra la extracción
- **Then** conserva la precisión

## Criterios de Aceptación No Funcionales (NFRs)
- Respuesta < 300 ms.
"""

TICKET = """---
document: technical_ticket
id: TK-001
related_story: US-001
points: 3
type: backend
status: approved
inputs:
  - docs/05_agile_planning/11_user_stories/stock/US-001.md
---

# TK-001: Endpoint de extracción

## 📝 Descripción
Texto.

## Alcance de Modificación (Hexagonal Layers)
Texto.

## Mitigación de Riesgos Técnicos
Texto.

## Criterios de Aceptación & DoD (Definition of Done)
Texto.

## 🤖 Instrucciones de Ejecución Autónoma para Agente IA
Texto.
"""

MATRIX = """# Matriz

| ID | Historia | Ticket |
|---|---|---|
| REQ-001 | [US-001](11_user_stories/stock/US-001.md) | [TK-001](12_tickets/stock/backend/TK-001.md) |
| REQ-003 | — | [TK-003](12_tickets/stock/backend/TK-003.md) |
"""

EXPERIMENT = """---
document: experiment
id: EXP-001
version: 1.0.0
status: designed
risk: valor
method: entrevista
criteria_locked_on: 2026-09-01
sample_target: 5
sample_obtained:
result_on:
decision: pendiente
---

# EXP-001: Apertura duplicada de insumos

## Hipótesis
Creemos que si mostramos los remanentes abiertos, los cocineros no abrirán uno nuevo.

## Criterio de éxito
4 de 5 cocineros consultan la lista antes de abrir un insumo.

## Método y muestra
Entrevista contextual a 5 cocineros de línea.
"""

CONCLUDED = (EXPERIMENT.replace("status: designed", "status: concluded")
             .replace("sample_obtained:\n", "sample_obtained: 5\n")
             .replace("result_on:\n", "result_on: 2026-09-10\n")
             .replace("decision: pendiente", "decision: seguir")
             + "\n## Resultado\n5 de 5 consultaron la lista.\n\n## Evidencia\nevidence/EXP-001/\n\n## Decisión\nSeguir.\n")

POSTMORTEM = """---
document: postmortem
id: PM-001
version: 1.0.0
status: closed
severity: alta
detected_at: 2026-09-09T18:10:00-03:00
resolved_at: 2026-09-09T18:54:00-03:00
---

# PM-001: El primer despliegue no arrancaba

## Resumen
El frontend no arrancaba porque una variable de URL no tenía esquema.

## Impacto
Primer despliegue sin usuarios; el servicio no llegó a servir durante 44 minutos.

## Línea de tiempo
- 18:10 — falla el despliegue (fuente: log de la plataforma)
- 18:54 — servicio en vivo (fuente: commit)

## Causas contribuyentes
- **Disparó el fallo:** la referencia de la plataforma devolvía un host sin esquema.

## Por qué ningún gate lo detectó
Ningún gate renderiza el blueprint de despliegue con los valores reales de la plataforma.

## Acciones
- Validar el formato URL de todas las variables de origen — TK-001
- Documentar la limitación de la plataforma — sin acción — ya quedó registrada en el blueprint
"""

OUTCOME = """---
document: outcome_report
id: OUT-001
version: 1.0.0
status: closed
measured_on: 2026-09-13
source_doc: docs/01_product_definition/02_prd.md
recommendation: mantener
---

# OUT-001: Merma

## Veredicto por KPI

| KPI | Línea base | Umbral de éxito | Valor medido | Veredicto |
|---|---|---|---|---|
| Merma desconocida | 12% | -30% | -34% | cumplido |

## Datos
data/OUT-001/merma.csv

## Recomendación
Mantener.
"""

RELEASE = """---
document: release
release: 1.0.0
version: 1.0.0
status: deployed
strategy: completo
strategy_justification: "Primer despliegue, sin usuarios todavía"
planned_on: 2026-09-09
deployed_at: 2026-09-09T18:54:00-03:00
includes_migration: no
changes_deploy_config: no
rollback_rehearsed_on:
---

# Release v1.0.0

## Tickets incluidos
- TK-003 — Entrega inicial

## Notas de versión
Primera versión disponible: registro de extracciones y tablero de remanentes.

## Verificación previa al despliegue
Blueprint validado con la herramienta de la plataforma; todas las URLs con esquema.

## Plan de rollback
Volver a desplegar el commit anterior desde la plataforma, sin cambios de datos.

## Verificación posterior
Workflow 08 en PASS: salud 200 y rutas protegidas responden 401.
"""

RELEASE_PATH = "docs/06_release_and_operations/releases/v1.0.0.md"
DONE_TICKET_PATH = "docs/05_agile_planning/12_tickets/stock/backend/TK-003.md"
OPS = "docs/06_release_and_operations"
SLOS_PATH = f"{OPS}/slos.md"
BACKUP_PATH = f"{OPS}/backup_and_recovery.md"

SLOS = """---
document: slos
version: 1.0.0
---

# SLOs del Servicio

## Recorrido crítico
Registrar una extracción de stock desde la cocina.

## SLOs

| SLO | SLI | Objetivo | Ventana | Fuente | Alerta | Presupuesto |
|---|---|---|---|---|---|---|
| Disponibilidad | % de peticiones sin error 5xx | 99,5% | 30 días | monitor declarado | RB-001 | disponible |
| Latencia del registro | p95 de POST de extracción | < 300 ms | 30 días | monitor declarado | RB-002 | disponible |

## Política de presupuesto de error
Con el presupuesto agotado solo se liberan correcciones y mejoras de fiabilidad.
"""

BACKUP = """---
document: backup_recovery
version: 1.0.0
rpo: 24 h
rto: 4 h
---

# Backups y Recuperación

## Mecanismo de backup
Copia diaria gestionada por la plataforma, retenida 7 días.

## Procedimiento de restauración
Restaurar la última copia en una base efímera y verificar los conteos.
"""


def runbook(rb_id, alert):
    return f"""---
document: runbook
id: {rb_id}
version: 1.0.0
alert: {alert}
severity: alta
last_tested_on: 2026-09-01
---

# {rb_id}: {alert}

## Síntoma
Los usuarios reciben errores al registrar.

## Diagnóstico
Revisar el panel de errores y el estado de la base de datos.

## Mitigación
Volver a la versión anterior con aprobación humana.

## Escalado
Avisar al responsable del servicio.
"""


def drill(drill_id, kind, target, result="exitoso", executed_on="2026-09-01", measured_rto="35 min"):
    rto_line = f"measured_rto: {measured_rto}\n" if measured_rto is not None else ""
    return f"""---
document: drill
id: {drill_id}
version: 1.0.0
type: {kind}
target: {target}
environment: base de datos efímera local
executed_on: {executed_on}
result: {result}
{rto_line}---

# {drill_id}: ensayo de {kind}

## Objetivo
Comprobar que el procedimiento funciona tal como está escrito.

## Procedimiento seguido
Se siguió el procedimiento paso a paso.

## Resultado
Resultado {result}.

## Evidencia
evidence/{drill_id}/
"""


DRILLS = {
    "DRILL-001": ("restauracion", "backup"),
    "DRILL-002": ("alerta", "RB-001"),
    "DRILL-003": ("runbook", "RB-002"),
}

PM_PATH = "docs/06_release_and_operations/postmortems/PM-001-despliegue.md"
OUT_PATH = "docs/01_product_definition/outcomes/OUT-001-merma.md"
OUT_DATA = "docs/01_product_definition/outcomes/data/OUT-001/merma.csv"

ADR = """---
document: adr
status: accepted
---

# ADR-001

- **Implementado por:** [`TK-001`](../../05_agile_planning/12_tickets/stock/backend/TK-001.md)
"""


class CheckSpecArtifactsTests(unittest.TestCase):
    def setUp(self):
        self.root = tempfile.mkdtemp()
        self._write("docs/01_product_definition/02_prd.md", KPI_TABLE)
        self._write("docs/05_agile_planning/11_user_stories/stock/US-001.md", STORY)
        self._write("docs/05_agile_planning/12_tickets/stock/backend/TK-001.md", TICKET)
        self._write("docs/05_agile_planning/13_matriz_trazabilidad.md", MATRIX)
        self._write("docs/02_architecture_design/adr/ADR-001-decision.md", ADR)
        self._write("docs/01_product_definition/experiments/EXP-001-apertura-duplicada.md", EXPERIMENT)
        self._write(PM_PATH, POSTMORTEM)
        self._write(OUT_PATH, OUTCOME)
        self._write(OUT_DATA, "semana,merma\n1,0.08\n")
        self._write(DONE_TICKET_PATH, TICKET.replace("id: TK-001", "id: TK-003").replace("status: approved", "status: done"))
        self._write(RELEASE_PATH, RELEASE)
        self._write(SLOS_PATH, SLOS)
        self._write(BACKUP_PATH, BACKUP)
        self._write(f"{OPS}/runbooks/RB-001-errores.md", runbook("RB-001", "Tasa de error alta"))
        self._write(f"{OPS}/runbooks/RB-002-latencia.md", runbook("RB-002", "Latencia alta en registro"))
        for drill_id, (kind, target) in DRILLS.items():
            self._write(f"{OPS}/drills/{drill_id}-ensayo.md", drill(drill_id, kind, target))
            self._write(f"{OPS}/drills/evidence/{drill_id}/salida.txt", "tiempo total: 35 min\n")
        self._write("CHANGELOG.md", "# Changelog\n\n## [1.0.0] - 2026-09-09\n- Primera versión.\n")

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def _write(self, rel, content):
        path = os.path.join(self.root, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)

    def _kinds(self, findings, gate=None):
        return [kind for g, _, kind, _ in findings.items if gate is None or g == gate]

    def test_conforming_project_reports_zero_findings(self):
        findings, checked = run_checks(self.root)

        self.assertEqual(findings.items, [])
        self.assertEqual(checked, 17)

    # kpi
    def test_prose_kpis_without_table_are_detected(self):
        self._write("docs/01_product_definition/02_prd.md", "# PRD\n\n* **Merma:** bajar un 30% en 90 días.\n")

        findings, _ = run_checks(self.root)

        self.assertIn("sin tabla de KPIs medible", self._kinds(findings, "kpi"))

    def test_kpi_missing_source_and_bad_date_are_detected(self):
        self._write("docs/01_product_definition/02_prd.md",
                    KPI_TABLE.replace("| Auditoría física semanal |", "|  |").replace("2099-12-10", "en 90 días"))

        findings, _ = run_checks(self.root)

        kinds = self._kinds(findings, "kpi")
        self.assertIn("KPI sin 'fuente de datos'", kinds)
        self.assertIn("fecha de revisión no es AAAA-MM-DD", kinds)

    def test_absent_kpi_documents_are_not_required(self):
        os.remove(os.path.join(self.root, "docs/01_product_definition/02_prd.md"))

        findings, _ = run_checks(self.root)

        self.assertEqual(self._kinds(findings, "kpi"), [])

    # historia
    def test_story_with_status_outside_vocabulary_is_detected(self):
        self._write("docs/05_agile_planning/11_user_stories/stock/US-001.md", STORY.replace("status: approved", "status: DONE"))

        findings, _ = run_checks(self.root)

        self.assertIn("status fuera del vocabulario", self._kinds(findings, "historia"))

    def test_story_with_fewer_than_three_scenarios_is_detected(self):
        two = STORY.split("### Escenario 3")[0] + "## Criterios de Aceptación No Funcionales (NFRs)\n- x\n"
        self._write("docs/05_agile_planning/11_user_stories/stock/US-001.md", two)

        findings, _ = run_checks(self.root)

        self.assertIn("menos de 3 escenarios", self._kinds(findings, "historia"))

    def test_story_with_legacy_frontmatter_and_no_nfr_is_detected(self):
        legacy = STORY.replace("document: user_story\nid: US-001\nversion: 1.0.0\n", "user_story: US-001\n")
        legacy = legacy.replace("## Criterios de Aceptación No Funcionales (NFRs)", "## Notas")
        self._write("docs/05_agile_planning/11_user_stories/stock/US-001.md", legacy)

        findings, _ = run_checks(self.root)

        kinds = self._kinds(findings, "historia")
        self.assertIn("document distinto de 'user_story'", kinds)
        self.assertIn("id ausente o distinto del nombre de archivo", kinds)
        self.assertIn("sin sección de NFRs", kinds)

    # ready
    def test_ticket_over_five_points_and_fullstack_is_detected(self):
        self._write("docs/05_agile_planning/12_tickets/stock/backend/TK-001.md",
                    TICKET.replace("points: 3", "points: 8").replace("type: backend", "type: fullstack"))

        findings, _ = run_checks(self.root)

        kinds = self._kinds(findings, "ready")
        self.assertIn("points fuera de 1/2/3/5 (máximo 5, SK-12)", kinds)
        self.assertIn("type distinto de backend/frontend (SK-12 no mezcla capas)", kinds)

    def test_ticket_missing_autonomy_section_is_detected_even_with_emoji_headings(self):
        self._write("docs/05_agile_planning/12_tickets/stock/backend/TK-001.md",
                    TICKET.split("## 🤖 Instrucciones")[0])

        findings, _ = run_checks(self.root)

        self.assertEqual(self._kinds(findings, "ready"), ["sin sección 'Instrucciones de Ejecución Autónoma'"])

    def test_ticket_related_story_must_exist_unless_justified_na(self):
        self._write("docs/05_agile_planning/12_tickets/stock/backend/TK-001.md",
                    TICKET.replace("related_story: US-001", "related_story: US-001 · US-099 · AUDIT-DEV-006"))
        self._write("docs/05_agile_planning/12_tickets/stock/backend/TK-002.md",
                    TICKET.replace("id: TK-001", "id: TK-002").replace("related_story: US-001", "related_story: N/A (Técnico — Deuda)"))
        self._write("docs/05_agile_planning/13_matriz_trazabilidad.md",
                    MATRIX + "| REQ-002 | — | [TK-002](12_tickets/stock/backend/TK-002.md) |\n")

        findings, _ = run_checks(self.root)

        self.assertEqual(
            [(os.path.basename(p), k, d) for g, p, k, d in findings.items],
            [("TK-001.md", "related_story apunta a una historia que no existe", "US-099")],
        )

    def test_abbreviated_section_titles_count_as_present(self):
        self._write("docs/05_agile_planning/12_tickets/stock/backend/TK-001.md",
                    TICKET.replace("## Alcance de Modificación (Hexagonal Layers)", "## 🔀 Alcance (Hexagonal)")
                          .replace("## Criterios de Aceptación & DoD (Definition of Done)", "## ✅ DoD"))

        findings, _ = run_checks(self.root)

        self.assertEqual(findings.items, [])

    def test_audit_reference_justifies_ticket_without_story(self):
        self._write("docs/05_agile_planning/12_tickets/stock/backend/TK-001.md",
                    TICKET.replace("related_story: US-001", "related_story: AUDIT-SEC-003"))
        self._write("docs/05_agile_planning/12_tickets/stock/backend/TK-002.md",
                    TICKET.replace("id: TK-001", "id: TK-002").replace("related_story: US-001", "related_story: pre-entrega"))
        self._write("docs/05_agile_planning/13_matriz_trazabilidad.md",
                    MATRIX + "| REQ-002 | — | [TK-002](12_tickets/stock/backend/TK-002.md) |\n")

        findings, _ = run_checks(self.root)

        self.assertEqual([(os.path.basename(p), k) for g, p, k, d in findings.items],
                         [("TK-002.md", "related_story sin historia, auditoría ni 'N/A' justificado")])

    # trazabilidad
    def test_artifact_mentioned_without_link_is_distinguished_from_absent(self):
        self._write("docs/05_agile_planning/12_tickets/stock/frontend/TK-001-FE.md",
                    TICKET.replace("id: TK-001", "id: TK-001-FE").replace("type: backend", "type: frontend"))
        self._write("docs/05_agile_planning/12_tickets/stock/frontend/TK-002-FE.md",
                    TICKET.replace("id: TK-001", "id: TK-002-FE").replace("type: backend", "type: frontend"))
        self._write("docs/05_agile_planning/13_matriz_trazabilidad.md", MATRIX + "| REQ-002 | — | `TK-001-FE` |\n")

        findings, _ = run_checks(self.root)

        self.assertEqual(sorted((os.path.basename(p), k) for g, p, k, d in findings.items), [
            ("TK-001-FE.md", "aparece en la matriz sin enlace a su archivo"),
            ("TK-002-FE.md", "no aparece en la matriz de trazabilidad"),
        ])

    def test_story_not_in_matrix_and_broken_matrix_link_are_detected(self):
        self._write("docs/05_agile_planning/11_user_stories/stock/US-002.md", STORY.replace("id: US-001", "id: US-002"))
        self._write("docs/05_agile_planning/13_matriz_trazabilidad.md",
                    MATRIX + "| REQ-009 | [US-009](11_user_stories/stock/US-009.md) | — |\n")

        findings, _ = run_checks(self.root)

        kinds = self._kinds(findings, "trazabilidad")
        self.assertIn("no aparece en la matriz de trazabilidad", kinds)
        self.assertIn("enlace roto en la matriz", kinds)

    def test_accepted_adr_orphan_or_pointing_to_missing_ticket_is_detected(self):
        self._write("docs/02_architecture_design/adr/ADR-001-decision.md",
                    ADR.replace("[`TK-001`](../../05_agile_planning/12_tickets/stock/backend/TK-001.md)", "— pendiente de cascada de spec"))
        self._write("docs/02_architecture_design/adr/ADR-002-other.md", ADR.replace("TK-001", "TK-777"))

        findings, _ = run_checks(self.root)

        kinds = self._kinds(findings, "trazabilidad")
        self.assertIn("ADR aceptado huérfano: 'Implementado por' no nombra historias ni tickets", kinds)
        self.assertIn("ADR aceptado apunta a un artefacto que no existe", kinds)

    def test_proposed_adr_is_not_checked(self):
        self._write("docs/02_architecture_design/adr/ADR-001-decision.md",
                    ADR.replace("status: accepted", "status: proposed").replace("TK-001", "TK-777"))

        findings, _ = run_checks(self.root)

        self.assertEqual(findings.items, [])

    # validación (etapa 2)
    STORY_PATH = "docs/05_agile_planning/11_user_stories/stock/US-001.md"
    EXP_PATH = "docs/01_product_definition/experiments/EXP-001-apertura-duplicada.md"

    def test_open_story_without_validation_or_value_risk_is_detected(self):
        self._write(self.STORY_PATH, STORY.replace("value_risk: bajo\n", "").replace("validation: exenta — mejora interna sin riesgo de valor\n", ""))

        findings, _ = run_checks(self.root)

        kinds = self._kinds(findings, "historia")
        self.assertIn("value_risk fuera de alto/medio/bajo", kinds)
        self.assertIn("sin validation: declara un EXP-NNN o 'exenta — motivo'", kinds)

    def test_done_story_is_not_required_to_declare_validation(self):
        legacy = STORY.replace("status: approved", "status: done").replace("value_risk: bajo\n", "")
        self._write(self.STORY_PATH, legacy.replace("validation: exenta — mejora interna sin riesgo de valor\n", ""))

        findings, _ = run_checks(self.root)

        self.assertEqual(findings.items, [])

    def test_high_value_risk_cannot_be_exempted(self):
        self._write(self.STORY_PATH, STORY.replace("value_risk: bajo", "value_risk: alto"))

        findings, _ = run_checks(self.root)

        self.assertIn("riesgo de valor alto exige un experimento: la exención no vale", self._kinds(findings, "historia"))

    def test_exemption_without_reason_is_detected(self):
        self._write(self.STORY_PATH, STORY.replace("validation: exenta — mejora interna sin riesgo de valor", "validation: exenta"))

        findings, _ = run_checks(self.root)

        self.assertIn("exención sin motivo", self._kinds(findings, "historia"))

    def test_approved_story_needs_an_existing_experiment_decided_to_proceed(self):
        self._write(self.STORY_PATH, STORY.replace("validation: exenta — mejora interna sin riesgo de valor", "validation: EXP-001"))
        self._write("docs/05_agile_planning/11_user_stories/stock/US-002.md",
                    STORY.replace("id: US-001", "id: US-002").replace("validation: exenta — mejora interna sin riesgo de valor", "validation: EXP-404"))
        self._write("docs/05_agile_planning/13_matriz_trazabilidad.md",
                    MATRIX + "| REQ-002 | [US-002](11_user_stories/stock/US-002.md) | — |\n")

        findings, _ = run_checks(self.root)

        self.assertEqual(sorted((os.path.basename(p), k) for g, p, k, d in findings.items), [
            ("US-001.md", "historia aprobada con un experimento cuya decisión no es 'seguir'"),
            ("US-002.md", "validation apunta a un experimento que no existe"),
        ])

    def test_story_backed_by_concluded_experiment_passes(self):
        self._write(self.STORY_PATH, STORY.replace("validation: exenta — mejora interna sin riesgo de valor", "validation: EXP-001").replace("value_risk: bajo", "value_risk: alto"))
        self._write(self.EXP_PATH, CONCLUDED)
        self._write("docs/01_product_definition/experiments/evidence/EXP-001/entrevista-01.md", "Cocinero de línea A consultó la lista.\n")

        findings, _ = run_checks(self.root)

        self.assertEqual(findings.items, [])

    def test_concluded_experiment_without_evidence_is_detected(self):
        self._write(self.EXP_PATH, CONCLUDED)

        findings, _ = run_checks(self.root)

        self.assertIn("experimento concluido sin evidencia en experiments/evidence/EXP-001/", self._kinds(findings, "experimento"))

    def test_result_dated_before_criteria_lock_is_detected(self):
        self._write(self.EXP_PATH, CONCLUDED.replace("result_on: 2026-09-10", "result_on: 2026-08-20"))
        self._write("docs/01_product_definition/experiments/evidence/EXP-001/notas.md", "notas\n")

        findings, _ = run_checks(self.root)

        self.assertIn("resultado anterior a la fecha en que se fijó el criterio", self._kinds(findings, "experimento"))

    def test_decision_before_concluding_is_detected(self):
        self._write(self.EXP_PATH, EXPERIMENT.replace("decision: pendiente", "decision: seguir"))

        findings, _ = run_checks(self.root)

        self.assertIn("decisión tomada antes de concluir el experimento", self._kinds(findings, "experimento"))

    def test_proceeding_with_insufficient_sample_is_detected(self):
        self._write(self.EXP_PATH, CONCLUDED.replace("sample_obtained: 5", "sample_obtained: 2"))
        self._write("docs/01_product_definition/experiments/evidence/EXP-001/notas.md", "notas\n")

        findings, _ = run_checks(self.root)

        self.assertIn("muestra menor que la objetivo: la decisión debe ser 'no_concluyente'", self._kinds(findings, "experimento"))

    def test_experiment_with_invalid_enums_and_missing_criterion_is_detected(self):
        broken = EXPERIMENT.replace("method: entrevista", "method: intuición").replace("## Criterio de éxito", "## Notas")
        self._write(self.EXP_PATH, broken)

        findings, _ = run_checks(self.root)

        kinds = self._kinds(findings, "experimento")
        self.assertIn("method fuera del vocabulario", kinds)
        self.assertIn("sin sección 'Criterio de éxito'", kinds)

    def test_personal_data_in_evidence_is_detected(self):
        self._write(self.EXP_PATH, CONCLUDED)
        self._write("docs/01_product_definition/experiments/evidence/EXP-001/entrevista-01.md",
                    "Contacto: maria.lopez@restaurante.com, +34 612 345 678\n")

        findings, _ = run_checks(self.root)

        self.assertIn("posibles datos personales en la evidencia (correo o teléfono)", self._kinds(findings, "experimento"))

    def test_changed_evidence_file_checks_its_experiment(self):
        self._write(self.EXP_PATH, CONCLUDED.replace("sample_obtained: 5", "sample_obtained: 2"))
        evidence = "docs/01_product_definition/experiments/evidence/EXP-001/notas.md"
        self._write(evidence, "notas\n")

        findings, checked = run_checks(self.root, scope={evidence})

        self.assertEqual(checked, 1)
        self.assertIn("muestra menor que la objetivo: la decisión debe ser 'no_concluyente'", self._kinds(findings, "experimento"))

    # postmortem (etapa 10)
    def test_postmortem_with_invalid_enums_and_resolution_before_detection_is_detected(self):
        self._write(PM_PATH, POSTMORTEM.replace("severity: alta", "severity: grave")
                    .replace("resolved_at: 2026-09-09T18:54:00-03:00", "resolved_at: 2026-09-09T17:00:00-03:00"))

        findings, _ = run_checks(self.root)

        kinds = self._kinds(findings, "postmortem")
        self.assertIn("severity fuera del vocabulario", kinds)
        self.assertIn("resolved_at anterior a detected_at", kinds)

    def test_postmortem_without_gate_analysis_or_timed_timeline_is_detected(self):
        broken = POSTMORTEM.replace("## Por qué ningún gate lo detectó", "## Notas").replace("- 18:54 — servicio en vivo (fuente: commit)\n", "")
        self._write(PM_PATH, broken)

        findings, _ = run_checks(self.root)

        kinds = self._kinds(findings, "postmortem")
        self.assertIn("sin sección 'Por qué ningún gate lo detectó'", kinds)
        self.assertIn("línea de tiempo con menos de 2 hitos con hora", kinds)

    def test_closed_postmortem_actions_must_be_traced(self):
        self._write(PM_PATH, POSTMORTEM.replace("— TK-001", "— TK-777").replace(
            "- Documentar la limitación de la plataforma — sin acción — ya quedó registrada en el blueprint",
            "- Revisar el resto de variables"))

        findings, _ = run_checks(self.root)

        self.assertEqual(sorted(self._kinds(findings, "postmortem")), [
            "acción apunta a un ticket que no existe",
            "acción sin ticket ni 'sin acción — motivo'",
        ])

    def test_draft_postmortem_actions_are_not_yet_required(self):
        self._write(PM_PATH, POSTMORTEM.replace("status: closed", "status: draft").replace("— TK-001", ""))

        findings, _ = run_checks(self.root, today=date(2026, 9, 12))

        self.assertEqual(findings.items, [])

    def test_mandatory_draft_postmortem_past_five_days_is_detected(self):
        draft = POSTMORTEM.replace("status: closed", "status: draft")
        self._write(PM_PATH, draft)

        within, _ = run_checks(self.root, today=date(2026, 9, 14))
        overdue, _ = run_checks(self.root, today=date(2026, 9, 15))
        self._write(PM_PATH, draft.replace("severity: alta", "severity: media"))
        minor, _ = run_checks(self.root, today=date(2026, 10, 1))

        self.assertEqual(self._kinds(within, "postmortem"), [])
        self.assertIn("postmortem obligatorio sin cerrar pasados 5 días de la resolución", self._kinds(overdue, "postmortem"))
        self.assertEqual(self._kinds(minor, "postmortem"), [])

    # resultado (etapa 11)
    def test_outcome_verdict_without_data_or_outside_vocabulary_is_detected(self):
        os.remove(os.path.join(self.root, OUT_DATA))
        self._write(OUT_PATH, OUTCOME.replace("| -34% | cumplido |\n", "| -34% | cumplido |\n| Rotación de remanentes | 96 h | < 72 h | 70 h | aprobado |\n"))

        findings, _ = run_checks(self.root)

        kinds = self._kinds(findings, "resultado")
        self.assertIn("veredicto sin datos en outcomes/data/OUT-001/", kinds)
        self.assertIn("veredicto fuera del vocabulario", kinds)

    def test_unmeasurable_kpi_needs_no_value_or_data(self):
        os.remove(os.path.join(self.root, OUT_DATA))
        self._write(OUT_PATH, OUTCOME.replace("| 12% | -30% | -34% | cumplido |", "| — | — |  | no_medible |"))

        findings, _ = run_checks(self.root)

        self.assertEqual(findings.items, [])

    def test_outcome_recommendation_must_match_status(self):
        self._write(OUT_PATH, OUTCOME.replace("recommendation: mantener", "recommendation: pendiente"))
        self._write("docs/01_product_definition/outcomes/OUT-002-otro.md",
                    OUTCOME.replace("id: OUT-001", "id: OUT-002").replace("status: closed", "status: draft"))
        self._write("docs/01_product_definition/outcomes/data/OUT-002/merma.csv", "x\n")

        findings, _ = run_checks(self.root)

        self.assertEqual(sorted(self._kinds(findings, "resultado")), [
            "informe cerrado sin recomendación",
            "recomendación escrita antes de cerrar el informe",
        ])

    def test_outcome_with_missing_source_doc_or_verdict_table_is_detected(self):
        self._write(OUT_PATH, OUTCOME.replace("docs/01_product_definition/02_prd.md", "docs/01_product_definition/99_nada.md")
                    .replace("| KPI | Línea base | Umbral de éxito | Valor medido | Veredicto |", "| Métrica | Valor |"))

        findings, _ = run_checks(self.root)

        kinds = self._kinds(findings, "resultado")
        self.assertIn("source_doc no existe", kinds)
        self.assertIn("sin tabla de veredicto por KPI", kinds)

    def test_kpi_past_review_date_without_outcome_report_closes_the_loop(self):
        self._write("docs/01_product_definition/02_prd.md",
                    KPI_TABLE.replace("2099-12-10", "2026-09-01") + "| Rotación de remanentes | Registro de consumo | 96 h | < 72 h | 30 días | 2026-09-01 |\n")

        findings, _ = run_checks(self.root, today=date(2026, 9, 13))
        before_review, _ = run_checks(self.root, today=date(2026, 8, 31))

        self.assertEqual([(k, d) for g, p, k, d in findings.items if g == "resultado"],
                         [("KPI con fecha de revisión vencida sin informe de resultados", "Rotación de remanentes")])
        self.assertEqual(self._kinds(before_review, "resultado"), [])

    def test_personal_data_in_outcome_data_is_detected(self):
        self._write(OUT_DATA, "cliente,correo\nA,ana@example.com\n")

        findings, _ = run_checks(self.root)

        self.assertIn("posibles datos personales en los datos (correo o teléfono)", self._kinds(findings, "resultado"))

    def test_changed_outcome_data_checks_its_report(self):
        self._write(OUT_PATH, OUTCOME.replace("recommendation: mantener", "recommendation: pendiente"))

        findings, checked = run_checks(self.root, scope={OUT_DATA})

        self.assertEqual(checked, 1)
        self.assertIn("informe cerrado sin recomendación", self._kinds(findings, "resultado"))

    # release (etapa 8)
    def _release(self, content):
        self._write(RELEASE_PATH, content)

    def test_full_release_without_justification_or_matching_filename_is_detected(self):
        self._release(RELEASE.replace('strategy_justification: "Primer despliegue, sin usuarios todavía"', 'strategy_justification: ""')
                      .replace("release: 1.0.0", "release: 1.0.1"))

        findings, _ = run_checks(self.root)

        kinds = self._kinds(findings, "release")
        self.assertIn("estrategia 'completo' sin justificación", kinds)
        self.assertIn("release distinto de la versión del nombre de archivo", kinds)

    def test_included_tickets_must_exist_and_be_done(self):
        self._release(RELEASE.replace("- TK-003 — Entrega inicial", "- TK-003 — Entrega inicial\n- TK-001 — Endpoint\n- TK-404 — Fantasma"))

        findings, _ = run_checks(self.root)

        self.assertEqual(sorted((k, d) for g, p, k, d in findings.items if g == "release"), [
            ("ticket incluido que no existe", "TK-404"),
            ("ticket incluido sin cerrar", "TK-001: approved"),
        ])

    def test_empty_release_notes_and_rollback_plan_are_detected(self):
        self._release(RELEASE.replace("Primera versión disponible: registro de extracciones y tablero de remanentes.", "")
                      .replace("Volver a desplegar el commit anterior desde la plataforma, sin cambios de datos.", ""))

        findings, _ = run_checks(self.root)

        kinds = self._kinds(findings, "release")
        self.assertIn("notas de versión vacías", kinds)
        self.assertIn("plan de rollback vacío", kinds)

    def test_migrations_must_be_classified_and_contract_needs_a_deployed_expand(self):
        with_migration = (RELEASE.replace("includes_migration: no", "includes_migration: si")
                          .replace("rollback_rehearsed_on:", "rollback_rehearsed_on: 2026-09-08")
                          .replace("## Verificación previa al despliegue",
                                   "## Migraciones\n- renombrar columna de stock\n- contract: quitar columna antigua — expand en v0.9.0\n\n## Verificación previa al despliegue"))
        self._release(with_migration)

        findings, _ = run_checks(self.root)
        self._write("docs/06_release_and_operations/releases/v0.9.0.md",
                    RELEASE.replace("release: 1.0.0", "release: 0.9.0").replace("# Release v1.0.0", "# Release v0.9.0"))
        self._write("CHANGELOG.md", "# Changelog\n\n## [1.0.0] - 2026-09-09\n\n## [0.9.0] - 2026-09-01\n")
        with_expand, _ = run_checks(self.root)

        self.assertEqual(sorted((k, d) for g, p, k, d in findings.items if g == "release"), [
            ("contract sin su expand desplegado en un release anterior", "v0.9.0"),
            ("migración sin clasificar (expand, contract o datos)", "renombrar columna de stock"),
        ])
        self.assertEqual([k for g, p, k, d in with_expand.items if g == "release"],
                         ["migración sin clasificar (expand, contract o datos)"])

    def test_flag_strategy_needs_a_removal_ticket_per_flag(self):
        self._release(RELEASE.replace("strategy: completo", "strategy: flag")
                      .replace("## Verificación previa al despliegue",
                               "## Feature flags\n- nuevo-tablero — retirada en TK-003\n- exportar-csv — pendiente\n\n## Verificación previa al despliegue"))

        findings, _ = run_checks(self.root)

        self.assertEqual([(k, d) for g, p, k, d in findings.items if g == "release"],
                         [("flag sin ticket de retirada", "exportar-csv — pendiente")])

    def test_rollback_rehearsal_is_required_for_deploy_config_changes_and_must_precede_deploy(self):
        self._release(RELEASE.replace("changes_deploy_config: no", "changes_deploy_config: si"))
        missing, _ = run_checks(self.root)
        self._release(RELEASE.replace("changes_deploy_config: no", "changes_deploy_config: si")
                      .replace("rollback_rehearsed_on:", "rollback_rehearsed_on: 2026-09-10"))
        late, _ = run_checks(self.root)

        self.assertIn("requiere ensayo de rollback (hay migración o cambio de despliegue)", self._kinds(missing, "release"))
        self.assertIn("ensayo de rollback posterior al despliegue", self._kinds(late, "release"))

    def test_deployed_release_needs_matching_tag_and_changelog_section(self):
        os.remove(os.path.join(self.root, "CHANGELOG.md"))

        without, _ = run_checks(self.root, tags=set())
        self._write("CHANGELOG.md", "# Changelog\n\n## [1.0.0] - 2026-09-09\n")
        coherent, _ = run_checks(self.root, tags={"v1.0.0"})

        self.assertEqual(sorted(self._kinds(without, "release")), [
            "release desplegado sin etiqueta git v1.0.0",
            "release desplegado sin sección en CHANGELOG.md",
        ])
        self.assertEqual(self._kinds(coherent, "release"), [])

    def test_planned_release_does_not_need_deploy_evidence_yet(self):
        planned = (RELEASE.replace("status: deployed", "status: planned").replace("deployed_at: 2026-09-09T18:54:00-03:00", "deployed_at:")
                   .replace("Workflow 08 en PASS: salud 200 y rutas protegidas responden 401.", ""))
        self._release(planned)
        os.remove(os.path.join(self.root, "CHANGELOG.md"))

        findings, _ = run_checks(self.root, tags=set())

        self.assertEqual(findings.items, [])

    def test_changed_scope_checks_only_the_release(self):
        self._release(RELEASE.replace('strategy_justification: "Primer despliegue, sin usuarios todavía"', 'strategy_justification: ""'))

        findings, checked = run_checks(self.root, scope={RELEASE_PATH})

        self.assertEqual(checked, 1)
        self.assertEqual(self._kinds(findings), ["estrategia 'completo' sin justificación"])

    # operación (etapa 9)
    def test_deployed_service_without_slos_or_backup_is_detected(self):
        os.remove(os.path.join(self.root, SLOS_PATH))
        os.remove(os.path.join(self.root, BACKUP_PATH))

        findings, _ = run_checks(self.root)

        kinds = self._kinds(findings, "operacion")
        self.assertIn("servicio desplegado sin slos.md", kinds)
        self.assertIn("servicio desplegado sin backup_and_recovery.md", kinds)

    def test_slo_table_gaps_are_detected(self):
        broken = (SLOS.replace("| Latencia del registro | p95 de POST de extracción | < 300 ms | 30 días | monitor declarado | RB-002 | disponible |",
                               "| Errores de pago | % de pagos fallidos | < 1% | 30 días | monitor declarado |  | quemado |")
                  .replace("| RB-001 |", "| RB-009 |").replace("## Política de presupuesto de error", "## Notas"))
        self._write(SLOS_PATH, broken)

        findings, _ = run_checks(self.root)

        kinds = self._kinds(findings, "operacion")
        for expected in ("falta SLO de latencia", "SLO sin alerta que lo mida", "alerta apunta a un runbook que no existe",
                         "presupuesto fuera del vocabulario", "sin sección 'Política de presupuesto de error'"):
            self.assertIn(expected, kinds)

    def test_runbook_never_successfully_drilled_is_detected(self):
        self._write(f"{OPS}/drills/DRILL-003-ensayo.md", drill("DRILL-003", "runbook", "RB-002", result="fallido"))

        findings, _ = run_checks(self.root)

        self.assertEqual([(k, os.path.basename(p)) for g, p, k, d in findings.items if g == "operacion"],
                         [("runbook nunca ensayado con éxito", "RB-002-latencia.md")])

    def test_backup_restore_drill_must_exist_be_recent_and_meet_rto(self):
        self._write(f"{OPS}/drills/DRILL-001-ensayo.md", drill("DRILL-001", "restauracion", "backup", measured_rto="5 h"))
        slow, _ = run_checks(self.root, today=date(2026, 9, 13))
        self._write(f"{OPS}/drills/DRILL-001-ensayo.md", drill("DRILL-001", "restauracion", "backup"))
        stale, _ = run_checks(self.root, today=date(2026, 12, 1))
        self._write(f"{OPS}/drills/DRILL-001-ensayo.md", drill("DRILL-001", "restauracion", "backup", result="fallido"))
        never, _ = run_checks(self.root, today=date(2026, 9, 13))

        self.assertIn("restauración más lenta que el RTO", self._kinds(slow, "operacion"))
        self.assertIn("último simulacro de restauración exitoso hace más de 90 días", self._kinds(stale, "operacion"))
        self.assertIn("backup sin simulacro de restauración exitoso", self._kinds(never, "operacion"))

    def test_drill_without_evidence_or_measurement_or_coherent_target_is_detected(self):
        os.remove(os.path.join(self.root, f"{OPS}/drills/evidence/DRILL-002/salida.txt"))
        self._write(f"{OPS}/drills/DRILL-001-ensayo.md", drill("DRILL-001", "restauracion", "backup", measured_rto=None))
        self._write(f"{OPS}/drills/DRILL-004-ensayo.md", drill("DRILL-004", "alerta", "backup"))
        self._write(f"{OPS}/drills/evidence/DRILL-004/salida.txt", "ok\n")

        findings, _ = run_checks(self.root)

        kinds = self._kinds(findings, "operacion")
        self.assertIn("simulacro sin evidencia en drills/evidence/DRILL-002/", kinds)
        self.assertIn("simulacro de restauración sin measured_rto", kinds)
        self.assertIn("target incoherente con el tipo de simulacro", kinds)

    def test_personal_data_in_drill_evidence_is_detected(self):
        self._write(f"{OPS}/drills/evidence/DRILL-001/salida.txt", "restaurado por soporte@example.com\n")

        findings, _ = run_checks(self.root)

        self.assertIn("posibles datos personales en la evidencia (correo o teléfono)", self._kinds(findings, "operacion"))

    def test_changed_drill_evidence_triggers_operations_check(self):
        self._write(f"{OPS}/drills/DRILL-003-ensayo.md", drill("DRILL-003", "runbook", "RB-002", result="fallido"))

        findings, checked = run_checks(self.root, scope={f"{OPS}/drills/evidence/DRILL-003/salida.txt"})

        self.assertGreater(checked, 0)
        self.assertIn("runbook nunca ensayado con éxito", self._kinds(findings, "operacion"))

    def test_exhausted_error_budget_blocks_features_in_a_planned_release(self):
        self._write(SLOS_PATH, SLOS.replace("| RB-001 | disponible |", "| RB-001 | agotado |"))
        self._write("docs/05_agile_planning/12_tickets/stock/backend/TK-004.md",
                    TICKET.replace("id: TK-001", "id: TK-004").replace("status: approved", "status: done")
                    .replace("related_story: US-001", "related_story: N/A (Técnico — corrección)"))
        self._write("docs/05_agile_planning/13_matriz_trazabilidad.md", MATRIX + "| REQ-004 | — | [TK-004](12_tickets/stock/backend/TK-004.md) |\n")
        self._write("docs/05_agile_planning/12_tickets/stock/backend/TK-003.md",
                    TICKET.replace("id: TK-001", "id: TK-003").replace("status: approved", "status: done"))
        planned = (RELEASE.replace("release: 1.0.0", "release: 1.1.0").replace("# Release v1.0.0", "# Release v1.1.0")
                   .replace("status: deployed", "status: planned").replace("deployed_at: 2026-09-09T18:54:00-03:00", "deployed_at:")
                   .replace("- TK-003 — Entrega inicial", "- TK-003 — Nueva función\n- TK-004 — Corrección"))
        self._write("docs/06_release_and_operations/releases/v1.1.0.md", planned)

        findings, _ = run_checks(self.root)

        self.assertEqual([(k, d) for g, p, k, d in findings.items if g == "release"],
                         [("presupuesto de error agotado: el release incluye funcionalidades", "TK-003")])

    # modos
    def test_changed_scope_ignores_untouched_debt(self):
        self._write("docs/05_agile_planning/12_tickets/stock/backend/TK-001.md", TICKET.replace("points: 3", "points: 13"))

        findings, checked = run_checks(self.root, scope={"docs/05_agile_planning/11_user_stories/stock/US-001.md"})

        self.assertEqual(findings.items, [])
        self.assertEqual(checked, 1)

    def test_ticket_mode_checks_only_that_ticket_and_reports_missing_ticket(self):
        self._write("docs/05_agile_planning/11_user_stories/stock/US-001.md", STORY.replace("status: approved", "status: DONE"))

        findings, checked = run_checks(self.root, ticket="TK-001")
        missing, _ = run_checks(self.root, ticket="TK-404")

        self.assertEqual(findings.items, [])
        self.assertEqual(checked, 1)
        self.assertIn("el ticket no existe: primero la cascada de spec (Guard 26)", self._kinds(missing))


if __name__ == "__main__":
    unittest.main()
