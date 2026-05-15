const API_BASE = 'http://localhost:8000';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };
  const res = await fetch(url, config);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Device Types ────────────────────────────────────────────────
export const deviceTypesAPI = {
  list: (activeOnly = false) => request(`/device-types/?active_only=${activeOnly}`),
  create: (data) => request('/device-types/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/device-types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/device-types/${id}`, { method: 'DELETE' }),
  toggle: (id) => request(`/device-types/${id}/toggle`, { method: 'PATCH' }),
};

// ── Devices ─────────────────────────────────────────────────────
export const devicesAPI = {
  list: () => request('/devices/'),
  create: (data) => request('/devices/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/devices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/devices/${id}`, { method: 'DELETE' }),
  toggle: (id) => request(`/devices/${id}/toggle`, { method: 'PATCH' }),
};

// ── Products ────────────────────────────────────────────────────
export const productsAPI = {
  list: (params = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.page) q.set('page', params.page);
    if (params.page_size) q.set('page_size', params.page_size);
    if (params.active_only) q.set('active_only', params.active_only);
    return request(`/products/?${q.toString()}`);
  },
  count: (params = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.active_only) q.set('active_only', params.active_only);
    return request(`/products/count?${q.toString()}`);
  },
  create: (data) => request('/products/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  toggle: (id) => request(`/products/${id}/toggle`, { method: 'PATCH' }),
};

// ── Sessions ────────────────────────────────────────────────────
export const sessionsAPI = {
  start: (data) => request('/sessions/', { method: 'POST', body: JSON.stringify(data) }),
  end: (id) => request(`/sessions/${id}/end`, { method: 'PUT' }),
  get: (id) => request(`/sessions/${id}`),
  addProduct: (sessionId, data) => request(`/sessions/${sessionId}/products`, { method: 'POST', body: JSON.stringify(data) }),
  invoice: (id) => request(`/sessions/${id}/invoice`),
};

// ── Settings ────────────────────────────────────────────────────
export const settingsAPI = {
  get: () => request('/settings'),
  update: (data) => request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  auth: (password) => request('/settings/auth', { method: 'POST', body: JSON.stringify({ password }) }),
};

// ── Reports ─────────────────────────────────────────────────────
export const reportsAPI = {
  monthly: (year, month) => request(`/reports/monthly?year=${year}&month=${month}`),
};
