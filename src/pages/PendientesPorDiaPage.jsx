import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Printer } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { InlineLoader } from '../components/ui';
import { ESTADO_BADGE_CLASS, ESTADO_LABELS } from '../utils/remitosConfig';

const STORAGE_KEY = 'panacea_pendientes_por_dia';
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const getWeekBounds = () => {
  const today = new Date();
  const dow = today.getDay();
  const toMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + toMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
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
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
};

const fmtFecha = (fecha) => {
  const [y, m, d] = fecha.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0);
  return {
    day: DAY_NAMES[date.getDay()],
    short: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`,
  };
};

const loadSaved = () => {
  try {
    const s = sessionStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
};

const buildClientGrid = (data) => {
  const clientesMap = new Map();
  const grid = new Map();
  for (const day of data) {
    for (const remito of day.remitos) {
      const cid = remito.cliente_id;
      if (!clientesMap.has(cid)) clientesMap.set(cid, remito.cliente);
      if (!grid.has(cid)) grid.set(cid, new Map());
      const dm = grid.get(cid);
      if (!dm.has(day.fecha)) dm.set(day.fecha, []);
      dm.get(day.fecha).push(remito);
    }
  }
  const clientIds = [...clientesMap.keys()].sort((a, b) => {
    const na = [clientesMap.get(a)?.nom1, clientesMap.get(a)?.nom2].filter(Boolean).join(' ').toLowerCase();
    const nb = [clientesMap.get(b)?.nom1, clientesMap.get(b)?.nom2].filter(Boolean).join(' ').toLowerCase();
    return na.localeCompare(nb);
  });
  return { clientesMap, grid, clientIds };
};

const nombreCliente = (c) =>
  [c?.nom1, c?.nom2].filter(Boolean).join(' ').trim() || `Cliente #${c?.idcliente}`;

// ── Sub-components ────────────────────────────────────────────────────────────

const TH = ({ align = 'left', minWidth = 80, children }) => (
  <th style={{
    padding: '10px 10px', textAlign: align, fontWeight: 600,
    color: 'var(--gray-600)', fontSize: 12, whiteSpace: 'nowrap',
    minWidth, verticalAlign: 'bottom', borderRight: '1px solid var(--gray-200)',
  }}>
    {children}
  </th>
);

const TD = ({ align = 'left', bg, children }) => (
  <td style={{
    padding: '8px 10px', verticalAlign: 'top', textAlign: align,
    borderRight: '1px solid var(--gray-100)',
    background: bg,
  }}>
    {children}
  </td>
);

const DaySummary = ({ d }) => (
  <div style={{ fontSize: 11, lineHeight: 1.9, minWidth: 100 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontWeight: 700, color: 'var(--gray-800)' }}>
      <span>Remitos:</span><span>{d.total_remitos}</span>
    </div>
    {d.total_pendientes > 0 && (
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: 'var(--gray-600)' }}>
        <span>Pendientes:</span><span>{d.total_pendientes}</span>
      </div>
    )}
    {d.total_en_preparacion > 0 && (
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: 'var(--warning)' }}>
        <span>En Prep.:</span><span>{d.total_en_preparacion}</span>
      </div>
    )}
    {d.total_listo_para_entrega > 0 && (
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: 'var(--primary)' }}>
        <span>Listo:</span><span>{d.total_listo_para_entrega}</span>
      </div>
    )}
    {d.total_en_camino > 0 && (
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: 'var(--secondary)' }}>
        <span>En Camino:</span><span>{d.total_en_camino}</span>
      </div>
    )}
    {d.total_entregados > 0 && (
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: 'var(--success)' }}>
        <span>Entregados:</span><span>{d.total_entregados}</span>
      </div>
    )}
  </div>
);

const StatBox = ({ label, value, color }) => (
  <div style={{ textAlign: 'center', minWidth: 72 }}>
    <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 4 }}>{label}</div>
  </div>
);

// ── Main page ─────────────────────────────────────────────────────────────────

export const PendientesPorDiaPage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const defaults = getWeekBounds();
  const [saved] = useState(loadSaved);

  const [desde,   setDesde]   = useState(saved?.desde ?? defaults.desde);
  const [hasta,   setHasta]   = useState(saved?.hasta ?? defaults.hasta);
  const [data,    setData]    = useState(saved?.data  ?? null);
  const [loading, setLoading] = useState(!saved?.data);

  const fetchReport = useCallback((d, h) => {
    setLoading(true);
    api.get('/reports/pendientes-por-dia', { params: { fecha_desde: d, fecha_hasta: h } })
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

  // Build derived structures from data
  const days = data ? generateDateRange(desde, hasta) : [];
  const dayDataMap = data ? new Map(data.map(d => [d.fecha, d])) : new Map();
  const { clientesMap, grid, clientIds } = data
    ? buildClientGrid(data)
    : { clientesMap: new Map(), grid: new Map(), clientIds: [] };

  const totalGlobal = days.reduce((acc, fecha) => {
    const d = dayDataMap.get(fecha);
    if (!d) return acc;
    return {
      total_remitos:            acc.total_remitos            + d.total_remitos,
      total_pendientes:         acc.total_pendientes         + d.total_pendientes,
      total_en_preparacion:     acc.total_en_preparacion     + d.total_en_preparacion,
      total_listo_para_entrega: acc.total_listo_para_entrega + d.total_listo_para_entrega,
      total_en_camino:          acc.total_en_camino          + d.total_en_camino,
      total_entregados:         acc.total_entregados         + d.total_entregados,
    };
  }, {
    total_remitos: 0, total_pendientes: 0, total_en_preparacion: 0,
    total_listo_para_entrega: 0, total_en_camino: 0, total_entregados: 0,
  });

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Pendientes por Día</div>
          <div className="page-subtitle">Distribución de remitos por fecha de entrega</div>
        </div>
        <div className="no-print">
          <button className="btn btn-secondary" onClick={() => window.print()}>
            <Printer size={14} /> Imprimir
          </button>
        </div>
      </div>

      {/* ── Filtros (oculto en impresión) ── */}
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
        <>
          {/* ── Totales globales ── */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <span className="card-title">Totales del período</span>
              <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>{desde} — {hasta}</span>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
                <StatBox label="Total Remitos"      value={totalGlobal.total_remitos}            color="var(--gray-800)"  />
                <StatBox label="Pendientes"          value={totalGlobal.total_pendientes}         color="var(--gray-600)"  />
                <StatBox label="En Preparación"      value={totalGlobal.total_en_preparacion}     color="var(--warning)"   />
                <StatBox label="Listo Para Entrega"  value={totalGlobal.total_listo_para_entrega} color="var(--primary)"   />
                <StatBox label="En Camino"           value={totalGlobal.total_en_camino}          color="var(--secondary)" />
                <StatBox label="Entregados"          value={totalGlobal.total_entregados}         color="var(--success)"   />
              </div>
            </div>
          </div>

          {/* ── Tabla por día ── */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Distribución por día</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--gray-50)', borderBottom: '2px solid var(--gray-200)' }}>
                    <TH minWidth={160}>Cliente</TH>
                    {days.map(fecha => {
                      const { day, short } = fmtFecha(fecha);
                      const hasData = dayDataMap.has(fecha);
                      return (
                        <TH key={fecha} align="center" minWidth={120}>
                          <div style={{ fontWeight: 700, color: hasData ? 'var(--gray-800)' : 'var(--gray-300)' }}>
                            {day}
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 400, color: hasData ? 'var(--gray-500)' : 'var(--gray-300)' }}>
                            {short}
                          </div>
                        </TH>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {/* Summary row */}
                  <tr style={{ background: '#eef4ff', borderBottom: '2px solid var(--gray-200)' }}>
                    <TD bg="#eef4ff">
                      <span style={{
                        fontWeight: 700, fontSize: 11, color: 'var(--primary)',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>
                        TOTALES
                      </span>
                    </TD>
                    {days.map(fecha => {
                      const d = dayDataMap.get(fecha);
                      return (
                        <TD key={fecha} bg="#eef4ff">
                          {d
                            ? <DaySummary d={d} />
                            : <span style={{ color: 'var(--gray-200)' }}>—</span>
                          }
                        </TD>
                      );
                    })}
                  </tr>

                  {/* Client rows */}
                  {clientIds.length === 0 ? (
                    <tr>
                      <td
                        colSpan={days.length + 1}
                        style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-400)', fontSize: 14 }}
                      >
                        No hay remitos en el período seleccionado
                      </td>
                    </tr>
                  ) : clientIds.map((cid, idx) => {
                    const cliente = clientesMap.get(cid);
                    const clientDays = grid.get(cid);
                    return (
                      <tr
                        key={cid}
                        style={{
                          borderBottom: '1px solid var(--gray-100)',
                          background: idx % 2 === 0 ? 'var(--white)' : 'var(--gray-50)',
                        }}
                      >
                        <TD>
                          <div style={{ fontWeight: 500, fontSize: 12, color: 'var(--gray-800)', lineHeight: 1.3 }}>
                            {nombreCliente(cliente)}
                          </div>
                          {cliente?.localidad && (
                            <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>
                              {cliente.localidad}
                            </div>
                          )}
                        </TD>
                        {days.map(fecha => {
                          const remitos = clientDays?.get(fecha) || [];
                          return (
                            <TD key={fecha} align="center">
                              {remitos.length === 0
                                ? <span style={{ color: 'var(--gray-200)' }}>—</span>
                                : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                                    {remitos.map(r => (
                                      <div key={r.id}>
                                        {/* Screen: clickable button */}
                                        <button
                                          className="no-print"
                                          onClick={() => navigate(`/remitos/${r.id}`)}
                                          style={{
                                            background: 'none',
                                            border: '1px solid var(--primary)',
                                            borderRadius: 4, padding: '3px 7px',
                                            cursor: 'pointer',
                                            display: 'inline-flex', alignItems: 'center', gap: 5,
                                            fontSize: 11, color: 'var(--primary)', fontWeight: 600,
                                            whiteSpace: 'nowrap',
                                          }}
                                        >
                                          #{r.id}
                                          <span
                                            className={`badge ${ESTADO_BADGE_CLASS[r.estado] || 'badge-gray'}`}
                                            style={{ fontSize: 9, padding: '1px 4px', lineHeight: 1.6 }}
                                          >
                                            {ESTADO_LABELS[r.estado] || r.estado}
                                          </span>
                                        </button>
                                        {/* Print: plain text */}
                                        <div
                                          className="print-only"
                                          style={{ display: 'none', fontSize: 11, fontWeight: 600, color: 'var(--gray-700)' }}
                                        >
                                          #{r.id} – {ESTADO_LABELS[r.estado] || r.estado}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )
                              }
                            </TD>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
