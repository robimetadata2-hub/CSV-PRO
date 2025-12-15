import { useEffect } from 'react';

/**
 * A component that forces the application to use English
 * with a simplified approach that won't cause rendering issues
 */
const ForceEnglishLanguage = () => {
  useEffect(() => {
    // Set the HTML lang attribute
    document.documentElement.lang = 'en';

    // Basic meta tags for English language
    if (document.head) {
      // Set the content language to English
      const contentLanguage = document.createElement('meta');
      contentLanguage.setAttribute('http-equiv', 'Content-Language');
      contentLanguage.setAttribute('content', 'en');
      document.head.appendChild(contentLanguage);

      // Prevent automatic translation
      const noTranslate = document.createElement('meta');
      noTranslate.setAttribute('name', 'google');
      noTranslate.setAttribute('content', 'notranslate');
      document.head.appendChild(noTranslate);
    }

    // Basic CSS to force English fonts
    const style = document.createElement('style');
    style.textContent = `
      body, button, input, textarea, select {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      }
    `;
    document.head.appendChild(style);

    // Clean up on unmount
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  // This component doesn't render anything visible
  return null;
};

export default ForceEnglishLanguage; 