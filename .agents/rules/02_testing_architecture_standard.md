# Estándar Profesional de Organización de Arquitectura de Tests (.agents/rules/02_testing_architecture_standard.md)

Este documento instruye la estructura, distribución de capas, patrones de diseño y convenciones de nomenclatura de la **Arquitectura de Pruebas** en proyectos mantenidos por momoy (`.agents/`).

**Qué fija este estándar y qué no.** Fija los principios, que valen para cualquier lenguaje: dónde vive cada tipo de prueba respecto al código, cuánto esfuerzo recibe cada capa y la anatomía de un test. **No fija ninguna tecnología.** El test runner, las librerías de test, la herramienta E2E, las rutas, las extensiones y los patrones de nombre se leen de `docs/00_stack_manifest.md` §5 (Testing), incluida su fila **Ubicación y nombres de tests**, y el comando para ejecutarlos, del §7. Si el manifest no declara la ubicación y los nombres de los tests, detente y pregunta antes de crear el primer archivo de prueba; nunca adoptes la convención de otro proyecto.

---

## 1. Estructura de Carpetas y Ubicación de Pruebas (Directiva Agéntica)

momoy adopta un modelo híbrido: **pruebas de dominio, casos de uso y componentes co-localizadas junto al código** que prueban, y **directorios dedicados para integración y E2E**.

Todo agente de IA o desarrollador DEBE ubicar los nuevos archivos de prueba siguiendo este mapa. Los nombres entre corchetes se sustituyen por los que declara el manifest; la forma (qué va junto al código y qué va aparte) es la regla:

```text
[raíz-del-proyecto]/
├── [directorio-backend]/
│   ├── [código-fuente]/                  # CÓDIGO FUENTE Y TESTS CO-LOCALIZADOS
│   │   ├── domain/                       # 1. Tests unitarios de dominio (sin dependencias externas, milisegundos)
│   │   │   └── [modulo]/
│   │   │       ├── [Entity]
│   │   │       └── [Entity][sufijo-de-test]      <-- co-localizado
│   │   ├── application/                  # 2. Tests de casos de uso (con fakes en memoria)
│   │   │   └── [modulo]/
│   │   │       ├── [UseCase]
│   │   │       └── [UseCase][sufijo-de-test]     <-- co-localizado
│   │   └── infrastructure/               # 3. Tests de adaptadores contra la dependencia real
│   │       └── [adaptador]/
│   │           ├── [Repository]
│   │           └── [Repository][sufijo-de-integración]
│   │
│   └── [directorio-de-tests-de-integración]/   # PRUEBAS DE INTEGRACIÓN DE SERVICIO (transversales)
│       ├── [modulo]/                     # Endpoints o puntos de entrada reales del servicio
│       ├── helpers/                      # Utilidades de test (reset de datos, arranque del servidor de test)
│       └── fixtures/                     # Data Builders y Object Mothers (SK-32)
│
└── [directorio-frontend]/                # Solo si el producto tiene interfaz
    ├── [código-fuente]/
    │   └── [componentes]/                # Tests de componente co-localizados
    └── [directorio-e2e]/                 # PRUEBAS E2E (herramienta E2E declarada)
        ├── config/                       # Entornos y mocks grabados
        ├── fixtures/                     # Datos de prueba y tokens de autenticación sintéticos
        ├── pages/                        # Page Object Models (POM)
        └── specs/                        # Especificaciones E2E (RBT / MBT, SK-34)
```

En un proyecto de un solo paquete, sin separación backend/frontend, el mapa se aplica directamente desde la raíz.

---

## 2. Distribución por Capas de Valor (Testing Trophy)

| Capa | Esfuerzo | Qué protege |
|---|---|---|
| E2E (con Page Object Models) | 10% | Flujos críticos de alto riesgo |
| Integración (HTTP, base de datos, mensajería) | 30% | Contratos de API y persistencia |
| Casos de uso (aplicación con fakes) | 40% | Reglas de negocio |
| Unidad pura (dominio y Value Objects) | 20% | Invariantes y aritmética de precisión |

---

## 3. Anatomía Estándar de un Archivo de Pruebas (AAA + BDD + 3 Oráculos)

Todo test generado o mantenido por momoy DEBE cumplir la anatomía de **3 bloques explícitos**: Arrange (Dado), Act (Cuando) y Assert (Entonces), con el nombre del test describiendo el comportamiento y el ticket que lo origina.

**Ejemplo ilustrativo.** Está escrito en TypeScript con un runner de estilo `describe`/`it` solo para mostrar la estructura; el lenguaje, el runner y la sintaxis reales son los del §5 del manifest.

```typescript
describe('TK-NNN: Reserva de plazas de un evento', () => {
  it('rechaza la reserva cuando no quedan plazas y no altera el aforo', async () => {
    // 1. ARRANGE (Dado): datos deterministas con Object Mother (SK-32)
    const evento = EventoMother.conAforo({ capacidad: 2, reservadas: 2 });
    const fakeEventos = new InMemoryEventoRepository([evento]);
    const useCase = new ReservarPlazaUseCase(fakeEventos);

    // 2. ACT (Cuando): invocación de la acción
    const result = await useCase.execute({ eventoId: evento.id, plazas: 1 });

    // 3. ASSERT (Entonces): verificación con los 3 oráculos
    // ORÁCULO DE ESTADO: el aforo no cambió
    const actualizado = await fakeEventos.findById(evento.id);
    expect(actualizado.reservadas).toBe(2);

    // ORÁCULO DE RESPUESTA: el resultado comunica el rechazo con su motivo
    expect(result.isSuccess).toBe(false);
    expect(result.error.code).toBe('SIN_PLAZAS');
  });
});
```

---

## 4. Convenciones de Nomenclatura

La convención concreta la declara el manifest. Esta tabla fija **qué** debe declararse para cada tipo de prueba; el §5 del manifest dice **cómo** en el proyecto:

| Tipo de Prueba | Ubicación | Patrón de nombre |
|---|---|---|
| **Dominio / VO** | Co-localizado junto a la entidad o Value Object | Nombre de la entidad + sufijo de test declarado |
| **Caso de uso** | Co-localizado junto al caso de uso | Nombre del caso de uso + sufijo de test declarado |
| **Integración de servicio** | Directorio de integración declarado | Nombre de la funcionalidad + sufijo de integración declarado |
| **E2E** | Directorio E2E declarado, subcarpeta `specs/` | Nombre del flujo + sufijo E2E declarado |

---

## 5. Verificación de Descubrimiento

Un runner que no encuentra un directorio no falla: informa menos tests y sale en verde. Por eso la ubicación declarada no basta, hay que comprobar que el comando canónico la recorre:

1. La fila **Ubicación y nombres de tests** del manifest declara el patrón de archivo (glob) de cada tipo de prueba.
2. `check_test_discovery.sh` (generado por `SK-27`) compara los archivos que coinciden con esos patrones con los que el runner ejecuta de verdad, y falla ante cualquier diferencia.
3. Al añadir un archivo de test, el recuento de su pasada debe subir. Si no sube, el test no se está ejecutando.
