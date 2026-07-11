import { createClient } from './supabase/client'

// Simple canvas fingerprint for unauthenticated requests
function generateDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'server-side-fingerprint';
  let fp = localStorage.getItem('device_fingerprint');
  if (!fp) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('pyqbase', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('pyqbase', 4, 17);
      fp = canvas.toDataURL().slice(-50); // Get last 50 chars as hash
    } else {
      fp = navigator.userAgent + window.screen.width + window.screen.height;
    }
    localStorage.setItem('device_fingerprint', fp);
  }
  return fp;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function apiClient(endpoint: string, options: RequestInit = {}) {
  const supabase = createClient();
  const headers = new Headers(options.headers);

  const { data: { session } } = await supabase.auth.getSession();

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
  
  let response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    // Try refreshing the session silently
    const { data: refreshData, error } = await supabase.auth.refreshSession();
    
    if (error || !refreshData.session) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Session expired. Please log in again.');
    }

    // Retry with new token
    headers.set('Authorization', `Bearer ${refreshData.session.access_token}`);
    response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Authentication failed');
    }
  }

  return response;
}
