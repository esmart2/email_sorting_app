const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const SITE_URL = import.meta.env.VITE_SITE_URL || 'http://localhost:3000';

export function getApiUrl(path: string): string {
  // Remove any leading slashes from the path
  const cleanPath = path.replace(/^\/+/, '');
  // Remove any trailing slashes from the API_URL
  const baseUrl = API_URL.replace(/\/+$/, '');
  return `${baseUrl}/${cleanPath}`;
}

export const config = {
  apiUrl: API_URL,
  siteUrl: SITE_URL,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
}; 