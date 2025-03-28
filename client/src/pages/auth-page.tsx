import React, { useState } from "react";
import { useAuth, useAuthRedirect } from "../hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlowEffect } from "@/components/ui/glow-effect";

export default function AuthPage() {
  // Redirect if already logged in
  useAuthRedirect();
  
  const { loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("login");
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Register form state
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ 
      email: loginEmail, 
      password: loginPassword 
    });
  };
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate({
      email: registerEmail,
      password: registerPassword,
      name: registerName || undefined
    });
  };

  return (
    <div className="flex min-h-screen">
      {/* Auth forms on the left */}
      <div className="w-full md:w-1/2 p-6 flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto bg-background/60 backdrop-blur-lg border border-border/50">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Welcome to ha'itu
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              {activeTab === "login" 
                ? "Sign in to access your AI flyer generator"
                : "Create an account to start designing amazing flyers"}
            </CardDescription>
          </CardHeader>
          
          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email"
                      type="email" 
                      placeholder="your@email.com" 
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input 
                      id="password"
                      type="password" 
                      placeholder="••••••••"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                  </div>
                  
                  {loginMutation.error && activeTab === "login" && (
                    <div className="text-sm text-red-500">
                      {loginMutation.error instanceof Error 
                        ? loginMutation.error.message 
                        : "Login failed"}
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    disabled={loginMutation.isPending}
                    type="submit"
                  >
                    {loginMutation.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Signing in...
                      </span>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister}>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input 
                      id="name"
                      placeholder="Your Name" 
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input 
                      id="register-email"
                      type="email" 
                      placeholder="your@email.com" 
                      required
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input 
                      id="register-password"
                      type="password" 
                      placeholder="••••••••"
                      required
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                    />
                  </div>
                  
                  {registerMutation.error && activeTab === "register" && (
                    <div className="text-sm text-red-500">
                      {registerMutation.error instanceof Error 
                        ? registerMutation.error.message 
                        : "Registration failed"}
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    disabled={registerMutation.isPending}
                    type="submit"
                  >
                    {registerMutation.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating account...
                      </span>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
      
      {/* Hero section on the right */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex-col justify-center items-center p-12">
        <div className="max-w-md">
          <GlowEffect
            className="mb-8 w-24 h-24 rounded-full"
            colors={["#8B5CF6", "#3B82F6", "#10B981"]}
            mode="colorShift"
            scale={1.5}
          >
            <div className="bg-white/10 backdrop-blur-md rounded-full p-4 flex items-center justify-center">
              <h1 className="text-3xl font-bold text-white">ha'itu</h1>
            </div>
          </GlowEffect>
          
          <h2 className="text-4xl font-bold text-white mb-6">
            AI-Powered Flyer Creation
          </h2>
          
          <p className="text-lg text-blue-100 mb-8">
            Create stunning professional flyers in seconds with our cutting-edge AI. 
            Upload images, provide a prompt, and let our advanced AI generate beautiful designs.
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4">
              <h3 className="text-xl font-semibold text-white mb-2">Fast & Easy</h3>
              <p className="text-blue-100">Generate flyers in seconds with simple prompts</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4">
              <h3 className="text-xl font-semibold text-white mb-2">Professional</h3>
              <p className="text-blue-100">Beautiful, modern designs with just a few clicks</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}