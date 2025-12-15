import { useEffect } from 'react';

/**
 * Hook to specifically block Chinese language display
 * This is more targeted than useForceEnglish and focuses on preventing Chinese characters
 */
export const useBlockChinese = () => {
  useEffect(() => {
    // Create a style element to force Western fonts that don't support Chinese
    const style = document.createElement('style');
    style.textContent = `
      /* Block Chinese characters by using Western-only fonts */
      @font-face {
        font-family: 'Western-Only';
        src: local('Arial'), local('Helvetica'), local('Segoe UI'), local('Roboto');
        unicode-range: U+4E00-9FFF, U+3400-4DBF, U+20000-2A6DF, U+2A700-2B73F, U+2B740-2B81F, U+2B820-2CEAF;
      }
      
      /* Apply Western-only fonts to all elements */
      * {
        font-family: 'Western-Only', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important;
      }
      
      /* Specifically target Chinese language attribute */
      :lang(zh), :lang(zh-CN), :lang(zh-TW), :lang(zh-HK) {
        font-family: 'Western-Only', Arial, sans-serif !important;
      }
    `;
    document.head.appendChild(style);
    
    // Function to replace Chinese characters with Latin equivalents
    const replaceChinese = () => {
      // Find text nodes that might contain Chinese
      const textNodes = [];
      const walk = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      let node;
      while (node = walk.nextNode()) {
        // Check if node contains Chinese characters
        if (/[\u4E00-\u9FFF\u3400-\u4DBF\u20000-\u2A6DF\u2A700-\u2B73F\u2B740-\u2B81F\u2B820-\u2CEAF]/.test(node.nodeValue)) {
          textNodes.push(node);
        }
      }
      
      // Replace Chinese characters with empty space or English placeholder
      textNodes.forEach(node => {
        if (node.nodeValue) {
          // Replace Chinese characters with English equivalents
          node.nodeValue = node.nodeValue.replace(/[\u4E00-\u9FFF\u3400-\u4DBF\u20000-\u2A6DF\u2A700-\u2B73F\u2B740-\u2B81F\u2B820-\u2CEAF]/g, '');
        }
      });
    };
    
    // Run initially
    replaceChinese();
    
    // Set up a MutationObserver to watch for DOM changes and replace Chinese characters
    const observer = new MutationObserver(() => {
      replaceChinese();
    });
    
    // Start observing the document
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
    
    // Clean up
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
      observer.disconnect();
    };
  }, []);
}; 