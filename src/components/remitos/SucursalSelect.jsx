/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { Select } from '../ui';
import { sucursalesService } from '../../services/api';

export const SucursalSelect = ({ value, onChange, tipo, placeholder = 'Seleccionar…', ...props }) => {
  const [sucursales, setSucursales] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    sucursalesService
      .list({ activa: true, tipo: tipo || undefined })
      .then(res => { if (!cancelled) setSucursales(res.data); })
      .catch(() => { if (!cancelled) setSucursales([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tipo]);

  const options = sucursales.map(s => ({ value: s.id, label: s.nombre }));

  return (
    <Select
      options={options}
      value={value ?? ''}
      onChange={onChange}
      placeholder={loading ? 'Cargando…' : placeholder}
      disabled={loading}
      {...props}
    />
  );
};
