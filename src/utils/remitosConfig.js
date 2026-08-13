export { formatDate } from './dates';

export const ESTADO_LABELS = {
  LISTO:          'Listo',
  EN_TRANSITO:    'En Tránsito',
  RECIBIDO:       'Recibido',
};

export const ESTADO_BADGE_CLASS = {
  LISTO:          'badge-primary',
  EN_TRANSITO:    'badge-primary',
  RECIBIDO:       'badge-success',
};

export const NEXT_ESTADO = {
  LISTO:          'EN_TRANSITO',
  EN_TRANSITO:    'RECIBIDO',
  RECIBIDO:       null,
};

export const ESTADO_FILTER_OPTIONS = [
  { value: '',              label: 'Todos' },
  { value: 'LISTO',          label: 'Listo' },
  { value: 'EN_TRANSITO',    label: 'En Tránsito' },
  { value: 'RECIBIDO',       label: 'Recibido' },
];

export const TIPO_LABELS = {
  VENTA:         'Venta',
  TRANSFERENCIA: 'Transferencia',
};

export const TIPO_FILTER_OPTIONS = [
  { value: '',              label: 'Todos' },
  { value: 'VENTA',          label: 'Venta' },
  { value: 'TRANSFERENCIA',  label: 'Transferencia' },
];

// Orden del historial de estados del remito: cada uno con el campo de fecha que registra su cumplimiento
export const HISTORIAL_ESTADOS = [
  { key: 'LISTO',          fechaKey: 'fecha_listo' },
  { key: 'EN_TRANSITO',    fechaKey: 'fecha_despacho' },
  { key: 'RECIBIDO',       fechaKey: 'fecha_recibido' },
];
