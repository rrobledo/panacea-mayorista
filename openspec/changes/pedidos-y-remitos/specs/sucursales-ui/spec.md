## ADDED Requirements

### Requirement: Selector de sucursal para origen/destino de transferencia
El sistema SHALL exponer un componente `SucursalSelect` que carga el
catálogo vía `GET /sucursales?activa=true` (con `tipo` opcional para
acotar a `SUCURSAL` o `FABRICA`) y lo presenta como `<select>` de
nombre de sucursal, usado dos veces en el alta de remito de
transferencia (origen y destino).

#### Scenario: Cargar el selector de sucursales
- **WHEN** se monta la pantalla de alta de remito con `tipo=TRANSFERENCIA`
- **THEN** ambos `SucursalSelect` (origen y destino) consultan `GET
  /sucursales?activa=true` y muestran las sucursales activas devueltas

### Requirement: Validación de sucursales distintas en el cliente
El formulario de alta de remito de transferencia SHALL impedir enviar
el formulario si `origen_sucursal_id === destino_sucursal_id`, mostrando
feedback inmediato sin depender de la respuesta del backend.

#### Scenario: Origen y destino iguales bloquean el envío
- **WHEN** el usuario selecciona la misma sucursal en origen y destino
- **THEN** se muestra un mensaje de validación junto a los selectores y
  el botón de confirmar permanece deshabilitado
