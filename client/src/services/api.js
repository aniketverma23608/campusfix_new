const API_ROOT = import.meta.env.VITE_API_URL || '';

export async function api(path, options = {}) {
  const token = localStorage.getItem('campusfix-token');
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_ROOT}${path}`, { ...options, headers });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || `Request failed (${response.status})`);
  return data;
}

export const json = value => JSON.stringify(value);

export async function protectedFile(path) {
  const token = localStorage.getItem('campusfix-token');
  const response = await fetch(path, { headers: token ? { Authorization: 'Bearer ' + token } : {} });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Could not open this file.');
  }
  return URL.createObjectURL(await response.blob());
}
