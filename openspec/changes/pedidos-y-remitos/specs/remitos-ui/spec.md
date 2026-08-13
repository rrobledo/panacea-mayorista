## ADDED Requirements

### Requirement: Alta manual de remito con tipo VENTA o TRANSFERENCIA
La pantalla de alta de remito (`/remitos/nuevo`) SHALL comenzar con un
selector de `tipo` (`VENTA` / `TRANSFERENCIA`) que determina los campos
siguientes: `VENTA` SHALL mostrar selección de cliente
(`ClientePopup`) y ocultar los selectores de sucursal;
`TRANSFERENCIA` SHALL mostrar dos `SucursalSelect` (origen/destino) y
ocultar la selección de cliente. Ambos tipos comparten la tabla de
productos (`ProductoPopup`, `cantidad`). El envío SHALL usar `POST
/remitos` con el payload correspondiente al tipo elegido.

#### Scenario: Alta de remito de venta directa
- **WHEN** el usuario elige `tipo=VENTA`, selecciona un cliente, agrega
  productos y confirma
- **THEN** se envía `POST /remitos` con `tipo=VENTA`, `cliente_id` y
  sin `origen_sucursal_id`/`destino_sucursal_id`

#### Scenario: Alta de remito de transferencia
- **WHEN** el usuario elige `tipo=TRANSFERENCIA`, selecciona sucursal
  origen y destino distintas, agrega productos y confirma
- **THEN** se envía `POST /remitos` con `tipo=TRANSFERENCIA`,
  `origen_sucursal_id`/`destino_sucursal_id` y sin `cliente_id`

#### Scenario: Transferencia con origen igual a destino se bloquea en el cliente
- **WHEN** el usuario selecciona la misma sucursal como origen y
  destino
- **THEN** el botón de confirmar queda deshabilitado y se muestra un
  mensaje de validación, sin llamar a `POST /remitos`

### Requirement: Edición de remito restringida a PENDIENTE
El detalle de remito (`/remitos/:id`) SHALL permitir editar cabecera y
líneas solo cuando `estado === 'PENDIENTE'`, enviando `PUT
/remitos/{id}`. Fuera de `PENDIENTE`, los campos SHALL mostrarse de
solo lectura y el botón "Eliminar" SHALL estar oculto o deshabilitado.

#### Scenario: Editar un remito PENDIENTE
- **WHEN** un remito en `PENDIENTE` recibe cambios y el usuario hace
  clic en "Guardar cambios"
- **THEN** se envía `PUT /remitos/{id}` y la vista se actualiza con la
  respuesta

#### Scenario: Intentar borrar un remito no PENDIENTE
- **WHEN** el remito está en `EN_TRANSITO` o cualquier estado distinto
  de `PENDIENTE`
- **THEN** el botón "Eliminar" no está disponible en la pantalla

### Requirement: Transición de estado del remito
El detalle de remito SHALL exponer un botón para avanzar al siguiente
estado de la secuencia `PENDIENTE → EN_PREPARACION → LISTO →
EN_TRANSITO → RECIBIDO` (con confirmación previa), enviando `PATCH
/remitos/{id}/estado`, igual para remitos `VENTA` y `TRANSFERENCIA`.

#### Scenario: Avanzar el estado de un remito de transferencia
- **WHEN** un remito `TRANSFERENCIA` en `LISTO` recibe la confirmación
  de avanzar de estado
- **THEN** se envía `PATCH /remitos/{id}/estado` con
  `{"nuevo_estado": "EN_TRANSITO"}` y la pantalla muestra el badge de
  estado actualizado

### Requirement: Listado y filtro de remitos
El listado de remitos (`/remitos/consulta`) SHALL permitir filtrar por
`tipo`, cliente, `pedido_id`, sucursal origen/destino, estado y rango
de fecha, consultando `GET /remitos`, y navegar al detalle de cada
fila. La columna "Cliente/Sucursales" SHALL mostrar el cliente para
remitos `VENTA` y el par origen→destino para remitos `TRANSFERENCIA`.

#### Scenario: Filtrar remitos de transferencia hacia una sucursal
- **WHEN** el usuario filtra por `tipo=TRANSFERENCIA` y una sucursal de
  destino
- **THEN** se consulta `GET /remitos` con esos filtros y la grilla
  muestra únicamente remitos de ese tipo y destino

#### Scenario: Ver los remitos de un pedido desde su propio detalle
- **WHEN** el usuario navega a `/remitos/consulta` con `pedido_id`
  precargado desde el detalle de un pedido
- **THEN** la grilla muestra únicamente los remitos generados por ese
  pedido

### Requirement: Impresión de remito
El detalle de remito SHALL permitir imprimir una copia con el header de
la marca, datos del cliente o de las sucursales origen/destino según
`tipo`, y una única columna de cantidad por línea (sin distinción
solicitado/entregado, dado que el remito ya representa lo efectivamente
despachado).

#### Scenario: Imprimir un remito de venta
- **WHEN** el usuario hace clic en "Imprimir" en un remito `VENTA`
- **THEN** la copia impresa muestra los datos del cliente y una columna
  de cantidad por producto

#### Scenario: Imprimir un remito de transferencia
- **WHEN** el usuario hace clic en "Imprimir" en un remito
  `TRANSFERENCIA`
- **THEN** la copia impresa muestra sucursal de origen y destino en
  lugar de datos de cliente, y una columna de cantidad por producto
