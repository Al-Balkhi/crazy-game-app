const API_BASE = 'http://localhost:8000';

function formatErrorDetail(detail) {
  if (!detail) return null;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg || item.message || JSON.stringify(item)).join(', ');
  }
  if (typeof detail === 'object' && detail.message) return detail.message;
  return String(detail);
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const config = {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  };

  let res;
  try {
    res = await fetch(url, config);
  } catch (error) {
    if (error.name === 'TypeError') {
      throw new Error('Network error: Unable to connect to server. Is the backend running?');
    }
    throw error;
  }

  if (!res.ok) {
    let errorMessage = res.statusText || `HTTP ${res.status}`;
    try {
      const errorData = await res.json();
      errorMessage = formatErrorDetail(errorData.detail) || errorMessage;
    } catch {
      // Non-JSON error body — keep status text
    }
    throw new Error(errorMessage);
  }

  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
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

// ── Health ──────────────────────────────────────────────────────
export const healthAPI = {
  check: () => request('/health'),
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
  lowStock: () => request('/products/alerts/low-stock'),
};

// ── Sessions ────────────────────────────────────────────────────
export const sessionsAPI = {
  start: (data) => request('/sessions/', { method: 'POST', body: JSON.stringify(data) }),
  end: (id) => request(`/sessions/${id}/end`, { method: 'PUT' }),
  pause: (id) => request(`/sessions/${id}/pause`, { method: 'PUT' }),
  resume: (id) => request(`/sessions/${id}/resume`, { method: 'PUT' }),
  get: (id) => request(`/sessions/${id}`),
  list: (params = {}) => {
    const q = new URLSearchParams();
    if (params.filter) q.set('filter', params.filter);
    if (params.page) q.set('page', params.page);
    if (params.page_size) q.set('page_size', params.page_size);
    return request(`/sessions/?${q.toString()}`);
  },
  addProduct: (sessionId, data) => request(`/sessions/${sessionId}/products`, { method: 'POST', body: JSON.stringify(data) }),
  removeProduct: (sessionId, sessionProductId) => request(`/sessions/${sessionId}/products/${sessionProductId}`, { method: 'DELETE' }),
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
  daily: (year, month, day) => request(`/reports/daily?year=${year}&month=${month}&day=${day}`),
};
