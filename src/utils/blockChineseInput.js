/**
 * Utility to block Chinese input methods and ensure only English input is allowed
 */

// Run this script when the document loads
document.addEventListener('DOMContentLoaded', () => {
  // Block Chinese input methods by disabling composition events
  document.addEventListener('compositionstart', (e) => {
    // Prevent IME composition for non-Latin languages
    e.preventDefault();
  }, true);
  
  document.addEventListener('compositionupdate', (e) => {
    e.preventDefault();
  }, true);
  
  document.addEventListener('compositionend', (e) => {
    e.preventDefault();
  }, true);
  
  // Override keyboard layout API if available
  if (navigator.keyboard && navigator.keyboard.getLayoutMap) {
    const originalGetLayoutMap = navigator.keyboard.getLayoutMap;
    navigator.keyboard.getLayoutMap = async () => {
      // Return a US English keyboard layout map
      const originalMap = await originalGetLayoutMap.call(navigator.keyboard);
      // Create a proxy that always returns English keys
      return new Proxy(originalMap, {
        get(target, prop) {
          if (prop === 'get') {
            return (code) => 'en-US';
          }
          return target[prop];
        }
      });
    };
  }
  
  // Block any input that contains Chinese characters
  document.addEventListener('input', (e) => {
    const target = e.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      // Check if the input contains Chinese characters
      if (/[\u4E00-\u9FFF\u3400-\u4DBF\u20000-\u2A6DF\u2A700-\u2B73F\u2B740-\u2B81F\u2B820-\u2CEAF]/.test(target.value)) {
        // Replace Chinese characters with empty string
        target.value = target.value.replace(/[\u4E00-\u9FFF\u3400-\u4DBF\u20000-\u2A6DF\u2A700-\u2B73F\u2B740-\u2B81F\u2B820-\u2CEAF]/g, '');
      }
    }
  }, true);
});

export default {}; 