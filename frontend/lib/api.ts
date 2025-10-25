// API client for backend communication
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface RequestOptions extends RequestInit {
  token?: string;
}

async function apiRequest(endpoint: string, options: RequestOptions = {}) {
  const { token, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Health check
  health: () => apiRequest('/health'),

  // Auth
  auth: {
    verify: (token: string) => apiRequest('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
    getProfile: (token: string) => apiRequest('/auth/profile', { token }),
    updateProfile: (token: string, data: any) => apiRequest('/auth/profile', {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    }),
  },

  // Complaints
  complaints: {
    getAll: (filters?: { status?: string; type?: string; limit?: number }) => {
      const params = new URLSearchParams(filters as any);
      return apiRequest(`/complaints?${params}`);
    },
    getById: (id: string) => apiRequest(`/complaints/${id}`),
    create: (token: string, data: any) => apiRequest('/complaints', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),
    getUserComplaints: (token: string) => apiRequest('/complaints/user', { token }),
  },

  // Admin
  admin: {
    getComplaints: (token: string, filters?: any) => {
      const params = new URLSearchParams(filters);
      return apiRequest(`/admin/complaints?${params}`, { token });
    },
    updateComplaint: (token: string, id: string, data: any) => 
      apiRequest(`/admin/complaints/${id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify(data),
      }),
    getStats: (token: string) => apiRequest('/admin/stats', { token }),
  },

  // AI Features
  ai: {
    predictType: (token: string, imageBase64: string) => 
      apiRequest('/ai/predict-type', {
        method: 'POST',
        token,
        body: JSON.stringify({ image_base64: imageBase64 }),
      }),
    generateSummary: (token: string, description: string, type: string) =>
      apiRequest('/ai/generate-summary', {
        method: 'POST',
        token,
        body: JSON.stringify({ description, type }),
      }),
    verifyResolution: (token: string, beforeImage: string, afterImage: string, issueType: string) =>
      apiRequest('/ai/verify-resolution', {
        method: 'POST',
        token,
        body: JSON.stringify({
          before_image: beforeImage,
          after_image: afterImage,
          issue_type: issueType,
        }),
      }),
    chatbot: (query: string, context?: any) =>
      apiRequest('/ai/chatbot', {
        method: 'POST',
        body: JSON.stringify({ query, context }),
      }),
    getInsights: (token: string) => apiRequest('/ai/insights', { token }),
  },
};
