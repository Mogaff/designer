import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQueryFn, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { CreditCard, Plus, Star, AlertTriangle, Gift, DollarSign, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ExtendedBadge } from '@/components/ui/extended-badge';
import { Redirect, useLocation } from 'wouter';
import { CreditsResponse, CreditTransaction, ExtendedBadgeVariant } from '@/lib/creditTypes';
import { toast } from '@/hooks/use-toast';

export default function Credits() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [isAddingCredits, setIsAddingCredits] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'error' | 'cancelled' | null>(null);
  
  // Type for Stripe verification response
  type VerifyPaymentResponse = {
    success: boolean;
    transaction: {
      amount: number;
      id: number;
      description: string;
    };
    credits: number;
  };
  
  // Mutation for Stripe payment verification
  const verifyPaymentMutation = useMutation<VerifyPaymentResponse, Error, string>({
    mutationFn: async (sessionId: string) => {
      try {
        const response = await apiRequest('POST', '/api/stripe/verify-payment', { sessionId });
        // Extract JSON data from response
        const data = await response.json();
        
        // Validate response format
        if (data && 
            typeof data === 'object' && 
            'success' in data && 
            'transaction' in data && 
            'credits' in data) {
          return data as VerifyPaymentResponse;
        }
        throw new Error('Invalid response structure from server');
      } catch (error) {
        console.error('Payment verification error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/credits'] });
      setPaymentStatus('success');
      toast({
        title: "Payment Successful",
        description: `${data.transaction.amount} credits have been added to your account.`,
        variant: "default",
      });
      
      // Clean up the URL parameters after successful processing
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('session_id');
      cleanUrl.searchParams.delete('payment_success');
      window.history.replaceState({}, document.title, cleanUrl.pathname);
    },
    onError: (error) => {
      console.error('Payment verification failed:', error);
      setPaymentStatus('error');
      toast({
        title: "Payment Verification Failed",
        description: "We couldn't verify your payment. Please contact support if funds were deducted.",
        variant: "destructive",
      });
    }
  });

  // Check for Stripe redirection with session_id
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const paymentSuccess = params.get('payment_success');
    const paymentCancelled = params.get('payment_cancelled');
    
    console.log('URL Params:', { sessionId, paymentSuccess, paymentCancelled });
    
    if (sessionId) {
      console.log('Found Stripe session ID:', sessionId);
      // Verify the Stripe session
      verifyPaymentMutation.mutate(sessionId);
    } else if (paymentSuccess === 'true') {
      // This is a fallback in case the session_id is not correctly passed
      // We won't automatically credit the account here, just show a message
      setPaymentStatus('success');
      toast({
        title: "Payment Received",
        description: "We're processing your payment. Your credits will be added shortly.",
        variant: "default",
      });
      
      // Clean up the URL parameter
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('payment_success');
      window.history.replaceState({}, document.title, cleanUrl.pathname);
    } else if (paymentCancelled === 'true') {
      setPaymentStatus('cancelled');
      toast({
        title: "Payment Cancelled",
        description: "Your payment was cancelled. No charges were made.",
        variant: "default",
      });
      
      // Clean up the URL parameter
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('payment_cancelled');
      window.history.replaceState({}, document.title, cleanUrl.pathname);
    }
  }, []);

  // Query user credits
  const { 
    data: creditData, 
    isLoading: isLoadingCredits,
    error: creditError 
  } = useQuery<CreditsResponse>({
    queryKey: ['/api/credits'],
    queryFn: getQueryFn({ on401: 'throw' }),
    enabled: isAuthenticated,
  });

  // Mutation to add credits
  const addCreditsMutation = useMutation({
    mutationFn: async ({ amount, description }: { amount: number, description: string }) => {
      const response = await apiRequest('POST', '/api/credits/add', { amount, description });
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate the credits query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/credits'] });
      toast({
        title: "Credits Added",
        description: "Your credits have been successfully added to your account.",
      });
      setIsAddingCredits(false);
    },
    onError: (error) => {
      console.error('Failed to add credits:', error);
      toast({
        title: "Failed to Add Credits",
        description: "There was an error adding credits to your account. Please try again.",
        variant: "destructive",
      });
      setIsAddingCredits(false);
    }
  });

  // Handle adding free credits
  const handleAddFreeCredits = () => {
    setIsAddingCredits(true);
    addCreditsMutation.mutate({ 
      amount: 10, 
      description: "Free credits bonus" 
    });
  };
  
  // Handle purchasing credit packages
  const handlePurchaseCredits = (packageName: string, amount: number, price: string) => {
    setSelectedPackage(packageName);
    setIsAddingCredits(true);
    
    // In a real implementation, this would redirect to a payment gateway
    // For the prototype, we'll just add the credits directly
    addCreditsMutation.mutate({ 
      amount, 
      description: `${packageName} Package ($${price})` 
    });
  };

  // If not authenticated or still checking auth, show loading
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  // Handle credit data loading state
  const renderCreditHistory = () => {
    if (isLoadingCredits) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      );
    }

    if (creditError) {
      return (
        <div className="p-4 bg-destructive/10 text-destructive rounded flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <span>Failed to load credit history. Please try again later.</span>
        </div>
      );
    }

    if (!creditData?.history?.length) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p>No credit transactions yet.</p>
        </div>
      );
    }

    return (
      <Table>
        <TableCaption>Your credit transaction history</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Type</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {creditData.history.map((tx: CreditTransaction) => (
            <TableRow key={tx.id}>
              <TableCell>
                {tx.created_at ? format(new Date(tx.created_at), 'MMM d, yyyy') : '-'}
              </TableCell>
              <TableCell>{tx.description || '-'}</TableCell>
              <TableCell className="text-right">{tx.amount}</TableCell>
              <TableCell className="text-right">
                <ExtendedBadge 
                  variant={tx.transaction_type === 'add' ? 'success' : tx.transaction_type === 'initial' ? 'outline' : 'destructive' as ExtendedBadgeVariant}
                >
                  {tx.transaction_type}
                </ExtendedBadge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="container max-w-4xl mx-auto py-32 px-4">
      {/* Payment Status Alert */}
      {paymentStatus === 'success' && (
        <div className="mb-6 p-4 bg-green-100 border border-green-200 rounded-lg flex items-center shadow-sm">
          <Check className="h-5 w-5 text-green-600 mr-3 flex-shrink-0" />
          <div className="flex-grow">
            <h4 className="font-medium text-green-800">Payment Successful</h4>
            <p className="text-green-700 text-sm">Your payment has been processed and credits have been added to your account.</p>
          </div>
        </div>
      )}
      
      {paymentStatus === 'error' && (
        <div className="mb-6 p-4 bg-red-100 border border-red-200 rounded-lg flex items-center shadow-sm">
          <X className="h-5 w-5 text-red-600 mr-3 flex-shrink-0" />
          <div className="flex-grow">
            <h4 className="font-medium text-red-800">Payment Verification Failed</h4>
            <p className="text-red-700 text-sm">We couldn't verify your payment. If funds were deducted, please contact our support team.</p>
          </div>
        </div>
      )}
      
      {paymentStatus === 'cancelled' && (
        <div className="mb-6 p-4 bg-yellow-100 border border-yellow-200 rounded-lg flex items-center shadow-sm">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0" />
          <div className="flex-grow">
            <h4 className="font-medium text-yellow-800">Payment Cancelled</h4>
            <p className="text-yellow-700 text-sm">Your payment was cancelled. No charges were made to your account.</p>
          </div>
        </div>
      )}
      
      {verifyPaymentMutation.isPending && (
        <div className="mb-6 p-4 bg-blue-100 border border-blue-200 rounded-lg flex items-center shadow-sm">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-600 mr-3 flex-shrink-0"></div>
          <div className="flex-grow">
            <h4 className="font-medium text-blue-800">Verifying Payment</h4>
            <p className="text-blue-700 text-sm">Please wait while we verify your payment...</p>
          </div>
        </div>
      )}
      
      <h1 className="text-3xl font-bold mb-8">Your Credits</h1>

      {/* Credit Summary Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Credit Balance
            {creditData?.is_premium && (
              <Badge variant="secondary" className="ml-auto">
                <Star className="h-3 w-3 mr-1 text-yellow-500" />
                Premium
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Credits are used to generate AI designs. Each design generation costs credits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div>
              <span className="text-4xl font-bold">
                {isLoadingCredits ? (
                  <Skeleton className="h-10 w-20 inline-block" />
                ) : (
                  creditData?.balance || 0
                )}
              </span>
              <span className="text-muted-foreground ml-2">credits available</span>
            </div>

            <Button 
              variant="default" 
              onClick={handleAddFreeCredits} 
              disabled={isAddingCredits || addCreditsMutation.isPending}
            >
              {isAddingCredits || addCreditsMutation.isPending ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                <>
                  <Gift className="h-4 w-4 mr-2" />
                  Get Free Credits
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Credit Packages */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Credit Packages
          </CardTitle>
          <CardDescription>
            Purchase credit packages to generate more AI designs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Basic Package */}
            <Card className="border border-muted">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Basic</CardTitle>
                <CardDescription>Perfect for beginners</CardDescription>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-3xl font-bold">50 <span className="text-base font-normal text-muted-foreground">credits</span></div>
                <div className="text-lg font-medium mt-2">$4.99</div>
                <ul className="mt-3 space-y-2 text-sm">
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Generate up to 12 designs
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Basic design styles
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => handlePurchaseCredits('Basic', 50, '4.99')}
                  disabled={isAddingCredits || addCreditsMutation.isPending}
                >
                  {(isAddingCredits && selectedPackage === 'Basic') || addCreditsMutation.isPending ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary mr-2"></div>
                      Processing...
                    </div>
                  ) : 'Purchase'}
                </Button>
              </CardFooter>
            </Card>

            {/* Pro Package */}
            <Card className="border border-primary shadow-lg">
              <CardHeader className="pb-3 bg-primary/5">
                <Badge className="mb-1 self-start">Popular</Badge>
                <CardTitle className="text-lg">Pro</CardTitle>
                <CardDescription>Great for regular users</CardDescription>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-3xl font-bold">200 <span className="text-base font-normal text-muted-foreground">credits</span></div>
                <div className="text-lg font-medium mt-2">$14.99</div>
                <ul className="mt-3 space-y-2 text-sm">
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Generate up to 50 designs
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    All design styles
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Priority processing
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full"
                  onClick={() => handlePurchaseCredits('Pro', 200, '14.99')}
                  disabled={isAddingCredits || addCreditsMutation.isPending}
                >
                  {(isAddingCredits && selectedPackage === 'Pro') || addCreditsMutation.isPending ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Processing...
                    </div>
                  ) : 'Purchase'}
                </Button>
              </CardFooter>
            </Card>

            {/* Premium Package */}
            <Card className="border border-muted">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Premium</CardTitle>
                <CardDescription>For professional users</CardDescription>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-3xl font-bold">500 <span className="text-base font-normal text-muted-foreground">credits</span></div>
                <div className="text-lg font-medium mt-2">$29.99</div>
                <ul className="mt-3 space-y-2 text-sm">
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Unlimited designs
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Premium design styles
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Priority support
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => handlePurchaseCredits('Premium', 500, '29.99')}
                  disabled={isAddingCredits || addCreditsMutation.isPending}
                >
                  {(isAddingCredits && selectedPackage === 'Premium') || addCreditsMutation.isPending ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary mr-2"></div>
                      Processing...
                    </div>
                  ) : 'Purchase'}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Credit History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            Your credit transaction history showing additions and usage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderCreditHistory()}
        </CardContent>
        <CardFooter className="border-t pt-6 flex justify-between">
          <div className="text-sm text-muted-foreground">
            Need help with credits? Contact support.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}