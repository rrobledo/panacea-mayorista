import { useState, useCallback, useEffect } from 'react';
import { Search, Printer, X } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { InlineLoader } from '../components/ui';

const STORAGE_KEY = 'panacea_productos_pendientes_por_dia';
const DAY_NAMES       = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const FULL_DAY_NAMES  = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// ── Date helpers ──────────────────────────────────────────────────────────────

const getWeekBounds = () => {
  const today = new Date();
  const dow = today.getDay();
  const toMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + toMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d) => {
    const y  = d.getFullYear();
    const m  = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };
  return { desde: fmt(monday), hasta: fmt(sunday) };
};

const generateDateRange = (desde, hasta) => {
  const dates = [];
  const cur = new Date(desde + 'T12:00:00');
  const end = new Date(hasta + 'T12:00:00');
  while (cur <= end) {
    const y  = cur.getFullYear();
    const m  = String(cur.getMonth() + 1).padStart(2, '0');
    const d  = String(cur.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
};

const fmtFecha = (fecha) => {
  const [y, m, d] = fecha.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0);
  return {
    day:     DAY_NAMES[date.getDay()],
    dayFull: FULL_DAY_NAMES[date.getDay()],
    short:   `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`,
    full:    `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`,
  };
};

// ── Data builder ──────────────────────────────────────────────────────────────

const buildProductGrid = (data) => {
  const productSet = new Set();
  const grid       = new Map(); // producto -> fecha -> cantidad
  const dayTotals  = new Map(); // fecha -> total cantidad

  for (const day of data) {
    let dayTotal = 0;
    for (const resp of day.responsables) {
      for (const prod of resp.productos) {
        productSet.add(prod.producto);
        if (!grid.has(prod.producto)) grid.set(prod.producto, new Map());
        const existing = grid.get(prod.producto).get(day.fecha) || 0;
        grid.get(prod.producto).set(day.fecha, existing + prod.cantidad);
        dayTotal += prod.cantidad;
      }
    }
    dayTotals.set(day.fecha, (dayTotals.get(day.fecha) || 0) + dayTotal);
  }

  const productos = [...productSet].sort((a, b) => a.localeCompare(b));
  return { productos, grid, dayTotals };
};

// ── Session storage ───────────────────────────────────────────────────────────

const loadSaved = () => {
  try {
    const s = sessionStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
};

// ── Sub-components ────────────────────────────────────────────────────────────

const TH = ({ align = 'left', minWidth = 80, children, onClick }) => (
  <th
    onClick={onClick}
    style={{
      padding: '0', textAlign: align, fontWeight: 600,
      color: 'var(--gray-600)', fontSize: 13, whiteSpace: 'nowrap',
      minWidth, verticalAlign: 'bottom', borderRight: '1px solid var(--gray-200)',
      cursor: onClick ? 'pointer' : 'default',
    }}
  >
    {children}
  </th>
);

const TD = ({ align = 'left', bg, bold, children }) => (
  <td style={{
    padding: '8px 10px', verticalAlign: 'middle', textAlign: align,
    borderRight: '1px solid var(--gray-100)', background: bg,
    fontWeight: bold ? 700 : undefined,
  }}>
    {children}
  </td>
);

// ── Day detail modal ──────────────────────────────────────────────────────────

const DayDetailModal = ({ dayData, onClose }) => {
  const fmt = fmtFecha(dayData.fecha);
  const grandTotal = dayData.responsables.reduce(
    (s, r) => s + r.productos.reduce((ss, p) => ss + p.cantidad, 0), 0,
  );

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-overlay day-modal-overlay" onClick={onClose}>
      <div
        className="modal modal-lg day-detail-modal"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title">
              {fmt.dayFull} {fmt.full}
            </div>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>
              {grandTotal} unidad{grandTotal !== 1 ? 'es' : ''} en total
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-secondary btn-sm no-print"
              onClick={() => window.print()}
            >
              <Printer size={13} /> Imprimir
            </button>
            <button className="btn btn-ghost btn-icon no-print" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body">
          {dayData.responsables.map((resp, i) => {
            const respTotal = resp.productos.reduce((s, p) => s + p.cantidad, 0);
            const isLast = i === dayData.responsables.length - 1;
            return (
              <div key={resp.responsable} style={{ marginBottom: isLast ? 0 : 28 }}>
                {/* Responsable header */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 10, paddingBottom: 6,
                  borderBottom: '2px solid var(--primary)',
                }}>
                  <span style={{
                    fontWeight: 700, fontSize: 14, color: 'var(--primary)',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    {resp.responsable}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--gray-500)', fontWeight: 500 }}>
                    {respTotal} unidad{respTotal !== 1 ? 'es' : ''}
                  </span>
                </div>

                {/* Products table */}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--gray-50)' }}>
                      <th style={{
                        padding: '7px 12px', textAlign: 'left', fontSize: 13,
                        fontWeight: 600, color: 'var(--gray-600)',
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                        borderBottom: '1px solid var(--gray-200)',
                      }}>
                        Producto
                      </th>
                      <th style={{
                        padding: '7px 12px', textAlign: 'right', fontSize: 13,
                        fontWeight: 600, color: 'var(--gray-600)',
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                        borderBottom: '1px solid var(--gray-200)', width: 90,
                      }}>
                        Cantidad
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {resp.productos.map((p, pi) => (
                      <tr
                        key={p.producto}
                        style={{ borderBottom: pi < resp.productos.length - 1 ? '1px solid var(--gray-100)' : 'none' }}
                      >
                        <td style={{ padding: '10px 12px', fontSize: 15 }}>{p.producto}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 17, fontWeight: 700, color: 'var(--gray-900)' }}>
                          {p.cantidad}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '1px solid var(--gray-300)', background: 'var(--gray-50)' }}>
                      <td style={{ padding: '7px 12px', fontSize: 13, fontWeight: 600, color: 'var(--gray-600)' }}>
                        Total
                      </td>
                      <td style={{ padding: '7px 12px', textAlign: 'right', fontSize: 15, fontWeight: 700, color: 'var(--primary)' }}>
                        {respTotal}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export const ProductosPendientesPorDiaPage = () => {
  const toast = useToast();

  const defaults = getWeekBounds();
  const [saved] = useState(loadSaved);

  const [desde,       setDesde]       = useState(saved?.desde ?? defaults.desde);
  const [hasta,       setHasta]       = useState(saved?.hasta ?? defaults.hasta);
  const [data,        setData]        = useState(saved?.data  ?? null);
  const [loading,     setLoading]     = useState(!saved?.data);
  const [selectedDay, setSelectedDay] = useState(null);

  const fetchReport = useCallback((d, h) => {
    setLoading(true);
    api.get('/remitos-reportes/productos-pendientes-por-dia', { params: { fecha_desde: d, fecha_hasta: h } })
      .then(res => {
        setData(res.data);
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ desde: d, hasta: h, data: res.data }));
      })
      .catch(() => toast.error('Error al cargar el reporte'))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    if (!saved?.data) fetchReport(defaults.desde, defaults.hasta);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBuscar = () => fetchReport(desde, hasta);

  // Derived data
  const days       = data ? generateDateRange(desde, hasta) : [];
  const dayDataMap = data ? new Map(data.map(d => [d.fecha, d])) : new Map();
  const { productos, grid, dayTotals } = data
    ? buildProductGrid(data)
    : { productos: [], grid: new Map(), dayTotals: new Map() };

  const grandTotal   = [...dayTotals.values()].reduce((s, v) => s + v, 0);
  const selectedData = selectedDay ? dayDataMap.get(selectedDay) : null;

  return (
    <div className={selectedDay ? 'with-day-modal' : ''}>
      <div className="productos-report-content">
        {/* ── Header ── */}
        <div className="page-header">
          <div className="page-header-left">
            <div className="page-title">Productos Pendientes por Día</div>
            <div className="page-subtitle">Unidades a producir por fecha de entrega</div>
          </div>
          <div className="no-print">
            <button className="btn btn-secondary" onClick={() => window.print()}>
              <Printer size={14} /> Imprimir
            </button>
          </div>
        </div>

        {/* ── Filtros ── */}
        <div className="card no-print" style={{ marginBottom: 20 }}>
          <div className="card-header"><span className="card-title">Período</span></div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-group">
                <label className="form-label">Desde</label>
                <input
                  type="date"
                  className="form-input"
                  value={desde}
                  onChange={e => setDesde(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Hasta</label>
                <input
                  type="date"
                  className="form-input"
                  value={hasta}
                  onChange={e => setHasta(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" onClick={handleBuscar} disabled={loading}>
                <Search size={14} />
                {loading ? 'Cargando…' : 'Buscar'}
              </button>
            </div>
          </div>
        </div>

        {loading && <InlineLoader text="Cargando reporte…" />}

        {!loading && data && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Producción por día</span>
              <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                {desde} — {hasta}
                {grandTotal > 0 && (
                  <span style={{ marginLeft: 12, fontWeight: 600, color: 'var(--gray-700)' }}>
                    · {grandTotal} unidades totales
                  </span>
                )}
              </span>
            </div>

            {productos.length === 0 ? (
              <div className="card-body" style={{ padding: 48, textAlign: 'center', color: 'var(--gray-400)', fontSize: 14 }}>
                No hay productos pendientes en el período seleccionado
              </div>
            ) : (
              <>
                {/* Print hint */}
                <div className="no-print" style={{ padding: '8px 20px', fontSize: 11, color: 'var(--gray-400)', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-100)' }}>
                  Hacé clic en el encabezado de un día para ver el detalle de producción
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: 'var(--gray-50)', borderBottom: '2px solid var(--gray-200)' }}>
                        <TH minWidth={180}>Producto</TH>
                        {days.map(fecha => {
                          const fmt     = fmtFecha(fecha);
                          const hasData = dayDataMap.has(fecha);
                          return (
                            <TH
                              key={fecha}
                              align="center"
                              minWidth={90}
                              onClick={hasData ? () => setSelectedDay(fecha) : undefined}
                            >
                              <div style={{
                                padding: '10px 10px',
                                borderRadius: hasData ? 6 : 0,
                                transition: 'background 0.15s',
                                color: hasData ? 'var(--primary)' : 'var(--gray-300)',
                              }}
                                className={hasData ? 'day-th-clickable' : ''}
                              >
                                <div style={{ fontWeight: 700 }}>{fmt.day}</div>
                                <div style={{ fontSize: 12, fontWeight: 400 }}>{fmt.short}</div>
                                {hasData && (
                                  <div className="no-print" style={{ fontSize: 9, marginTop: 3, opacity: 0.7 }}>
                                    ver detalle
                                  </div>
                                )}
                              </div>
                            </TH>
                          );
                        })}
                        <TH align="center" minWidth={70}>Total</TH>
                      </tr>
                    </thead>
                    <tbody>
                      {/* TOTALES row */}
                      <tr style={{ background: '#eef4ff', borderBottom: '2px solid var(--gray-200)' }}>
                        <TD bg="#eef4ff">
                          <span style={{
                            fontWeight: 700, fontSize: 12, color: 'var(--primary)',
                            textTransform: 'uppercase', letterSpacing: '0.06em',
                          }}>
                            TOTALES
                          </span>
                        </TD>
                        {days.map(fecha => {
                          const total = dayTotals.get(fecha);
                          return (
                            <TD key={fecha} align="center" bg="#eef4ff" bold>
                              {total != null
                                ? <span style={{ color: 'var(--primary)', fontSize: 16 }}>{total}</span>
                                : <span style={{ color: 'var(--gray-200)' }}>—</span>
                              }
                            </TD>
                          );
                        })}
                        <TD align="center" bg="#dbeafe" bold>
                          <span style={{ color: 'var(--primary)', fontSize: 16 }}>{grandTotal}</span>
                        </TD>
                      </tr>

                      {/* Product rows */}
                      {productos.map((producto, idx) => {
                        const prodGrid   = grid.get(producto);
                        const prodTotal  = [...(prodGrid?.values() || [])].reduce((s, v) => s + v, 0);
                        return (
                          <tr
                            key={producto}
                            style={{
                              borderBottom: '1px solid var(--gray-100)',
                              background: idx % 2 === 0 ? 'var(--white)' : 'var(--gray-50)',
                            }}
                          >
                            <TD>
                              <span style={{ fontWeight: 500, color: 'var(--gray-800)' }}>{producto}</span>
                            </TD>
                            {days.map(fecha => {
                              const qty = prodGrid?.get(fecha);
                              return (
                                <TD key={fecha} align="center">
                                  {qty != null
                                    ? <span style={{ fontWeight: 600, fontSize: 15 }}>{qty}</span>
                                    : <span style={{ color: 'var(--gray-200)' }}>—</span>
                                  }
                                </TD>
                              );
                            })}
                            <TD align="center">
                              <span style={{ fontWeight: 600, color: 'var(--gray-700)' }}>{prodTotal}</span>
                            </TD>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Day detail modal ── */}
      {selectedData && (
        <DayDetailModal
          dayData={selectedData}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
};
