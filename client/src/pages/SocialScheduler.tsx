import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { 
  Instagram, 
  Linkedin, 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Settings, 
  Send, 
  Eye,
  Trash2,
  Edit3,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { SocialAccount, SocialPost, UserCreation } from '@shared/schema';

const accountSchema = z.object({
  platform: z.enum(['instagram', 'linkedin']),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  account_type: z.enum(['business', 'personal']).default('business'),
});

const postSchema = z.object({
  social_account_id: z.number(),
  creation_id: z.number().optional(),
  caption: z.string().min(1, 'Caption is required'),
  hashtags: z.string(),
  scheduled_time: z.date(),
});

type AccountForm = z.infer<typeof accountSchema>;
type PostForm = z.infer<typeof postSchema>;

export default function SocialScheduler() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [selectedCreation, setSelectedCreation] = useState<UserCreation | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch social accounts
  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ['/api/social-accounts'],
  });
  const accounts = (accountsData as { accounts?: SocialAccount[] })?.accounts || [];

  // Fetch scheduled posts
  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['/api/social-posts'],
  });
  const posts = (postsData as { posts?: SocialPost[] })?.posts || [];

  // Fetch user creations for posting
  const { data: creationsData, isLoading: creationsLoading } = useQuery({
    queryKey: ['/api/creations'],
  });
  const creations = (creationsData as { creations?: UserCreation[] })?.creations || [];

  // Account form
  const accountForm = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      platform: 'instagram',
      account_type: 'business',
    },
  });

  // Post form
  const postForm = useForm<PostForm>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      scheduled_time: new Date(),
    },
  });

  // Add account mutation
  const addAccountMutation = useMutation({
    mutationFn: (data: AccountForm) => apiRequest('POST', '/api/social-accounts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social-accounts'] });
      setShowAccountDialog(false);
      accountForm.reset();
      toast({ description: 'Social media account added successfully!' });
    },
    onError: () => {
      toast({ 
        variant: 'destructive',
        description: 'Failed to add account. Please check your credentials.' 
      });
    },
  });

  // Schedule post mutation
  const schedulePostMutation = useMutation({
    mutationFn: (data: PostForm) => apiRequest('POST', '/api/social-posts', {
      ...data,
      hashtags: data.hashtags.split(',').map(tag => tag.trim()).filter(Boolean),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social-posts'] });
      setShowPostDialog(false);
      postForm.reset();
      toast({ description: 'Post scheduled successfully!' });
    },
    onError: () => {
      toast({ 
        variant: 'destructive',
        description: 'Failed to schedule post. Please try again.' 
      });
    },
  });

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: (postId: number) => apiRequest('DELETE', `/api/social-posts/${postId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social-posts'] });
      toast({ description: 'Post deleted successfully!' });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'posted': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'scheduled': return <Clock className="h-4 w-4 text-blue-500" />;
      default: return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram': return <Instagram className="h-4 w-4" />;
      case 'linkedin': return <Linkedin className="h-4 w-4" />;
      default: return null;
    }
  };

  // Filter posts by selected date
  const postsForDate = posts.filter((post: SocialPost) => {
    if (!post.scheduled_time) return false;
    const postDate = new Date(post.scheduled_time);
    return postDate.toDateString() === selectedDate.toDateString();
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Social Media Scheduler</h1>
          <p className="text-muted-foreground mt-2">
            Schedule and manage your social media posts across platforms
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Manage Accounts
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Social Media Account</DialogTitle>
                <DialogDescription>
                  Connect your Instagram or LinkedIn business account
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={accountForm.handleSubmit((data) => addAccountMutation.mutate(data))} className="space-y-4">
                <div>
                  <Label htmlFor="platform">Platform</Label>
                  <Select onValueChange={(value) => accountForm.setValue('platform', value as 'instagram' | 'linkedin')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">
                        <div className="flex items-center gap-2">
                          <Instagram className="h-4 w-4" />
                          Instagram Business
                        </div>
                      </SelectItem>
                      <SelectItem value="linkedin">
                        <div className="flex items-center gap-2">
                          <Linkedin className="h-4 w-4" />
                          LinkedIn
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input 
                    {...accountForm.register('username')} 
                    placeholder="Your username" 
                  />
                </div>
                
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    type="password"
                    {...accountForm.register('password')} 
                    placeholder="Your password" 
                  />
                </div>
                
                <Button type="submit" disabled={addAccountMutation.isPending} className="w-full">
                  {addAccountMutation.isPending ? 'Adding...' : 'Add Account'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Schedule New Post</DialogTitle>
                <DialogDescription>
                  Create and schedule a post for your social media accounts
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={postForm.handleSubmit((data) => schedulePostMutation.mutate(data))} className="space-y-4">
                <div>
                  <Label>Account</Label>
                  <Select onValueChange={(value) => postForm.setValue('social_account_id', parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account: SocialAccount) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          <div className="flex items-center gap-2">
                            {getPlatformIcon(account.platform)}
                            @{account.username} ({account.platform})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Design (Optional)</Label>
                  <Select onValueChange={(value) => postForm.setValue('creation_id', parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a design to post" />
                    </SelectTrigger>
                    <SelectContent>
                      {creations.map((creation: UserCreation) => (
                        <SelectItem key={creation.id} value={creation.id.toString()}>
                          {creation.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="caption">Caption</Label>
                  <Textarea 
                    {...postForm.register('caption')} 
                    placeholder="Write your post caption..." 
                    rows={4}
                  />
                </div>
                
                <div>
                  <Label htmlFor="hashtags">Hashtags</Label>
                  <Input 
                    {...postForm.register('hashtags')} 
                    placeholder="#design, #marketing, #business" 
                  />
                </div>
                
                <div>
                  <Label>Schedule Time</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {postForm.watch('scheduled_time') ? 
                          format(postForm.watch('scheduled_time'), 'PPP p') : 
                          'Pick a date and time'
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={postForm.watch('scheduled_time')}
                        onSelect={(date) => date && postForm.setValue('scheduled_time', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <Button type="submit" disabled={schedulePostMutation.isPending} className="w-full">
                  {schedulePostMutation.isPending ? 'Scheduling...' : 'Schedule Post'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="accounts">Connected Accounts</TabsTrigger>
          <TabsTrigger value="posts">All Posts</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>
                    Posts for {format(selectedDate, 'MMMM d, yyyy')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {postsForDate.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No posts scheduled for this date
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {postsForDate.map((post: SocialPost) => (
                        <div key={post.id} className="flex items-center gap-3 p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            {getPlatformIcon(post.platform)}
                            {getStatusIcon(post.status)}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium truncate">{post.caption}</p>
                            <p className="text-sm text-muted-foreground">
                              {post.scheduled_time && format(new Date(post.scheduled_time), 'p')}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => deletePostMutation.mutate(post.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="accounts">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account: SocialAccount) => (
              <Card key={account.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getPlatformIcon(account.platform)}
                    @{account.username}
                  </CardTitle>
                  <CardDescription>
                    {account.platform} • {account.account_type}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <Badge variant={account.is_active ? "default" : "secondary"}>
                      {account.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Button size="sm" variant="outline">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="posts">
          <Card>
            <CardHeader>
              <CardTitle>All Scheduled Posts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {posts.map((post: SocialPost) => (
                  <div key={post.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      {getPlatformIcon(post.platform)}
                      {getStatusIcon(post.status)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium truncate">{post.caption}</p>
                      <p className="text-sm text-muted-foreground">
                        {post.scheduled_time && format(new Date(post.scheduled_time), 'PPP p')}
                      </p>
                    </div>
                    <Badge variant="outline">{post.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}