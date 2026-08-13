## ADDED Requirements

### Requirement: Alta de pedido con cliente y líneas de producto
La pantalla de alta de pedido (`/pedidos/nuevo`) SHALL permitir
seleccionar un cliente vía `ClientePopup`, agregar una o más líneas de
producto vía `ProductoPopup` con `cantidad_pedida`, e ingresar
`vendedor`, `fecha_entrega` y `observaciones` opcionales, enviando
`POST /pedidos`. El botón "Registrar" SHALL permanecer deshabilitado
hasta que haya cliente seleccionado, al menos una línea, y `vendedor`/
`fecha_entrega` completos.

#### Scenario: Registrar un pedido válido
- **WHEN** el usuario selecciona un cliente, agrega dos productos con
  cantidad y completa vendedor y fecha de entrega, y hace clic en
  "Registrar"
- **THEN** se envía `POST /pedidos` con las dos líneas
  (`cantidad_pedida`), se muestra un toast de éxito con el número de
  pedido, y el formulario se limpia para cargar otro

#### Scenario: Botón deshabilitado sin cliente ni productos
- **WHEN** el usuario no seleccionó cliente o no agregó ningún producto
- **THEN** el botón "Registrar" está deshabilitado y se muestra la
  advertencia correspondiente ("Debe seleccionar un cliente" / "Debe
  agregar al menos un producto")

### Requirement: Edición de pedido restringida a PENDIENTE
El detalle de pedido (`/pedidos/:id`) SHALL permitir editar cabecera
(vendedor, observaciones) y líneas (`cantidad_pedida`, alta/baja de
producto) solo cuando `estado === 'PENDIENTE'`, enviando `PUT
/pedidos/{id}`. Si el pedido no está en `PENDIENTE`, los campos SHALL
mostrarse de solo lectura.

#### Scenario: Editar un pedido PENDIENTE
- **WHEN** un pedido en `PENDIENTE` recibe cambios de cabecera/líneas y
  el usuario hace clic en "Guardar cambios"
- **THEN** se envía `PUT /pedidos/{id}` y la vista se actualiza con la
  respuesta

#### Scenario: Formulario de líneas deshabilitado fuera de PENDIENTE
- **WHEN** el pedido está en `EN_PREPARACION` o cualquier estado
  posterior
- **THEN** no se muestran los controles de "Agregar Producto" ni de
  edición de `cantidad_pedida`, y no hay botón "Guardar cambios"

### Requirement: Registro de entrega parcial por línea
El detalle de pedido SHALL permitir editar `cantidad_entregada` por
línea en cualquier estado previo a `ENTREGADO`/`CANCELADO`, con un
control numérico acotado en el cliente entre la `cantidad_entregada`
actual y `cantidad_pedida`, enviando `PATCH /pedidos/{id}/entrega` con
las líneas modificadas.

#### Scenario: Registrar entrega parcial de una línea
- **WHEN** una línea con `cantidad_pedida=10`, `cantidad_entregada=0`
  se edita a `6` y se confirma
- **THEN** se envía `PATCH /pedidos/{id}/entrega` con
  `{detalle_id, cantidad_entregada: 6}` y la línea queda actualizada en
  pantalla

#### Scenario: El control no permite bajar de lo ya entregado
- **WHEN** una línea tiene `cantidad_entregada=6`
- **THEN** el control numérico de esa línea tiene como mínimo `6`, sin
  permitir ingresar un valor menor

### Requirement: Transición de estado del pedido con feedback del remito generado
El detalle de pedido SHALL exponer un botón para avanzar al siguiente
estado de la secuencia `PENDIENTE → EN_PREPARACION → PREPARADO →
LISTO_PARA_ENTREGA → ENTREGADO` (con confirmación previa), enviando
`PATCH /pedidos/{id}/estado`. Cuando la transición exitosa es hacia
`LISTO_PARA_ENTREGA` o `ENTREGADO`, la UI SHALL refrescar la lista de
remitos asociados al pedido (`GET /remitos?pedido_id={id}`) y mostrar un
toast indicando el remito generado, si el backend generó uno nuevo. Si
la transición es rechazada, la UI SHALL mostrar el mensaje de error del
backend sin cambiar el estado mostrado.

#### Scenario: Transición genera un remito nuevo
- **WHEN** un pedido con entrega parcial registrada transiciona a
  `LISTO_PARA_ENTREGA` y el backend responde 200
- **THEN** el pedido muestra el nuevo estado, la sección "Remitos
  generados" se refresca, y aparece un toast con el número del remito
  creado

#### Scenario: Transición rechazada por el backend
- **WHEN** un pedido sin ninguna entrega registrada intenta
  transicionar a `LISTO_PARA_ENTREGA` y el backend responde 422
- **THEN** la UI muestra el mensaje de error devuelto y el pedido
  permanece en su estado anterior

### Requirement: Sección de remitos generados en el detalle de pedido
El detalle de pedido SHALL listar, en una tabla de solo lectura, los
remitos generados a partir de ese pedido (`GET
/remitos?pedido_id={id}`), cada uno con enlace a su propio detalle
(`/remitos/{id}`).

#### Scenario: Pedido con dos remitos generados en tandas distintas
- **WHEN** un pedido generó dos remitos (entrega parcial y luego
  entrega final)
- **THEN** la sección "Remitos generados" muestra ambos, cada uno con
  su número y estado, y un link a su detalle

### Requirement: Listado y filtro de pedidos
El listado de pedidos (`/pedidos/consulta`) SHALL permitir filtrar por
cliente, rango de `fecha_entrega` y estado, consultando `GET /pedidos`,
y navegar al detalle de cada fila.

#### Scenario: Filtrar pedidos por cliente y rango de fechas
- **WHEN** el usuario selecciona un cliente, un rango de fechas de
  entrega y hace clic en "Buscar"
- **THEN** se consulta `GET /pedidos` con esos filtros y se muestra la
  grilla de resultados con el estado de cada pedido

### Requirement: Reportes de pedidos pendientes por día
El sistema SHALL consumir `GET /pedidos-reportes/pendientes-por-dia` y
`GET /pedidos-reportes/productos-pendientes-por-dia` en las pantallas de
reportes "Pendientes por Día" y "Productos Pendientes x Día"
respectivamente, y SHALL mostrar los buckets de estado nuevos
(`total_pendientes`, `total_en_preparacion`, `total_listo_para_entrega`,
`total_entregados`, `total_cancelados`), sin ningún bucket de estado "En
Camino".

#### Scenario: Reporte de pendientes por día sin bucket "En Camino"
- **WHEN** se carga la pantalla "Pendientes por Día" para un rango de
  fechas con datos
- **THEN** cada fila muestra los buckets `total_pendientes`,
  `total_en_preparacion`, `total_listo_para_entrega`,
  `total_entregados` y `total_cancelados`, sin ninguna columna "En
  Camino"
