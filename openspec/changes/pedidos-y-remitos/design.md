## Context

Hoy todo el flujo de "remitos" en este frontend gira alrededor de un único
recurso `remitosService` (`src/services/api.js`) que habla contra
`POST/GET/PUT/DELETE /remitos` y `PATCH /remitos/{id}/estado` de
`panacea-mayorista-backend`, con:

- Un estado lineal de 6 pasos (`creado → en_produccion → preparando →
  listo_entregar → en_entrega → facturado`), codificado en
  `src/utils/remitosConfig.js` (`ESTADO_LABELS`, `ESTADO_BADGE_CLASS`,
  `NEXT_ESTADO`, `ESTADO_FILTER_OPTIONS`).
- Una sola tabla de líneas con `cantidad` (pedido) y `entregado`
  (editable solo en estado `preparando`, ver `RemitoDetailPage.jsx`).
- Impresión con lógica condicional según `estado` (`ESTADOS_IMPRIME_ENTREGADO`,
  columna "Solicitado"/"Entregado" en `RemitoCopy`).
- Reportes de pendientes (`PendientesPorDiaPage`,
  `ProductosPendientesPorDiaPage`) contra `/remitos-reportes/*`.

El backend (`panacea-mayorista-backend`) ya migró a un modelo con dos
entidades — confirmado por el usuario, fuera del alcance de este change —
que replica el contrato descripto en
`../panacea-produccion-backend/openspec/changes/pedidos-y-remitos/specs/`:
`Pedido`/`PedidoDetalle` (estado propio, `cantidad_pedida`/
`cantidad_entregada` por línea) y `Remito`/`RemitoDetalle` rediseñado
(`tipo` `VENTA`/`TRANSFERENCIA`, estado de logística propio sin
`facturado`). Ese documento es la referencia de contrato para este design,
no algo que este change modifique.

Hay dos consumidores existentes de esos endpoints en este frontend que hoy
no se tocan: `ClientePopup`/`ProductoPopup` (seleccionan cliente/producto,
no dependen del modelo de remito) y `DataGrid`/`Field`/`ConfirmDialog`/
`PageLoader` (componentes genéricos de UI, reutilizables tal cual).

## Goals / Non-Goals

**Goals:**
- Adaptar el frontend al contrato nuevo del backend sin ambigüedad de qué
  pantalla corresponde a qué recurso (`Pedido` vs `Remito`).
- Preservar la experiencia de carga actual (seleccionar cliente, agregar
  productos con cantidad, cargar) como alta de `Pedido`, con el mínimo
  cambio de layout posible para no reentrenar al usuario.
- Dar de baja toda referencia al estado viejo (`creado`, `facturado`,
  `entregado` como campo de línea al crear) del código y reemplazarla por
  los estados/campos nuevos.
- Habilitar el caso de uso nuevo que no existía: remitos de transferencia
  entre sucursales, sin cliente ni pedido.

**Non-Goals:**
- No se implementa nada en `panacea-mayorista-backend` ni en ningún otro
  repo de backend — se asume el contrato nuevo ya disponible (confirmado
  por el usuario).
- No se modela stock/inventario en la UI — el remito de transferencia
  solo registra el traslado, igual que en el backend (ver Non-Goals del
  design.md de referencia).
- No se rediseña el look & feel general de la app (cards, tablas, badges);
  se reutiliza el mismo lenguaje visual que ya existe.
- No se pagina/optimiza el listado de sucursales — se asume un catálogo
  chico (activa por defecto en los selects, sin paginación).

## Decisions

### 1. Split de rutas: `/pedidos/*` para la nota de pedido, `/remitos/*` para el comprobante

Se reemplaza el árbol de rutas actual:

```
/remitos/nuevo        → alta de pedido (antes: alta de remito)
/remitos/consulta     → listado de remitos (antes: listado, mismo modelo)
/remitos/:id          → detalle de remito (solo lectura salvo PENDIENTE)
/orders                → placeholder sin implementar
```

por:

```
/pedidos/nuevo         → alta de Pedido (cliente, líneas con cantidad_pedida)
/pedidos/consulta      → listado de Pedido (filtros: cliente, fecha_entrega, estado)
/pedidos/:id           → detalle de Pedido: editar (solo PENDIENTE), registrar
                          entrega parcial por línea, transicionar estado,
                          ver los remitos generados a partir de este pedido
/remitos/nuevo         → alta de Remito manual (tipo VENTA directo o TRANSFERENCIA)
/remitos/consulta      → listado de Remito (filtros: tipo, cliente, pedido_id,
                          sucursal origen/destino, estado, fecha)
/remitos/:id           → detalle de Remito: editar líneas (solo PENDIENTE),
                          transicionar estado, imprimir
```

Se descartó mantener `/remitos/*` como el flujo principal con `Pedido`
"escondido" detrás (p.ej. como un modo de `/remitos/nuevo`) porque el
pedido de usuario original al backend fue explícito en separar ambos
conceptos — hacerlo distinto en la URL pero igual en la UI hubiera sido
inconsistente con esa decisión ya tomada. `/orders` (el placeholder de
navegación ya existente para "Pedidos") se retira: la sección "Pedidos"
del menú apunta ahora a las rutas `/pedidos/*` reales.

### 2. Dos configs de estado, no una

`src/utils/remitosConfig.js` se reemplaza por
`src/utils/pedidosConfig.js` (estado de `Pedido`: `PENDIENTE`,
`EN_PREPARACION`, `PREPARADO`, `LISTO_PARA_ENTREGA`, `ENTREGADO`,
`CANCELADO`) y `src/utils/remitosConfig.js` reescrito (estado de
`Remito`: `PENDIENTE`, `EN_PREPARACION`, `LISTO`, `EN_TRANSITO`,
`RECIBIDO` — sin `facturado`). Mismo patrón que el archivo viejo
(`ESTADO_LABELS`, `ESTADO_BADGE_CLASS`, `NEXT_ESTADO`,
`ESTADO_FILTER_OPTIONS`, `formatDate` compartido). Se evaluó una sola
config parametrizada por "dominio" (pedido/remito); se descartó porque
los estados no comparten ningún valor (ni siquiera `PENDIENTE` significa
lo mismo conceptualmente) y una config genérica hubiera necesitado un
parámetro en cada uso, sin ahorrar código real frente a dos archivos
chicos.

### 3. `RemitosPage` (alta) se convierte 1:1 en alta de `Pedido`

La pantalla de carga actual (selección de cliente vía `ClientePopup`,
tabla de productos vía `ProductoPopup` con `cantidad`, fecha de entrega,
vendedor, observaciones) mapea directo a `POST /pedidos`: el único cambio
de payload es que las líneas se llaman `cantidad_pedida` en vez de
`cantidad`, y no se envía nada de `entregado` (no existe en el alta). El
layout, la validación (`fechaEntregaMin`, cliente + al menos un producto
requeridos) y los componentes (`ClientePopup`, `ProductoPopup`) se
reutilizan sin cambios de comportamiento — solo cambia el nombre del
servicio (`pedidosService.create`) y el campo del payload.

### 4. Detalle de `Pedido`: entrega parcial como edición de línea, no como "guardar remito"

El detalle viejo (`RemitoDetailPage`) mezclaba edición de cabecera/líneas
y edición de `entregado` en un solo botón "Guardar cambios" (`PUT
/remitos/{id}` con toda la lista de detalles). El nuevo detalle de
`Pedido` separa dos acciones porque el backend las separa en dos
endpoints con reglas distintas (`specs/pedidos/spec.md`):

- **Editar pedido** (`PUT /pedidos/{id}`, campos de cabecera y líneas
  con `cantidad_pedida`) — solo habilitado si `estado === 'PENDIENTE'`,
  igual que antes.
- **Registrar entrega** (`PATCH /pedidos/{id}/entrega`, solo
  `cantidad_entregada` por línea) — habilitado en cualquier estado previo
  a `ENTREGADO`/`CANCELADO`, con validación en el cliente de que el valor
  nuevo sea `>= cantidad_entregada` actual y `<= cantidad_pedida` (el
  backend igual valida y devuelve 422; el chequeo en UI es solo para dar
  feedback inmediato sin depender del roundtrip).

Se evaluó mantener una sola tabla editable con un botón único que decida
qué endpoint pegar según qué cambió; se descartó por ambigüedad: un
usuario podría cambiar `cantidad_pedida` y `cantidad_entregada` a la vez
en la misma fila, y el backend no expone un endpoint combinado. Dos
acciones explícitas (dos botones, uno por tabla o uno por fila) son más
claras que inferir la intención.

### 5. Transición de estado del pedido: confirmar y mostrar el remito generado

Cuando `PATCH /pedidos/{id}/estado` mueve el pedido a
`LISTO_PARA_ENTREGA`/`ENTREGADO` y el backend genera un `Remito` en la
misma transacción (`specs/pedidos/spec.md`, Requirement "Generación
automática de remito"), la respuesta del pedido no incluye el remito
generado directamente (el pedido no tiene ese campo). Tras una transición
exitosa a esos dos estados, la UI dispara un `GET
/remitos?pedido_id={id}` y muestra un toast con enlace al remito más
reciente ("Se generó el Remito #N — Ver"), además de listarlo en la
sección "Remitos generados" del detalle del pedido (ver Decisión 6). Si
el backend rechaza la transición con 422 porque no hay ningún incremento
y el pedido nunca generó un remito (`specs/pedidos/spec.md`, mismo
Requirement), se muestra el mensaje de error tal cual lo devuelve el
backend — no se duplica esa validación en el cliente porque depende del
historial de remitos ya generados, que la UI no trackea localmente.

### 6. Sección "Remitos generados" en el detalle de `Pedido`

El detalle de `Pedido` agrega una tabla de solo lectura con los remitos
que tiene asociados (`GET /remitos?pedido_id={id}`, cargado junto con el
pedido), cada fila con link a `/remitos/{id}`. Reemplaza lo que antes era
implícito (el remito y el pedido eran el mismo objeto). Sin esto, un
pedido entregado en varias tandas no tendría forma de ver los remitos que
generó sin ir a buscarlos manualmente en la consulta de remitos filtrando
por `pedido_id`.

### 7. Impresión: se muda del detalle de pedido al detalle de remito

La lógica de impresión actual (`RemitoCopy` en `RemitoDetailPage.jsx`,
con columnas condicionales "Solicitado"/"Entregado" según estado) se
traslada al detalle de `Remito`, simplificada: un remito ya es "la foto
del despacho" (design.md del backend, Decisión 3) — sus líneas son
`cantidad` fija, no hay pedido/entregado que distinguir. La tabla
impresa muestra una sola columna `cantidad` por producto, sin la
alternancia `mostrarAmbasColumnas`/`mostrarEntregado` que existía para
manejar el estado `facturado`. El resto del layout de impresión (header
"PANACEA BAKERY GLUTEN FREE", firma, orientación portrait) se preserva
tal cual (commits recientes `01fe913`/`4d97ed8`/`fb379b5` ya lo dejaron
en el formato que el usuario quiere).

### 8. Alta manual de `Remito`: un formulario, `tipo` como primer campo

`/remitos/nuevo` es una pantalla nueva (no existía — antes toda carga
pasaba por lo que ahora es `/pedidos/nuevo`). El formulario arranca con
un selector `tipo` (`VENTA` / `TRANSFERENCIA`) que determina qué el resto
de los campos se muestran:
- `VENTA`: mismo bloque de cliente (`ClientePopup`) + productos
  (`ProductoPopup`) que el alta de pedido, sin `pedido_id` (venta directa
  — el caso con `pedido_id` solo lo genera el backend automáticamente,
  nunca se arma a mano en la UI).
- `TRANSFERENCIA`: dos selects de `Sucursal` (origen/destino, poblados
  vía `sucursalesService.list({ activa: true })`), sin cliente, más la
  misma tabla de productos.

Se evaluó una pantalla separada por tipo (`/remitos/nuevo/venta`,
`/remitos/nuevo/transferencia`); se descartó porque comparten toda la
tabla de productos y el patrón de guardado, y el selector de tipo ya
resuelve la bifurcación sin duplicar el formulario completo — mismo
criterio que usó el backend para no separar `RemitoVenta`/
`RemitoTransferencia` en dos tablas (design.md de referencia, Decisión
2).

### 9. Componente nuevo: `SucursalSelect`

Se agrega `src/components/remitos/SucursalSelect.jsx`, un `<select>`
simple poblado desde `sucursalesService.list({ activa: true })` (sin
popup de búsqueda como `ClientePopup`/`ProductoPopup` — design.md de
referencia fija el catálogo como "chico", sin necesidad de búsqueda
incremental). Recibe `tipo` opcional para filtrar (`SUCURSAL` vs
`FABRICA`) y se usa dos veces en el alta de transferencia (origen,
destino), validando en el cliente que no sean la misma sucursal antes de
enviar (mismo chequeo que hace el backend, para feedback inmediato).

### 10. Reportes: mismo layout, endpoint y bucket distintos

`PendientesPorDiaPage`/`ProductosPendientesPorDiaPage` cambian el
endpoint consumido (`/remitos-reportes/*` → `/pedidos-reportes/*`) y
ajustan el shape esperado: se elimina el bucket `total_en_camino` (no
existe del lado de `Pedido`, ver design.md de referencia, Decisión 8) y
se agrega `total_cancelados`. El resto del layout (agrupación por día,
`StatBox`, filtros de fecha, impresión) se preserva.

## Risks / Trade-offs

- [El usuario confirma "el cambio ya fue hecho en el backend", pero no se
  verificó en este change contra qué versión/URL de
  `panacea-mayorista-backend` corre el frontend] → Mitigación: antes de
  dar el change por completo, correr el frontend contra
  `VITE_API_URL`/el backend configurado y confirmar manualmente que
  `/pedidos`, `/remitos` (nuevo contrato) y `/sucursales` responden como
  documentan las specs de referencia — si no, este change queda
  bloqueado hasta que el backend esté desplegado (ver tasks.md).
- [Split de rutas rompe bookmarks/hábitos de navegación existentes
  (`/remitos/nuevo` dejó de ser "cargar un remito")] → Mitigación
  aceptada: es la consecuencia directa e intencional de separar los dos
  conceptos: sin mitigación adicional más que comunicar el cambio de menú
  al usuario final (dueño del negocio).
- [`SucursalSelect` sin búsqueda incremental no escala si el catálogo de
  sucursales crece mucho] → Mitigación: aceptado como no-goal (ver Goals
  / Non-Goals); si hace falta, es un cambio de componente aislado más
  adelante, no un rediseño.

## Migration Plan

1. Reescribir `src/utils/remitosConfig.js` (estado nuevo de `Remito`) y
   agregar `src/utils/pedidosConfig.js` (estado de `Pedido`).
2. Reescribir `src/services/api.js`: `remitosService` contra el
   contrato nuevo, agregar `pedidosService` y `sucursalesService`.
3. Agregar `src/components/remitos/SucursalSelect.jsx`.
4. Reescribir `src/pages/RemitosPage.jsx` → alta de `Pedido` (ruta
   `/pedidos/nuevo`).
5. Nuevo `src/pages/PedidoDetailPage.jsx` (edición PENDIENTE, entrega
   parcial, transición de estado, remitos generados) y
   `src/pages/PedidosListPage.jsx` (adaptado de `RemitosListPage.jsx`).
6. Reescribir `src/pages/RemitoDetailPage.jsx` (estado/impresión nuevos,
   sin lógica de `entregado`/pedido) y `src/pages/RemitosListPage.jsx`
   (filtros nuevos).
7. Nuevo `src/pages/RemitoNuevoPage.jsx` (alta manual VENTA directo /
   TRANSFERENCIA).
8. Actualizar `src/App.jsx` (rutas) y
   `src/components/layout/AppLayout.jsx` (menú: "Pedidos" apunta a
   `/pedidos/*`, "Remitos" a `/remitos/*`).
9. Migrar `src/pages/PendientesPorDiaPage.jsx` y
   `src/pages/ProductosPendientesPorDiaPage.jsx` al endpoint
   `/pedidos-reportes/*`.
10. Verificación manual contra el backend real (ver Risks) antes de dar
    el change por completo — no hay suite de tests automatizados en este
    repo hoy (confirmar en tasks.md si corresponde agregar).

Sin rollback automatizado: revertir es revertir el commit/branch, igual
que cualquier otro cambio de este repo (no hay estado persistente del
lado del frontend, todo vive en el backend).

## Open Questions — resueltas durante la implementación

- **¿Contra qué backend corre realmente este frontend?** Resuelto:
  `.env.local` fija `VITE_API_URL=http://localhost:8000/costos` — el
  frontend consume `panacea-produccion-backend` bajo el prefijo
  `/costos` (no `panacea-mayorista-backend`, que era la referencia
  desactualizada usada al escribir la propuesta original). El backend
  local ya expone el contrato nuevo completo, verificado por API
  (`/costos/pedidos*`, `/costos/remitos*`, `/costos/sucursales*`,
  `/costos/pedidos-reportes/*`); el deploy de producción de
  `panacea-produccion-backend.vercel.app` todavía sirve el contrato
  viejo (`/costos/remitos-reportes/*`, sin `/pedidos`), así que este
  frontend seguirá funcionando en local pero no contra prod hasta que
  ese backend se despliegue con su change `pedidos-y-remitos`. Se
  corrigió el fallback de `baseURL` en `src/services/api.js`, que
  apuntaba a un backend equivocado.
- **¿Hace falta un test automatizado?** Este repo no tiene suite de
  tests — la verificación de este change fue funcional por API contra
  el backend local real (ver tasks.md 9.2) más `npm run build`/`npm run
  lint`, sin click-through en navegador real por no haber herramienta
  de automatización de browser disponible en este entorno.
