import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define language type
type Language = 'en'; // Currently only English supported

// Context interface
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

// Create the context with default values
const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
});

// Custom hook for using the language context
export const useLanguage = () => useContext(LanguageContext);

// Provider component
interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  // Always use English
  const [language] = useState<Language>('en');

  // Set basic language attributes
  useEffect(() => {
    // Set HTML language attribute
    document.documentElement.lang = 'en';
    
    // Store language preference
    localStorage.setItem('app-language', 'en');
  }, []);

  // No-op function since we only support English
  const setLanguage = () => {
    console.info('Language is fixed to English in this application.');
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}; 