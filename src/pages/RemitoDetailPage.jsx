/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, ChevronRight } from 'lucide-react';
import { remitosService } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Field, PageLoader, ConfirmDialog } from '../components/ui';
import { ProductoPopup } from '../components/remitos/ProductoPopup';
import {
  ESTADO_LABELS, ESTADO_BADGE_CLASS, NEXT_ESTADO, formatDate,
} from '../utils/remitosConfig';

const fmt = (v) => `$${Number(v).toFixed(2)}`;

const toInputDate = (iso) => iso ? iso.split('T')[0] : '';

const detalleToProducto = (d) => ({
  id:           d.producto_id,
  producto_id:  d.producto_id,
  cantidad:     d.cantidad,
  nombre:       d.producto?.nombre       || `Producto #${d.producto_id}`,
  codigo:       d.producto?.codigo       || '—',
  unidad_medida:d.producto?.unidad_medida|| '',
  precio_actual:d.producto?.precio_actual|| 0,
  categoria:    d.producto?.categoria    || '',
});

export const RemitoDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [remito, setRemito]           = useState(null);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  // Editable form state
  const [vendedor, setVendedor]           = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [fechaEntrega, setFechaEntrega]   = useState('');
  const [productos, setProductos]         = useState([]);
  const [productoPopup, setProductoPopup] = useState(false);
  const [confirmTransicion, setConfirmTransicion] = useState(false);

  useEffect(() => {
    setLoading(true);
    remitosService.get(id)
      .then(res => {
        const r = res.data;
        setRemito(r);
        setVendedor(r.vendedor || '');
        setObservaciones(r.observaciones || '');
        setFechaEntrega(toInputDate(r.fecha_entrega));
        setProductos(r.detalles.map(detalleToProducto));
      })
      .catch(() => toast.error('No se pudo cargar el remito'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleProductoAdd = (producto, cantidad) => {
    setProductos(prev => {
      const idx = prev.findIndex(p => p.id === producto.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], cantidad: next[idx].cantidad + cantidad };
        return next;
      }
      return [...prev, { ...producto, id: producto.id, producto_id: producto.id, cantidad }];
    });
    setProductoPopup(false);
  };

  const handleEliminar = (id) => setProductos(prev => prev.filter(p => p.id !== id));

  const handleGuardar = async () => {
    if (!vendedor.trim()) { toast.error('El vendedor es requerido'); return; }
    if (!fechaEntrega)    { toast.error('La fecha de entrega es requerida'); return; }
    if (productos.length === 0) { toast.error('Debe haber al menos un producto'); return; }

    setSaving(true);
    try {
      const res = await remitosService.update(id, {
        vendedor: vendedor.trim(),
        observaciones: observaciones.trim() || null,
        fecha_entrega: `${fechaEntrega}T00:00:00`,
        detalles: productos.map(p => ({ producto_id: p.producto_id, cantidad: p.cantidad })),
      });
      setRemito(res.data);
      setProductos(res.data.detalles.map(detalleToProducto));
      toast.success('Remito actualizado');
    } catch (err) {
      const msg = err.response?.data?.detail;
      toast.error(typeof msg === 'string' ? msg : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleTransicion = async () => {
    const siguiente = NEXT_ESTADO[remito.estado];
    if (!siguiente) return;
    setTransitioning(true);
    try {
      const res = await remitosService.estado(id, siguiente);
      setRemito(res.data);
      toast.success(`Estado actualizado a: ${ESTADO_LABELS[siguiente]}`);
    } catch {
      toast.error('Error al cambiar el estado');
    } finally {
      setTransitioning(false);
      setConfirmTransicion(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!remito)  return (
    <div className="card">
      <div className="card-body" style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>
        No se encontró el remito #{id}
      </div>
    </div>
  );

  const nombreCliente = [remito.cliente?.nom1, remito.cliente?.nom2].filter(Boolean).join(' ')
    || `Cliente #${remito.cliente_id}`;

  const siguienteEstado = NEXT_ESTADO[remito.estado];
  const totalEstimado = productos.reduce((acc, p) => acc + p.precio_actual * p.cantidad, 0);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('/remitos/consulta')}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              Remito #{remito.id}
              <span className={`badge ${ESTADO_BADGE_CLASS[remito.estado] || 'badge-gray'}`}>
                {ESTADO_LABELS[remito.estado] || remito.estado}
              </span>
            </div>
            <div className="page-subtitle">
              Cargado el {formatDate(remito.fecha_carga)} · {nombreCliente}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {siguienteEstado && (
            <button
              className="btn btn-secondary"
              onClick={() => setConfirmTransicion(true)}
              disabled={transitioning}
            >
              {transitioning
                ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Actualizando…</>
                : <>{ESTADO_LABELS[remito.estado]} <ChevronRight size={14} /> {ESTADO_LABELS[siguienteEstado]}</>
              }
            </button>
          )}
          <button className="btn btn-primary" onClick={handleGuardar} disabled={saving}>
            {saving
              ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Guardando…</>
              : <><Save size={14} /> Guardar cambios</>
            }
          </button>
        </div>
      </div>

      {/* ── Datos del remito ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><span className="card-title">Datos del Remito</span></div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>

            {/* Cliente (read-only) */}
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Cliente</label>
              <div style={{
                padding: '8px 12px', background: 'var(--gray-50)',
                border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)',
                fontSize: 14, color: 'var(--gray-700)',
              }}>
                <span style={{ fontWeight: 600 }}>{nombreCliente}</span>
                {remito.cliente?.cuit     && <span style={{ marginLeft: 16, color: 'var(--gray-500)', fontSize: 12 }}>CUIT: {remito.cliente.cuit}</span>}
                {remito.cliente?.direccion && <span style={{ marginLeft: 12, color: 'var(--gray-500)', fontSize: 12 }}>{remito.cliente.direccion}</span>}
                {remito.cliente?.localidad && <span style={{ marginLeft: 12, color: 'var(--gray-500)', fontSize: 12 }}>{remito.cliente.localidad}</span>}
              </div>
            </div>

            {/* Fecha de entrega */}
            <Field label="Fecha de Entrega" required>
              <input
                type="date"
                className="form-input"
                value={fechaEntrega}
                onChange={e => setFechaEntrega(e.target.value)}
              />
            </Field>

            {/* Vendedor */}
            <Field label="Vendedor" required>
              <input
                type="text"
                className="form-input"
                value={vendedor}
                onChange={e => setVendedor(e.target.value)}
                placeholder="Nombre del vendedor"
              />
            </Field>

            {/* Fechas de estado (read-only info) */}
            {(remito.fecha_preparacion || remito.fecha_listo || remito.fecha_despacho || remito.fecha_recibido || remito.fecha_facturacion) && (
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Historial de estados</label>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--gray-500)' }}>
                  {remito.fecha_preparacion  && <span>En Preparación: {formatDate(remito.fecha_preparacion)}</span>}
                  {remito.fecha_listo        && <span>Listo: {formatDate(remito.fecha_listo)}</span>}
                  {remito.fecha_despacho     && <span>Despachado: {formatDate(remito.fecha_despacho)}</span>}
                  {remito.fecha_recibido     && <span>Recibido: {formatDate(remito.fecha_recibido)}</span>}
                  {remito.fecha_facturacion  && <span>Facturado: {formatDate(remito.fecha_facturacion)}</span>}
                </div>
              </div>
            )}

            {/* Observaciones */}
            <Field label="Observaciones" span={2}>
              <textarea
                className="form-textarea"
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                placeholder="Notas adicionales…"
                rows={2}
              />
            </Field>
          </div>
        </div>
      </div>

      {/* ── Productos ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">Productos</span>
          <button className="btn btn-primary btn-sm" onClick={() => setProductoPopup(true)}>
            <Plus size={14} /> Agregar Producto
          </button>
        </div>

        {productos.length === 0 ? (
          <div className="card-body" style={{ padding: 32, textAlign: 'center', color: 'var(--gray-400)', fontSize: 14 }}>
            Sin productos. Use "Agregar Producto" para añadir.
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: 'var(--gray-50)', borderBottom: '2px solid var(--gray-200)' }}>
                    {['Código', 'Producto', 'Categoría', 'Unidad', 'Precio Unit.', 'Cantidad', 'Total', ''].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {productos.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                      <td style={{ padding: '10px 14px', color: 'var(--gray-500)', fontFamily: 'monospace', fontSize: 12 }}>{p.codigo}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 500 }}>{p.nombre}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--gray-500)' }}>{p.categoria}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--gray-500)' }}>{p.unidad_medida}</td>
                      <td style={{ padding: '10px 14px' }}>{fmt(p.precio_actual)}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <input
                          type="number"
                          min={1}
                          value={p.cantidad}
                          onChange={e => {
                            const val = Math.max(1, parseInt(e.target.value) || 1);
                            setProductos(prev => prev.map(x => x.id === p.id ? { ...x, cantidad: val } : x));
                          }}
                          style={{ width: 70, padding: '4px 8px', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius)', fontSize: 14 }}
                        />
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--primary)' }}>
                        {fmt(p.precio_actual * p.cantidad)}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => handleEliminar(p.id)}
                          title="Eliminar"
                        >
                          <Trash2 size={14} color="var(--danger)" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--gray-600)' }}>
                {productos.length} producto{productos.length !== 1 ? 's' : ''} ·
              </span>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--gray-900)' }}>
                Total estimado: {fmt(totalEstimado)}
              </span>
            </div>
          </>
        )}
      </div>

      <ProductoPopup
        open={productoPopup}
        onClose={() => setProductoPopup(false)}
        onAdd={handleProductoAdd}
      />

      <ConfirmDialog
        open={confirmTransicion}
        onCancel={() => setConfirmTransicion(false)}
        onConfirm={handleTransicion}
        variant="primary"
        title="Cambiar estado"
        message={`¿Confirma avanzar el remito de "${ESTADO_LABELS[remito.estado]}" a "${ESTADO_LABELS[siguienteEstado]}"?`}
      />
    </div>
  );
};
