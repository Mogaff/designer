import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogOut, Mail, Settings, User } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function ProfilePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("account");
  
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#090a15]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  // Get the first letter of the user's name or email for avatar fallback
  const getInitials = () => {
    if (user.name) {
      return user.name.charAt(0).toUpperCase();
    }
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-[#090a15] text-white">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <Link href="/">
              <a className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-500">
                ha'itu
              </a>
            </Link>
            <Button 
              variant="outline" 
              size="sm"
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1 space-y-6">
            <Card className="border-white/10 bg-black/30 backdrop-blur-md">
              <CardHeader className="pb-4">
                <div className="flex flex-col items-center space-y-4">
                  <Avatar className="h-24 w-24 border-2 border-indigo-500/50 shadow-lg shadow-indigo-500/20">
                    <AvatarImage src={`https://avatar.vercel.sh/${user.id}`} />
                    <AvatarFallback className="bg-indigo-500/20 text-xl font-semibold">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <h2 className="text-xl font-bold">{user.name || 'User'}</h2>
                    <p className="text-sm text-white/60">{user.email}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="flex justify-center">
                  <Badge className="bg-gradient-to-r from-indigo-500 to-purple-500 border-none uppercase font-semibold tracking-wide">
                    {user.subscriptionStatus || 'Free'}
                  </Badge>
                </div>
              </CardContent>
              <CardFooter className="justify-center">
                <div className="grid grid-cols-2 w-full gap-4">
                  <Button
                    variant="outline"
                    className="border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs"
                    size="sm" 
                    asChild
                  >
                    <Link href="/my-flyers">
                      <a className="flex items-center justify-center">
                        View Flyers
                      </a>
                    </Link>
                  </Button>
                  <Button
                    variant="default"
                    className="bg-indigo-500/80 hover:bg-indigo-500 text-white text-xs"
                    size="sm"
                    asChild
                  >
                    <Link href="/">
                      <a className="flex items-center justify-center">
                        New Flyer
                      </a>
                    </Link>
                  </Button>
                </div>
              </CardFooter>
            </Card>
            
            <Card className="border-white/10 bg-black/30 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-base">Account Menu</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex flex-col">
                  <button 
                    className={`flex items-center px-4 py-3 text-sm ${activeTab === 'account' ? 'bg-indigo-500/20 text-white' : 'text-white/70 hover:bg-white/5'}`}
                    onClick={() => setActiveTab('account')}
                  >
                    <User className="h-4 w-4 mr-3" />
                    Account Information
                  </button>
                  <button 
                    className={`flex items-center px-4 py-3 text-sm ${activeTab === 'subscription' ? 'bg-indigo-500/20 text-white' : 'text-white/70 hover:bg-white/5'}`}
                    onClick={() => setActiveTab('subscription')}
                  >
                    <Mail className="h-4 w-4 mr-3" />
                    Subscription
                  </button>
                  <button 
                    className={`flex items-center px-4 py-3 text-sm ${activeTab === 'settings' ? 'bg-indigo-500/20 text-white' : 'text-white/70 hover:bg-white/5'}`}
                    onClick={() => setActiveTab('settings')}
                  >
                    <Settings className="h-4 w-4 mr-3" />
                    Settings
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Main Content */}
          <div className="md:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-black/30 border border-white/10">
                <TabsTrigger 
                  value="account"
                  className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-white data-[state=active]:shadow-none"
                >
                  Account
                </TabsTrigger>
                <TabsTrigger 
                  value="subscription"
                  className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-white data-[state=active]:shadow-none"
                >
                  Subscription
                </TabsTrigger>
                <TabsTrigger 
                  value="settings"
                  className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-white data-[state=active]:shadow-none"
                >
                  Settings
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="account" className="mt-6">
                <Card className="border-white/10 bg-black/30 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                    <CardDescription className="text-white/60">
                      View and update your personal information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-white/80">Email</h3>
                      <p className="p-2 bg-white/5 rounded-md text-sm">{user.email}</p>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-white/80">Display Name</h3>
                      <p className="p-2 bg-white/5 rounded-md text-sm">{user.name || 'Not set'}</p>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-white/80">Member Since</h3>
                      <p className="p-2 bg-white/5 rounded-md text-sm">March 2025</p>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full bg-indigo-500/80 hover:bg-indigo-500 text-white"
                      onClick={() => {
                        toast({
                          title: "Coming Soon",
                          description: "Profile editing will be available in the next update.",
                          duration: 3000,
                        });
                      }}
                    >
                      Edit Profile
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
              
              <TabsContent value="subscription" className="mt-6">
                <Card className="border-white/10 bg-black/30 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle>Subscription Plan</CardTitle>
                    <CardDescription className="text-white/60">
                      Manage your subscription and billing
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="p-4 border border-white/10 rounded-lg bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h3 className="text-base font-bold text-white">
                            {user.subscriptionStatus === 'active' ? 'Premium Plan' : 'Free Plan'}
                          </h3>
                          <p className="text-sm text-white/60">
                            {user.subscriptionStatus === 'active' 
                              ? 'Your premium subscription is active' 
                              : 'Limited features and usage'}
                          </p>
                        </div>
                        <Badge className={user.subscriptionStatus === 'active' 
                          ? 'bg-green-500/80 hover:bg-green-500 border-none'
                          : 'bg-gray-500/80 hover:bg-gray-500 border-none'
                        }>
                          {user.subscriptionStatus === 'active' ? 'Active' : 'Free Tier'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-white/80">AI Flyer Generation</span>
                          <span className="font-medium">{user.subscriptionStatus === 'active' ? 'Unlimited' : '3 per day'}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-white/80">Custom Templates</span>
                          <span className="font-medium">{user.subscriptionStatus === 'active' ? 'All Access' : 'Basic Only'}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-white/80">Flyer Storage</span>
                          <span className="font-medium">{user.subscriptionStatus === 'active' ? 'Unlimited' : '10 Flyers'}</span>
                        </div>
                      </div>
                    </div>
                    
                    {user.subscriptionStatus !== 'active' && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-white/80">Upgrade to Premium</h3>
                        <p className="text-sm text-white/60">
                          Get unlimited AI-generated flyers, premium templates, and more for just $9/month.
                        </p>
                        <Button 
                          className="w-full mt-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white border-none"
                          onClick={() => {
                            toast({
                              title: "Coming Soon",
                              description: "Subscription upgrade will be available in the next update.",
                              duration: 3000,
                            });
                          }}
                        >
                          Upgrade Now
                        </Button>
                      </div>
                    )}
                    
                    {user.subscriptionStatus === 'active' && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-white/80">Billing Information</h3>
                        <p className="text-sm text-white/60">
                          Your next billing date is April 28, 2025.
                        </p>
                        <Button 
                          variant="outline"
                          className="w-full mt-2 bg-transparent border-white/20 text-white hover:bg-white/10"
                          onClick={() => {
                            toast({
                              title: "Coming Soon",
                              description: "Billing management will be available in the next update.",
                              duration: 3000,
                            });
                          }}
                        >
                          Manage Billing
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="settings" className="mt-6">
                <Card className="border-white/10 bg-black/30 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle>Account Settings</CardTitle>
                    <CardDescription className="text-white/60">
                      Manage your account settings and preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-sm">Email Notifications</h3>
                        <p className="text-xs text-white/60">Receive email updates about your account</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                        onClick={() => {
                          toast({
                            title: "Coming Soon",
                            description: "Notification preferences will be available in the next update.",
                            duration: 3000,
                          });
                        }}
                      >
                        Configure
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-sm">Password</h3>
                        <p className="text-xs text-white/60">Change your password</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                        onClick={() => {
                          toast({
                            title: "Coming Soon",
                            description: "Password change will be available in the next update.",
                            duration: 3000,
                          });
                        }}
                      >
                        Update
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-sm">Delete Account</h3>
                        <p className="text-xs text-white/60">Permanently delete your account and data</p>
                      </div>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => {
                          toast({
                            title: "Coming Soon",
                            description: "Account deletion will be available in the next update.",
                            duration: 3000,
                          });
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}