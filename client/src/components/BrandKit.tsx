import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarGroupAction,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton
} from '@/components/ui/sidebar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PaintBucket, Plus, Trash2, Edit, Check, PlusCircle, Upload } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';

// Definition for BrandKit type
interface BrandKit {
  id: number;
  user_id: number;
  name: string;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  logo_url: string | null;
  heading_font: string | null;
  body_font: string | null;
  brand_voice: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

// Form validation schema for creating/editing a brand kit
const brandKitSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  primary_color: z.string().optional().default(''),
  secondary_color: z.string().optional().default(''),
  accent_color: z.string().optional().default(''),
  heading_font: z.string().optional().default(''),
  body_font: z.string().optional().default(''),
  brand_voice: z.string().optional().default(''),
  is_active: z.boolean().default(true),
});

type BrandKitFormValues = z.infer<typeof brandKitSchema>;

interface BrandKitProps {
  onOpenPanel: () => void;
}

export default function BrandKit({ onOpenPanel }: BrandKitProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedBrandKit, setSelectedBrandKit] = useState<BrandKit | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all brand kits
  const { data: brandKitsData, isLoading, isError } = useQuery<{ brandKits: BrandKit[] }>({
    queryKey: ['/api/brand-kits'],
    refetchOnWindowFocus: false,
  });

  const brandKits = brandKitsData?.brandKits || [];

  // Get active brand kit
  const { data: activeBrandKitData } = useQuery<{ brandKit: BrandKit }>({
    queryKey: ['/api/brand-kits/active'],
    refetchOnWindowFocus: false,
    enabled: brandKits.some((kit) => kit.is_active),
  });
  
  const activeBrandKit = activeBrandKitData?.brandKit;

  // Add brand kit mutation
  const addBrandKitMutation = useMutation({
    mutationFn: async (data: BrandKitFormValues) => {
      const response = await fetch('/api/brand-kits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create brand kit');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/brand-kits'] });
      toast({
        title: 'Success',
        description: 'Brand kit created successfully',
      });
      setIsAddDialogOpen(false);
      addForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update brand kit mutation
  const updateBrandKitMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: BrandKitFormValues }) => {
      const response = await fetch(`/api/brand-kits/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update brand kit');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/brand-kits'] });
      toast({
        title: 'Success',
        description: 'Brand kit updated successfully',
      });
      setIsEditDialogOpen(false);
      setSelectedBrandKit(null);
      editForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete brand kit mutation
  const deleteBrandKitMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/brand-kits/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete brand kit');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/brand-kits'] });
      toast({
        title: 'Success',
        description: 'Brand kit deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Form for adding a new brand kit
  const addForm = useForm<BrandKitFormValues>({
    resolver: zodResolver(brandKitSchema),
    defaultValues: {
      name: '',
      primary_color: '#4f46e5',
      secondary_color: '#a5b4fc',
      accent_color: '#f59e0b',
      heading_font: 'Arial',
      body_font: 'Helvetica',
      brand_voice: '',
      is_active: true,
    },
  });

  // Form for editing an existing brand kit
  const editForm = useForm<BrandKitFormValues>({
    resolver: zodResolver(brandKitSchema),
    defaultValues: {
      name: '',
      primary_color: '',
      secondary_color: '',
      accent_color: '',
      heading_font: '',
      body_font: '',
      brand_voice: '',
      is_active: false,
    },
  });

  // Update edit form when a brand kit is selected
  useEffect(() => {
    if (selectedBrandKit) {
      editForm.reset({
        name: selectedBrandKit.name,
        primary_color: selectedBrandKit.primary_color || '',
        secondary_color: selectedBrandKit.secondary_color || '',
        accent_color: selectedBrandKit.accent_color || '',
        heading_font: selectedBrandKit.heading_font || '',
        body_font: selectedBrandKit.body_font || '',
        brand_voice: selectedBrandKit.brand_voice || '',
        is_active: selectedBrandKit.is_active,
      });
    }
  }, [selectedBrandKit, editForm]);

  // Handle brand kit submission
  const onAddSubmit = (data: BrandKitFormValues) => {
    addBrandKitMutation.mutate(data);
  };

  // Handle brand kit update
  const onEditSubmit = (data: BrandKitFormValues) => {
    if (selectedBrandKit) {
      updateBrandKitMutation.mutate({ id: selectedBrandKit.id, data });
    }
  };

  // Handle brand kit deletion
  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this brand kit?')) {
      deleteBrandKitMutation.mutate(id);
    }
  };

  // Open edit dialog
  const handleEdit = (brandKit: BrandKit) => {
    setSelectedBrandKit(brandKit);
    setIsEditDialogOpen(true);
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center justify-between text-white">
        <div className="flex items-center">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-violet-600 to-indigo-700">
            <PaintBucket className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="sidebar-text ml-2 uppercase font-medium tracking-wide text-xs">Brand Kit</span>
        </div>
        <SidebarGroupAction asChild>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/10 rounded-full sidebar-text">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Brand Kit</DialogTitle>
                <DialogDescription>
                  Create a new brand kit to store your brand's colors, fonts, and voice.
                </DialogDescription>
              </DialogHeader>

              <Form {...addForm}>
                <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
                  <FormField
                    control={addForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="My Brand" {...field} className="bg-black/20 border-white/10 text-white rounded-md" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="mb-4">
                    <Label className="text-sm font-medium">Brand Logo</Label>
                    <div className="mt-2">
                      <div className="flex items-center gap-4">
                        <div className="h-20 w-20 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center relative overflow-hidden">
                          <input 
                            type="file" 
                            id="logo-upload" 
                            className="hidden" 
                            accept="image/*"
                            onChange={(e) => {
                              // In a real implementation, this would trigger file upload
                              console.log('Logo upload:', e.target.files?.[0]);
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
                            <PaintBucket className="h-8 w-8 text-white opacity-70" />
                          </div>
                          <label 
                            htmlFor="logo-upload" 
                            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <Upload className="h-6 w-6 text-white" />
                            <span className="sr-only">Upload Logo</span>
                          </label>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-medium">Upload Logo</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Square PNG or JPG recommended. This will appear in your generated designs.
                          </p>
                          <label 
                            htmlFor="logo-upload" 
                            className="mt-2 inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
                          >
                            Choose File
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={addForm.control}
                      name="primary_color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Color</FormLabel>
                          <FormControl>
                            <div className="flex items-center space-x-2">
                              <div className="relative">
                                <div 
                                  className="h-10 w-10 rounded-md flex items-center justify-center overflow-hidden border border-white/10" 
                                  style={{ backgroundColor: field.value || '#4f46e5', boxShadow: `0 0 15px ${field.value || '#4f46e5'}40` }}
                                >
                                  <Input
                                    type="color"
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    {...field}
                                    value={field.value || '#4f46e5'}
                                  />
                                </div>
                              </div>
                              <Input
                                {...field}
                                value={field.value || '#4f46e5'}
                                className="flex-1 bg-black/20 border-white/10 text-white rounded-md"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={addForm.control}
                      name="secondary_color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Secondary</FormLabel>
                          <FormControl>
                            <div className="flex items-center space-x-2">
                              <div className="relative">
                                <div 
                                  className="h-10 w-10 rounded-md flex items-center justify-center overflow-hidden border border-white/10" 
                                  style={{ backgroundColor: field.value || '#a5b4fc', boxShadow: `0 0 15px ${field.value || '#a5b4fc'}40` }}
                                >
                                  <Input
                                    type="color"
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    {...field}
                                    value={field.value || '#a5b4fc'}
                                  />
                                </div>
                              </div>
                              <Input
                                {...field}
                                value={field.value || '#a5b4fc'}
                                className="flex-1 bg-black/20 border-white/10 text-white rounded-md"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={addForm.control}
                      name="accent_color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Accent</FormLabel>
                          <FormControl>
                            <div className="flex items-center space-x-2">
                              <div className="relative">
                                <div 
                                  className="h-10 w-10 rounded-md flex items-center justify-center overflow-hidden border border-white/10" 
                                  style={{ backgroundColor: field.value || '#f59e0b', boxShadow: `0 0 15px ${field.value || '#f59e0b'}40` }}
                                >
                                  <Input
                                    type="color"
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    {...field}
                                    value={field.value || '#f59e0b'}
                                  />
                                </div>
                              </div>
                              <Input
                                {...field}
                                value={field.value || '#f59e0b'}
                                className="flex-1 bg-black/20 border-white/10 text-white rounded-md"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={addForm.control}
                      name="heading_font"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Heading Font</FormLabel>
                          <FormControl>
                            <Input placeholder="Arial" {...field} className="bg-black/20 border-white/10 text-white rounded-md" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={addForm.control}
                      name="body_font"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Body Font</FormLabel>
                          <FormControl>
                            <Input placeholder="Helvetica" {...field} className="bg-black/20 border-white/10 text-white rounded-md" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={addForm.control}
                    name="brand_voice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brand Voice</FormLabel>
                        <FormControl>
                          <Input placeholder="Professional and friendly" {...field} className="bg-black/20 border-white/10 text-white rounded-md" />
                        </FormControl>
                        <FormDescription>
                          A short description of your brand's tone and voice
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addForm.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Active</FormLabel>
                          <FormDescription>
                            Make this your active brand kit for new designs
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button variant="outline" type="button" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={addBrandKitMutation.isPending}>
                      {addBrandKitMutation.isPending ? 'Creating...' : 'Create'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </SidebarGroupAction>
      </SidebarGroupLabel>

      <SidebarGroupContent>
        {isLoading ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : isError ? (
          <div className="text-center text-red-500 p-2 text-sm sidebar-text">Failed to load brand kits</div>
        ) : (
          <SidebarMenu>
            {brandKits.length > 0 ? (
              brandKits.map((brandKit) => (
                <SidebarMenuItem key={brandKit.id}>
                  <div className="flex items-center justify-between w-full p-2 rounded-md hover:bg-white/10 text-white group">
                    <div className="flex items-center">
                      <div className="flex h-5 w-5 items-center justify-center rounded-sm" 
                           style={{ backgroundColor: brandKit.primary_color || '#4f46e5', 
                                   boxShadow: `0 0 10px ${brandKit.primary_color || '#4f46e5'}40` }}>
                        {brandKit.logo_url ? (
                          <img src={brandKit.logo_url} alt="Logo" className="w-3 h-3 object-contain" />
                        ) : (
                          <div className="w-3 h-3 rounded-full bg-white/70"></div>
                        )}
                      </div>
                      <span className="truncate sidebar-text ml-2 text-xs font-medium">{brandKit.name}</span>
                      {brandKit.is_active && (
                        <div className="sidebar-text ml-1.5 bg-green-600/20 p-0.5 rounded-sm">
                          <Check className="h-2 w-2 text-green-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-1 sidebar-text opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-5 w-5 text-white hover:bg-white/10 rounded-full" onClick={() => handleEdit(brandKit)}>
                        <Edit className="h-2.5 w-2.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-5 w-5 text-white hover:bg-white/10 rounded-full" onClick={() => handleDelete(brandKit.id)}>
                        <Trash2 className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  </div>
                </SidebarMenuItem>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center space-y-1 p-2 sidebar-text">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/10 mb-1">
                  <PlusCircle className="w-4 h-4 text-indigo-400" />
                </div>
                <p className="text-center text-white/60 text-xs">No brand kits yet</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs h-7 px-3 rounded-full bg-white/5 hover:bg-white/10 text-white/80"
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  Create a brand kit
                </Button>
              </div>
            )}
          </SidebarMenu>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Brand Kit</DialogTitle>
              <DialogDescription>
                Update your brand kit settings
              </DialogDescription>
            </DialogHeader>

            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Brand" {...field} className="bg-black/20 border-white/10 text-white rounded-md" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={editForm.control}
                    name="primary_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Color</FormLabel>
                        <FormControl>
                          <div className="flex items-center space-x-2">
                            <div className="relative">
                              <div 
                                className="h-10 w-10 rounded-md flex items-center justify-center overflow-hidden border border-white/10" 
                                style={{ backgroundColor: field.value || '#4f46e5', boxShadow: `0 0 15px ${field.value || '#4f46e5'}40` }}
                              >
                                <Input
                                  type="color"
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                  {...field}
                                  value={field.value || '#4f46e5'}
                                />
                              </div>
                            </div>
                            <Input
                              {...field}
                              value={field.value || '#4f46e5'}
                              className="flex-1 bg-black/20 border-white/10 text-white rounded-md"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="secondary_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secondary</FormLabel>
                        <FormControl>
                          <div className="flex items-center space-x-2">
                            <div className="relative">
                              <div 
                                className="h-10 w-10 rounded-md flex items-center justify-center overflow-hidden border border-white/10" 
                                style={{ backgroundColor: field.value || '#a5b4fc', boxShadow: `0 0 15px ${field.value || '#a5b4fc'}40` }}
                              >
                                <Input
                                  type="color"
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                  {...field}
                                  value={field.value || '#a5b4fc'}
                                />
                              </div>
                            </div>
                            <Input
                              {...field}
                              value={field.value || '#a5b4fc'}
                              className="flex-1 bg-black/20 border-white/10 text-white rounded-md"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="accent_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Accent</FormLabel>
                        <FormControl>
                          <div className="flex items-center space-x-2">
                            <div className="relative">
                              <div 
                                className="h-10 w-10 rounded-md flex items-center justify-center overflow-hidden border border-white/10" 
                                style={{ backgroundColor: field.value || '#f59e0b', boxShadow: `0 0 15px ${field.value || '#f59e0b'}40` }}
                              >
                                <Input
                                  type="color"
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                  {...field}
                                  value={field.value || '#f59e0b'}
                                />
                              </div>
                            </div>
                            <Input
                              {...field}
                              value={field.value || '#f59e0b'}
                              className="flex-1 bg-black/20 border-white/10 text-white rounded-md"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="heading_font"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Heading Font</FormLabel>
                        <FormControl>
                          <Input placeholder="Arial" {...field} className="bg-black/20 border-white/10 text-white rounded-md" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="body_font"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Body Font</FormLabel>
                        <FormControl>
                          <Input placeholder="Helvetica" {...field} className="bg-black/20 border-white/10 text-white rounded-md" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="brand_voice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand Voice</FormLabel>
                      <FormControl>
                        <Input placeholder="Professional and friendly" {...field} className="bg-black/20 border-white/10 text-white rounded-md" />
                      </FormControl>
                      <FormDescription>
                        A short description of your brand's tone and voice
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Make this your active brand kit for new designs
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateBrandKitMutation.isPending}>
                    {updateBrandKitMutation.isPending ? 'Updating...' : 'Update'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}