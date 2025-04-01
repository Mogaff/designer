import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { CreditCard, Plus, Star, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ExtendedBadge } from '@/components/ui/extended-badge';
import { Redirect } from 'wouter';
import { CreditsResponse, CreditTransaction, ExtendedBadgeVariant } from '@/lib/creditTypes';

export default function Credits() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

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

            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Credits
            </Button>
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