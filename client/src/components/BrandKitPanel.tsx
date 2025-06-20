import React, { useEffect, useRef, useState, ChangeEvent } from 'react';
import { X, PlusCircle, Check, Edit, Trash2, PaintBucket, Upload, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BrandKit } from '@/lib/types';
import { cn } from '@/lib/utils';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

type View = 'list' | 'create' | 'edit';

interface BrandKitPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Define the form schema
const brandKitSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  primary_color: z.string().optional(),
  secondary_color: z.string().optional(),
  accent_color: z.string().optional(),
  heading_font: z.string().optional(),
  body_font: z.string().optional(),
  brand_voice: z.string().optional(),
  is_active: z.boolean().optional(),
  logo_url: z.string().optional(),
});

type BrandKitFormValues = z.infer<typeof brandKitSchema>;

export function BrandKitPanel({ isOpen, onClose }: BrandKitPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>('list');
  const [selectedKit, setSelectedKit] = useState<BrandKit | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  
  // Animation style with glass effect that stays on the left
  const slideInStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '250px',
    height: '100%',
    zIndex: 50,
    opacity: isOpen ? 1 : 0,
    visibility: isOpen ? 'visible' : 'hidden',
    transition: 'opacity 0.3s ease-in-out, visibility 0.3s ease-in-out',
    background: 'rgba(15, 23, 42, 0.4)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 'inherit'
  } as React.CSSProperties;
  
  // Form setup
  const form = useForm<BrandKitFormValues>({
    resolver: zodResolver(brandKitSchema),
    defaultValues: {
      name: '',
      primary_color: '#4f46e5',
      secondary_color: '#a5b4fc',
      accent_color: '#f59e0b',
      heading_font: '',
      body_font: '',
      brand_voice: '',
      is_active: false,
      logo_url: '',
    }
  });
  
  // Query to fetch brand kits with improved error handling and caching
  const { data: brandKits = [], isLoading, isError } = useQuery<BrandKit[]>({
    queryKey: ['/api/brand-kits'],
    queryFn: async () => {
      const response = await fetch('/api/brand-kits');
      if (!response.ok) {
        console.error('Failed to load brand kits:', await response.text());
        throw new Error('Failed to load brand kits');
      }
      const data = await response.json();
      console.log('Loaded brand kits:', data);
      return data.brandKits || [];
    },
    staleTime: 1000, // Consider data fresh for 1 second
    refetchOnMount: true, // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch when window regains focus
    retry: 3, // Retry failed requests 3 times
  });
  
  // Mutations for creating and updating brand kits
  const queryClient = useQueryClient();
  
  // Mutation to deactivate brand kit
  const deactivateBrandKitMutation = useMutation<any, Error>({
    mutationFn: async () => {
      const response = await fetch('/api/brand-kits/deactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to deactivate brand kit');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/brand-kits'] });
      queryClient.invalidateQueries({ queryKey: ['/api/brand-kits/active'] });
      setView('list');
      setSelectedKit(null);
    },
    onError: (error) => {
      console.error('Failed to deactivate brand kit:', error);
    },
  });
  
  // Set active brand kit mutation
  const setActiveBrandKitMutation = useMutation<any, Error, number>({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/brand-kits/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: true }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to set active brand kit');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/brand-kits'] });
      queryClient.invalidateQueries({ queryKey: ['/api/brand-kits/active'] });
    },
  });
  
  const createBrandKitMutation = useMutation<any, Error, BrandKitFormValues>({
    mutationFn: async (data: BrandKitFormValues) => {
      const response = await fetch('/api/brand-kits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      setView('list');
    },
  });
  
  const updateBrandKitMutation = useMutation<any, Error, BrandKitFormValues & { id: number }>({
    mutationFn: async (data: BrandKitFormValues & { id: number }) => {
      const response = await fetch(`/api/brand-kits/${data.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
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
      setView('list');
    },
  });
  
  // Handle form submission
  const onSubmit = (data: BrandKitFormValues) => {
    if (view === 'create') {
      createBrandKitMutation.mutate(data);
    } else if (view === 'edit' && selectedKit) {
      updateBrandKitMutation.mutate({ ...data, id: selectedKit.id });
    }
  };
  
  // Handle navigating to create a new brand kit
  const handleCreateNew = () => {
    form.reset(); // Reset form when creating a new kit
    setSelectedKit(null);
    setLogoPreview('');
    setView('create');
  };
  
  // Handle editing an existing brand kit
  const handleEdit = (brandKit: BrandKit) => {
    // Convert null values to empty strings for the form
    const formValues = {
      name: brandKit.name,
      primary_color: brandKit.primary_color || '#4f46e5',
      secondary_color: brandKit.secondary_color || '#a5b4fc',
      accent_color: brandKit.accent_color || '#f59e0b',
      heading_font: brandKit.heading_font || '',
      body_font: brandKit.body_font || '',
      brand_voice: brandKit.brand_voice || '',
      is_active: brandKit.is_active,
      logo_url: brandKit.logo_url || '',
    };
    
    form.reset(formValues);
    setSelectedKit(brandKit);
    setLogoPreview(brandKit.logo_url || '');
    setView('edit');
  };
  
  // Handle setting a brand kit as active
  const handleSetActive = (brandKit: BrandKit, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent click events
    
    if (!brandKit.is_active) {
      setActiveBrandKitMutation.mutate(brandKit.id);
    }
  };
  
  // Handle back button to return to list
  const handleBackToList = () => {
    setView('list');
  };
  
  // Handle logo file upload
  const handleLogoUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Handle file selection
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Read the file and convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setLogoPreview(base64String);
      form.setValue('logo_url', base64String);
    };
    reader.readAsDataURL(file);
  };
  
  // Manually refetch brand kits when panel opens
  useEffect(() => {
    if (isOpen) {
      console.log('Brand Kit Panel opened, refetching data...');
      queryClient.invalidateQueries({ queryKey: ['/api/brand-kits'] });
    }
  }, [isOpen, queryClient]);

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <div 
      style={slideInStyle}
      ref={panelRef}
    >
      <div className="flex flex-col max-h-[80vh]">
        {/* Header with dynamic title based on current view */}
        <div className="flex items-center justify-between p-3 border-b border-white/10">
          <div className="flex items-center">
            {view !== 'list' && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleBackToList} 
                className="mr-2 h-6 w-6 text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
            )}
            <h2 className="text-base font-medium text-white">
              {view === 'list' ? 'Brand Kits' : 
               view === 'create' ? 'Create Brand Kit' : 
               'Edit Brand Kit'}
            </h2>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose} 
            className="text-white hover:bg-white/10 h-7 w-7"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Content area with conditional rendering based on view */}
        <div className="overflow-y-auto px-3 py-2" style={{ maxHeight: 'calc(80vh - 120px)' }}>
          {/* List View */}
          {view === 'list' && (
            isLoading ? (
              <div className="flex justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              </div>
            ) : isError ? (
              <div className="text-center text-red-500 p-2 text-sm">Failed to load brand kits</div>
            ) : (
              <div className="space-y-3">
                {brandKits.length > 0 ? (
                  brandKits.map((brandKit) => (
                    <div 
                      key={brandKit.id} 
                      className={cn(
                        "bg-white/5 rounded-lg p-2.5 shadow-sm cursor-pointer transition-all duration-200",
                        !brandKit.is_active && "hover:bg-white/10"
                      )}
                      onClick={(e) => handleSetActive(brandKit, e)}
                      title={brandKit.is_active ? "Bereits aktiv" : "Klicken, um als aktiv zu setzen"}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center">
                          <div 
                            className="h-7 w-7 rounded-md flex items-center justify-center overflow-hidden" 
                            style={{ backgroundColor: brandKit.primary_color || '#4f46e5', boxShadow: `0 0 10px ${brandKit.primary_color || '#4f46e5'}60` }}
                          >
                            {brandKit.logo_url ? (
                              <img src={brandKit.logo_url} alt="Logo" className="w-4 h-4 object-contain" />
                            ) : (
                              <div className="w-3 h-3 rounded-full bg-white/70"></div>
                            )}
                          </div>
                          <span className="ml-2 font-medium text-white text-sm">{brandKit.name}</span>
                          {brandKit.is_active && (
                            <>
                              <div className="ml-2 bg-green-600/20 p-0.5 px-1.5 rounded text-xs text-green-500 flex items-center">
                                <Check className="h-2.5 w-2.5 mr-0.5" />
                                Active
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (brandKit.is_active) {
                                    deactivateBrandKitMutation.mutate();
                                  }
                                }}
                                className="ml-2 bg-red-600/10 hover:bg-red-600/20 text-xs text-red-400 h-5 rounded-sm px-1.5"
                              >
                                Deactivate
                              </Button>
                            </>
                          )}
                        </div>
                        <div className="flex space-x-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => { e.stopPropagation(); handleEdit(brandKit); }}
                            className="h-5 w-5 text-white hover:bg-white/10 rounded-full"
                          >
                            <Edit className="h-2.5 w-2.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-5 w-5 text-white hover:bg-white/10 rounded-full"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-1.5 mt-2">
                        <div 
                          className="h-8 rounded-md"
                          style={{ backgroundColor: brandKit.primary_color || '#4f46e5' }}
                        ></div>
                        <div 
                          className="h-8 rounded-md"
                          style={{ backgroundColor: brandKit.secondary_color || '#a5b4fc' }}
                        ></div>
                        <div 
                          className="h-8 rounded-md"
                          style={{ backgroundColor: brandKit.accent_color || '#f59e0b' }}
                        ></div>
                      </div>
                      
                      <div className="mt-2 text-xs text-white/70">
                        <p><span className="text-white/50">Heading:</span> {brandKit.heading_font || 'Not set'}</p>
                        <p><span className="text-white/50">Body:</span> {brandKit.body_font || 'Not set'}</p>
                        {brandKit.brand_voice && (
                          <p className="mt-1 italic text-xs">{brandKit.brand_voice}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center p-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-500/10 mb-2">
                      <PaintBucket className="w-5 h-5 text-indigo-400" />
                    </div>
                    <p className="text-center text-white/60 mb-3 text-sm">No brand kits yet</p>
                  </div>
                )}
              </div>
            )
          )}
          
          {/* Create/Edit Form View */}
          {(view === 'create' || view === 'edit') && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-white">Brand Kit Name</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-black/20 border-white/10 text-white text-xs h-8 rounded-md" 
                          placeholder="My Brand Kit"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-3 gap-2">
                  <FormField
                    control={form.control}
                    name="primary_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-white">Primary</FormLabel>
                        <FormControl>
                          <div className="relative h-8 rounded-md" style={{ backgroundColor: field.value }}>
                            <Input
                              type="color"
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              {...field}
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="secondary_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-white">Secondary</FormLabel>
                        <FormControl>
                          <div className="relative h-8 rounded-md" style={{ backgroundColor: field.value }}>
                            <Input
                              type="color"
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              {...field}
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="accent_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-white">Accent</FormLabel>
                        <FormControl>
                          <div className="relative h-8 rounded-md" style={{ backgroundColor: field.value }}>
                            <Input
                              type="color"
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              {...field}
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="heading_font"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-white">Heading Font</FormLabel>
                        <FormControl>
                          <Select 
                            value={field.value} 
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="h-8 text-xs bg-black/20 border-white/10 text-white">
                              <SelectValue placeholder="Heading Font" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              <div className="max-h-60 overflow-y-auto">
                                {['Roboto', 'Montserrat', 'Open Sans', 'Lato', 'Poppins', 'Oswald', 'Playfair Display', 'Raleway', 'Bebas Neue', 'Anton'].map((font) => (
                                  <SelectItem key={font} value={font}>
                                    <span style={{ fontFamily: font }}>{font}</span>
                                  </SelectItem>
                                ))}
                              </div>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="body_font"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-white">Body Font</FormLabel>
                        <FormControl>
                          <Select 
                            value={field.value} 
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="h-8 text-xs bg-black/20 border-white/10 text-white">
                              <SelectValue placeholder="Body Font" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              <div className="max-h-60 overflow-y-auto">
                                {['Open Sans', 'Roboto', 'Lato', 'Nunito', 'Source Sans Pro', 'Montserrat', 'Raleway', 'PT Sans', 'Roboto Slab', 'Merriweather'].map((font) => (
                                  <SelectItem key={font} value={font}>
                                    <span style={{ fontFamily: font }}>{font}</span>
                                  </SelectItem>
                                ))}
                              </div>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="brand_voice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-white">Brand Voice</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-black/20 border-white/10 text-white text-xs h-8 rounded-md" 
                          placeholder="Professional, friendly, modern"
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-white/50">
                        Describe the tone and style of your brand
                      </FormDescription>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="logo_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-white">Logo</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <div 
                            className="h-10 w-10 rounded-md flex items-center justify-center bg-black/30 border border-white/10 overflow-hidden"
                          >
                            {logoPreview || field.value ? (
                              <img src={logoPreview || field.value} alt="Logo" className="w-6 h-6 object-contain" />
                            ) : (
                              <Upload className="h-4 w-4 text-white/50" />
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleLogoUpload}
                            className="h-8 text-xs bg-black/20 border-white/10 text-white/80 hover:bg-white/10"
                          >
                            Upload Logo
                          </Button>
                          <input 
                            type="file" 
                            ref={fileInputRef}
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                          />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md border border-white/10 p-2">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4 rounded border-white/20 bg-black/20"
                        />
                      </FormControl>
                      <FormLabel className="text-xs text-white cursor-pointer">Set as active brand kit</FormLabel>
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          )}
        </div>
        
        {/* Footer with dynamic buttons based on view */}
        <div className="p-3 border-t border-white/10">
          {view === 'list' ? (
            <Button 
              variant="default" 
              onClick={handleCreateNew}
              className="w-full h-8 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs"
            >
              <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
              Create New Brand Kit
            </Button>
          ) : (
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={handleBackToList}
                className="flex-1 h-8 bg-white/5 hover:bg-white/10 text-white/80 border-white/10 text-xs"
              >
                Cancel
              </Button>
              <Button 
                variant="default" 
                onClick={form.handleSubmit(onSubmit)}
                className="flex-1 h-8 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs"
              >
                {view === 'create' ? 'Create' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}