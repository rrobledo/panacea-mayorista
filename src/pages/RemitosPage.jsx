import { useState } from 'react';
import { Plus, Trash2, UserCheck, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { remitosService } from '../services/api';
import { Field } from '../components/ui';
import { ClientePopup } from '../components/remitos/ClientePopup';
import { ProductoPopup } from '../components/remitos/ProductoPopup';

const fmt = (v) => `$${Number(v).toFixed(2)}`;

const initialForm = {
  fechaEntrega: '',
  vendedor: '',
  observaciones: '',
};

export const RemitosPage = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [cliente, setCliente]               = useState(null);
  const [productos, setProductos]           = useState([]);
  const [form, setForm]                     = useState({ ...initialForm, vendedor: user?.name || '' });
  const [errors, setErrors]                 = useState({});
  const [submitting, setSubmitting]         = useState(false);
  const [clientePopup, setClientePopup]     = useState(false);
  const [productoPopup, setProductoPopup]   = useState(false);

  const nombreCliente = (c) =>
    [c.nom1, c.nom2].filter(Boolean).join(' ') || `Cliente #${c.idcliente}`;

  const fechaEntregaMin = (() => { const d = new Date(); const dias = d.getHours() < 14 ? 2 : 3; d.setDate(d.getDate() + dias); return d.toISOString().split('T')[0]; })();

  const handleField = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: null }));
  };

  const handleClienteSelect = (c) => {
    setCliente(c);
    setClientePopup(false);
  };

  const handleProductoAdd = (producto, cantidad) => {
    setProductos(prev => {
      const idx = prev.findIndex(p => p.id === producto.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], cantidad: next[idx].cantidad + cantidad };
        return next;
      }
      return [...prev, { ...producto, cantidad }];
    });
    setProductoPopup(false);
  };

  const handleEliminarProducto = (id) => {
    setProductos(prev => prev.filter(p => p.id !== id));
  };

  const validate = () => {
    const errs = {};
    if (!form.vendedor.trim()) errs.vendedor = 'El vendedor es requerido';
    if (!form.fechaEntrega)    errs.fechaEntrega = 'La fecha de entrega es requerida';
    return errs;
  };

  const canSubmit =
    cliente !== null &&
    productos.length > 0 &&
    form.fechaEntrega !== '' &&
    form.vendedor.trim() !== '' &&
    !submitting;

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      const payload = {
        vendedor: form.vendedor.trim(),
        observaciones: form.observaciones.trim() || null,
        fecha_entrega: `${form.fechaEntrega}T00:00:00`,
        cliente_id: cliente.idcliente,
        detalles: productos.map(p => ({
          producto_id: p.id,
          cantidad: p.cantidad,
        })),
      };

      const res = await remitosService.create(payload);
      toast.success(`Remito #${res.data.id} registrado exitosamente`);

      setCliente(null);
      setProductos([]);
      setForm({ ...initialForm, vendedor: user?.name || '' });
      setErrors({});
    } catch (err) {
      const msg = err.response?.data?.detail;
      const detail = Array.isArray(msg)
        ? msg.map(d => d.msg).join(', ')
        : (typeof msg === 'string' ? msg : 'Error al registrar el remito');
      toast.error(detail);
    } finally {
      setSubmitting(false);
    }
  };

  const totalRemito = productos.reduce(
    (acc, p) => acc + p.precio_actual * p.cantidad, 0
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Carga de Remito</div>
          <div className="page-subtitle">Registro de nueva nota de pedido</div>
        </div>
      </div>

      {/* ── Datos del remito ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">Datos del Remito</span>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>

            {/* Cliente */}
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">
                Cliente <span className="required">*</span>
              </label>
              {cliente ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', background: 'var(--primary-light)',
                  border: '1px solid var(--primary)', borderRadius: 'var(--radius)',
                }}>
                  <UserCheck size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{nombreCliente(cliente)}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {cliente.cuit && <span>CUIT: {cliente.cuit}</span>}
                      {cliente.direccion && <span>{cliente.direccion}</span>}
                      {cliente.localidad && <span>{cliente.localidad}</span>}
                      {cliente.tel1 && <span>Tel: {cliente.tel1}</span>}
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setClientePopup(true)}
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <button
                  className="btn btn-secondary"
                  onClick={() => setClientePopup(true)}
                  style={{ alignSelf: 'flex-start' }}
                >
                  <UserCheck size={14} /> Seleccionar Cliente
                </button>
              )}
            </div>

            {/* Fecha de entrega */}
            <Field label="Fecha de Entrega" required error={errors.fechaEntrega}>
              <input
                type="date"
                className={`form-input${errors.fechaEntrega ? ' error' : ''}`}
                value={form.fechaEntrega}
                min={fechaEntregaMin}
                onChange={e => {
                  const val = e.target.value;
                  if (val && val < fechaEntregaMin) return;
                  handleField('fechaEntrega', val);
                }}
              />
            </Field>

            {/* Vendedor */}
            <Field label="Vendedor" required error={errors.vendedor}>
              <input
                type="text"
                className={`form-input${errors.vendedor ? ' error' : ''}`}
                value={form.vendedor}
                onChange={e => handleField('vendedor', e.target.value)}
                placeholder="Nombre del vendedor"
              />
            </Field>

            {/* Observaciones */}
            <Field label="Observaciones" span={2}>
              <textarea
                className="form-textarea"
                value={form.observaciones}
                onChange={e => handleField('observaciones', e.target.value)}
                placeholder="Notas adicionales (opcional)…"
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
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setProductoPopup(true)}
          >
            <Plus size={14} /> Agregar Producto
          </button>
        </div>

        {productos.length === 0 ? (
          <div className="card-body" style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>
            <Package size={36} style={{ margin: '0 auto 12px', display: 'block', color: 'var(--gray-300)' }} />
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--gray-500)' }}>
              No hay productos agregados
            </div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              Haga clic en "Agregar Producto" para comenzar
            </div>
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
                          title="Eliminar"
                          onClick={() => handleEliminarProducto(p.id)}
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
                Total estimado: {fmt(totalRemito)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* ── Validación y envío ── */}
      {(!cliente || productos.length === 0) && (
        <div className="alert alert-warning" style={{ marginBottom: 16, fontSize: 13 }}>
          {!cliente && <div>• Debe seleccionar un cliente</div>}
          {productos.length === 0 && <div>• Debe agregar al menos un producto</div>}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="btn btn-primary btn-lg"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting
            ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Registrando…</>
            : 'Registrar Remito'
          }
        </button>
      </div>

      <ClientePopup
        open={clientePopup}
        onClose={() => setClientePopup(false)}
        onSelect={handleClienteSelect}
      />

      <ProductoPopup
        open={productoPopup}
        onClose={() => setProductoPopup(false)}
        onAdd={handleProductoAdd}
      />
    </div>
  );
};
