import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Pricing from "@/pages/Pricing";
import Gallery from "@/pages/Gallery";
import Settings from "@/pages/Settings";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserSettingsProvider } from "@/contexts/UserSettingsContext";
import ProtectedRoute from "@/components/ProtectedRoute";

function Router() {
  return (
    <Switch>
      {/* Login is the only route that doesn't require authentication */}
      <Route path="/login" component={Login} />
      
      {/* All other routes require authentication */}
      <Route path="/">
        <ProtectedRoute>
          <Home />
        </ProtectedRoute>
      </Route>
      <Route path="/pricing">
        <ProtectedRoute>
          <Pricing />
        </ProtectedRoute>
      </Route>
      <Route path="/gallery">
        <ProtectedRoute>
          <Gallery />
        </ProtectedRoute>
      </Route>
      
      <Route path="/settings">
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      </Route>
      
      {/* 404 page also requires authentication */}
      <Route>
        <ProtectedRoute>
          <NotFound />
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UserSettingsProvider>
          <Router />
          <Toaster />
        </UserSettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
