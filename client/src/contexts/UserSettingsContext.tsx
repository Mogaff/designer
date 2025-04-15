import React, { createContext, useContext, useState, useEffect } from 'react';
import { FontSettings } from '@/lib/types';
import { preloadCommonFonts } from '@/lib/fontService';

// Default font settings
const DEFAULT_FONTS: FontSettings = {
  headingFont: 'Montserrat',
  bodyFont: 'Open Sans'
};

// Context type definition
interface UserSettingsContextType {
  fontSettings: FontSettings;
  setFontSettings: (settings: FontSettings) => void;
  resetFontSettings: () => void;
}

// Create the context
const UserSettingsContext = createContext<UserSettingsContextType | undefined>(undefined);

// Provider component
export function UserSettingsProvider({ children }: { children: React.ReactNode }) {
  // Get settings from localStorage or use defaults
  const [fontSettings, setFontSettings] = useState<FontSettings>(() => {
    const savedSettings = localStorage.getItem('userFontSettings');
    return savedSettings ? JSON.parse(savedSettings) : DEFAULT_FONTS;
  });

  // Update localStorage when settings change
  useEffect(() => {
    localStorage.setItem('userFontSettings', JSON.stringify(fontSettings));
  }, [fontSettings]);

  // Preload common fonts on initial render
  useEffect(() => {
    preloadCommonFonts();
  }, []);

  // Reset to default settings
  const resetFontSettings = () => {
    setFontSettings(DEFAULT_FONTS);
  };

  // Context value
  const value = {
    fontSettings,
    setFontSettings,
    resetFontSettings
  };

  return (
    <UserSettingsContext.Provider value={value}>
      {children}
    </UserSettingsContext.Provider>
  );
}

// Custom hook for using the context
export function useUserSettings() {
  const context = useContext(UserSettingsContext);
  if (context === undefined) {
    throw new Error('useUserSettings must be used within a UserSettingsProvider');
  }
  return context;
}