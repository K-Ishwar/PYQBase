import { createClient } from './supabase/client'

// Simple canvas fingerprint for unauthenticated requests
function generateDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'server-side-fingerprint';
  let fp = localStorage.getItem('device_fingerprint');
  if (!fp) {
    fp = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('device_fingerprint', fp);
  }
  return fp;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export async function apiClient(endpoint: string, options: RequestInit = {}) {
  try {
    const supabase = createClient();
    const headers = new Headers(options.headers);

    // Try to get session - catch if Supabase fails
    let session = null;
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      session = s;
    } catch (err) {
      console.error('Supabase session error:', err);
      // Continue without session
    }

    if (session?.access_token) {
      headers.set('Authorization', `Bearer ${session.access_token}`);
    } else {
      headers.set('X-Device-Fingerprint', generateDeviceFingerprint());
    }

    // Ensure JSON requests set content type
    if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const url = `${API_BASE_URL}${endpoint}`;
    
    console.log('API Request:', {
      method: options.method || 'GET',
      url,
      hasAuth: !!session?.access_token,
      headers: Object.fromEntries(headers.entries())
    });
    
    let response = await fetch(url, { ...options, headers });

    console.log('API Response:', {
      status: response.status,
      statusText: response.statusText,
      url: response.url
    });

    if (response.status === 401) {
      // Try refreshing the session silently
      let refreshData = null;
      try {
        const result = await supabase.auth.refreshSession();
        refreshData = result.data;
      } catch (err) {
        console.error('Session refresh error:', err);
      }
      
      if (!refreshData || !refreshData.session) {
        // Do NOT redirect here — let the caller/component decide what to do.
        // Forcing window.location causes redirect loops when the home page
        // fires authenticated API calls (e.g. SRS queue) right after login.
        throw new Error('Session expired. Please log in again.');
      }

      // Retry with new token
      headers.set('Authorization', `Bearer ${refreshData.session.access_token}`);
      response = await fetch(url, { ...options, headers });

      if (response.status === 401) {
        throw new Error('Authentication failed');
      }
    }

    return response;
  } catch (error) {
    console.error('apiClient error:', error);
    throw error;
  }
}
