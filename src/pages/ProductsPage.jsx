import { useState, useEffect, useMemo } from 'react';
import { DataGrid } from '../components/grid/DataGrid';
import { InlineLoader } from '../components/ui';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

const fmt = (v) => `$${Number(v ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

const COLUMNS = [
  { accessorKey: 'codigo',        header: 'Código',    size: 150 },
  { accessorKey: 'nombre',        header: 'Nombre',    size: 220 },
  { accessorKey: 'categoria',     header: 'Categoría', size: 140 },
  { accessorKey: 'unidad_medida', header: 'Unidad',    size: 80  },
  {
    accessorKey: 'precio_actual',
    header: 'Precio',
    size: 110,
    cell: ({ getValue }) => (
      <span style={{ fontWeight: 500 }}>{fmt(getValue())}</span>
    ),
  },
  {
    accessorKey: 'habilitado',
    header: 'Estado',
    size: 110,
    cell: ({ getValue }) => (
      <span className={`badge ${getValue() ? 'badge-success' : 'badge-gray'}`}>
        {getValue() ? 'Habilitado' : 'Deshabilitado'}
      </span>
    ),
  },
];

export const ProductsPage = () => {
  const toast = useToast();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [soloHabilitados, setSoloHabilitados] = useState(true);

  useEffect(() => {
    api.get('/productos', { params: { limit: 500 } })
      .then(res => setProductos(res.data))
      .catch(() => toast.error('Error al cargar productos'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const data = useMemo(
    () => soloHabilitados ? productos.filter(p => p.habilitado) : productos,
    [productos, soloHabilitados],
  );

  const toggleAction = (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
      <input
        type="checkbox"
        checked={soloHabilitados}
        onChange={e => setSoloHabilitados(e.target.checked)}
      />
      Solo habilitados
    </label>
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Productos</div>
          <div className="page-subtitle">Catálogo de productos</div>
        </div>
      </div>

      {loading
        ? <InlineLoader text="Cargando productos…" />
        : (
          <DataGrid
            title={`${data.length} producto${data.length !== 1 ? 's' : ''}`}
            columns={COLUMNS}
            data={data}
            actions={toggleAction}
            emptyText="No se encontraron productos"
            showExport={false}
            pageSize={25}
          />
        )
      }
    </div>
  );
};
