import NumberFlow from '@number-flow/react'
import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { toast } from "../../hooks/use-toast";
import { apiRequest } from '../../lib/queryClient';

export function PricingInteraction ({
  starterMonth,
  starterAnnual,
  proMonth,
  proAnnual,
}:{
  starterMonth: number;
  starterAnnual: number;
  proMonth: number;
  proAnnual: number;
}) {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [active, setActive] = React.useState(0);
  const [period, setPeriod] = React.useState(0);
  const [isProcessing, setIsProcessing] = React.useState(false);
  
  const handleChangePlan = (index: number) => {
    setActive(index);
  };
  
  const handleChangePeriod = (index: number) => {
    setPeriod(index);
    if (index === 0) {
      setStarter(starterMonth);
      setPro(proMonth);
    } else {
      setStarter(starterAnnual);
      setPro(proAnnual);
    }
  };
  
  const [starter, setStarter] = React.useState(starterMonth);
  const [pro, setPro] = React.useState(proMonth);
  
  // Define checkout response type
  type CheckoutSessionResponse = {
    url: string;
    sessionId: string;
  };
  
  // Create checkout session mutation
  const createCheckoutMutation = useMutation<CheckoutSessionResponse, Error, string>({
    mutationFn: async (packageType: string) => {
      try {
        const response = await apiRequest('POST', '/api/stripe/create-checkout', {
          packageType,
          successUrl: `${window.location.origin}/credits?payment_success=true`,
          cancelUrl: `${window.location.origin}/pricing?payment_cancelled=true`,
        });
        
        const data = await response.json();
        return data as CheckoutSessionResponse;
      } catch (error) {
        console.error('Checkout error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast({
        title: "Error creating checkout session",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  });

  return (
    <div className="rounded-[32px] p-4 shadow-md max-w-sm w-full flex flex-col items-center gap-3 bg-black/20 backdrop-blur-sm border border-indigo-500/30">
        <div className="rounded-full relative w-full bg-white/10 p-1.5 flex items-center">
          <button
            className="font-semibold rounded-full w-full p-1.5 text-white z-20"
            onClick={() => handleChangePeriod(0)}
          >
            Monthly
          </button>
          <button
            className="font-semibold rounded-full w-full p-1.5 text-white z-20"
            onClick={() => handleChangePeriod(1)}
          >
            Yearly
          </button>
          <div
            className="p-1.5 flex items-center justify-center absolute inset-0 w-1/2 z-10"
            style={{
              transform: `translateX(${period * 100}%)`,
              transition: "transform 0.3s",
            }}
          >
            <div className="bg-indigo-500/60 backdrop-blur-sm shadow-sm rounded-full w-full h-full"></div>
          </div>
        </div>
        <div className="w-full relative flex flex-col items-center justify-center gap-3 mt-2">
          <div
            className="w-full flex justify-between cursor-pointer border border-white/20 p-4 rounded-2xl backdrop-blur-sm"
            onClick={() => handleChangePlan(0)}
          >
            <div className="flex flex-col items-start">
              <p className="font-semibold text-xl text-white">Free</p>
              <p className="text-white/70 text-md">
                <span className="text-white font-medium">$0.00</span>/month
              </p>
            </div>
            <div
              className="border-2 border-white/50 size-6 rounded-full mt-0.5 p-1 flex items-center justify-center"
              style={{
                borderColor: `${active === 0 ? "#6366f1" : "rgba(255, 255, 255, 0.5)"}`,
                transition: "border-color 0.3s",
              }}
            >
              <div
                className="size-3 bg-indigo-500 rounded-full"
                style={{
                  opacity: `${active === 0 ? 1 : 0}`,
                  transition: "opacity 0.3s",
                }}
              ></div>
            </div>
          </div>
          <div
            className="w-full flex justify-between cursor-pointer border border-white/20 p-4 rounded-2xl backdrop-blur-sm"
            onClick={() => handleChangePlan(1)}
          >
            <div className="flex flex-col items-start">
              <p className="font-semibold text-xl flex items-center gap-2 text-white">
                Starter{" "}
                <span className="py-1 px-2 block rounded-lg bg-orange-500/20 text-orange-500 text-sm">
                  Popular
                </span>
              </p>
              <p className="text-white/70 text-md flex">
                <span className="text-white font-medium flex items-center">
                  ${" "}
                  <NumberFlow
                    className="text-white font-medium"
                    value={starter}
                  />
                </span>
                /month
              </p>
            </div>
            <div
              className="border-2 border-white/50 size-6 rounded-full mt-0.5 p-1 flex items-center justify-center"
              style={{
                borderColor: `${active === 1 ? "#6366f1" : "rgba(255, 255, 255, 0.5)"}`,
                transition: "border-color 0.3s",
              }}
            >
              <div
                className="size-3 bg-indigo-500 rounded-full"
                style={{
                  opacity: `${active === 1 ? 1 : 0}`,
                  transition: "opacity 0.3s",
                }}
              ></div>
            </div>
          </div>
          <div
            className="w-full flex justify-between cursor-pointer border border-white/20 p-4 rounded-2xl backdrop-blur-sm"
            onClick={() => handleChangePlan(2)}
          >
            <div className="flex flex-col items-start">
              <p className="font-semibold text-xl text-white">Pro</p>
              <p className="text-white/70 text-md flex">
                <span className="text-white font-medium flex items-center">
                  ${" "}
                  <NumberFlow
                    className="text-white font-medium"
                    value={pro}
                  />
                </span>
                /month
              </p>
            </div>
            <div
              className="border-2 border-white/50 size-6 rounded-full mt-0.5 p-1 flex items-center justify-center"
              style={{
                borderColor: `${active === 2 ? "#6366f1" : "rgba(255, 255, 255, 0.5)"}`,
                transition: "border-color 0.3s",
              }}
            >
              <div
                className="size-3 bg-indigo-500 rounded-full"
                style={{
                  opacity: `${active === 2 ? 1 : 0}`,
                  transition: "opacity 0.3s",
                }}
              ></div>
            </div>
          </div>
          <div
            className={`w-full h-[88px] absolute top-0 border-2 border-indigo-500 rounded-2xl`}
            style={{
              transform: `translateY(${active * 88 + 12 * active}px)`,
              transition: "transform 0.3s",
            }}
          ></div>
        </div>
        <button 
          className={`rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-lg text-white w-full p-3 active:scale-95 transition-all duration-300 mt-4 hover:from-indigo-600 hover:to-indigo-700 shadow-lg relative ${
            isProcessing ? 'opacity-70 cursor-not-allowed' : ''
          }`}
          onClick={() => {
            if (isProcessing) return;
            
            // If free plan is selected, just navigate home
            if (active === 0) {
              setLocation('/');
              return;
            }
            
            // If not authenticated, redirect to login first
            if (!isAuthenticated) {
              toast({
                title: "Login required",
                description: "Please sign in to purchase a plan",
                variant: "default",
              });
              setLocation('/login?returnTo=/pricing');
              return;
            }
            
            // Determine package type based on selection
            let packageType = '';
            if (active === 1) {
              packageType = 'STARTER';
            } else if (active === 2) {
              packageType = 'PRO';
            }
            
            if (packageType) {
              setIsProcessing(true);
              createCheckoutMutation.mutate(packageType);
            }
          }}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            active === 0 ? "Continue with Free" : "Purchase Plan"
          )}
        </button>
      </div>
  );
};