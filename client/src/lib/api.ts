import { auth } from './firebase';

// Type for API request options
type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  includeAuth?: boolean;
  isFormData?: boolean;
};

/**
 * Universal API request function that automatically includes Firebase auth token
 * when the user is logged in
 */
export async function apiRequest<T = any>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    body,
    includeAuth = true,
    isFormData = false
  } = options;

  // Default headers - don't set Content-Type for FormData (browser sets it with boundary)
  const requestHeaders: Record<string, string> = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...headers
  };

  // Add Firebase token to Authorization header if user is logged in
  if (includeAuth && auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      requestHeaders['Authorization'] = `Bearer ${token}`;
      
      // Also include the Firebase UID in the request body for our custom auth middleware
      // But only for JSON requests, not FormData
      if (body && method !== 'GET' && !isFormData && typeof body === 'object') {
        // For FormData we'll need to append this field
        if (body instanceof FormData) {
          body.append('uid', auth.currentUser.uid);
        } else {
          // For JSON objects
          body.uid = auth.currentUser.uid;
        }
      }
    } catch (error) {
      console.error('Error getting Firebase token:', error);
    }
  }

  // Prepare request options
  const requestOptions: RequestInit = {
    method,
    headers: requestHeaders,
    credentials: 'include', // Important for session cookies
  };

  // Add body for non-GET requests
  if (body && method !== 'GET') {
    // If it's FormData, use it directly
    if (isFormData || body instanceof FormData) {
      requestOptions.body = body as FormData | BodyInit;
      
      // For FormData with Firebase UID, add it if not already present
      if (includeAuth && auth.currentUser && body instanceof FormData && !body.has('uid')) {
        body.append('uid', auth.currentUser.uid);
      }
    } else {
      // Otherwise stringify as JSON
      requestOptions.body = JSON.stringify(body);
    }
  }

  try {
    const response = await fetch(url, requestOptions);

    // Check if the request was successful
    if (!response.ok) {
      // Try to parse the error response
      try {
        const errorData = await response.json();
        throw new Error(errorData.message || `API error: ${response.status}`);
      } catch (e) {
        // If parsing fails, throw a generic error with the status
        throw new Error(`API error: ${response.status}`);
      }
    }

    // For 204 No Content responses, return null
    if (response.status === 204) {
      return null as T;
    }

    // Parse and return the response
    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

// Helper functions for common request methods
export const api = {
  // GET request with optional query params - adds Firebase UID to URL for auth
  get: async <T = any>(url: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<T> => {
    // Automatically append user's Firebase UID to GET requests if user is logged in
    let finalUrl = url;
    
    if (auth.currentUser) {
      // Add user's Firebase UID as a query parameter
      const separator = url.includes('?') ? '&' : '?';
      finalUrl = `${url}${separator}uid=${auth.currentUser.uid}`;
    }
    
    return apiRequest<T>(finalUrl, { ...options, method: 'GET' });
  },

  post: async <T = any>(url: string, body: any, options?: Omit<ApiRequestOptions, 'method'>): Promise<T> => 
    apiRequest<T>(url, { ...options, method: 'POST', body }),

  put: async <T = any>(url: string, body: any, options?: Omit<ApiRequestOptions, 'method'>): Promise<T> => 
    apiRequest<T>(url, { ...options, method: 'PUT', body }),

  delete: async <T = any>(url: string, options?: Omit<ApiRequestOptions, 'method'>): Promise<T> => 
    apiRequest<T>(url, { ...options, method: 'DELETE' }),
};