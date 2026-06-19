/* eslint-disable react-hooks/set-state-in-effect */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Eye } from 'lucide-react';
import { DataGrid } from '../components/grid/DataGrid';
import { ClientePopup } from '../components/remitos/ClientePopup';
import { remitosService } from '../services/api';
import { useToast } from '../context/ToastContext';
import { InlineLoader } from '../components/ui';
import {
  ESTADO_LABELS, ESTADO_BADGE_CLASS, ESTADO_FILTER_OPTIONS, formatDate,
} from '../utils/remitosConfig';

const initialFilters = {
  fechaDesde: '',
  fechaHasta: '',
  estadoFilter: '',
};

const COLUMNS = (navigate) => [
  { accessorKey: 'id',        header: '#',              size: 60 },
  {
    id: 'cliente',
    header: 'Cliente',
    size: 200,
    accessorFn: row => [row.cliente?.nom1, row.cliente?.nom2].filter(Boolean).join(' ') || `#${row.cliente_id}`,
  },
  {
    id: 'fecha_entrega',
    header: 'Fecha Entrega',
    size: 130,
    accessorFn: row => formatDate(row.fecha_entrega),
  },
  {
    id: 'fecha_carga',
    header: 'Fecha Carga',
    size: 120,
    accessorFn: row => formatDate(row.fecha_carga),
  },
  { accessorKey: 'vendedor', header: 'Vendedor', size: 140 },
  {
    id: 'estado',
    header: 'Estado',
    size: 150,
    cell: ({ row }) => (
      <span className={`badge ${ESTADO_BADGE_CLASS[row.original.estado] || 'badge-gray'}`}>
        {ESTADO_LABELS[row.original.estado] || row.original.estado}
      </span>
    ),
  },
  {
    id: 'acciones',
    header: '',
    size: 80,
    cell: ({ row }) => (
      <button
        className="btn btn-secondary btn-sm"
        onClick={e => { e.stopPropagation(); navigate(`/remitos/${row.original.id}`); }}
      >
        <Eye size={13} /> Ver
      </button>
    ),
  },
];

export const RemitosListPage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [filters, setFilters]         = useState(initialFilters);
  const [cliente, setCliente]         = useState(null);
  const [clientePopup, setClientePopup] = useState(false);
  const [remitos, setRemitos]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [searched, setSearched]       = useState(false);

  const buscar = () => {
    setLoading(true);
    setSearched(true);

    const params = { limit: 500 };
    if (filters.fechaDesde) params.fecha_desde = `${filters.fechaDesde}T00:00:00`;
    if (filters.fechaHasta) params.fecha_hasta = `${filters.fechaHasta}T23:59:59`;
    if (cliente)            params.cliente_id  = cliente.idcliente;

    remitosService.list(params)
      .then(res => {
        let data = res.data;
        if (filters.estadoFilter) {
          data = data.filter(r => r.estado === filters.estadoFilter);
        }
        setRemitos(data);
      })
      .catch(() => toast.error('Error al consultar remitos'))
      .finally(() => setLoading(false));
  };

  const limpiar = () => {
    setFilters(initialFilters);
    setCliente(null);
    setRemitos([]);
    setSearched(false);
  };

  const nombreCliente = (c) =>
    [c.nom1, c.nom2].filter(Boolean).join(' ') || `Cliente #${c.idcliente}`;

  const columns = COLUMNS(navigate);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Consulta de Remitos</div>
          <div className="page-subtitle">Búsqueda y seguimiento de remitos</div>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">Filtros</span>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, alignItems: 'end' }}>

            {/* Fecha desde */}
            <div className="form-group">
              <label className="form-label">Fecha Entrega Desde</label>
              <input
                type="date"
                className="form-input"
                value={filters.fechaDesde}
                onChange={e => setFilters(f => ({ ...f, fechaDesde: e.target.value }))}
              />
            </div>

            {/* Fecha hasta */}
            <div className="form-group">
              <label className="form-label">Fecha Entrega Hasta</label>
              <input
                type="date"
                className="form-input"
                value={filters.fechaHasta}
                onChange={e => setFilters(f => ({ ...f, fechaHasta: e.target.value }))}
              />
            </div>

            {/* Cliente */}
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
                  <button className="btn btn-ghost btn-icon" title="Quitar cliente" onClick={() => setCliente(null)}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button className="btn btn-secondary" onClick={() => setClientePopup(true)}>
                  Seleccionar…
                </button>
              )}
            </div>

            {/* Estado */}
            <div className="form-group">
              <label className="form-label">Estado</label>
              <select
                className="form-select"
                value={filters.estadoFilter}
                onChange={e => setFilters(f => ({ ...f, estadoFilter: e.target.value }))}
              >
                {ESTADO_FILTER_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Botones */}
            <div style={{ display: 'flex', gap: 8, paddingTop: 2 }}>
              <button className="btn btn-primary" onClick={buscar} disabled={loading}>
                <Search size={14} />
                {loading ? 'Buscando…' : 'Buscar'}
              </button>
              <button className="btn btn-secondary" onClick={limpiar} disabled={loading}>
                Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Resultados ── */}
      {loading && <InlineLoader text="Consultando remitos…" />}

      {!loading && searched && (
        <DataGrid
          title={`Resultados — ${remitos.length} remito${remitos.length !== 1 ? 's' : ''}`}
          columns={columns}
          data={remitos}
          emptyText="No se encontraron remitos con los filtros seleccionados"
          onRowClick={row => navigate(`/remitos/${row.id}`)}
          pageSize={20}
          showExport={false}
        />
      )}

      {!loading && !searched && (
        <div className="card">
          <div className="card-body" style={{ padding: 48, textAlign: 'center', color: 'var(--gray-400)' }}>
            <Search size={36} style={{ margin: '0 auto 12px', display: 'block', color: 'var(--gray-300)' }} />
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--gray-500)' }}>
              Complete los filtros y presione Buscar
            </div>
          </div>
        </div>
      )}

      <ClientePopup
        open={clientePopup}
        onClose={() => setClientePopup(false)}
        onSelect={c => { setCliente(c); setClientePopup(false); }}
      />
    </div>
  );
};
