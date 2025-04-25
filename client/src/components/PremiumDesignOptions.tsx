import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Crown, Sparkles, Star, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface PremiumDesignOptionsProps {
  onSelect: (optionId: string) => void;
  currentBalance: number;
  isGenerating?: boolean;
}

interface DesignOption {
  id: string;
  name: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
  price: number;
  color: string;
}

export default function PremiumDesignOptions({ onSelect, currentBalance, isGenerating }: PremiumDesignOptionsProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  
  const designOptions: DesignOption[] = [
    {
      id: 'basic',
      name: 'Basic',
      description: 'Standard design generation',
      features: [
        '1 design variation',
        'Basic styling',
        'Standard quality'
      ],
      icon: <Zap className="h-5 w-5" />,
      price: 1,
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'premium',
      name: 'Premium',
      description: 'Enhanced design options',
      features: [
        '4 design variations',
        'Enhanced styling',
        'Premium quality'
      ],
      icon: <Star className="h-5 w-5" />,
      price: 3,
      color: 'from-purple-500 to-indigo-600'
    },
    {
      id: 'elite',
      name: 'Elite',
      description: 'Professional-grade designs',
      features: [
        '8 design variations',
        'Advanced styling options',
        'High-resolution output',
        'Export in multiple formats'
      ],
      icon: <Crown className="h-5 w-5" />,
      price: 5,
      color: 'from-amber-500 to-orange-600'
    },
    {
      id: 'ultimate',
      name: 'Ultimate',
      description: 'The complete design package',
      features: [
        '12 design variations',
        'Ultra-high quality',
        'All premium features',
        'Priority generation',
        'Advanced customization options'
      ],
      icon: <Sparkles className="h-5 w-5" />,
      price: 10,
      color: 'from-green-500 to-emerald-600'
    }
  ];
  
  const handleSelectOption = (optionId: string) => {
    const option = designOptions.find(o => o.id === optionId);
    if (!option) return;
    
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to select premium design options",
        variant: "destructive"
      });
      return;
    }
    
    if (option.price > currentBalance) {
      toast({
        title: "Insufficient credits",
        description: `You need ${option.price} credits for this option. Please purchase more credits.`,
        variant: "destructive"
      });
      return;
    }
    
    setSelectedOption(optionId);
  };
  
  const handleGenerateDesigns = () => {
    if (!selectedOption) {
      toast({
        title: "No option selected",
        description: "Please select a design option first",
        variant: "destructive"
      });
      return;
    }
    
    onSelect(selectedOption);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white">Design Options</h2>
        <div className="flex items-center bg-black/30 backdrop-blur-md px-3 py-1 rounded-full">
          <span className="text-sm text-white mr-1.5">Credit Balance:</span>
          <span className="text-sm font-bold text-amber-400">{currentBalance}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {designOptions.map((option) => (
          <Card 
            key={option.id}
            className={`
              border transition-all duration-300 cursor-pointer backdrop-blur-md overflow-hidden
              ${selectedOption === option.id 
                ? 'bg-gradient-to-br ' + option.color + ' border-white/20 shadow-lg shadow-' + option.id + '-500/20' 
                : 'bg-black/30 border-white/10 hover:bg-black/40'}
            `}
            onClick={() => handleSelectOption(option.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center mb-1">
                    <div className={`
                      p-1.5 rounded-full mr-2
                      ${selectedOption === option.id 
                        ? 'bg-white/20' 
                        : 'bg-gradient-to-br ' + option.color}
                    `}>
                      {option.icon}
                    </div>
                    <h3 className={`
                      font-bold 
                      ${selectedOption === option.id ? 'text-white' : 'text-white'}
                    `}>{option.name}</h3>
                  </div>
                  <p className={`
                    text-sm mb-2
                    ${selectedOption === option.id ? 'text-white/90' : 'text-white/70'}
                  `}>
                    {option.description}
                  </p>
                </div>
                
                <div className="flex items-center">
                  <span className={`
                    text-xl font-bold mr-1
                    ${selectedOption === option.id ? 'text-white' : 'text-amber-400'}
                  `}>{option.price}</span>
                  <span className={`
                    text-xs
                    ${selectedOption === option.id ? 'text-white/90' : 'text-white/70'}
                  `}>credits</span>
                </div>
              </div>
              
              <ul className={`
                mt-2 space-y-1 text-sm
                ${selectedOption === option.id ? 'text-white/90' : 'text-white/70'}
              `}>
                {option.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center">
                    <Check className="h-3 w-3 mr-1.5 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              
              {selectedOption === option.id && (
                <div className="absolute top-2 right-2 bg-white/20 p-1 rounded-full">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Button
        className="w-full py-2 font-medium rounded-md bg-indigo-500/40 backdrop-blur-sm text-white hover:bg-indigo-500/60 border-0"
        onClick={handleGenerateDesigns}
        disabled={!selectedOption || isGenerating}
      >
        {isGenerating ? (
          <>
            <span>Generating</span>
            <div className="ml-1.5 h-2.5 w-2.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
          </>
        ) : (
          `Generate ${selectedOption ? designOptions.find(o => o.id === selectedOption)?.name : ''} Designs`
        )}
      </Button>
    </div>
  );
}