import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown | undefined,
  headers?: Record<string, string>,
  isRawFormData?: boolean
): Promise<T> {
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
  return await res.json() as T;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
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
