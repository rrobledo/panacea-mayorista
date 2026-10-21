import { ESTADO_LABELS, seImprimeComoRemito, formatDate } from '../../utils/pedidosConfig';

// ── Copia imprimible de un envío ──────────────────────────────────────────────
// Sale como REMITO (cantidades entregadas, sin las líneas no entregadas) si el
// envío es un remito directo o ya está listo para entregar / entregado; si no,
// como PEDIDO (cantidades pedidas).

const th = { padding: '6px 9px', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: '#444', background: '#f0f0f0', borderBottom: '1px solid #bbb', textAlign: 'left' };
const td = { padding: '6px 9px', fontSize: 14, borderBottom: '1px solid #eee', verticalAlign: 'top' };
const label = { fontSize: 12, color: '#666', textTransform: 'uppercase', fontWeight: 600 };

export const EnvioPrint = ({ envio, lineas, vendedor, observaciones }) => {
  const esRemito = seImprimeComoRemito(envio);
  const esSucursal = envio.tipo === 'SUCURSAL';
  const nombreCliente = [envio.cliente?.nom1, envio.cliente?.nom2].filter(Boolean).join(' ')
    || (envio.cliente_id ? `Cliente #${envio.cliente_id}` : '—');
  const filas = esRemito
    ? lineas.filter(l => l.cantidad_entregada > 0).map(l => ({ ...l, cantidad: l.cantidad_entregada }))
    : lineas.map(l => ({ ...l, cantidad: l.cantidad_pedida }));

  return (
    <div style={{ flex: 1, fontFamily: 'Arial, sans-serif', fontSize: 14, color: '#111' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #111', paddingBottom: 8, marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 19, letterSpacing: '0.04em' }}>PANACEA BAKERY GLUTEN FREE</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Panadería sin gluten</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, fontSize: 17 }}>{esRemito ? 'REMITO' : 'PEDIDO'} N° {envio.id}</div>
          {envio.remitos_legacy_ids?.length > 0 && (
            <div style={{ fontSize: 12, color: '#666' }}>Remito anterior: {envio.remitos_legacy_ids.map(n => `#${n}`).join(', ')}</div>
          )}
        </div>
      </div>

      {/* Info grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px', marginBottom: 10 }}>
        <div>
          {esSucursal ? (
            <>
              <div style={label}>Origen → Destino</div>
              <div style={{ fontWeight: 700 }}>
                {envio.origen_sucursal?.nombre || (envio.origen_sucursal_id ? `Sucursal #${envio.origen_sucursal_id}` : 'Fábrica')}
                {' → '}
                {envio.sucursal?.nombre || `Sucursal #${envio.sucursal_id}`}
              </div>
            </>
          ) : (
            <>
              <div style={label}>Cliente</div>
              <div style={{ fontWeight: 700 }}>{nombreCliente}</div>
              {envio.cliente?.cuit      && <div style={{ fontSize: 13, color: '#555' }}>CUIT: {envio.cliente.cuit}</div>}
              {envio.cliente?.direccion && <div style={{ fontSize: 13, color: '#555' }}>{envio.cliente.direccion}{envio.cliente?.localidad ? `, ${envio.cliente.localidad}` : ''}</div>}
              {(envio.cliente?.celular || envio.cliente?.tel1) && <div style={{ fontSize: 13, color: '#555' }}>Tel: {envio.cliente.celular || envio.cliente.tel1}</div>}
            </>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div>
            <div style={label}>{esRemito ? 'Fecha' : 'Fecha Entrega'}</div>
            <div style={{ fontWeight: 700 }}>
              {formatDate(esRemito ? (envio.fecha_entregado || envio.fecha_listo_para_entrega || envio.fecha_carga) : envio.fecha_entrega)}
            </div>
          </div>
          <div>
            <div style={label}>Vendedor</div>
            <div>{vendedor || '—'}</div>
          </div>
          <div>
            <div style={label}>Estado</div>
            <div>{ESTADO_LABELS[envio.estado] || envio.estado}</div>
          </div>
          {esRemito && !envio.es_remito && (
            <div>
              <div style={label}>Pedido</div>
              <div>Cargado el {formatDate(envio.fecha_carga)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Products table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
        <thead>
          <tr>
            <th style={th}>Producto</th>
            <th style={{ ...th, textAlign: 'right', width: 75 }}>Cantidad</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((l, i) => (
            <tr key={l.producto_id} style={{ background: i % 2 === 1 ? '#f3f3f3' : 'transparent' }}>
              <td style={td}>{l.nombre}</td>
              <td style={{ ...td, textAlign: 'right' }}>{l.cantidad}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Observaciones */}
      {observaciones && (
        <div style={{ fontSize: 13, color: '#555', marginBottom: 10, paddingTop: 4, borderTop: '1px solid #ddd' }}>
          <strong>Obs.: </strong>{observaciones}
        </div>
      )}

      {/* Firma */}
      {esRemito && (
        <div style={{ marginTop: 48, maxWidth: 200 }}>
          <div style={{ borderTop: '1px solid #555', paddingTop: 4, fontSize: 12, color: '#666' }}>Firma receptor</div>
        </div>
      )}
    </div>
  );
};
