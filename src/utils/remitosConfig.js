export { formatDate } from './dates';

// Un remito es un envío cargado con es_remito = true: comparte estados con el
// pedido (ver pedidosConfig.js) y se distingue por destinatario.
export const TIPO_LABELS = {
  CLIENTE:  'A cliente',
  SUCURSAL: 'Entre sucursales',
};

export const TIPO_FILTER_OPTIONS = [
  { value: '',         label: 'Todos' },
  { value: 'CLIENTE',  label: 'A cliente' },
  { value: 'SUCURSAL', label: 'Entre sucursales' },
];

export const ESTADO_FILTER_OPTIONS = [
  { value: '',                   label: 'Todos' },
  { value: 'LISTO_PARA_ENTREGA', label: 'Listo Para Entrega' },
  { value: 'ENTREGADO',          label: 'Entregado' },
  { value: 'CANCELADO',          label: 'Cancelado' },
];

export const FACTURADO_FILTER_OPTIONS = [
  { value: '',      label: 'Todos' },
  { value: 'true',  label: 'Facturados' },
  { value: 'false', label: 'Sin facturar' },
];
