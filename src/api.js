const API_URL = import.meta.env.DEV
  ? import.meta.env.VITE_API_URL_DEV || 'http://localhost:5000/api'
  : import.meta.env.VITE_API_URL_PROD;

if (!API_URL) {
  throw new Error('VITE_API_URL_PROD must be configured for production builds');
}

export async function api(path, { token, ...options } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const payload = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || `Request failed (${response.status})`);
  return payload;
}
