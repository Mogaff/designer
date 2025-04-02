import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  username: string;
  email: string;
  credits_balance: number;
  is_premium: boolean;
  firebase_uid?: string;
}

export default function AdminPage() {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [creditAmount, setCreditAmount] = useState<number>(0);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);

  // Fetch all users
  const { data: users, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Mutation to update user credits
  const updateCreditsMutation = useMutation({
    mutationFn: async ({ userId, amount }: { userId: number; amount: number }) => {
      const response = await fetch(`/api/admin/users/${userId}/credits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update credits');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Credits Updated',
        description: `Credits successfully updated for user.`,
      });
      refetch();
      setIsUpdateDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const handleOpenUpdateDialog = (user: User) => {
    setSelectedUser(user);
    setCreditAmount(user.credits_balance);
    setIsUpdateDialogOpen(true);
  };

  const handleUpdateCredits = () => {
    if (selectedUser && creditAmount !== null) {
      updateCreditsMutation.mutate({ 
        userId: selectedUser.id, 
        amount: creditAmount 
      });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading users...</div>;
  }

  if (isError) {
    return <div className="flex justify-center items-center h-screen text-red-500">Error loading users</div>;
  }

  // For testing with our mock user when actual API isn't available
  const mockUsers = [
    {
      id: 1,
      username: 'test_user',
      email: 'test@example.com',
      credits_balance: 100,
      is_premium: true,
      firebase_uid: 'mock-user-id'
    }
  ];

  const displayUsers = users as User[] || mockUsers;

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="bg-card rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">User Management</h2>
        
        <Table>
          <TableCaption>List of all users</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Credits</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayUsers.map((user: User) => (
              <TableRow key={user.id}>
                <TableCell>{user.id}</TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.credits_balance}</TableCell>
                <TableCell>
                  <Badge variant={user.is_premium ? "default" : "secondary"} className={user.is_premium ? "bg-green-500 hover:bg-green-600" : ""}>
                    {user.is_premium ? 'Premium' : 'Standard'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleOpenUpdateDialog(user)}
                  >
                    Update Credits
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {/* Credits Update Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update User Credits</DialogTitle>
            <DialogDescription>
              Modify the credit balance for {selectedUser?.username}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="credits" className="text-right">Credits</Label>
              <Input
                id="credits"
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(Number(e.target.value))}
                className="col-span-3"
              />
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              onClick={handleUpdateCredits} 
              disabled={updateCreditsMutation.isPending}
            >
              {updateCreditsMutation.isPending ? 'Updating...' : 'Update Credits'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}