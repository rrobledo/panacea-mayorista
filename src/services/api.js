import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://panacea-produccion-backend.vercel.app/costos',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Generic CRUD factory ─────────────────────────────────────────────────────
export const createCrudService = (resource) => ({
  list:   (params) => api.get(`/${resource}`, { params }),
  get:    (id)    => api.get(`/${resource}/${id}`),
  create: (data)  => api.post(`/${resource}`, data),
  update: (id, data) => api.put(`/${resource}/${id}`, data),
  patch:  (id, data) => api.patch(`/${resource}/${id}`, data),
  remove: (id)    => api.delete(`/${resource}/${id}`),
});

// ── Domain services ───────────────────────────────────────────────────────────
export const clientesService = {
  list: (q, limit = 50) => api.get('/clientes', { params: { q: q || undefined, limit } }),
  get:  (id) => api.get(`/clientes/${id}`),
};

export const productosService = {
  list: (q, limit = 50) => api.get('/productos', { params: { q: q || undefined, limit, solo_habilitados: true } }),
  get:  (id) => api.get(`/productos/${id}`),
};

export const pedidosService = {
  create: (data)   => api.post('/pedidos', data),
  list:   (params) => api.get('/pedidos', { params }),
  get:    (id)     => api.get(`/pedidos/${id}`),
  update: (id, data) => api.put(`/pedidos/${id}`, data),
  remove: (id)     => api.delete(`/pedidos/${id}`),
  estado: (id, nuevo_estado) => api.patch(`/pedidos/${id}/estado`, { nuevo_estado }),
  entrega: (id, lineas) => api.patch(`/pedidos/${id}/entrega`, { lineas }),
  // { fecha_facturado, factura_referencia } — las dos nulas desmarcan
  facturacion: (id, data) => api.patch(`/pedidos/${id}/facturacion`, data),
};

export const sucursalesService = {
  list:   (params) => api.get('/sucursales', { params }),
  create: (data)   => api.post('/sucursales', data),
  update: (id, data) => api.put(`/sucursales/${id}`, data),
};
