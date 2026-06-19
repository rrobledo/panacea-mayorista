/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { Modal, SearchInput, InlineLoader, EmptyState } from '../ui';
import { clientesService } from '../../services/api';
import { useDebounce } from '../../hooks';
import { Users } from 'lucide-react';

export const ClientePopup = ({ open, onClose, onSelect }) => {
  const [query, setQuery]       = useState('');
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const debouncedQuery          = useDebounce(query, 350);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setClientes([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    clientesService
      .list(debouncedQuery || undefined)
      .then(res => { if (!cancelled) setClientes(res.data); })
      .catch(() => { if (!cancelled) setError('No se pudo cargar la lista de clientes.'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, debouncedQuery]);

  const nombreCliente = (c) =>
    [c.nom1, c.nom2].filter(Boolean).join(' ') || `Cliente #${c.idcliente}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Seleccionar Cliente"
      size="lg"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Buscar por nombre…"
        />

        <div style={{ maxHeight: 380, overflowY: 'auto', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)' }}>
          {loading && <InlineLoader text="Buscando clientes…" />}

          {!loading && error && (
            <div style={{ padding: 16, color: 'var(--danger)', fontSize: 14 }}>{error}</div>
          )}

          {!loading && !error && clientes.length === 0 && (
            <EmptyState
              icon={Users}
              title="Sin resultados"
              description="No se encontraron clientes con ese nombre."
            />
          )}

          {!loading && !error && clientes.map(c => (
            <button
              key={c.idcliente}
              onClick={() => onSelect(c)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '10px 14px', background: 'none', border: 'none',
                borderBottom: '1px solid var(--gray-100)', cursor: 'pointer',
                transition: 'background var(--transition)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-800)' }}>
                {nombreCliente(c)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {c.cuit && <span>CUIT: {c.cuit}</span>}
                {c.localidad && <span>{c.localidad}{c.provincia ? `, ${c.provincia}` : ''}</span>}
                {c.tel1 && <span>Tel: {c.tel1}</span>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
};
