import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import PremiumDesignOptions from './PremiumDesignOptions';
import { Sparkles, Crown, Loader } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface PremiumDesignPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (optionId: string) => void;
  isGenerating?: boolean;
  selectedOption?: string | null;
}

export default function PremiumDesignPanel({ 
  isOpen, 
  onClose, 
  onSelectOption,
  isGenerating = false
}: PremiumDesignPanelProps) {
  const { toast } = useToast();
  
  // Get user credits
  const { data: creditsData, isLoading: isLoadingCredits } = useQuery({
    queryKey: ['/api/credits'],
    queryFn: async () => {
      const response = await fetch('/api/credits');
      if (!response.ok) {
        throw new Error('Failed to fetch credits');
      }
      return response.json();
    },
    enabled: isOpen, // Only fetch when dialog is open
  });
  
  const currentBalance = creditsData?.balance || 0;
  
  const handleSelectOption = (optionId: string) => {
    onSelectOption(optionId);
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/80 backdrop-blur-xl border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-white gap-2">
            <Crown className="h-5 w-5 text-amber-400" />
            Premium Design Options
          </DialogTitle>
          <DialogDescription className="text-white/70">
            Choose a design package that fits your needs.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-2">
          {isLoadingCredits ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="h-6 w-6 text-indigo-500 animate-spin mr-2" />
              <span className="text-white/70">Loading your balance...</span>
            </div>
          ) : (
            <PremiumDesignOptions 
              onSelect={handleSelectOption}
              currentBalance={currentBalance}
              isGenerating={isGenerating}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}