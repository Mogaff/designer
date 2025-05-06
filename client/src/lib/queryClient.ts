import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { apiRequest as apiClientRequest } from './api';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Updated API request function that uses our new API client with Firebase token
export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown | undefined,
  headers?: Record<string, string>,
  isRawFormData?: boolean
): Promise<T> {
  // Import our new API client
  const { api } = await import('./api');
  
  try {
    // Use different methods based on the HTTP method
    switch (method.toUpperCase()) {
      case 'GET':
        return await api.get<T>(url, { headers });
      case 'POST':
        // Handle FormData separately
        if (data instanceof FormData) {
          // For FormData, we need to use the browser's fetch directly
          const res = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: data,
            credentials: 'include',
          });
          await throwIfResNotOk(res);
          return await res.json();
        }
        return await api.post<T>(url, data, { headers });
      case 'PUT':
        return await api.put<T>(url, data, { headers });
      case 'DELETE':
        return await api.delete<T>(url, { headers });
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  } catch (error) {
    console.error(`API Request failed: ${method} ${url}`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
// Type-safe query function factory
export function getQueryFn<TData>(options: { on401: UnauthorizedBehavior }): QueryFunction<TData> {
  return async ({ queryKey }) => {
    try {
      // Dynamically import our API client
      const { api } = await import('./api');
      
      // Use the API client for GET requests (it will add Firebase UID automatically)
      return await api.get<TData>(queryKey[0] as string);
    } catch (error: any) {
      // Handle unauthorized errors based on the specified behavior
      if (error.message?.includes('401') && options.on401 === 'returnNull') {
        console.log(`Received 401 for ${queryKey[0]}, returning null as configured`);
        return null as TData;
      }
      
      // Re-throw all other errors
      throw error;
    }
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
