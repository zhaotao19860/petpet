export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const hasFormDataBody = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    ...(options.body !== undefined && !hasFormDataBody ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers ?? {}),
  };
  const response = await fetch(path, {
    ...options,
    credentials: 'include',
    headers,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'API_ERROR');
  }
  return data as T;
}
