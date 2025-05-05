const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const SITE_URL = import.meta.env.VITE_SITE_URL || 'http://localhost:3000';

// Log API configuration on startup
console.log('API Configuration:', {
  API_URL,
  SITE_URL,
  isProduction: import.meta.env.PROD
});

export function getApiUrl(path: string): string {
  // Remove any leading slashes from the path
  const cleanPath = path.replace(/^\/+/, '');
  // Remove any trailing slashes from the API_URL
  const baseUrl = API_URL.replace(/\/+$/, '');
  const fullUrl = `${baseUrl}/${cleanPath}`;
  
  // Log API URL to help with debugging
  console.log(`API URL: ${fullUrl}`);
  
  return fullUrl;
}

export const config = {
  apiUrl: API_URL,
  siteUrl: SITE_URL,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
}; 