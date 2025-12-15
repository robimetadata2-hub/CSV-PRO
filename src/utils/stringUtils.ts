/**
 * Removes symbols from a string
 */
export const removeSymbols = (text: string): string => {
  return text.replace(/[^\w\s]/gi, ' ').replace(/\s+/g, ' ').trim();
};

/**
 * Capitalizes only the first word of a string, making the rest lowercase
 */
export const capitalizeFirstWord = (text: string): string => {
  if (!text) return '';
  const words = text.trim().toLowerCase().split(' ');
  if (words.length === 0) return '';
  
  words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  return words.join(' ');
};
