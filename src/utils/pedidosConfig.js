export { formatDate } from './dates';

export const TIPO_LABELS = {
  CLIENTE:  'Cliente',
  SUCURSAL: 'Sucursal',
};

export const TIPO_FILTER_OPTIONS = [
  { value: '',         label: 'Todos' },
  { value: 'CLIENTE',  label: 'Cliente' },
  { value: 'SUCURSAL', label: 'Sucursal' },
];

export const ESTADO_LABELS = {
  PENDIENTE:          'Pendiente',
  EN_PREPARACION:     'En Preparación',
  PREPARADO:          'Preparado',
  LISTO_PARA_ENTREGA: 'Listo Para Entrega',
  ENTREGADO:          'Entregado',
  CANCELADO:          'Cancelado',
};

export const ESTADO_BADGE_CLASS = {
  PENDIENTE:          'badge-gray',
  EN_PREPARACION:     'badge-warning',
  PREPARADO:          'badge-warning',
  LISTO_PARA_ENTREGA: 'badge-primary',
  ENTREGADO:          'badge-success',
  CANCELADO:          'badge-danger',
};

// Siguiente estado en la secuencia normal de avance (no incluye CANCELADO,
// que es una transición aparte disponible desde cualquier estado previo a ENTREGADO)
export const NEXT_ESTADO = {
  PENDIENTE:          'EN_PREPARACION',
  EN_PREPARACION:     'PREPARADO',
  PREPARADO:          'LISTO_PARA_ENTREGA',
  LISTO_PARA_ENTREGA: 'ENTREGADO',
  ENTREGADO:          null,
  CANCELADO:          null,
};

// Transiciones que, al completarse, pueden disparar la generación automática de un Remito
export const ESTADOS_GENERADORES = ['LISTO_PARA_ENTREGA', 'ENTREGADO'];

export const ESTADO_FILTER_OPTIONS = [
  { value: '',                   label: 'Todos' },
  { value: 'PENDIENTE',          label: 'Pendiente' },
  { value: 'EN_PREPARACION',     label: 'En Preparación' },
  { value: 'PREPARADO',          label: 'Preparado' },
  { value: 'LISTO_PARA_ENTREGA', label: 'Listo Para Entrega' },
  { value: 'ENTREGADO',          label: 'Entregado' },
  { value: 'CANCELADO',          label: 'Cancelado' },
];

export const canCancelar = (estado) => estado !== 'ENTREGADO' && estado !== 'CANCELADO';

// Orden del historial de estados del pedido: cada uno con el campo de fecha que registra su cumplimiento
export const HISTORIAL_ESTADOS = [
  { key: 'PENDIENTE',          fechaKey: 'fecha_carga' },
  { key: 'EN_PREPARACION',     fechaKey: 'fecha_en_preparacion' },
  { key: 'PREPARADO',          fechaKey: 'fecha_preparado' },
  { key: 'LISTO_PARA_ENTREGA', fechaKey: 'fecha_listo_para_entrega' },
  { key: 'ENTREGADO',          fechaKey: 'fecha_entregado' },
];
