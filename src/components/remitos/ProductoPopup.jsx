/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { Modal, SearchInput, InlineLoader, EmptyState } from '../ui';
import { productosService } from '../../services/api';
import { useDebounce } from '../../hooks';
import { Package, ArrowLeft } from 'lucide-react';

const fmt = (v) => `$${Number(v).toFixed(2)}`;

export const ProductoPopup = ({ open, onClose, onAdd }) => {
  const [step, setStep]               = useState(1);
  const [query, setQuery]             = useState('');
  const [productos, setProductos]     = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [seleccionado, setSeleccionado] = useState(null);
  const [cantidad, setCantidad]       = useState(1);
  const debouncedQuery                = useDebounce(query, 350);

  useEffect(() => {
    if (!open || step !== 1) return;

    if (!debouncedQuery.trim()) {
      setProductos([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    productosService
      .list(debouncedQuery)
      .then(res => { if (!cancelled) setProductos(res.data); })
      .catch(() => { if (!cancelled) setError('No se pudo cargar la lista de productos.'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, debouncedQuery]);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setQuery('');
      setProductos([]);
      setSeleccionado(null);
      setCantidad(1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSeleccionar = (producto) => {
    setSeleccionado(producto);
    setCantidad(1);
    setStep(2);
  };

  const handleAgregar = () => {
    if (!seleccionado || cantidad < 1) return;
    onAdd(seleccionado, Number(cantidad));
    onClose();
  };

  const handleVolver = () => {
    setStep(1);
    setSeleccionado(null);
    setCantidad(1);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={step === 1 ? 'Seleccionar Producto' : 'Ingresar Cantidad'}
      size="lg"
      footer={step === 2 ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleVolver}>
            <ArrowLeft size={14} /> Volver
          </button>
          <button
            className="btn btn-primary"
            onClick={handleAgregar}
            disabled={cantidad < 1}
          >
            Agregar al remito
          </button>
        </div>
      ) : null}
    >
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Buscar producto por nombre…"
          />

          <div style={{ maxHeight: 380, overflowY: 'auto', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)' }}>
            {loading && <InlineLoader text="Buscando productos…" />}

            {!loading && error && (
              <div style={{ padding: 16, color: 'var(--danger)', fontSize: 14 }}>{error}</div>
            )}

            {!loading && !error && !query.trim() && (
              <EmptyState
                icon={Package}
                title="Buscar productos"
                description="Escriba el nombre del producto para ver resultados."
              />
            )}

            {!loading && !error && query.trim() && productos.length === 0 && (
              <EmptyState
                icon={Package}
                title="Sin resultados"
                description="No se encontraron productos con ese nombre."
              />
            )}

            {!loading && !error && productos.map(p => (
              <button
                key={p.id}
                onClick={() => handleSeleccionar(p)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '10px 14px', background: 'none', border: 'none',
                  borderBottom: '1px solid var(--gray-100)', cursor: 'pointer',
                  transition: 'background var(--transition)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-800)' }}>
                      {p.nombre}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2, display: 'flex', gap: 10 }}>
                      <span>Cód: {p.codigo}</span>
                      <span>{p.categoria}</span>
                      <span>{p.unidad_medida}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)', flexShrink: 0, marginLeft: 12 }}>
                    {fmt(p.precio_actual)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && seleccionado && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ margin: 0 }}>
            <div className="card-body" style={{ padding: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--gray-900)', marginBottom: 8 }}>
                {seleccionado.nombre}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 13, color: 'var(--gray-600)' }}>
                <span><strong>Código:</strong> {seleccionado.codigo}</span>
                <span><strong>Categoría:</strong> {seleccionado.categoria}</span>
                <span><strong>Unidad:</strong> {seleccionado.unidad_medida}</span>
                <span><strong>Precio:</strong> {fmt(seleccionado.precio_actual)}</span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Cantidad <span className="required">*</span>
            </label>
            <input
              type="number"
              className="form-input"
              value={cantidad}
              min={1}
              onChange={e => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
              autoFocus
              style={{ maxWidth: 160 }}
            />
            <span className="form-hint">
              Total estimado: {fmt(seleccionado.precio_actual * cantidad)}
            </span>
          </div>
        </div>
      )}
    </Modal>
  );
};
