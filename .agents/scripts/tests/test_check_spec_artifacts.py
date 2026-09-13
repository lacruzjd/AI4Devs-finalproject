#!/usr/bin/env python3
import os
import sys
import shutil
import tempfile
import unittest

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(__file__), "..")))
from check_spec_artifacts import run_checks  # noqa: E402

KPI_TABLE = """# PRD

## Objetivos de Negocio y KPIs

| KPI | Fuente de datos | Línea base | Umbral de éxito | Ventana | Fecha de revisión |
|---|---|---|---|---|---|
| Merma desconocida | Auditoría física semanal | 12% | -30% | 90 días | 2026-12-10 |
"""

STORY = """---
document: user_story
id: US-001
version: 1.0.0
status: approved
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
"""

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
        self.assertEqual(checked, 5)

    # kpi
    def test_prose_kpis_without_table_are_detected(self):
        self._write("docs/01_product_definition/02_prd.md", "# PRD\n\n* **Merma:** bajar un 30% en 90 días.\n")

        findings, _ = run_checks(self.root)

        self.assertIn("sin tabla de KPIs medible", self._kinds(findings, "kpi"))

    def test_kpi_missing_source_and_bad_date_are_detected(self):
        self._write("docs/01_product_definition/02_prd.md",
                    KPI_TABLE.replace("| Auditoría física semanal |", "|  |").replace("2026-12-10", "en 90 días"))

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
