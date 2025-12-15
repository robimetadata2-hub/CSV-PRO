import { useLanguage } from '@/context/LanguageContext';
import { getText } from '@/utils/languages';

/**
 * Hook for accessing localized text strings
 * @returns A function that takes a text key path and returns the localized text
 */
export const useText = () => {
  const { language } = useLanguage();
  
  /**
   * Get localized text for the given key path
   * @param path Dot-notation path to the text string (e.g., 'sidebar.settings')
   * @returns The localized text string
   */
  const t = (path: string): string => {
    return getText(path, language);
  };
  
  return t;
}; 