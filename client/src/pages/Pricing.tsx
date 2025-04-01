import React from 'react';
import { PricingInteraction } from "../components/ui/pricing-interaction";
import { useAuth } from "../contexts/AuthContext";
import { useLocation } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { CheckIcon } from 'lucide-react';

export default function Pricing() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-black -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-indigo-950/30 to-black"></div>
      </div>
      
      <div className="container mx-auto px-4 py-8 flex-grow">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-white/70">
            Choose the plan that works best for your design needs
          </p>
        </div>
        
        <div className="my-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Interactive Pricing Calculator</h2>
          <div className="flex justify-center">
            <PricingInteraction
              starterMonth={9.99}
              starterAnnual={7.49}
              proMonth={19.99}
              proAnnual={17.49}
            />
          </div>
        </div>

        
        <div className="max-w-3xl mx-auto p-6 border border-indigo-500/30 rounded-xl bg-black/20 backdrop-blur-sm mt-8">
          <h2 className="text-xl font-bold text-white mb-4">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">How do credits work?</h3>
              <p className="text-white/70">Each design you generate costs 1 credit. Select between 1-4 designs per generation to pay accordingly. Credits reset monthly on your billing date.</p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Can I change plans anytime?</h3>
              <p className="text-white/70">Yes, you can upgrade, downgrade, or cancel your subscription at any time. Changes take effect on your next billing cycle.</p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-white mb-2">What happens if I run out of credits?</h3>
              <p className="text-white/70">You can purchase additional credits or wait until your next billing cycle when your credits will automatically refresh.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}