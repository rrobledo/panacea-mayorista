## 1. Configs de estado y servicios de API

- [x] 1.1 Reescribir `src/utils/remitosConfig.js`: estado nuevo de
      `Remito` (`PENDIENTE → EN_PREPARACION → LISTO → EN_TRANSITO →
      RECIBIDO`), `ESTADO_LABELS`/`ESTADO_BADGE_CLASS`/`NEXT_ESTADO`/
      `ESTADO_FILTER_OPTIONS` actualizados, sin `facturado`.
- [x] 1.2 Crear `src/utils/pedidosConfig.js`: estado de `Pedido`
      (`PENDIENTE → EN_PREPARACION → PREPARADO → LISTO_PARA_ENTREGA →
      ENTREGADO`, más `CANCELADO`), mismo patrón de labels/badges/
      `NEXT_ESTADO`/filtros.
- [x] 1.3 En `src/services/api.js`: reescribir `remitosService` contra
      el contrato nuevo (`create` con `tipo` condicional,
      `list` con filtros `tipo`/`cliente_id`/`pedido_id`/
      `origen_sucursal_id`/`destino_sucursal_id`/`estado`/fecha).
- [x] 1.4 Agregar `pedidosService` (`create`, `list`, `get`, `update`,
      `remove`, `estado`, `entrega`) y `sucursalesService` (`list`,
      `create`, `update`) en `src/services/api.js`.

## 2. Componente `SucursalSelect`

- [x] 2.1 `src/components/remitos/SucursalSelect.jsx`: `<select>`
      poblado desde `sucursalesService.list({ activa: true, tipo })`,
      según `specs/sucursales-ui/spec.md`.

## 3. Alta y listado de `Pedido`

- [x] 3.1 Reescribir `src/pages/RemitosPage.jsx` como alta de pedido
      (payload `cantidad_pedida`, sin `entregado`) — ver
      `specs/pedidos-ui/spec.md` Requirement "Alta de pedido con
      cliente y líneas de producto". Renombrado a
      `src/pages/PedidosPage.jsx`.
- [x] 3.2 Nuevo `src/pages/PedidosListPage.jsx` (adaptado de
      `RemitosListPage.jsx`): filtros cliente/fecha_entrega/estado
      sobre `GET /pedidos` — ver Requirement "Listado y filtro de
      pedidos".

## 4. Detalle de `Pedido`

- [x] 4.1 Nuevo `src/pages/PedidoDetailPage.jsx`: edición de
      cabecera/líneas restringida a `PENDIENTE` (`PUT /pedidos/{id}`) —
      ver Requirement "Edición de pedido restringida a PENDIENTE".
- [x] 4.2 Control de entrega parcial por línea (`PATCH
      /pedidos/{id}/entrega`), acotado en el cliente entre
      `cantidad_entregada` actual y `cantidad_pedida` — ver Requirement
      "Registro de entrega parcial por línea".
- [x] 4.3 Botón de transición de estado (`PATCH /pedidos/{id}/estado`)
      con confirmación previa; tras transición exitosa a
      `LISTO_PARA_ENTREGA`/`ENTREGADO`, refrescar remitos asociados y
      mostrar toast del remito generado; mostrar el error del backend
      tal cual si la transición es rechazada — ver Requirement
      "Transición de estado del pedido con feedback del remito
      generado". También se agregó un botón "Cancelar" separado
      (`PATCH .../estado` a `CANCELADO`), disponible en cualquier
      estado previo a `ENTREGADO`/`CANCELADO`.
- [x] 4.4 Sección "Remitos generados" (`GET
      /remitos?pedido_id={id}`) con link a cada detalle — ver
      Requirement "Sección de remitos generados en el detalle de
      pedido".

## 5. Reportes de pedidos pendientes

- [x] 5.1 Migrar `src/pages/PendientesPorDiaPage.jsx` a `GET
      /pedidos-reportes/pendientes-por-dia`, actualizando los buckets
      mostrados (`total_pendientes`, `total_en_preparacion`,
      `total_listo_para_entrega`, `total_entregados`,
      `total_cancelados`, sin "En Camino") — ver Requirement "Reportes
      de pedidos pendientes por día".
- [x] 5.2 Migrar `src/pages/ProductosPendientesPorDiaPage.jsx` a `GET
      /pedidos-reportes/productos-pendientes-por-dia`.

## 6. Alta y listado de `Remito`

- [x] 6.1 Nuevo `src/pages/RemitoNuevoPage.jsx`: selector de `tipo`
      (`VENTA`/`TRANSFERENCIA`) que alterna cliente vs. sucursales
      origen/destino, tabla de productos compartida, `POST /remitos` —
      ver `specs/remitos-ui/spec.md` Requirement "Alta manual de
      remito con tipo VENTA o TRANSFERENCIA".
- [x] 6.2 Validación en el cliente de sucursales origen/destino
      distintas antes de habilitar el envío — ver Requirement
      "Transferencia con origen igual a destino se bloquea en el
      cliente" y `specs/sucursales-ui/spec.md`.
- [x] 6.3 Reescribir `src/pages/RemitosListPage.jsx`: filtros
      `tipo`/cliente/`pedido_id`/sucursal origen-destino/estado/fecha
      sobre `GET /remitos`, columna "Cliente/Sucursales" condicional
      según `tipo` — ver Requirement "Listado y filtro de remitos".

## 7. Detalle de `Remito`

- [x] 7.1 Reescribir `src/pages/RemitoDetailPage.jsx`: edición
      restringida a `PENDIENTE` (`PUT /remitos/{id}`), sin columna
      `entregado` — ver Requirement "Edición de remito restringida a
      PENDIENTE".
- [x] 7.2 Botón de transición de estado (`PATCH /remitos/{id}/estado`)
      sobre la secuencia `PENDIENTE → EN_PREPARACION → LISTO →
      EN_TRANSITO → RECIBIDO` — ver Requirement "Transición de estado
      del remito".
- [x] 7.3 Simplificar `RemitoCopy` (impresión): una sola columna de
      cantidad por línea, header condicional cliente vs. sucursales
      origen/destino según `tipo`, preservando layout/orientación
      portrait ya existente — ver Requirement "Impresión de remito".

## 8. Rutas y navegación

- [x] 8.1 Actualizar `src/App.jsx`: rutas `/pedidos/nuevo`,
      `/pedidos/consulta`, `/pedidos/:id`, `/remitos/nuevo`,
      `/remitos/consulta`, `/remitos/:id`; retirar el placeholder
      `/orders`.
- [x] 8.2 Actualizar `src/components/layout/AppLayout.jsx`: menú
      "Pedidos" (nuevo, consulta) y "Remitos" (nuevo, consulta,
      reportes bajo `/pedidos-reportes/*`).

## 9. Verificación

- [x] 9.1 Confirmar contra qué backend corre el frontend
      (`VITE_API_URL` / `panacea-mayorista-backend.vercel.app`) y que
      ya expone el contrato nuevo (`/pedidos*`, `/remitos*`,
      `/sucursales*`, `/pedidos-reportes/*`) antes de considerar el
      change verificado — ver design.md, Open Questions. **Resultado**:
      `.env.local` apunta en realidad a `http://localhost:8000/costos`
      — el frontend consume `panacea-produccion-backend`, no
      `panacea-mayorista-backend` (la memoria de proyecto tenía esto
      desactualizado, corregido). El backend local ya expone el
      contrato nuevo completo (`/costos/pedidos*`,
      `/costos/remitos*`, `/costos/sucursales*`,
      `/costos/pedidos-reportes/*`); el deploy de producción de
      `panacea-produccion-backend.vercel.app` todavía sirve el
      contrato viejo (`/costos/remitos-reportes/*`), así que no se
      puede usar contra prod hasta que ese backend se despliegue con
      el change `pedidos-y-remitos`. Corregido además el fallback de
      `baseURL` en `src/services/api.js` (apuntaba a un backend
      equivocado).
- [x] 9.2 Verificación funcional contra el backend local real
      (`http://localhost:8000/costos`, con el contrato nuevo ya
      desplegado): se ejercitó por API el ciclo completo — alta de
      pedido, entrega parcial (`PATCH .../entrega`), transición de
      estado con generación automática de remito, listado de remitos
      por `pedido_id`, alta de sucursales, alta de remito
      `TRANSFERENCIA`, transición de estado de remito (incluida una
      transición inválida rechazada con 422), y ambos reportes de
      pendientes — confirmando que los shapes de request/response
      coinciden exactamente con lo que asumió el frontend. Esto
      encontró y corrigió un bug real: `PATCH /pedidos/{id}/entrega`
      espera `{"lineas": [...]}`, no `{"detalles": [...]}` (corregido
      en `pedidosService.entrega`). No se hizo click-through en
      navegador real (no hay herramienta de automatización de browser
      disponible en este entorno) — `npm run build` y la transformación
      de todos los módulos nuevos vía Vite no arrojaron errores. Este
      repo no tiene suite de tests automatizada.
- [x] 9.3 `npm run lint` sin errores nuevos (corrido con Node 22, la
      versión activa del entorno —20.2— no puede ejecutar ESLint 10).
      Los 9 errores/10 warnings preexistentes están todos en archivos
      no tocados por este change (`MasterDetailForm.jsx`,
      `ui/index.jsx`, `ToastContext.jsx`, `hooks/index.js`,
      `ChartsPage.jsx`, `FormPages.jsx`) o en una línea de efecto
      preexistente en los reportes que no fue modificada por este
      change.
- [x] 9.4 `openspec validate pedidos-y-remitos --type change --strict
      --json` pasa.
