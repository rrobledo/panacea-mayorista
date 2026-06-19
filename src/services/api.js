import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://panacea-mayorista-backend.vercel.app',
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

export const remitosService = {
  create: (data)   => api.post('/remitos', data),
  list:   (params) => api.get('/remitos', { params }),
  get:    (id)     => api.get(`/remitos/${id}`),
  update: (id, data) => api.put(`/remitos/${id}`, data),
  remove: (id)     => api.delete(`/remitos/${id}`),
  estado: (id, nuevo_estado) => api.patch(`/remitos/${id}/estado`, { nuevo_estado }),
};
