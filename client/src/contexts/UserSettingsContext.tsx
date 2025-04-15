import React, { createContext, useContext, useState, useEffect } from 'react';
import { FontSettings } from '@/lib/types';
import { preloadCommonFonts } from '@/lib/fontService';

// Default font settings
export const DEFAULT_FONTS: FontSettings = {
  headingFont: 'Montserrat',
  bodyFont: 'Open Sans'
};

// Context type definition
export interface UserSettingsContextType {
  fontSettings: FontSettings;
  setFontSettings: (settings: FontSettings) => void;
  resetFontSettings: () => void;
}

// Create the context with default values to avoid undefined checks
const defaultContextValue: UserSettingsContextType = {
  fontSettings: DEFAULT_FONTS,
  setFontSettings: () => {}, // No-op function
  resetFontSettings: () => {} // No-op function
};

// Create the context
export const UserSettingsContext = createContext<UserSettingsContextType>(defaultContextValue);

// Custom hook for using the context
export const useUserSettings = () => useContext(UserSettingsContext);

// Provider component
export const UserSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Get settings from localStorage or use defaults
  const [fontSettings, setFontSettings] = useState<FontSettings>(() => {
    try {
      const savedSettings = localStorage.getItem('userFontSettings');
      return savedSettings ? JSON.parse(savedSettings) : DEFAULT_FONTS;
    } catch (error) {
      console.error('Error loading font settings:', error);
      return DEFAULT_FONTS;
    }
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
};