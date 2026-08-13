## Why

El backend que consume este frontend (`panacea-mayorista-backend`) reemplazó
el modelo plano `Remito`/`RemitoDetalle` (un solo documento con estado lineal
`creado → ... → facturado` y una columna `entregado` por línea) por dos
entidades separadas: `Pedido` (la nota de pedido del cliente, con entrega
parcial trackeada por línea) y `Remito` rediseñado (el comprobante físico de
traslado/entrega, que ahora puede ser `VENTA` — generado automáticamente
desde un pedido, o creado directo sin pedido — o `TRANSFERENCIA` entre
sucursales, sin cliente). El frontend actual (`RemitosPage`,
`RemitoDetailPage`, `RemitosListPage`, los reportes de "pendientes por día")
todavía habla el contrato viejo (`POST/GET/PUT/DELETE /remitos`, estados
`creado/en_produccion/preparando/listo_entregar/en_entrega/facturado`,
`entregado` por línea) y deja de funcionar contra el backend nuevo.

## What Changes

- **BREAKING**: se reemplaza el flujo único "Carga de Remito" por dos flujos
  separados: **Pedidos** (alta de la nota de pedido, entrega parcial por
  línea, transición de estado que dispara la generación automática del
  remito de venta) y **Remitos** (consulta/seguimiento de los comprobantes
  generados, más alta manual de remitos de venta directa o de
  transferencia entre sucursales).
- `RemitosPage` (carga) se convierte en la pantalla de alta de `Pedido`
  (cliente, vendedor, fecha de entrega, líneas con `cantidad_pedida`) — ya
  no envía `entregado`, que no existe al crear un pedido.
- `RemitoDetailPage` se separa en dos vistas: detalle de `Pedido` (edición
  restringida a `PENDIENTE`, registro de entrega parcial por línea,
  transición de estado `PENDIENTE → EN_PREPARACION → PREPARADO →
  LISTO_PARA_ENTREGA → ENTREGADO`/`CANCELADO`, listado de los remitos que
  generó) y detalle de `Remito` (solo lectura de líneas salvo en
  `PENDIENTE`, transición de estado propia `PENDIENTE → EN_PREPARACION →
  LISTO → EN_TRANSITO → RECIBIDO`, impresión).
- `RemitosListPage` pasa a listar `Remito` con sus filtros nuevos (`tipo`,
  `pedido_id`, `origen_sucursal_id`/`destino_sucursal_id`, estado nuevo);
  se agrega una lista de `Pedido` equivalente a la vieja consulta de
  remitos por cliente/fecha/estado.
- Nueva pantalla de alta de `Remito` tipo `TRANSFERENCIA` (sin cliente, con
  selectores de sucursal origen/destino) y de `Remito` tipo `VENTA` directo
  (sin pedido previo).
- `ClientePopup`/`ProductoPopup` se reutilizan sin cambios (no dependen del
  modelo viejo). Se agrega un selector de `Sucursal` nuevo para los
  remitos de transferencia.
- `remitosConfig.js` (labels/badges/`NEXT_ESTADO` del estado viejo) se
  reemplaza por dos configs: una para el estado de `Pedido`, otra para el
  estado de `Remito` (ya no incluye `facturado`).
- Los reportes "Pendientes por Día" y "Productos Pendientes x Día" migran
  de `/remitos-reportes/*` a `/pedidos-reportes/*` (mismo shape de
  respuesta salvo el bucket `total_en_camino`, que se elimina — ver
  design.md).
- El ítem de navegación "Pedidos" (hoy un placeholder en `/orders`) se
  reemplaza por las pantallas reales de `Pedido`; el ítem "Remitos" queda
  para consulta/alta de `Remito`.
- `services/api.js`: `remitosService` se reescribe contra el contrato
  nuevo de `/remitos` y se agrega `pedidosService`/`sucursalesService`.

## Capabilities

### New Capabilities
- `pedidos-ui`: alta de pedido, edición/entrega parcial/transición de
  estado en el detalle, listado con filtros, y los reportes de pendientes
  por día.
- `remitos-ui`: alta de remito (venta directa o transferencia), detalle
  con transición de estado propia e impresión, listado con filtros por
  tipo/pedido/sucursal/estado.
- `sucursales-ui`: selector de sucursal (origen/destino) reutilizado en el
  alta de remitos de transferencia, poblado desde el catálogo del backend.

### Modified Capabilities
(ninguna — este repo no tiene specs archivadas todavía; las pantallas
actuales de remitos nunca se documentaron como capability formal, así que
este change las introduce desde cero en vez de como delta.)

## Impact

- Código: se reescriben `src/pages/RemitosPage.jsx`,
  `src/pages/RemitoDetailPage.jsx`, `src/pages/RemitosListPage.jsx`,
  `src/pages/PendientesPorDiaPage.jsx`,
  `src/pages/ProductosPendientesPorDiaPage.jsx`, `src/utils/remitosConfig.js`
  y `src/services/api.js` (`remitosService`). Se agregan páginas nuevas
  para `Pedido` (alta, detalle, listado) y para alta de `Remito`
  `TRANSFERENCIA`, un componente `SucursalSelect`, y los servicios
  `pedidosService`/`sucursalesService`.
- Rutas (`src/App.jsx`): `/remitos/nuevo` pasa a ser alta de pedido (o se
  reemplaza por `/pedidos/nuevo`, a definir en design.md); `/orders` deja
  de ser placeholder.
- Navegación (`src/components/layout/AppLayout.jsx`): se actualiza la
  sección "Remitos"/"Pedidos" del menú.
- Backend consumido: requiere que `panacea-mayorista-backend` ya exponga
  el contrato nuevo (`/pedidos*`, `/remitos*` rediseñado, `/sucursales*`,
  `/pedidos-reportes/*`) — confirmado con el usuario que ese trabajo de
  backend ya está resuelto; este change no toca ningún repo de backend.
- No hay cambios de infraestructura, autenticación ni dependencias nuevas.
