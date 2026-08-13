/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, ChevronRight, Ban, Truck } from 'lucide-react';
import { pedidosService, remitosService } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Field, PageLoader, ConfirmDialog } from '../components/ui';
import { ProductoPopup } from '../components/remitos/ProductoPopup';
import {
  ESTADO_LABELS, ESTADO_BADGE_CLASS, NEXT_ESTADO, ESTADOS_GENERADORES, HISTORIAL_ESTADOS, canCancelar, formatDate,
} from '../utils/pedidosConfig';
import {
  ESTADO_LABELS as REMITO_ESTADO_LABELS, ESTADO_BADGE_CLASS as REMITO_ESTADO_BADGE_CLASS,
} from '../utils/remitosConfig';

const fmt = (v) => `$${Number(v).toFixed(2)}`;

const detalleToLinea = (d) => ({
  detalle_id:       d.id,
  producto_id:       d.producto_id,
  cantidad_pedida:   d.cantidad_pedida,
  cantidad_entregada: d.cantidad_entregada ?? 0,
  nombre:            d.producto?.nombre        || `Producto #${d.producto_id}`,
  codigo:            d.producto?.codigo        || '—',
  unidad_medida:     d.producto?.unidad_medida || '',
  precio_actual:     d.producto?.precio_actual || 0,
  categoria:         d.producto?.categoria     || '',
});

export const PedidoDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [pedido, setPedido]           = useState(null);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [savingEntrega, setSavingEntrega] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [remitos, setRemitos]         = useState([]);

  // Editable form state
  const [vendedor, setVendedor]           = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [lineas, setLineas]               = useState([]);
  const [productoPopup, setProductoPopup] = useState(false);
  const [confirmTransicion, setConfirmTransicion] = useState(false);
  const [confirmCancelar, setConfirmCancelar]     = useState(false);

  const cargarPedido = () => {
    setLoading(true);
    return pedidosService.get(id)
      .then(res => {
        const p = res.data;
        setPedido(p);
        setVendedor(p.vendedor || '');
        setObservaciones(p.observaciones || '');
        setLineas(p.detalles.map(detalleToLinea));
      })
      .catch(() => toast.error('No se pudo cargar el pedido'))
      .finally(() => setLoading(false));
  };

  const cargarRemitos = () => {
    remitosService.list({ pedido_id: id })
      .then(res => setRemitos(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    cargarPedido();
    cargarRemitos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const esPendiente = pedido?.estado === 'PENDIENTE';
  const puedeEntregar = pedido && pedido.estado !== 'ENTREGADO' && pedido.estado !== 'CANCELADO';

  const handleProductoAdd = (producto, cantidad) => {
    setLineas(prev => {
      const idx = prev.findIndex(l => l.producto_id === producto.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], cantidad_pedida: next[idx].cantidad_pedida + cantidad };
        return next;
      }
      return [...prev, {
        detalle_id: null, producto_id: producto.id, cantidad_pedida: cantidad, cantidad_entregada: 0,
        nombre: producto.nombre, codigo: producto.codigo, unidad_medida: producto.unidad_medida,
        precio_actual: producto.precio_actual, categoria: producto.categoria,
      }];
    });
    setProductoPopup(false);
  };

  const handleEliminarLinea = (producto_id) => setLineas(prev => prev.filter(l => l.producto_id !== producto_id));

  const handleGuardar = async () => {
    if (!vendedor.trim()) { toast.error('El vendedor es requerido'); return; }
    if (lineas.length === 0) { toast.error('Debe haber al menos un producto'); return; }

    setSaving(true);
    try {
      const res = await pedidosService.update(id, {
        vendedor: vendedor.trim(),
        observaciones: observaciones.trim() || null,
        detalles: lineas.map(l => ({ producto_id: l.producto_id, cantidad_pedida: l.cantidad_pedida })),
      });
      setPedido(res.data);
      setLineas(res.data.detalles.map(detalleToLinea));
      toast.success('Pedido actualizado');
    } catch (err) {
      const msg = err.response?.data?.detail;
      toast.error(typeof msg === 'string' ? msg : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleGuardarEntrega = async () => {
    const cambios = lineas
      .filter(l => l.detalle_id != null)
      .map(l => ({ detalle_id: l.detalle_id, cantidad_entregada: l.cantidad_entregada }));

    setSavingEntrega(true);
    try {
      const res = await pedidosService.entrega(id, cambios);
      setPedido(res.data);
      setLineas(res.data.detalles.map(detalleToLinea));
      toast.success('Entrega registrada');
    } catch (err) {
      const msg = err.response?.data?.detail;
      toast.error(typeof msg === 'string' ? msg : 'Error al registrar la entrega');
    } finally {
      setSavingEntrega(false);
    }
  };

  const handleTransicion = async () => {
    const siguiente = NEXT_ESTADO[pedido.estado];
    if (!siguiente) return;
    setTransitioning(true);
    try {
      const res = await pedidosService.estado(id, siguiente);
      setPedido(res.data);
      toast.success(`Estado actualizado a: ${ESTADO_LABELS[siguiente]}`);

      if (ESTADOS_GENERADORES.includes(siguiente)) {
        const remitosRes = await remitosService.list({ pedido_id: id });
        setRemitos(remitosRes.data);
        if (remitosRes.data.length > remitos.length) {
          const nuevo = remitosRes.data[remitosRes.data.length - 1];
          toast.success(`Se generó el Remito #${nuevo.id} — ver la sección "Remitos generados"`);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.detail;
      toast.error(typeof msg === 'string' ? msg : 'Error al cambiar el estado');
    } finally {
      setTransitioning(false);
      setConfirmTransicion(false);
    }
  };

  const handleCancelar = async () => {
    setTransitioning(true);
    try {
      const res = await pedidosService.estado(id, 'CANCELADO');
      setPedido(res.data);
      toast.success('Pedido cancelado');
    } catch (err) {
      const msg = err.response?.data?.detail;
      toast.error(typeof msg === 'string' ? msg : 'Error al cancelar el pedido');
    } finally {
      setTransitioning(false);
      setConfirmCancelar(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!pedido)  return (
    <div className="card">
      <div className="card-body" style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>
        No se encontró el pedido #{id}
      </div>
    </div>
  );

  const nombreCliente = [pedido.cliente?.nom1, pedido.cliente?.nom2].filter(Boolean).join(' ')
    || `Cliente #${pedido.cliente_id}`;

  const siguienteEstado = NEXT_ESTADO[pedido.estado];
  const totalEstimado = lineas.reduce((acc, l) => acc + l.precio_actual * l.cantidad_pedida, 0);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              Pedido #{pedido.id}
              <span className={`badge ${ESTADO_BADGE_CLASS[pedido.estado] || 'badge-gray'}`}>
                {ESTADO_LABELS[pedido.estado] || pedido.estado}
              </span>
            </div>
            <div className="page-subtitle">
              Cargado el {formatDate(pedido.fecha_carga)} · {nombreCliente}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canCancelar(pedido.estado) && (
            <button
              className="btn btn-secondary"
              onClick={() => setConfirmCancelar(true)}
              disabled={transitioning}
            >
              <Ban size={14} /> Cancelar
            </button>
          )}
          {siguienteEstado && (
            <button
              className="btn btn-secondary"
              onClick={() => setConfirmTransicion(true)}
              disabled={transitioning}
            >
              {transitioning
                ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Actualizando…</>
                : <>{ESTADO_LABELS[pedido.estado]} <ChevronRight size={14} /> {ESTADO_LABELS[siguienteEstado]}</>
              }
            </button>
          )}
          {esPendiente && (
            <button className="btn btn-primary" onClick={handleGuardar} disabled={saving}>
              {saving
                ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Guardando…</>
                : <><Save size={14} /> Guardar cambios</>
              }
            </button>
          )}
        </div>
      </div>

      {/* ── Datos del pedido ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><span className="card-title">Datos del Pedido</span></div>
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
                {pedido.cliente?.cuit      && <span style={{ marginLeft: 16, color: 'var(--gray-500)', fontSize: 12 }}>CUIT: {pedido.cliente.cuit}</span>}
                {pedido.cliente?.direccion && <span style={{ marginLeft: 12, color: 'var(--gray-500)', fontSize: 12 }}>{pedido.cliente.direccion}</span>}
                {pedido.cliente?.localidad && <span style={{ marginLeft: 12, color: 'var(--gray-500)', fontSize: 12 }}>{pedido.cliente.localidad}</span>}
              </div>
            </div>

            {/* Fecha de entrega */}
            <Field label="Fecha de Entrega">
              <input
                type="date"
                className="form-input"
                value={pedido.fecha_entrega ? pedido.fecha_entrega.split('T')[0] : ''}
                readOnly
                style={{ background: 'var(--gray-50)', color: 'var(--gray-500)', cursor: 'not-allowed' }}
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
                readOnly={!esPendiente}
                style={!esPendiente ? { background: 'var(--gray-50)', color: 'var(--gray-500)' } : undefined}
              />
            </Field>

            {/* Fechas de estado (read-only info) */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Historial de estados</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {HISTORIAL_ESTADOS.map(({ key, fechaKey }) => {
                  const fecha = pedido[fechaKey];
                  return (
                    <div
                      key={key}
                      className={`badge ${ESTADO_BADGE_CLASS[key] || 'badge-gray'}`}
                      style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: '6px 12px' }}
                    >
                      <span style={{ fontWeight: 700 }}>{ESTADO_LABELS[key]}</span>
                      <span style={{ fontWeight: 400, fontSize: 11, opacity: fecha ? 0.9 : 0.7 }}>
                        {fecha ? formatDate(fecha) : 'Pendiente'}
                      </span>
                    </div>
                  );
                })}
                {pedido.estado === 'CANCELADO' && (
                  <div
                    className={`badge ${ESTADO_BADGE_CLASS.CANCELADO}`}
                    style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: '6px 12px' }}
                  >
                    <span style={{ fontWeight: 700 }}>{ESTADO_LABELS.CANCELADO}</span>
                    <span style={{ fontWeight: 400, fontSize: 11, opacity: 0.9 }}>
                      {formatDate(pedido.fecha_cancelado)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Observaciones */}
            <Field label="Observaciones" span={2}>
              <textarea
                className="form-textarea"
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                placeholder="Notas adicionales…"
                rows={2}
                readOnly={!esPendiente}
                style={!esPendiente ? { background: 'var(--gray-50)', color: 'var(--gray-500)' } : undefined}
              />
            </Field>
          </div>
        </div>
      </div>

      {/* ── Productos ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">Productos</span>
          {esPendiente && (
            <button className="btn btn-primary btn-sm" onClick={() => setProductoPopup(true)}>
              <Plus size={14} /> Agregar Producto
            </button>
          )}
        </div>

        {lineas.length === 0 ? (
          <div className="card-body" style={{ padding: 32, textAlign: 'center', color: 'var(--gray-400)', fontSize: 14 }}>
            Sin productos.
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: 'var(--gray-50)', borderBottom: '2px solid var(--gray-200)' }}>
                    {['Código', 'Producto', 'Unidad', 'Precio Unit.', 'Cant. Pedida', 'Cant. Entregada', 'Total', ''].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lineas.map(l => (
                    <tr key={l.producto_id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                      <td style={{ padding: '10px 14px', color: 'var(--gray-500)', fontFamily: 'monospace', fontSize: 12 }}>{l.codigo}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 500 }}>{l.nombre}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--gray-500)' }}>{l.unidad_medida}</td>
                      <td style={{ padding: '10px 14px' }}>{fmt(l.precio_actual)}</td>
                      <td style={{ padding: '10px 14px' }}>
                        {esPendiente ? (
                          <input
                            type="number"
                            min={1}
                            value={l.cantidad_pedida}
                            onChange={e => {
                              const val = Math.max(1, parseInt(e.target.value) || 1);
                              setLineas(prev => prev.map(x => x.producto_id === l.producto_id ? { ...x, cantidad_pedida: val } : x));
                            }}
                            style={{ width: 70, padding: '4px 8px', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius)', fontSize: 14 }}
                          />
                        ) : (
                          <span style={{ color: 'var(--gray-700)' }}>{l.cantidad_pedida}</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {puedeEntregar && l.detalle_id != null ? (
                          <input
                            type="number"
                            min={l.cantidad_entregada}
                            max={l.cantidad_pedida}
                            value={l.cantidad_entregada}
                            onChange={e => {
                              const raw = parseInt(e.target.value);
                              const val = Number.isNaN(raw)
                                ? l.cantidad_entregada
                                : Math.min(l.cantidad_pedida, raw);
                              setLineas(prev => prev.map(x => x.producto_id === l.producto_id ? { ...x, cantidad_entregada: val } : x));
                            }}
                            style={{ width: 70, padding: '4px 8px', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius)', fontSize: 14 }}
                          />
                        ) : (
                          <span style={{ color: 'var(--gray-700)' }}>{l.cantidad_entregada || '—'}</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--primary)' }}>
                        {fmt(l.precio_actual * l.cantidad_pedida)}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {esPendiente && (
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={() => handleEliminarLinea(l.producto_id)}
                            title="Eliminar"
                          >
                            <Trash2 size={14} color="var(--danger)" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--gray-900)' }}>
                Total estimado: {fmt(totalEstimado)}
              </span>
              {puedeEntregar && (
                <button className="btn btn-primary btn-sm" onClick={handleGuardarEntrega} disabled={savingEntrega}>
                  {savingEntrega
                    ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Guardando…</>
                    : <><Save size={14} /> Guardar entrega</>
                  }
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Remitos generados ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><span className="card-title">Remitos generados</span></div>
        {remitos.length === 0 ? (
          <div className="card-body" style={{ padding: 24, textAlign: 'center', color: 'var(--gray-400)', fontSize: 14 }}>
            Este pedido todavía no generó ningún remito.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'var(--gray-50)', borderBottom: '2px solid var(--gray-200)' }}>
                  {['#', 'Fecha', 'Estado', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)', fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {remitos.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>#{r.id}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--gray-500)' }}>{formatDate(r.fecha_carga)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className={`badge ${REMITO_ESTADO_BADGE_CLASS[r.estado] || 'badge-gray'}`}>
                        {REMITO_ESTADO_LABELS[r.estado] || r.estado}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <Link className="btn btn-secondary btn-sm" to={`/remitos/${r.id}`}>
                        <Truck size={13} /> Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
        message={`¿Confirma avanzar el pedido de "${ESTADO_LABELS[pedido.estado]}" a "${ESTADO_LABELS[siguienteEstado]}"?`}
      />

      <ConfirmDialog
        open={confirmCancelar}
        onCancel={() => setConfirmCancelar(false)}
        onConfirm={handleCancelar}
        variant="danger"
        title="Cancelar pedido"
        message="¿Confirma cancelar este pedido? Esta acción no se puede deshacer."
      />
    </div>
  );
};
