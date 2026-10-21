/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pedidosService } from '../services/api';
import { PageLoader } from '../components/ui';

// Los remitos pasaron a ser envíos (/pedidos/:id). Esta ruta queda para los
// links y números de remito anteriores a la unificación: busca el envío que
// reemplazó al remito #id y redirige a su detalle.
export const RemitoDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [noEncontrado, setNoEncontrado] = useState(false);

  useEffect(() => {
    setNoEncontrado(false);
    pedidosService.list({ remito_legacy_id: id })
      .then(res => {
        const [envio] = res.data;
        if (envio) navigate(`/pedidos/${envio.id}`, { replace: true });
        else setNoEncontrado(true);
      })
      .catch(() => setNoEncontrado(true));
  }, [id, navigate]);

  if (!noEncontrado) return <PageLoader />;
  return (
    <div className="card">
      <div className="card-body" style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>
        No se encontró el remito #{id}
      </div>
    </div>
  );
};
