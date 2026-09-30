# Actualizar momoy en un proyecto

Qué hacer al pasar un proyecto a una versión de momoy que cambia rutas. El procedimiento general de actualización está en la sección 0 del [README](README.md); aquí están solo las equivalencias que necesitas cuando la versión nueva rompe algo que el proyecto cita.

---

## De 3.x a 4.0.0

En 4.0.0 cambia una sola cosa: los procedimientos `SK-NN` salen de `.agents/skills/` y pasan a `.agents/procedures/`. `.agents/skills/` queda solo para los comandos `/momoy-*` del estándar Agent Skills, así que el nombre del directorio vuelve a decir qué contiene. Los IDs `SK-NN`, los nombres de archivo, las carpetas de fase y los comandos no cambian.

| Antes | Ahora |
|:---|:---|
| `.agents/skills/specs/<fase>/SK-NN_<slug>.md` | `.agents/procedures/specs/<fase>/SK-NN_<slug>.md` |
| `.agents/skills/development/<fase>/SK-NN_<slug>.md` | `.agents/procedures/development/<fase>/SK-NN_<slug>.md` |

### Pasos

1. Reinstala `.agents/` y regenera las copias de los comandos: `bash .agents/scripts/sync_claude_skills.sh`. `install.sh` exige borrar `.agents/` antes de reinstalar, así que los directorios antiguos desaparecen. Si actualizas copiando encima, borra a mano `.agents/skills/specs/` y `.agents/skills/development/`: `check_skill_standard.py` ya no los exceptúa y los informa como directorios sin `SKILL.md`.
2. Busca las rutas antiguas fuera de `.agents/`:
   ```bash
   grep -rln "\.agents/skills/\(specs\|development\)/" --exclude-dir=.agents --exclude-dir=node_modules .
   ```
3. Reescríbelas. Es un cambio de prefijo, sin excepciones:
   ```bash
   grep -rlZ "skills/\(specs\|development\)/" --exclude-dir=.agents --exclude-dir=node_modules --exclude-dir=.git . \
     | xargs -0 sed -i 's#skills/specs/#procedures/specs/#g; s#skills/development/#procedures/development/#g'
   ```
   Revisa antes los resultados del paso 2: si el proyecto tiene su propio directorio `skills/specs/` o `skills/development/` ajeno a momoy, exclúyelo.
4. Corre los gates y revisa el diff antes de commitear.

Si vienes de 2.x, aplica primero la sección de 3.0.0 y después esta. Las tablas de 3.0.0 muestran las rutas bajo `skills/`, que eran las vigentes entonces.

---

## De 2.x a 3.0.0

En 3.0.0 cambian tres cosas: los workflows se renumeran en el orden del ciclo, siete procedimientos se renombran para que su nombre sea una acción y cinco artefactos de `docs/` pasan a inglés.

### Pasos

1. Reinstala `.agents/` y regenera las copias de los comandos: `bash .agents/scripts/sync_claude_skills.sh`.
2. Migra `docs/`: `python3 .agents/scripts/migrate_docs_v3.py` muestra el plan y `--apply` lo ejecuta. Renombra los archivos y reescribe sus referencias en `docs/` y `AGENTS.md`. Si una ruta nueva ya existe, no toca nada de esa ruta y lo informa como conflicto.
3. Busca en el resto del proyecto las rutas de workflows y procedimientos que cambiaron y actualízalas con las tablas de abajo:
   ```bash
   grep -rn "\.agents/workflows/\|\.agents/skills/development/" --exclude-dir=.agents .
   ```
4. Corre los gates. Mientras quede una ruta anterior de `docs/`, el gate `migracion` la informa.
5. Revisa el diff antes de commitear.

Los IDs `SK-NN` y los nombres de los comandos (`/momoy-*`) no cambian.

### Workflows

| Antes | Ahora |
|:---|:---|
| `00_greenfield_bootstrap_workflow.md` | `01_greenfield_bootstrap_workflow.md` |
| `00_brownfield_adoption_workflow.md` | `02_brownfield_adoption_workflow.md` |
| `01_cascading_spec_workflow.md` | `03_cascading_spec_workflow.md` |
| `03_spec_audit_workflow.md` | `04_spec_audit_workflow.md` |
| `02_cascading_dev_workflow.md` | `05_cascading_dev_workflow.md` |
| `05_test_runner_workflow.md` | `06_test_runner_workflow.md` |
| `06_full_qa_pipeline.md` | `07_full_qa_workflow.md` |
| `09_live_stack_verification_workflow.md` | `08_live_stack_verification_workflow.md` |
| `04_dev_audit_workflow.md` | `09_dev_audit_workflow.md` |
| `08_smoke_test_deploy_validation.md` | `11_smoke_test_workflow.md` |
| `07_production_observability_workflow.md` | `12_production_observability_workflow.md` |
| `11_maintenance_workflow.md` | `13_maintenance_workflow.md` |

`00_master_vsdd_workflow.md` y `10_release_workflow.md` no cambian.

### Procedimientos en `skills/development/`

| Antes | Ahora |
|:---|:---|
| `01_rules_extraction/SK-30_legacy_diagram_extractor.md` | `01_rules_extraction/SK-30_extract_legacy_diagrams.md` |
| `01_rules_extraction/SK-31_technical_debt_indexer.md` | `01_rules_extraction/SK-31_index_technical_debt.md` |
| `01_rules_extraction/SK-33_environment_configuration_auditor.md` | `01_rules_extraction/SK-33_audit_environment_configuration.md` |
| `05_quality_and_lint/SK-19_refactor_and_lint.md` | `05_code_quality/SK-19_refactor_and_lint.md` |
| `05_quality_and_lint/SK-23_audit_dependency_security.md` | `05_code_quality/SK-23_audit_dependency_security.md` |
| `05_quality_and_lint/SK-25_audit_contract_validation.md` | `05_code_quality/SK-25_audit_contract_validation.md` |
| `05_quality_and_lint/SK-24_execute_characterization_testing.md` | `08_testing/SK-24_execute_characterization_testing.md` |
| `05_quality_and_lint/SK-32_test_fixture_builder.md` | `08_testing/SK-32_build_test_fixtures.md` |
| `08_testing/SK-34_model_based_testing_designer.md` | `08_testing/SK-34_design_model_based_tests.md` |
| `05_quality_and_lint/SK-22_agent_troubleshooting.md` | `09_agent_support/SK-22_troubleshoot_agent.md` |
| `05_quality_and_lint/SK-26_retrieve_few_shot_context.md` | `09_agent_support/SK-26_retrieve_few_shot_context.md` |
| `07_performance_and_observability/SK-29_load_and_performance_testing.md` | `07_performance_and_observability/SK-29_execute_load_and_performance_testing.md` |

### Artefactos de `docs/`

`migrate_docs_v3.py` hace estos renombres por ti.

| Antes | Ahora |
|:---|:---|
| `docs/01_product_definition/01_glosario_y_reglas_negocio.md` | `docs/01_product_definition/01_glossary_and_business_rules.md` |
| `docs/05_agile_planning/11_user_stories/indice_user_stories.md` | `docs/05_agile_planning/11_user_stories/user_stories_index.md` |
| `docs/05_agile_planning/12_tickets/indice_tickets.md` | `docs/05_agile_planning/12_tickets/tickets_index.md` |
| `docs/05_agile_planning/13_matriz_trazabilidad.md` | `docs/05_agile_planning/13_traceability_matrix.md` |
| `docs/audits/AUDIT-CONTRACT-DISCREPANCIES.md` | `docs/audits/contract_discrepancies.md` |

La matriz de trazabilidad cambia también su tipo de documento: `document: matriz_trazabilidad` pasa a `document: traceability_matrix` (el script lo reescribe).
