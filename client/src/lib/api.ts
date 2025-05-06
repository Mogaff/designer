import { auth } from './firebase';

// Type for API request options
type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  includeAuth?: boolean;
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
    includeAuth = true
  } = options;

  // Default headers
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers
  };

  // Add Firebase token to Authorization header if user is logged in
  if (includeAuth && auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      requestHeaders['Authorization'] = `Bearer ${token}`;
      
      // Also include the Firebase UID in the request body for our custom auth middleware
      if (body && method !== 'GET') {
        body.uid = auth.currentUser.uid;
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
    requestOptions.body = JSON.stringify(body);
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
  get: <T = any>(url: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) => 
    apiRequest<T>(url, { ...options, method: 'GET' }),

  post: <T = any>(url: string, body: any, options?: Omit<ApiRequestOptions, 'method'>) => 
    apiRequest<T>(url, { ...options, method: 'POST', body }),

  put: <T = any>(url: string, body: any, options?: Omit<ApiRequestOptions, 'method'>) => 
    apiRequest<T>(url, { ...options, method: 'PUT', body }),

  delete: <T = any>(url: string, options?: Omit<ApiRequestOptions, 'method'>) => 
    apiRequest<T>(url, { ...options, method: 'DELETE' }),
};