export const formatDate = (iso) => {
  if (!iso) return '—';
  const [date] = iso.split('T');
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
};
