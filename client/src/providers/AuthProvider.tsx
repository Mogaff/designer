import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider as InnerAuthProvider } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { ReactNode } from "react";

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <InnerAuthProvider>
        {children}
      </InnerAuthProvider>
    </QueryClientProvider>
  );
}