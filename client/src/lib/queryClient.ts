import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Get the response text
    const text = (await res.text()) || res.statusText;
    
    // Check if it might be HTML (simple check for common HTML tags)
    const isHtml = text.includes('<html') || text.includes('<!DOCTYPE') || text.includes('<body');
    
    // If it looks like HTML, provide a more helpful error message
    if (isHtml) {
      console.error('Received HTML response instead of JSON:', text.substring(0, 300) + '...');
      throw new Error(`${res.status}: Received HTML instead of JSON. The server might be returning an error page.`);
    } else {
      throw new Error(`${res.status}: ${text}`);
    }
  }
}

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown | undefined,
  headers?: Record<string, string>,
  isRawFormData?: boolean
): Promise<T> {
  try {
    // Check if data is FormData (for file uploads)
    const isFormData = data instanceof FormData;
    
    // Prepare headers
    let requestHeaders: Record<string, string> = {
      ...(headers || {})
    };
    
    // Only add content-type for JSON data (browser will set it automatically for FormData with boundary)
    if (data && !isFormData && !isRawFormData) {
      requestHeaders["Content-Type"] = "application/json";
    }
    
    const res = await fetch(url, {
      method,
      headers: requestHeaders,
      // If it's FormData or explicitly marked as raw form data, send directly, otherwise stringify
      body: (isFormData || isRawFormData) ? data as FormData : data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    
    try {
      return await res.json() as T;
    } catch (jsonError) {
      console.error('Failed to parse response as JSON:', jsonError);
      throw new Error('Server returned invalid JSON response');
    }
  } catch (error) {
    console.error(`API request failed for ${method} ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      
      try {
        return await res.json();
      } catch (jsonError) {
        console.error('Failed to parse response as JSON:', jsonError);
        throw new Error(`Server returned invalid JSON response for query: ${queryKey[0]}`);
      }
    } catch (error) {
      console.error(`Query failed for ${queryKey[0]}:`, error);
      throw error;
    }
  };

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
