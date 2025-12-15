import { useEffect } from 'react';

/**
 * Hook that forces the application to use English by overriding browser APIs
 * This is a more aggressive approach to ensure English is used
 */
export const useForceEnglish = () => {
  useEffect(() => {
    // Override navigator.language and navigator.languages
    Object.defineProperty(navigator, 'language', {
      get: function() { return 'en-US'; }
    });
    
    Object.defineProperty(navigator, 'languages', {
      get: function() { return ['en-US', 'en']; }
    });
    
    // Intercept language detection
    const originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = function(element, pseudoElt) {
      const style = originalGetComputedStyle(element, pseudoElt);
      
      // Override font-related properties if they're attempting to use non-Latin fonts
      const overrideStyle = new Proxy(style, {
        get: function(target, prop) {
          if (prop === 'fontFamily') {
            return '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
          }
          return target[prop];
        }
      });
      
      return overrideStyle;
    };
    
    // Set document language
    document.documentElement.lang = 'en';
    
    // Block any auto-detect language features
    if (window.Intl && window.Intl.DateTimeFormat) {
      const originalDateTimeFormat = window.Intl.DateTimeFormat;
      // Instead of completely replacing DateTimeFormat, we'll just patch
      // the constructor to always use English locale
      const originalDateTimeFormatConstructor = window.Intl.DateTimeFormat;
      (window.Intl as any).DateTimeFormat = function(locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
        return new originalDateTimeFormatConstructor('en-US', options);
      };
      // Preserve the supportedLocalesOf static method
      (window.Intl.DateTimeFormat as any).supportedLocalesOf = originalDateTimeFormatConstructor.supportedLocalesOf;
    }
    
    return () => {
      // Restore original getComputedStyle on cleanup
      window.getComputedStyle = originalGetComputedStyle;
    };
  }, []);
}; 