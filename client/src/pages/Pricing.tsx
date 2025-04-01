import React from 'react';
import { PricingInteraction } from "../components/ui/pricing-interaction";
import { useAuth } from "../contexts/AuthContext";
import { useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import pricingBgGradient from '../assets/pricing-bg-gradient.png';

export default function Pricing() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background gradient image */}
      <div 
        className="absolute inset-0 -z-10 bg-cover bg-center" 
        style={{ 
          backgroundImage: `url(${pricingBgGradient})`,
          opacity: 0.9
        }}
      />
      
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/30 -z-10" />
      
      {/* Back button */}
      <button 
        onClick={() => setLocation('/')}
        className="absolute top-6 left-6 p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all duration-300 shadow-lg group z-10"
        aria-label="Back to generator"
      >
        <ArrowLeft className="size-5 group-hover:scale-110 transition-transform duration-300" />
      </button>
      
      <div className="container mx-auto px-4 py-16 flex-grow flex flex-col items-center justify-center">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-white/90">
            Choose the plan that works best for your design needs
          </p>
        </div>
        
        <div className="my-8 max-w-3xl mx-auto w-full">
          <div className="flex justify-center">
            <PricingInteraction
              starterMonth={9.99}
              starterAnnual={7.49}
              proMonth={19.99}
              proAnnual={17.49}
            />
          </div>
        </div>
      </div>
    </div>
  );
}