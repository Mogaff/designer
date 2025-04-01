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
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Pricing plans cards */}
          <div className="bg-black/20 backdrop-blur-sm border border-indigo-500/30 rounded-2xl p-6 flex flex-col">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-white mb-2">Free Trial</h3>
              <div className="flex items-end mb-2">
                <span className="text-3xl font-bold text-white">$0</span>
                <span className="text-white/70 ml-1">/month</span>
              </div>
              <p className="text-white/60 text-sm mb-4">Perfect for trying out our platform</p>
              <Badge variant="outline" className="bg-white/10 text-white border-white/20">Limited</Badge>
            </div>
            
            <div className="flex-grow">
              <ul className="space-y-3 mb-6">
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-indigo-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-white/80">5 free credits to start</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-indigo-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-white/80">1 credit per design</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-indigo-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-white/80">Generate 1-4 designs per request</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-indigo-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-white/80">Basic email support</span>
                </li>
              </ul>
            </div>
            
            <button 
              onClick={() => isAuthenticated ? setLocation('/') : setLocation('/login')}
              className="w-full py-2 px-4 bg-indigo-500/40 hover:bg-indigo-500/60 text-white font-medium rounded-lg transition-colors"
            >
              {isAuthenticated ? 'Go to Dashboard' : 'Sign Up Free'}
            </button>
          </div>
          
          <div className="bg-black/30 backdrop-blur-sm border border-indigo-500/50 rounded-2xl p-6 flex flex-col relative transform scale-105 z-10 shadow-xl">
            <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">POPULAR</div>
            
            <div className="mb-4">
              <h3 className="text-xl font-bold text-white mb-2">Standard</h3>
              <div className="flex items-end mb-2">
                <span className="text-3xl font-bold text-white">$9.99</span>
                <span className="text-white/70 ml-1">/month</span>
              </div>
              <p className="text-white/60 text-sm mb-4">Perfect for regular content creators</p>
              <Badge variant="outline" className="bg-indigo-500/20 text-indigo-300 border-indigo-500/40">Best Value</Badge>
            </div>
            
            <div className="flex-grow">
              <ul className="space-y-3 mb-6">
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-indigo-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-white/80">50 credits per month</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-indigo-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-white/80">Priority processing</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-indigo-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-white/80">Generate 1-4 designs per request</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-indigo-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-white/80">Save designs to favorites</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-indigo-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-white/80">Premium email support</span>
                </li>
              </ul>
            </div>
            
            <button 
              onClick={() => isAuthenticated ? setLocation('/credits') : setLocation('/login')}
              className="w-full py-2 px-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-medium rounded-lg transition-colors shadow-lg"
            >
              {isAuthenticated ? 'Upgrade Now' : 'Sign Up & Subscribe'}
            </button>
          </div>
          
          <div className="bg-black/20 backdrop-blur-sm border border-indigo-500/30 rounded-2xl p-6 flex flex-col">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-white mb-2">Premium</h3>
              <div className="flex items-end mb-2">
                <span className="text-3xl font-bold text-white">$19.99</span>
                <span className="text-white/70 ml-1">/month</span>
              </div>
              <p className="text-white/60 text-sm mb-4">For power users and professionals</p>
              <Badge variant="outline" className="bg-white/10 text-white border-white/20">Unlimited</Badge>
            </div>
            
            <div className="flex-grow">
              <ul className="space-y-3 mb-6">
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-indigo-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-white/80">120 credits per month</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-indigo-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-white/80">Highest priority processing</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-indigo-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-white/80">Generate 1-4 designs per request</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-indigo-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-white/80">Download in high-resolution</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-indigo-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-white/80">Dedicated support</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-indigo-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-white/80">Custom branding options</span>
                </li>
              </ul>
            </div>
            
            <button 
              onClick={() => isAuthenticated ? setLocation('/credits') : setLocation('/login')}
              className="w-full py-2 px-4 bg-indigo-500/40 hover:bg-indigo-500/60 text-white font-medium rounded-lg transition-colors"
            >
              {isAuthenticated ? 'Upgrade Now' : 'Sign Up & Subscribe'}
            </button>
          </div>
        </div>
        
        <div className="my-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Or Try Our Interactive Pricing Calculator</h2>
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