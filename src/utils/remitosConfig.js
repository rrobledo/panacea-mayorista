export const ESTADO_LABELS = {
  creado:          'Pendiente',
  en_produccion:   'En Producción',
  preparando:      'En Preparación',
  listo_entregar:  'Listo Para Entrega',
  en_entrega:      'En Camino',
  facturado:       'Entregado',
};

export const ESTADO_BADGE_CLASS = {
  creado:          'badge-gray',
  en_produccion:   'badge-warning',
  preparando:      'badge-warning',
  listo_entregar:  'badge-primary',
  en_entrega:      'badge-primary',
  facturado:       'badge-success',
};

export const NEXT_ESTADO = {
  creado:          'en_produccion',
  en_produccion:   'preparando',
  preparando:      'listo_entregar',
  listo_entregar:  'en_entrega',
  en_entrega:      'facturado',
  facturado:       null,
};

export const ESTADO_FILTER_OPTIONS = [
  { value: '',               label: 'Todos' },
  { value: 'creado',         label: 'Pendiente' },
  { value: 'en_produccion',  label: 'En Producción' },
  { value: 'preparando',     label: 'En Preparación' },
  { value: 'listo_entregar', label: 'Listo Para Entrega' },
  { value: 'en_entrega',     label: 'En Camino' },
  { value: 'facturado',      label: 'Entregado' },
];

export const formatDate = (iso) => {
  if (!iso) return '—';
  const [date] = iso.split('T');
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
};
