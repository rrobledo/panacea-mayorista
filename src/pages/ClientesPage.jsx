import { useState, useEffect, useMemo } from 'react';
import { DataGrid } from '../components/grid/DataGrid';
import { InlineLoader } from '../components/ui';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

const COLUMNS = [
  {
    id: 'nombre',
    header: 'Nombre',
    size: 200,
    accessorFn: c => [c.nom1, c.nom2].filter(Boolean).join(' / '),
  },
  { accessorKey: 'cuit',            header: 'CUIT',       size: 130 },
  { accessorKey: 'direccion',       header: 'Dirección',  size: 170 },
  { accessorKey: 'localidad',       header: 'Localidad',  size: 120 },
  {
    id: 'telefono',
    header: 'Teléfono',
    size: 120,
    accessorFn: c => c.celular || c.tel1 || '',
  },
  { accessorKey: 'email1', header: 'Email', size: 180 },
  {
    accessorKey: 'activo',
    header: 'Estado',
    size: 90,
    cell: ({ getValue }) => (
      <span className={`badge ${getValue() ? 'badge-success' : 'badge-gray'}`}>
        {getValue() ? 'Activo' : 'Inactivo'}
      </span>
    ),
  },
];

export const ClientesPage = () => {
  const toast = useToast();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [soloActivos, setSoloActivos] = useState(true);

  useEffect(() => {
    api.get('/clientes', { params: { limit: 500 } })
      .then(res => setClientes(res.data))
      .catch(() => toast.error('Error al cargar clientes'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const data = useMemo(
    () => soloActivos ? clientes.filter(c => c.activo) : clientes,
    [clientes, soloActivos],
  );

  const toggleAction = (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
      <input
        type="checkbox"
        checked={soloActivos}
        onChange={e => setSoloActivos(e.target.checked)}
      />
      Solo activos
    </label>
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Clientes</div>
          <div className="page-subtitle">Listado de clientes</div>
        </div>
      </div>

      {loading
        ? <InlineLoader text="Cargando clientes…" />
        : (
          <DataGrid
            title={`${data.length} cliente${data.length !== 1 ? 's' : ''}`}
            columns={COLUMNS}
            data={data}
            actions={toggleAction}
            emptyText="No se encontraron clientes"
            showExport={false}
            pageSize={25}
          />
        )
      }
    </div>
  );
};
