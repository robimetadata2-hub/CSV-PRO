/**
 * Utility for converting SVG files to PNG format
 * This is necessary because Gemini API doesn't support SVG format directly
 */

/**
 * Converts an SVG file to PNG format
 * @param svgFile - The SVG file to convert
 * @param width - The width of the PNG (default: 1200)
 * @param height - The height of the PNG (default: 1200)
 * @returns A Promise that resolves to a PNG File object
 */
export async function convertSvgToPng(
  svgFile: File,
  width: number = 1200,
  height: number = 1200
): Promise<File> {
  // First read the SVG file as text
  const svgText = await readFileAsText(svgFile);
  
  // Create a canvas element to render the SVG
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  // Create an SVG image
  const img = new Image();
  
  // Return a promise that resolves when the image has loaded
  return new Promise((resolve, reject) => {
    img.onload = () => {
      // Draw the SVG on the canvas
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert the canvas to a Blob
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to convert SVG to PNG'));
          return;
        }
        
        // Create a new File from the Blob
        const pngFile = new File([blob], svgFile.name.replace(/\.svg$/i, '.png'), {
          type: 'image/png',
          lastModified: Date.now(),
        });
        
        resolve(pngFile);
      }, 'image/png');
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load SVG image'));
    };
    
    // Set the source of the image to the SVG data URL
    img.src = URL.createObjectURL(
      new Blob([svgText], { type: 'image/svg+xml' })
    );
  });
}

/**
 * Helper function to read a file as text
 */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Checks if a file is an SVG
 */
export function isSvgFile(file: File): boolean {
  return file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
} 