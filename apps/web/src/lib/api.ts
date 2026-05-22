import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Call this once in a client component to inject auth
export function setupApiAuth(getToken: () => Promise<string | null>) {
  api.interceptors.request.use(async (config) => {
    try {
      const token = await getToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch {}
    return config;
  });
}
