/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Eye, Receipt } from 'lucide-react';
import { pedidosService } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Field, Modal, InlineLoader } from '../components/ui';
import { ClientePopup } from '../components/remitos/ClientePopup';
import { ESTADO_LABELS, ESTADO_BADGE_CLASS, formatDate } from '../utils/pedidosConfig';

const fmt = (v) => `$${Number(v).toFixed(2)}`;

// Fecha local de hoy en YYYY-MM-DD (toISOString daría la fecha UTC).
const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const ESTADO_OPCIONES = [
  { value: 'ENTREGADO',          label: 'Entregados',                    estados: ['ENTREGADO'] },
  { value: 'LISTO_PARA_ENTREGA', label: 'Listos para entrega',           estados: ['LISTO_PARA_ENTREGA'] },
  { value: 'AMBOS',              label: 'Entregados y listos p/ entrega', estados: ['ENTREGADO', 'LISTO_PARA_ENTREGA'] },
];

const CLASE_OPCIONES = [
  { value: '',      label: 'Pedidos y remitos' },
  { value: 'false', label: 'Solo pedidos' },
  { value: 'true',  label: 'Solo remitos' },
];

const initialFilters = { estado: 'ENTREGADO', clase: '', fechaDesde: '', fechaHasta: '' };

const destinatario = (e) => {
  if (e.tipo === 'SUCURSAL') {
    const origen = e.origen_sucursal?.nombre || (e.origen_sucursal_id ? `Sucursal #${e.origen_sucursal_id}` : null);
    const destino = e.sucursal?.nombre || `Sucursal #${e.sucursal_id}`;
    return origen ? `${origen} → ${destino}` : destino;
  }
  return [e.cliente?.nom1, e.cliente?.nom2].filter(Boolean).join(' ') || `Cliente #${e.cliente_id}`;
};

const unidadesEntregadas = (e) => e.detalles.reduce((acc, d) => acc + d.cantidad_entregada, 0);
const importeEstimado = (e) => e.detalles.reduce(
  (acc, d) => acc + (d.producto?.precio_actual || 0) * d.cantidad_entregada, 0,
);

const th = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)', fontSize: 12, whiteSpace: 'nowrap' };
const tdS = { padding: '10px 14px' };

export const PendientesFacturarPage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [filters, setFilters]   = useState(initialFilters);
  const [cliente, setCliente]   = useState(null);
  const [envios, setEnvios]     = useState([]);
  const [loading, setLoading]   = useState(false);
  const [seleccion, setSeleccion] = useState(new Set());
  const [clientePopup, setClientePopup] = useState(false);

  // Modal de facturación: lista de envíos a facturar (uno o varios)
  const [aFacturar, setAFacturar]   = useState(null);
  const [fecha, setFecha]           = useState(hoy());
  const [referencia, setReferencia] = useState('');
  const [saving, setSaving]         = useState(false);

  const buscar = () => {
    setLoading(true);
    const { estados } = ESTADO_OPCIONES.find(o => o.value === filters.estado);
    const base = { limit: 500, facturado: false };
    if (filters.clase)      base.es_remito   = filters.clase;
    if (cliente)            base.cliente_id  = cliente.idcliente;
    if (filters.fechaDesde) base.fecha_desde = `${filters.fechaDesde}T00:00:00`;
    if (filters.fechaHasta) base.fecha_hasta = `${filters.fechaHasta}T23:59:59`;

    Promise.all(estados.map(estado => pedidosService.list({ ...base, estado })))
      .then(responses => {
        const data = responses.flatMap(r => r.data)
          .sort((a, b) => new Date(a.fecha_entrega) - new Date(b.fecha_entrega));
        setEnvios(data);
        setSeleccion(new Set());
      })
      .catch(() => toast.error('Error al consultar los pendientes de facturar'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    buscar();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const limpiar = () => {
    setFilters(initialFilters);
    setCliente(null);
  };

  const toggle = (id) => setSeleccion(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const todosSeleccionados = envios.length > 0 && seleccion.size === envios.length;
  const toggleTodos = () => setSeleccion(todosSeleccionados ? new Set() : new Set(envios.map(e => e.id)));

  const abrirFacturar = (lista) => {
    setAFacturar(lista);
    setFecha(hoy());
    setReferencia('');
  };

  const confirmarFacturar = async () => {
    if (!fecha) { toast.error('La fecha de facturación es requerida'); return; }
    if (!referencia.trim()) { toast.error('La referencia de la factura es requerida'); return; }

    setSaving(true);
    const data = { fecha_facturado: `${fecha}T00:00:00`, factura_referencia: referencia.trim() };
    const resultados = await Promise.allSettled(aFacturar.map(e => pedidosService.facturacion(e.id, data)));
    const ok = aFacturar.filter((_, i) => resultados[i].status === 'fulfilled').map(e => e.id);
    const fallidos = aFacturar.filter((_, i) => resultados[i].status === 'rejected');
    setSaving(false);

    setEnvios(prev => prev.filter(e => !ok.includes(e.id)));
    setSeleccion(prev => new Set([...prev].filter(id => !ok.includes(id))));
    if (ok.length) toast.success(`${ok.length} envío${ok.length !== 1 ? 's' : ''} marcado${ok.length !== 1 ? 's' : ''} como facturado${ok.length !== 1 ? 's' : ''} (${referencia.trim()})`);
    if (fallidos.length) {
      toast.error(`No se pudo facturar: ${fallidos.map(e => `#${e.id}`).join(', ')}`);
      setAFacturar(fallidos);
    } else {
      setAFacturar(null);
    }
  };

  const seleccionados = envios.filter(e => seleccion.has(e.id));
  const totalImporte = envios.reduce((acc, e) => acc + importeEstimado(e), 0);
  const nombreCliente = (c) => [c.nom1, c.nom2].filter(Boolean).join(' ') || `Cliente #${c.idcliente}`;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Pendientes de Facturar</div>
          <div className="page-subtitle">Pedidos y remitos entregados que todavía no tienen factura</div>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><span className="card-title">Filtros</span></div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, alignItems: 'end' }}>
            <div className="form-group">
              <label className="form-label">Estado</label>
              <select className="form-select" value={filters.estado} onChange={e => setFilters(f => ({ ...f, estado: e.target.value }))}>
                {ESTADO_OPCIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Tipo</label>
              <select className="form-select" value={filters.clase} onChange={e => setFilters(f => ({ ...f, clase: e.target.value }))}>
                {CLASE_OPCIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Cliente</label>
              {cliente ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{
                    flex: 1, padding: '7px 10px', background: 'var(--primary-light)',
                    border: '1px solid var(--primary)', borderRadius: 'var(--radius)',
                    fontSize: 13, fontWeight: 500, color: 'var(--gray-800)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {nombreCliente(cliente)}
                  </div>
                  <button className="btn btn-ghost btn-icon" title="Quitar" onClick={() => setCliente(null)}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button className="btn btn-secondary" onClick={() => setClientePopup(true)}>Seleccionar…</button>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Fecha Entrega Desde</label>
              <input type="date" className="form-input" value={filters.fechaDesde}
                onChange={e => setFilters(f => ({ ...f, fechaDesde: e.target.value }))} />
            </div>

            <div className="form-group">
              <label className="form-label">Fecha Entrega Hasta</label>
              <input type="date" className="form-input" value={filters.fechaHasta}
                onChange={e => setFilters(f => ({ ...f, fechaHasta: e.target.value }))} />
            </div>

            <div style={{ display: 'flex', gap: 8, paddingTop: 2 }}>
              <button className="btn btn-primary" onClick={buscar} disabled={loading}>
                <Search size={14} /> {loading ? 'Buscando…' : 'Buscar'}
              </button>
              <button className="btn btn-secondary" onClick={limpiar} disabled={loading}>Limpiar</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Resultados ── */}
      {loading ? <InlineLoader text="Consultando pendientes…" /> : (
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              {envios.length} pendiente{envios.length !== 1 ? 's' : ''} · Importe estimado {fmt(totalImporte)}
            </span>
            <button
              className="btn btn-primary btn-sm"
              disabled={seleccionados.length === 0}
              onClick={() => abrirFacturar(seleccionados)}
            >
              <Receipt size={14} /> Facturar seleccionados{seleccionados.length ? ` (${seleccionados.length})` : ''}
            </button>
          </div>

          {envios.length === 0 ? (
            <div className="card-body" style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)', fontSize: 14 }}>
              No hay envíos pendientes de facturar con los filtros seleccionados.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: 'var(--gray-50)', borderBottom: '2px solid var(--gray-200)' }}>
                    <th style={{ ...th, width: 40 }}>
                      <input type="checkbox" checked={todosSeleccionados} onChange={toggleTodos} />
                    </th>
                    {['#', 'Tipo', 'Cliente / Sucursal', 'Fecha Entrega', 'Entregado el', 'Estado', 'Unidades', 'Importe Est.', ''].map(h => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {envios.map(e => (
                    <tr
                      key={e.id}
                      style={{ borderBottom: '1px solid var(--gray-100)', background: seleccion.has(e.id) ? 'var(--primary-light)' : undefined, cursor: 'pointer' }}
                      onClick={() => toggle(e.id)}
                    >
                      <td style={tdS}>
                        <input type="checkbox" checked={seleccion.has(e.id)} onChange={() => toggle(e.id)} onClick={ev => ev.stopPropagation()} />
                      </td>
                      <td style={{ ...tdS, fontWeight: 600 }}>#{e.id}</td>
                      <td style={tdS}>
                        <span className={`badge ${e.es_remito ? 'badge-primary' : 'badge-gray'}`}>{e.es_remito ? 'Remito' : 'Pedido'}</span>
                      </td>
                      <td style={{ ...tdS, fontWeight: 500 }}>{destinatario(e)}</td>
                      <td style={{ ...tdS, color: 'var(--gray-500)' }}>{formatDate(e.fecha_entrega)}</td>
                      <td style={{ ...tdS, color: 'var(--gray-500)' }}>{e.fecha_entregado ? formatDate(e.fecha_entregado) : '—'}</td>
                      <td style={tdS}>
                        <span className={`badge ${ESTADO_BADGE_CLASS[e.estado] || 'badge-gray'}`}>{ESTADO_LABELS[e.estado] || e.estado}</span>
                      </td>
                      <td style={tdS}>{unidadesEntregadas(e)}</td>
                      <td style={{ ...tdS, fontWeight: 600, color: 'var(--primary)' }}>{fmt(importeEstimado(e))}</td>
                      <td style={{ ...tdS, whiteSpace: 'nowrap' }} onClick={ev => ev.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-primary btn-sm" onClick={() => abrirFacturar([e])}>
                            <Receipt size={13} /> Facturar
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/pedidos/${e.id}`)}>
                            <Eye size={13} /> Ver
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modal de facturación ── */}
      <Modal
        open={!!aFacturar}
        onClose={() => !saving && setAFacturar(null)}
        title={aFacturar?.length === 1 ? `Facturar ${aFacturar[0].es_remito ? 'remito' : 'pedido'} #${aFacturar[0].id}` : `Facturar ${aFacturar?.length || 0} envíos`}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setAFacturar(null)} disabled={saving}>Cancelar</button>
          <button className="btn btn-primary" onClick={confirmarFacturar} disabled={saving}>
            {saving ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Guardando…</> : <><Receipt size={14} /> Marcar como facturado</>}
          </button>
        </>}
      >
        {aFacturar && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--gray-600)' }}>
              {aFacturar.map(e => `#${e.id} ${destinatario(e)}`).join(' · ')}
              <div style={{ marginTop: 4, fontWeight: 600, color: 'var(--gray-800)' }}>
                Importe estimado: {fmt(aFacturar.reduce((acc, e) => acc + importeEstimado(e), 0))}
              </div>
            </div>
            <Field label="Fecha de facturación" required>
              <input type="date" className="form-input" value={fecha} onChange={e => setFecha(e.target.value)} />
            </Field>
            <Field label="Referencia de la factura" required hint={aFacturar.length > 1 ? 'Se aplica la misma referencia a todos los envíos seleccionados' : undefined}>
              <input
                type="text"
                className="form-input"
                maxLength={100}
                value={referencia}
                onChange={e => setReferencia(e.target.value)}
                placeholder="Ej: A-0001-00001234"
                autoFocus
              />
            </Field>
          </div>
        )}
      </Modal>

      <ClientePopup
        open={clientePopup}
        onClose={() => setClientePopup(false)}
        onSelect={c => { setCliente(c); setClientePopup(false); }}
      />
    </div>
  );
};
