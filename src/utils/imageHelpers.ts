import { Platform } from '@/components/PlatformSelector';
import { removeSymbols } from './stringUtils';
import { getRelevantFreepikKeywords } from './keywordGenerator';
import { determineVideoCategory } from './categorySelector';

export interface ProcessedImage {
  id: string;
  file: File;
  reducedFile?: File; // Optimized version of the file for API processing
  previewUrl: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  result?: {
    title: string;
    description: string;
    keywords: string[];
    prompt?: string;
    baseModel?: string;
    categories?: string[];
    isVideo?: boolean;
    category?: number;
    isEps?: boolean;
  };
  error?: string;
}

/**
 * Format images as CSV
 */
export const formatImagesAsCSV = (
  images: ProcessedImage[],
  isFreepikOnly?: boolean,
  isShutterstock?: boolean,
  isAdobeStock?: boolean,
  isVecteezy?: boolean,
  isDepositphotos?: boolean,
  is123RF?: boolean,
  isAlamy?: boolean
): string => {
  const header = isFreepikOnly
    ? '"File name";"Title";"Keywords";"Prompt";"Base-Model"'
    : isShutterstock
      ? '"Filename","Description","Keywords"'
      : isAdobeStock
        ? '"Filename","Title","Keywords"'
        : '"Filename","Title","Description","Keywords"';

  const rows = images
    .filter(img => img.status === 'complete' && img.result)
    .map(img => {
      const filename = img.file.name;
      const title = img.result?.title ? removeSymbolsFromTitle(img.result.title) : '';
      const description = img.result?.description || '';
      const keywords = (img.result?.keywords || []).join(',');
      const prompt = img.result?.prompt || '';
      const baseModel = img.result?.baseModel || 'leonardo';

      return isFreepikOnly
        ? `"${escapeCSV(filename)}";"${escapeCSV(title)}";"${escapeCSV(keywords)}";"${escapeCSV(prompt)}";"${escapeCSV(baseModel)}"`
        : isShutterstock
          ? `"${escapeCSV(filename)}","${escapeCSV(description)}","${escapeCSV(keywords)}"`
          : isAdobeStock
            ? `"${escapeCSV(filename)}","${escapeCSV(title)}","${escapeCSV(keywords)}"`
            : `"${escapeCSV(filename)}","${escapeCSV(title)}","${escapeCSV(description)}","${escapeCSV(keywords)}"`;
    });

  return `${header}\n${rows.join('\n')}`;
};

/**
 * Format videos as CSV
 */
export const formatVideosAsCSV = (videos: ProcessedImage[], isShutterstock?: boolean): string => {
  // Create CSV header row - Shutterstock requires specific format
  const header = isShutterstock 
    ? '"Filename","Description","Keywords"'
    : '"Filename","Title","Keywords","Category"';
  
  // Process each video
  const rows = videos
    .filter(video => video.status === 'complete' && video.result)
    .map(video => {
      // Ensure we have a filename
      const filename = video.file.name;
      
      // Clean title
      const title = video.result?.title ? removeSymbolsFromTitle(video.result.title) : '';
      
      // Get description for Shutterstock
      const description = video.result?.description || '';
      
      // Join keywords
      const keywords = (video.result?.keywords || []).join(',');
      
      // Determine category
      // Use the existing category if available, otherwise determine it
      const category = video.result?.category || determineVideoCategory(
        title,
        description,
        video.result?.keywords || []
      );
      
      // Format the row with proper CSV escaping
      // For Shutterstock, use the description and keywords without category
      return isShutterstock
        ? `"${escapeCSV(filename)}","${escapeCSV(description)}","${escapeCSV(keywords)}"`
        : `"${escapeCSV(filename)}","${escapeCSV(title)}","${escapeCSV(keywords)}","${category}"`;
    });
  
  // Combine header and rows
  return `${header}\n${rows.join('\n')}`;
};

/**
 * Downloads content as a CSV file
 */
export const downloadCSV = (csvContent: string, filename: string, platform?: Platform | string): string => {
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  
  a.href = url;
  
  // Use platform to create a custom folder name
  let folderName = 'metadata';
  
  if (platform) {
    // When General platform (Alamy) is selected, use "General"
    if (platform === 'Alamy') {
      folderName = 'General';
    } else {
      folderName = `${platform}-metadata`;
    }
  }
  
  // Append folder name to filename
  a.download = `${folderName}/${filename}`;
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  // Return the URL as required by the function signature
  return url;
};

/**
 * Format file size to human readable format
 */
export const formatFileSize = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Removes symbols from a title
 */
export const removeSymbolsFromTitle = (title: string): string => {
  return removeSymbols(title);
};

/**
 * Removes commas from a description
 */
export const removeCommasFromDescription = (description: string): string => {
  return description.replace(/,/g, '');
};

// Helper function to properly escape CSV fields
export const escapeCSV = (field: string): string => {
  // Replace double quotes with two double quotes according to CSV standard
  return field.replace(/"/g, '""');
};

/**
 * Create a preview for an image file
 */
export const createImagePreview = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Generate a unique ID
 */
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

/**
 * Check if the file type is allowed
 */
export const isValidImageType = (file: File): boolean => {
  const validTypes = [
    'image/jpeg', 
    'image/png', 
    'image/jpg', 
    'image/svg+xml', 
    'application/postscript',
    'application/eps',
    'image/eps',
    'application/illustrator',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/ogg',
    'video/x-msvideo',
    'video/x-ms-wmv'
  ];
  
  return validTypes.includes(file.type);
};

/**
 * Check if the file size is within limits
 */
export const isValidFileSize = (file: File): boolean => {
  const MAX_SIZE = 10 * 1024 * 1024 * 1024; // 10GB
  return file.size <= MAX_SIZE;
};

/**
 * Suggest categories for Shutterstock
 */
export const suggestCategoriesForShutterstock = (title: string, description: string): string[] => {
  const content = `${title} ${description}`.toLowerCase();
  
  const categories: string[] = [];
  
  if (content.includes('people') || content.includes('person') || content.includes('portrait')) {
    categories.push('People');
  }
  
  if (content.includes('nature') || content.includes('landscape') || content.includes('outdoor')) {
    categories.push('Nature');
  }
  
  if (content.includes('business') || content.includes('office') || content.includes('professional')) {
    categories.push('Business');
  }
  
  if (content.includes('food') || content.includes('drink') || content.includes('meal')) {
    categories.push('Food & Drink');
  }
  
  if (content.includes('abstract') || content.includes('pattern') || content.includes('texture')) {
    categories.push('Backgrounds/Textures');
  }
  
  // Return at least one category
  if (categories.length === 0) {
    categories.push('Objects');
  }
  
  return categories;
};

/**
 * Suggest categories for Adobe Stock
 */
export const suggestCategoriesForAdobeStock = (title: string, keywords: string[]): string[] => {
  const content = `${title} ${keywords.join(' ')}`.toLowerCase();
  
  const categories: string[] = [];
  
  if (content.includes('people') || content.includes('person') || content.includes('portrait')) {
    categories.push('People');
  }
  
  if (content.includes('nature') || content.includes('landscape') || content.includes('outdoor')) {
    categories.push('Nature');
  }
  
  if (content.includes('business') || content.includes('office') || content.includes('professional')) {
    categories.push('Business');
  }
  
  if (content.includes('food') || content.includes('drink') || content.includes('meal')) {
    categories.push('Food');
  }
  
  if (content.includes('abstract') || content.includes('pattern') || content.includes('texture')) {
    categories.push('Abstract');
  }
  
  // Return at least one category
  if (categories.length === 0) {
    categories.push('Illustrations');
  }
  
  return categories;
};

/**
 * Reduces the size and dimensions of an image file to improve processing speed
 * @param file Original image file
 * @param quality Quality percentage (1-100)
 * @param targetWidth Target width in pixels (default 200px)
 * @returns A promise that resolves to a new File with reduced size
 */
export async function reduceImageSize(file: File, quality: number = 20, targetWidth: number = 200): Promise<File> {
  // Skip reduction for non-image files or SVG files
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return file;
  }
  
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        
        img.onload = () => {
          // Calculate new dimensions - target 10% of original dimensions (90% reduction)
          // but not larger than targetWidth
          let newWidth = Math.min(Math.round(img.width * 0.1), targetWidth);
          let newHeight = Math.round(img.height * (newWidth / img.width));
          
          // Ensure dimensions are at least 200x200 if original is larger
          if (img.width > 200 && img.height > 200) {
            newWidth = Math.max(newWidth, 200);
            newHeight = Math.max(newHeight, 200);
          } else {
            // For smaller images, keep them as is or reduce slightly
            newWidth = Math.min(img.width, 200);
            newHeight = Math.min(img.height, 200);
          }
          
          console.log(`Reducing image dimensions: ${img.width}x${img.height} -> ${newWidth}x${newHeight}`);
          
          // Create canvas for resizing
          const canvas = document.createElement('canvas');
          canvas.width = newWidth;
          canvas.height = newHeight;
          
          // Draw resized image on canvas
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          // Use low quality settings for drawing to maximize compression
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'low'; // Use low quality for better compression
          ctx.drawImage(img, 0, 0, newWidth, newHeight);
          
          // Convert to blob with reduced quality
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to create blob from canvas'));
                return;
              }
              
              // Create new file with same name but reduced size
              const newFile = new File([blob], file.name, {
                type: 'image/jpeg', // Convert to JPEG for better compression
                lastModified: file.lastModified,
              });
              
              const originalSizeKB = file.size / 1024;
              const newSizeKB = newFile.size / 1024;
              const reductionPercent = Math.round((1 - (newFile.size / file.size)) * 100);
              
              console.log(`Reduced image size: ${file.name} - Original: ${originalSizeKB.toFixed(2)} KB, New: ${newSizeKB.toFixed(2)} KB (${reductionPercent}% reduction)`);
              
              // Target size is around 200KB
              const targetSizeKB = 200;
              
              // If file is still too large (>200KB), try more aggressive compression
              if (newSizeKB > targetSizeKB) {
                console.log(`File still too large (${newSizeKB.toFixed(2)} KB). Applying more aggressive compression...`);
                
                // Try again with even smaller dimensions and lower quality
                const smallerCanvas = document.createElement('canvas');
                const smallerWidth = Math.round(newWidth * 0.7); // Further reduce to 70% of already reduced size
                const smallerHeight = Math.round(newHeight * 0.7);
                
                smallerCanvas.width = smallerWidth;
                smallerCanvas.height = smallerHeight;
                
                const smallerCtx = smallerCanvas.getContext('2d');
                if (!smallerCtx) {
                  // If this fails, return the first attempt
                  resolve(newFile);
                  return;
                }
                
                smallerCtx.imageSmoothingEnabled = true;
                smallerCtx.imageSmoothingQuality = 'low';
                smallerCtx.drawImage(img, 0, 0, smallerWidth, smallerHeight);
                
                // Convert to blob with very low quality
                smallerCanvas.toBlob(
                  (smallerBlob) => {
                    if (!smallerBlob) {
                      // If this fails, return the first attempt
                      resolve(newFile);
                      return;
                    }
                    
                    const finalFile = new File([smallerBlob], file.name, {
                      type: 'image/jpeg',
                      lastModified: file.lastModified,
                    });
                    
                    const finalSizeKB = finalFile.size / 1024;
                    const finalReductionPercent = Math.round((1 - (finalFile.size / file.size)) * 100);
                    
                    console.log(`Second-pass reduction: ${file.name} - Original: ${originalSizeKB.toFixed(2)} KB, New: ${finalSizeKB.toFixed(2)} KB (${finalReductionPercent}% reduction)`);
                    
                    // Use the smaller file
                    if (finalFile.size < newFile.size) {
                      resolve(finalFile);
                    } else {
                      resolve(newFile);
                    }
                  },
                  'image/jpeg',
                  0.2 // Very low quality (20%)
                );
              } else {
                // Reduction was sufficient, return the file
                resolve(newFile);
              }
            },
            'image/jpeg',
            quality / 100
          );
        };
        
        img.onerror = () => {
          console.warn(`Could not load image for reduction: ${file.name}`);
          resolve(file); // Return original if we can't process it
        };
      };
      
      reader.onerror = () => {
        console.warn(`Could not read file for reduction: ${file.name}`);
        resolve(file); // Return original if we can't read it
      };
    } catch (error) {
      console.error('Error reducing image size:', error);
      resolve(file); // Return original on error
    }
  });
}
