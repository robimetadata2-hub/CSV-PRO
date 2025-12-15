import { Platform } from '@/components/PlatformSelector';
import { GenerationMode } from '@/components/GenerationModeSelector';
import { getRelevantFreepikKeywords } from './keywordGenerator';
import { suggestCategoriesForShutterstock, suggestCategoriesForAdobeStock, removeSymbolsFromTitle, reduceImageSize } from './imageHelpers';
import { convertSvgToPng, isSvgFile } from './svgToPng';
import { extractVideoThumbnail, isVideoFile } from './videoProcessor';
import { isEpsFile, extractEpsMetadata, createEpsMetadataRepresentation } from './epsMetadataExtractor';
import { determineVideoCategory } from './categorySelector';
import { capitalizeFirstWord } from './stringUtils';

interface AnalysisOptions {
  titleLength?: number;
  descriptionLength?: number;
  keywordCount?: number;
  platforms?: Platform[];
  generationMode?: GenerationMode;
  minTitleWords?: number;
  maxTitleWords?: number;
  minKeywords?: number;
  maxKeywords?: number;
  minDescriptionWords?: number;
  maxDescriptionWords?: number;
  customPromptEnabled?: boolean;
  customPrompt?: string;
  prohibitedWords?: string;
  prohibitedWordsEnabled?: boolean;
  transparentBgEnabled?: boolean;
  isolatedOnTransparentBgEnabled?: boolean;
  silhouetteEnabled?: boolean;
  singleWordKeywordsEnabled?: boolean;
}

interface AnalysisResult {
  title: string;
  description: string;
  keywords: string[];
  prompt?: string;
  baseModel?: string;
  categories?: string[];
  error?: string;
  filename?: string;
  isVideo?: boolean;
  category?: number;
  isEps?: boolean;
  index?: number; // Added for individual processing
}

interface BatchImageData {
  file: File;
  originalFilename: string;
  base64Data: string;
  originalIsVideo: boolean;
  originalIsEps: boolean;
  originalIsSvg: boolean;
}

export async function analyzeImageWithGemini(
  imageFile: File,
  apiKey: string,
  options: AnalysisOptions = {}
): Promise<AnalysisResult> {
  const {
    platforms = ['AdobeStock'],
    generationMode = 'metadata',
    minTitleWords = 8,
    maxTitleWords = 15,
    minKeywords = 20,
    maxKeywords = 35,
    minDescriptionWords = 30,
    maxDescriptionWords = 40,
    customPromptEnabled = false,
    customPrompt = '',
    prohibitedWords = '',
    prohibitedWordsEnabled = false,
    transparentBgEnabled = false,
    isolatedOnTransparentBgEnabled = false,
    silhouetteEnabled = false,
    singleWordKeywordsEnabled = false
  } = options;

  const isFreepikOnly = platforms.length === 1 && platforms[0] === 'Freepik';
  const isShutterstock = platforms.length === 1 && platforms[0] === 'Shutterstock';
  const isAdobeStock = platforms.length === 1 && platforms[0] === 'AdobeStock';
  
  try {
    // Store original filename
    const originalFilename = imageFile.name;
    
    // Check if we need to process special file types
    let fileToProcess = imageFile;
    let originalIsSvg = false;
    let originalIsVideo = false;
    let originalIsEps = false;
    let epsMetadata = null;

    // Handle SVG files
    if (isSvgFile(imageFile)) {
      try {
        originalIsSvg = true;
        console.log('Converting SVG to PNG for Gemini API compatibility...');
        fileToProcess = await convertSvgToPng(imageFile);
        console.log('SVG conversion successful');
      } catch (conversionError) {
        console.error('SVG conversion failed:', conversionError);
        throw new Error('Failed to convert SVG to PNG format: ' + (conversionError instanceof Error ? conversionError.message : 'Unknown error'));
      }
    }
    // Handle EPS files
    else if (isEpsFile(imageFile)) {
      try {
        originalIsEps = true;
        console.log('Extracting metadata from EPS file for Gemini API compatibility...');
        epsMetadata = await extractEpsMetadata(imageFile);
        fileToProcess = createEpsMetadataRepresentation(epsMetadata);
        console.log('EPS metadata extraction successful');
      } catch (extractionError) {
        console.error('EPS metadata extraction failed:', extractionError);
        throw new Error('Failed to extract metadata from EPS file: ' + (extractionError instanceof Error ? extractionError.message : 'Unknown error'));
      }
    }
    // Handle video files
    else if (isVideoFile(imageFile)) {
      try {
        originalIsVideo = true;
        fileToProcess = await extractVideoThumbnail(imageFile);
      } catch (extractionError) {
        throw new Error('Failed to extract thumbnail from video: ' + (extractionError instanceof Error ? extractionError.message : 'Unknown error'));
      }
    }
    // For regular image files, reduce the size
    else if (fileToProcess.type.startsWith('image/')) {
      try {
        fileToProcess = await reduceImageSize(fileToProcess);
        console.log(`Image size reduced for ${fileToProcess.name}`);
      } catch (reductionError) {
        console.warn('Image size reduction failed, using original:', reductionError);
        // Continue with original file if reduction fails
      }
    }
    
    // Convert image file to base64
    const base64Image = await fileToBase64(fileToProcess);
    
    // Define prompt based on platform and file type
    let prompt = `Analyze this image and generate:`;
    
    // Add silhouette instructions if enabled
    let silhouetteInstructions = '';
    if (silhouetteEnabled) {
      silhouetteInstructions = `IMPORTANT: This image features a silhouette. Please ensure you:
1. Add "silhouette" to the end of the title
2. Include "silhouette" as one of the keywords
3. Mention the silhouette style in the description as a distinctive feature\n\n`;
    }
    
    // Use custom prompt if enabled and provided
    if (customPromptEnabled && customPrompt.trim()) {
      // Append the formatting instructions to the custom prompt
      let formattingPrompt = '';
      
      // Add prohibited words instruction if provided and enabled
      if (prohibitedWordsEnabled && prohibitedWords.trim()) {
        const prohibitedWordsArray = prohibitedWords
          .split(',')
          .map(word => word.trim())
          .filter(word => word.length > 0);
        
        if (prohibitedWordsArray.length > 0) {
          formattingPrompt += `\n\nIMPORTANT: Do not use the following words in any part of the metadata (title, description, or keywords): ${prohibitedWordsArray.join(', ')}.`;
        }
      }
      
      // Add transparent background instructions if enabled
      if (transparentBgEnabled) {
        formattingPrompt += `\n\nIMPORTANT: This image has an isolated object on a white background. Please ensure you:
1. Add "isolated on white background" to the end of the title
2. Include "white background" as one of the keywords
3. Mention the isolated object on a white background in the description`;
      }
      
      // Add isolated on transparent background instructions if enabled
      if (isolatedOnTransparentBgEnabled) {
        formattingPrompt += `\n\nIMPORTANT: This image has an isolated object on a transparent background. Please ensure you:
1. Add "isolated on transparent background" to the end of the title
2. Include "transparent background" as one of the keywords
3. Mention the isolated object on a transparent background in the description`;
      }
      
      // Add silhouette instructions if enabled
      if (silhouetteEnabled) {
        formattingPrompt += `\n\nIMPORTANT: This image features a silhouette. Please ensure you:
1. Add "silhouette" to the end of the title
2. Include "silhouette" as one of the keywords
3. Mention the silhouette style in the description as a distinctive feature`;
      }
      
      if (generationMode === 'imageToPrompt') {
        formattingPrompt += '\n\nReturn the prompt description only, nothing else.';
      } else if (isFreepikOnly) {
        formattingPrompt += `\n\nFormat your response as a JSON object with the fields "title", "prompt", and "keywords" (as an array of at least ${minKeywords} terms).`;
      } else if (isShutterstock) {
        formattingPrompt += `\n\nFormat your response as a JSON object with the fields "description" and "keywords" (as an array of at least ${minKeywords} terms).`;
      } else if (isAdobeStock) {
        formattingPrompt += `\n\nFormat your response as a JSON object with the fields "title" and "keywords" (as an array of at least ${minKeywords} terms).`;
      } else {
        if (originalIsVideo) {
          formattingPrompt += `\n\nFormat your response as a JSON object with the fields "title", "keywords" (as an array of at least ${minKeywords} terms), and "category" (as a number from 1-10).`;
        } else {
          formattingPrompt += `\n\nFormat your response as a JSON object with the fields "title", "description", and "keywords" (as an array of at least ${minKeywords} terms).`;
        }
      }
      
      prompt = `${customPrompt}${formattingPrompt}`;
    } else {
      // Process prohibited words for default prompts
      let prohibitedWordsInstructions = '';
      if (prohibitedWordsEnabled && prohibitedWords.trim()) {
        const prohibitedWordsArray = prohibitedWords
          .split(',')
          .map(word => word.trim())
          .filter(word => word.length > 0);
        
        if (prohibitedWordsArray.length > 0) {
          prohibitedWordsInstructions = `IMPORTANT: Do not use the following words in any part of the metadata (title, description, or keywords): ${prohibitedWordsArray.join(', ')}.\n\n`;
        }
      }
      
      // Add transparent background instructions if enabled
      let transparentBgInstructions = '';
      if (transparentBgEnabled) {
        transparentBgInstructions = `IMPORTANT: This image has an isolated object on a white background. Please ensure you:
1. Add "isolated on white background" to the end of the title
2. Include "white background" as one of the keywords
3. Mention the isolated object on a white background in the description\n\n`;
      }
      
      // Add isolated on transparent background instructions if enabled
      let isolatedOnTransparentBgInstructions = '';
      if (isolatedOnTransparentBgEnabled) {
        isolatedOnTransparentBgInstructions = `IMPORTANT: This image has an isolated object on a transparent background. Please ensure you:
1. Add "isolated on transparent background" to the end of the title
2. Include "transparent background" as one of the keywords
3. Mention the isolated object on a transparent background in the description\n\n`;
      }
      
      // Add silhouette instructions if enabled
      let silhouetteInstructions = '';
      if (silhouetteEnabled) {
        silhouetteInstructions = `IMPORTANT: This image features a silhouette. Please ensure you:
1. Add "silhouette" to the end of the title
2. Include "silhouette" as one of the keywords
3. Mention the silhouette style in the description as a distinctive feature\n\n`;
      }
      
      // Special handling for EPS files
      if (originalIsEps) {
        prompt = `${prohibitedWordsInstructions}${transparentBgInstructions}${isolatedOnTransparentBgInstructions}${silhouetteInstructions}This is metadata extracted from an EPS file named "${originalFilename}". The metadata includes information like title, creator, creation date, document type, color information, and content details. Based on this information, generate appropriate metadata for this design file:`;
      }
      // Modify prompt for video files
      else if (originalIsVideo) {
        prompt = `${prohibitedWordsInstructions}${transparentBgInstructions}${isolatedOnTransparentBgInstructions}${silhouetteInstructions}This is a thumbnail from a video file named "${originalFilename}". Analyze this thumbnail and generate metadata suitable for a video:`;
      }
      
      if (generationMode === 'imageToPrompt') {
        if (originalIsEps) {
          prompt = `${prohibitedWordsInstructions}${transparentBgInstructions}${isolatedOnTransparentBgInstructions}${silhouetteInstructions}This is metadata extracted from an EPS file named "${originalFilename}". The metadata includes information like title, creator, document type (${epsMetadata?.documentType || 'Vector Design'}), and content details. Generate a detailed description of what this design file likely contains. 
          
Image Count: ${epsMetadata?.imageCount || 1}
Colors: ${epsMetadata?.colors?.join(', ') || 'Unknown'}
Fonts: ${epsMetadata?.fontInfo?.join(', ') || 'Unknown'}

The description should be at least 50 words but not more than 150 words. Important: Do not include phrases like "Vector EPS" or "EPS file" or "Vector file" in the description itself - just describe the content.`;
        } else if (originalIsVideo) {
          prompt = `${prohibitedWordsInstructions}${transparentBgInstructions}${isolatedOnTransparentBgInstructions}${silhouetteInstructions}This is a thumbnail from a video file named "${originalFilename}". Generate a detailed description of what this video appears to contain based on this frame. Include details about content, style, colors, movement, and composition. The description should be at least 50 words but not more than 150 words.`;
        } else {
          prompt = `${prohibitedWordsInstructions}${transparentBgInstructions}${isolatedOnTransparentBgInstructions}${silhouetteInstructions}Generate a detailed prompt description to recreate this image with an AI image generator. Include details about content, style, colors, lighting, and composition. The prompt should be at least 50 words but not more than 150 words.`;
        }
      } else if (isFreepikOnly) {
        if (originalIsEps) {
          prompt = `${prohibitedWordsInstructions}${transparentBgInstructions}${isolatedOnTransparentBgInstructions}${silhouetteInstructions}This is metadata extracted from an EPS file named "${originalFilename}". The metadata includes the following information:

Document Type: ${epsMetadata?.documentType || 'Vector Design'}
Image Count: ${epsMetadata?.imageCount || 1}
Colors: ${epsMetadata?.colors?.join(', ') || 'Unknown'}
Fonts: ${epsMetadata?.fontInfo?.join(', ') || 'Unknown'}

Generate metadata for the Freepik platform:
1. A clear, descriptive title between ${minTitleWords}-${maxTitleWords} words that accurately describes what's likely in this design file. The title should be relevant for stock image platforms. Don't use any symbols.
2. Create an image generation prompt that describes this design file in 1-2 sentences (30-50 words). Important: Do not include phrases like "Vector EPS" or "EPS file" or "Vector file" in the prompt itself - just describe the content.
3. Generate a detailed list of ${minKeywords}-${maxKeywords} relevant, specific keywords (single words or short phrases) that someone might search for to find this design. Focus on content, style, and technical aspects of the design.`;
        } else {
          prompt = `${prohibitedWordsInstructions}${transparentBgInstructions}${isolatedOnTransparentBgInstructions}${silhouetteInstructions}Analyze this image and generate metadata for the Freepik platform:
1. A clear, descriptive title between ${minTitleWords}-${maxTitleWords} words that accurately describes what's in the image. The title should be relevant for stock image platforms. Don't use any symbols.
2. Create an image generation prompt that describes this image in 1-2 sentences (30-50 words).
3. Generate a detailed list of ${minKeywords}-${maxKeywords} relevant, specific keywords (single words or short phrases) that someone might search for to find this image. Focus on content, style, emotions, and technical details of the image.`;
        }
      } else if (isShutterstock) {
        if (originalIsEps) {
          prompt = `${prohibitedWordsInstructions}${transparentBgInstructions}${isolatedOnTransparentBgInstructions}${silhouetteInstructions}This is metadata extracted from an EPS file named "${originalFilename}". The metadata includes the following information:

Document Type: ${epsMetadata?.documentType || 'Vector Design'}
Image Count: ${epsMetadata?.imageCount || 1}
Colors: ${epsMetadata?.colors?.join(', ') || 'Unknown'}
Fonts: ${epsMetadata?.fontInfo?.join(', ') || 'Unknown'}

Generate metadata for the Shutterstock platform:
1. A clear, descriptive detailed description that's between ${minDescriptionWords}-${maxDescriptionWords} words about what's likely in this design file. Important: Do not include phrases like "Vector EPS" or "EPS file" or "Vector file" in the description itself - just describe the content.
2. A list of ${minKeywords}-${maxKeywords} relevant, specific keywords (single words or short phrases) that someone might search for to find this design.`;
        } else {
          prompt = `${prohibitedWordsInstructions}${transparentBgInstructions}${isolatedOnTransparentBgInstructions}${silhouetteInstructions}Analyze this image and generate metadata for the Shutterstock platform:
1. A clear, descriptive detailed description that's between ${minDescriptionWords}-${maxDescriptionWords} words.
2. A list of ${minKeywords}-${maxKeywords} relevant, specific keywords (single words or short phrases) that someone might search for to find this image.`;
        }
      } else if (isAdobeStock) {
        if (originalIsEps) {
          prompt = `${prohibitedWordsInstructions}${transparentBgInstructions}${isolatedOnTransparentBgInstructions}${silhouetteInstructions}This is metadata extracted from an EPS file named "${originalFilename}". The metadata includes the following information:

Document Type: ${epsMetadata?.documentType || 'Vector Design'}
Image Count: ${epsMetadata?.imageCount || 1}
Colors: ${epsMetadata?.colors?.join(', ') || 'Unknown'}
Fonts: ${epsMetadata?.fontInfo?.join(', ') || 'Unknown'}

Generate metadata for Adobe Stock:
1. A clear, descriptive title between ${minTitleWords}-${maxTitleWords} words about what's likely in this design file. Don't use any symbols or phrases like "Vector EPS" or "EPS file".
2. A list of ${minKeywords}-${maxKeywords} relevant, specific keywords (single words or short phrases) that someone might search for to find this design.`;
        } else {
          prompt = `${prohibitedWordsInstructions}${transparentBgInstructions}${isolatedOnTransparentBgInstructions}${silhouetteInstructions}Analyze this image and generate metadata for Adobe Stock:
1. A clear, descriptive title between ${minTitleWords}-${maxTitleWords} words. Don't use any symbols.
2. A list of ${minKeywords}-${maxKeywords} relevant, specific keywords (single words or short phrases) that someone might search for to find this image.`;
        }
      } else {
        if (originalIsVideo) {
          prompt = `${prohibitedWordsInstructions}${transparentBgInstructions}${isolatedOnTransparentBgInstructions}${silhouetteInstructions}This is a thumbnail from a video file named "${originalFilename}". Analyze this thumbnail and generate metadata suitable for a video:
1. A clear, descriptive title between ${minTitleWords}-${maxTitleWords} words that accurately describes what's in the video. Don't use any symbols.
2. A list of ${minKeywords}-${maxKeywords} relevant, specific keywords (single words or short phrases) that someone might search for to find this video.
3. A category number between 1-10, where:
   1=Animations, 2=Backgrounds, 3=Business, 4=Education, 5=Food, 6=Lifestyle, 7=Nature, 8=Presentations, 9=Technology, 10=Other`;
        } else if (originalIsEps) {
          prompt = `${prohibitedWordsInstructions}${transparentBgInstructions}${isolatedOnTransparentBgInstructions}${silhouetteInstructions}This is metadata extracted from an EPS file named "${originalFilename}". The metadata includes the following information:

Document Type: ${epsMetadata?.documentType || 'Vector Design'}
Image Count: ${epsMetadata?.imageCount || 1}
Colors: ${epsMetadata?.colors?.join(', ') || 'Unknown'}
Fonts: ${epsMetadata?.fontInfo?.join(', ') || 'Unknown'}

Generate appropriate metadata for this design file:
1. A clear, descriptive title between ${minTitleWords}-${maxTitleWords} words that accurately describes what's likely in this design file. Don't use any symbols.
2. A detailed description that's between ${minDescriptionWords}-${maxDescriptionWords} words. Important: Do not include phrases like "Vector EPS" or "EPS file" or "Vector file" in the description itself - just describe the content.
3. A list of ${minKeywords}-${maxKeywords} relevant, specific keywords (single words or short phrases) that someone might search for to find this design.`;
        } else {
          prompt = `${prohibitedWordsInstructions}${transparentBgInstructions}${isolatedOnTransparentBgInstructions}${silhouetteInstructions}Analyze this image and generate:
1. A clear, descriptive title between ${minTitleWords}-${maxTitleWords} words. Don't use any symbols.
2. A detailed description that's between ${minDescriptionWords}-${maxDescriptionWords} words.
3. A list of ${minKeywords}-${maxKeywords} relevant, specific keywords (single words or short phrases) that someone might search for to find this image.`;
        }
      }
      
      if (generationMode === 'imageToPrompt') {
        prompt += `\n\nReturn the prompt description only, nothing else.`;
      } else if (isFreepikOnly) {
        prompt += `\n\nFormat your response as a JSON object with the fields "title", "prompt", and "keywords" (as an array of at least ${minKeywords} terms).`;
      } else if (isShutterstock) {
        prompt += `\n\nFormat your response as a JSON object with the fields "description" and "keywords" (as an array).`;
      } else if (isAdobeStock) {
        prompt += `\n\nFormat your response as a JSON object with the fields "title" and "keywords" (as an array).`;
      } else {
        if (originalIsVideo) {
          prompt += `\n\nFormat your response as a JSON object with the fields "title", "keywords" (as an array), and "category" (as a number from 1-10).`;
        } else {
          prompt += `\n\nFormat your response as a JSON object with the fields "title", "description", and "keywords" (as an array).`;
        }
      }
    }
    
    // Make API request with retry logic for rate limiting
    const MAX_RETRIES = 5;
    let retryCount = 0;
    let response;
    
    while (retryCount <= MAX_RETRIES) {
      try {
        // Updated to use the newer Gemini 2.5 Flash-Lite Preview 06-17model
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-robotics-er-1.5-preview:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  // For EPS files, send the metadata as text without inline_data
                  ...(originalIsEps 
                    ? [{ text: base64Image }] 
                    : [{
                        inline_data: {
                          mime_type: fileToProcess.type,
                          data: base64Image.split(',')[1],
                        },
                      }]
                  ),
                ],
              },
            ],
            generationConfig: {
              temperature: 0.4,
              topK: 32,
              topP: 0.95,
              maxOutputTokens: 1024,
            },
          }),
        });
        
        // Check for rate limiting responses
        if (response.status === 429 || response.status === 503) {
          retryCount++;
          if (retryCount <= MAX_RETRIES) {
            // Apply exponential backoff
            const delay = Math.min(2000 * Math.pow(2, retryCount), 60000);
            console.log(`Rate limit hit. Backing off for ${delay/1000} seconds before retry #${retryCount}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue; // Try again
          }
        }
        
        // Break the loop if we got a response
        break;
      } catch (error) {
        retryCount++;
        if (retryCount <= MAX_RETRIES && error instanceof Error && 
            (error.message.includes('429') || error.message.includes('Too Many Requests'))) {
          // Apply exponential backoff for network errors that might be rate limiting
          const delay = Math.min(2000 * Math.pow(2, retryCount), 60000);
          console.log(`Network error (possible rate limit). Backing off for ${delay/1000} seconds before retry #${retryCount}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue; // Try again
        }
        
        // For other errors or if max retries reached, rethrow
        throw error;
      }
    }
    
    if (!response || !response.ok) {
      const errorData = await response.json();
      console.error('API error:', errorData);
      throw new Error(errorData?.error?.message || 'Failed to analyze image');
    }

    const data = await response.json();
    const text = data.candidates[0]?.content?.parts[0]?.text || '';
    
    // For image-to-prompt mode, just return the description
    if (generationMode === 'imageToPrompt') {
      return {
        title: '',
        description: text.trim(),
        keywords: [],
        filename: originalFilename,
        isVideo: originalIsVideo,
        isEps: originalIsEps
      };
    }
    
    // Extract JSON from the response text
    let jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || 
                    text.match(/```\n([\s\S]*?)\n```/) ||
                    text.match(/\{[\s\S]*\}/);
                    
    let jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
    
    // Clean up potential garbage around the JSON object
    jsonStr = jsonStr.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
    
    let result;
    try {
      result = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse JSON from response:', jsonStr);
      console.error('Original response:', text);
      throw new Error('Failed to parse metadata from the API response');
    }
    
    // Ensure titles don't have symbols and only the first word is capitalized
    if (result.title) {
      result.title = capitalizeFirstWord(removeSymbolsFromTitle(result.title));
    }
    
    // Post-process for transparent background if enabled
    if (transparentBgEnabled) {
      // Add "isolated on white background" to the title if not already present
      if (result.title && !result.title.toLowerCase().includes('isolated on white background')) {
        result.title = result.title.trim() + ' isolated on white background';
      }
      
      // Add "transparent background" to keywords if not already present
      if (result.keywords && !result.keywords.some(k => k.toLowerCase().includes('white background'))) {
        result.keywords.push('white background');
      }
      
      // Mention transparent background in description if not already mentioned
      if (result.description && !result.description.toLowerCase().includes('isolated white background')) {
        result.description = result.description.trim() + '';
      }
    }
    
    // Post-process for isolated on transparent background if enabled
    if (isolatedOnTransparentBgEnabled) {
      // Add "isolated on transparent background" to the title if not already present
      if (result.title && !result.title.toLowerCase().includes('isolated on transparent background')) {
        result.title = result.title.trim() + ' isolated on transparent background';
      }
      
      // Add "transparent background" to keywords if not already present
      if (result.keywords && !result.keywords.some(k => k.toLowerCase().includes('transparent background'))) {
        result.keywords.push('transparent background');
      }
      
      // Mention transparent background in description if not already mentioned
      if (result.description && !result.description.toLowerCase().includes('transparent background')) {
        result.description = result.description.trim() + '';
      }
    }
    
    // Post-process for silhouette if enabled
    if (silhouetteEnabled) {
      // Add "silhouette" to the title if not already present
      if (result.title && !result.title.toLowerCase().includes('silhouette')) {
        result.title = result.title.trim() + ' silhouette';
      }
      
      // Add "silhouette" to keywords if not already present
      if (result.keywords && !result.keywords.some(k => k.toLowerCase().includes('silhouette'))) {
        result.keywords.push('silhouette');
      }
      
      // Mention silhouette in description if not already mentioned
      if (result.description && !result.description.toLowerCase().includes('silhouette')) {
        result.description = result.description.trim() + ' This image features a striking silhouette design, perfect for creating a bold visual impact.';
      }
    }
    
    // Post-process for single word keywords if enabled
    if (singleWordKeywordsEnabled && result.keywords && result.keywords.length > 0) {
      // Convert multi-word keywords to individual words
      const singleWordKeywords: string[] = [];
      
      for (const keyword of result.keywords) {
        // Split keyword phrases into individual words
        const words = keyword
          .split(/\s+/)
          .map(word => word.trim())
          .filter(word => word.length > 0 && !singleWordKeywords.includes(word));
        
        // Add individual words to the list
        singleWordKeywords.push(...words);
      }
      
      // Remove duplicates and ensure we don't exceed maxKeywords
      result.keywords = [...new Set(singleWordKeywords)].slice(0, maxKeywords);
    }
    
    // Ensure we have enough keywords for all platforms and custom prompts
    if (result.keywords && result.keywords.length < minKeywords) {
      console.log('Not enough keywords provided, generating more...');
      
      // For custom prompts or any platform, generate additional keywords if needed
      if (customPromptEnabled || (!isFreepikOnly && !isShutterstock && !isAdobeStock)) {
        // Use title and description to generate more keywords
        const contentForKeywords = [
          result.title || '',
          result.description || '',
          result.keywords.join(', ')
        ].join(' ');
        
        // Use the existing Freepik keyword generator as a fallback
        const additionalKeywords = getRelevantFreepikKeywords(contentForKeywords);
        
        // Combine existing keywords with new ones, remove duplicates
        const combinedKeywords = [...new Set([...result.keywords, ...additionalKeywords])];
        
        // Use the combined list, up to maxKeywords
        result.keywords = combinedKeywords.slice(0, maxKeywords);
      }
    }
    
    // Post-process to filter out prohibited words if provided and enabled
    if (prohibitedWordsEnabled && prohibitedWords.trim()) {
      const prohibitedWordsArray = prohibitedWords
        .split(',')
        .map(word => word.trim().toLowerCase())
        .filter(word => word.length > 0);
      
      if (prohibitedWordsArray.length > 0) {
        // Filter keywords
        if (result.keywords && result.keywords.length > 0) {
          result.keywords = result.keywords.filter(keyword => {
            const lowerKeyword = keyword.toLowerCase();
            return !prohibitedWordsArray.some(prohibited => lowerKeyword.includes(prohibited));
          });
          
          // If we filtered too many keywords, generate replacements
          if (result.keywords.length < minKeywords) {
            const additionalKeywords = getRelevantFreepikKeywords(result.title || '' + ' ' + (result.description || ''));
            const filteredAdditionalKeywords = additionalKeywords.filter(keyword => {
              const lowerKeyword = keyword.toLowerCase();
              return !prohibitedWordsArray.some(prohibited => lowerKeyword.includes(prohibited));
            });
            
            // Add filtered additional keywords
            result.keywords = [...new Set([...result.keywords, ...filteredAdditionalKeywords])].slice(0, maxKeywords);
          }
        }
      }
    }
    
    // For Freepik, use the keywords provided directly from the API response
    if (isFreepikOnly) {
      // If keywords exist in the result, use them
      if (!result.keywords || result.keywords.length < minKeywords) {
        // Fallback: Generate keywords from the prompt if not enough keywords provided
        const freepikKeywords = getRelevantFreepikKeywords(result.prompt || '');
        result.keywords = freepikKeywords;
      }
      result.baseModel = "leonardo";
    }
    
    // For Shutterstock, suggest categories based on content
    if (isShutterstock) {
      result.categories = suggestCategoriesForShutterstock(
        result.title || '', 
        result.description || ''
      );
    }
    
    // For Adobe Stock, suggest categories based on content
    if (isAdobeStock) {
      result.categories = suggestCategoriesForAdobeStock(
        result.title || '',
        result.keywords || []
      );
    }
    
    // For video-specific responses
    if (originalIsVideo) {
      // Extract category from Gemini result if provided, otherwise determine it from content
      let videoCategory: number;
      
      if (result.category && typeof result.category === 'number' && result.category >= 1 && result.category <= 21) {
        videoCategory = result.category;
      } else {
        // If Gemini didn't provide a valid category, determine it from the content
        videoCategory = determineVideoCategory(
          result.title || '',
          result.description || '',
          result.keywords || []
        );
      }
      
      return {
        title: result.title || '',
        description: result.description || '',
        keywords: result.keywords || [],
        category: videoCategory,
        filename: originalFilename,
        isVideo: true,
        isEps: false,
        ...(!isFreepikOnly && !isShutterstock && !isAdobeStock ? { categories: result.categories } : {}),
      };
    }
    
    // For EPS-specific responses
    if (originalIsEps) {
      return {
        title: result.title || '',
        description: result.description || '',
        keywords: result.keywords || [],
        prompt: result.prompt,
        baseModel: result.baseModel || "leonardo",
        categories: result.categories,
        filename: originalFilename,
        isVideo: false,
        isEps: true,
      };
    }
    
    return {
      title: result.title || '',
      description: result.description || '',
      keywords: result.keywords || [],
      prompt: result.prompt,
      baseModel: result.baseModel || "leonardo",
      categories: result.categories,
      filename: originalFilename,
      isVideo: false,
      isEps: false,
    };
  } catch (error) {
    console.error('Processing error:', error instanceof Error ? error.message : 'Unknown error');
    
    return {
      title: '',
      description: '',
      keywords: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      isVideo: isVideoFile(imageFile),
      isEps: isEpsFile(imageFile),
      filename: imageFile.name,
    };
  }
}
// Helper function to convert file to base64
function fileToBase64(file: File): Promise<string> {
  // For text files (like our EPS metadata), read as text instead of binary
  if (file.type === 'text/plain') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }
  
  // For image files, proceed as usual with dataURL
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

/**
 * Helper function to wait with exponential backoff for rate limiting
 * @param retryCount Current retry attempt number
 * @returns Promise that resolves after the backoff period
 */
async function exponentialBackoff(retryCount: number): Promise<void> {
  // Start with 2 seconds, then 4, 8, 16, etc. up to 60 seconds max
  const delay = Math.min(2000 * Math.pow(2, retryCount), 60000);
  console.log(`Rate limit hit. Backing off for ${delay/1000} seconds before retry #${retryCount + 1}`);
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Process multiple images in a single batch (up to 50 images per API call)
 */
export async function analyzeImagesInBatch(
  imageFiles: File[],
  apiKey: string,
  options: AnalysisOptions = {}
): Promise<AnalysisResult[]> {
  // Adjust batch size based on file sizes to prevent API errors
  let MAX_BATCH_SIZE = 10; // Reduce default batch size to avoid rate limits
  
  // Calculate total size of all files
  const totalSizeMB = imageFiles.reduce((sum, file) => sum + file.size / (1024 * 1024), 0);
  console.log(`Total size of all files: ${totalSizeMB.toFixed(2)} MB`);
  
  // Adjust batch size based on total file size
  if (totalSizeMB > 20) {
    MAX_BATCH_SIZE = 5; // Smaller batch for very large uploads
    console.log(`Large upload detected (${totalSizeMB.toFixed(2)} MB). Reducing batch size to ${MAX_BATCH_SIZE}`);
  } else if (totalSizeMB > 10) {
    MAX_BATCH_SIZE = 8; // Medium batch for moderate uploads
    console.log(`Medium upload detected (${totalSizeMB.toFixed(2)} MB). Reducing batch size to ${MAX_BATCH_SIZE}`);
  }
  
  // Further reduce batch size if there are many large files
  const largeFiles = imageFiles.filter(file => file.size > 2 * 1024 * 1024).length;
  if (largeFiles > 5) {
    MAX_BATCH_SIZE = Math.min(MAX_BATCH_SIZE, 3);
    console.log(`Many large files detected (${largeFiles} files > 2MB). Reducing batch size to ${MAX_BATCH_SIZE}`);
  }
  
  // For extremely large uploads or many files, process one by one to avoid JSON parsing errors
  if (totalSizeMB > 50 || imageFiles.length > 50) {
    console.log(`Very large upload detected. Processing images individually to avoid errors.`);
    
    // Process each image individually
    const allResults: AnalysisResult[] = [];
    
    for (let i = 0; i < imageFiles.length; i++) {
      try {
        // Reduce image size before processing
        const reducedFile = await reduceImageSize(imageFiles[i]);
        
        // Add retry logic for rate limiting
        let result: AnalysisResult | null = null;
        let retryCount = 0;
        const MAX_RETRIES = 5;
        
        while (retryCount < MAX_RETRIES) {
          try {
            result = await analyzeImageWithGemini(reducedFile, apiKey, options);
            break; // Success, exit retry loop
          } catch (error) {
            if (error instanceof Error && 
                (error.message.includes("429") || 
                 error.message.includes("Too Many Requests") || 
                 error.message.includes("Resource has been exhausted"))) {
              // Rate limit hit, apply exponential backoff
              retryCount++;
              if (retryCount < MAX_RETRIES) {
                await exponentialBackoff(retryCount);
                continue; // Try again
              }
            }
            // For other errors or if max retries reached, rethrow
            throw error;
          }
        }
        
        if (!result) {
          throw new Error("Failed to process image after multiple retries");
        }
        
        // Add index to result for consistent behavior with batch processing
        result.index = i;
        // Make sure we preserve the original filename
        result.filename = imageFiles[i].name;
        allResults.push(result);
        
        // Add a small delay between requests to avoid rate limiting
        // Increase delay as we process more files to avoid hitting limits
        const baseDelay = 1000; // 1 second base delay
        const progressiveDelay = baseDelay + (i * 50); // Add 50ms for each file processed
        await new Promise(resolve => setTimeout(resolve, progressiveDelay));
        
        // Log progress
        console.log(`Processed ${i + 1}/${imageFiles.length} images (${Math.round((i + 1) / imageFiles.length * 100)}%)`);
      } catch (error) {
        console.error(`Error processing file ${imageFiles[i].name}:`, error);
        allResults.push({
          title: '',
          description: '',
          keywords: [],
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          isVideo: isVideoFile(imageFiles[i]),
          isEps: isEpsFile(imageFiles[i]),
          filename: imageFiles[i].name,
          index: i
        });
      }
    }
    
    return allResults;
  }
  
  const batches: File[][] = [];
  
  // Split images into batches
  for (let i = 0; i < imageFiles.length; i += MAX_BATCH_SIZE) {
    batches.push(imageFiles.slice(i, i + MAX_BATCH_SIZE));
  }
  
  console.log(`Processing ${imageFiles.length} files in ${batches.length} batches of up to ${MAX_BATCH_SIZE} files each`);
  
  // Process each batch and collect results
  const allResults: AnalysisResult[] = [];
  
  // Process each batch using the existing batch processing logic
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`Processing batch ${batchIndex + 1} of ${batches.length} (${batch.length} files)`);
    
    try {
      // Always process individually for better reliability
      console.log('Processing files individually for better reliability');
      
      // Process files individually
      for (let i = 0; i < batch.length; i++) {
        const file = batch[i];
        const globalIndex = batchIndex * MAX_BATCH_SIZE + i;
        
        try {
          // Reduce image size before processing
          const reducedFile = await reduceImageSize(file);
          
          // Add retry logic for rate limiting
          let result: AnalysisResult | null = null;
          let retryCount = 0;
          const MAX_RETRIES = 5;
          
          while (retryCount < MAX_RETRIES) {
            try {
              result = await analyzeImageWithGemini(reducedFile, apiKey, options);
              break; // Success, exit retry loop
            } catch (error) {
              if (error instanceof Error && 
                  (error.message.includes("429") || 
                   error.message.includes("Too Many Requests") || 
                   error.message.includes("Resource has been exhausted"))) {
                // Rate limit hit, apply exponential backoff
                retryCount++;
                if (retryCount < MAX_RETRIES) {
                  await exponentialBackoff(retryCount);
                  continue; // Try again
                }
              }
              // For other errors or if max retries reached, rethrow
              throw error;
            }
          }
          
          if (!result) {
            throw new Error("Failed to process image after multiple retries");
          }
          
          result.index = globalIndex;
          // Make sure we preserve the original filename
          result.filename = file.name;
          allResults.push(result);
          
          // Log progress
          const overallProgress = batchIndex * MAX_BATCH_SIZE + i + 1;
          const totalFiles = imageFiles.length;
          console.log(`Processed ${overallProgress}/${totalFiles} images (${Math.round(overallProgress / totalFiles * 100)}%)`);
          
          // Add a progressive delay between requests to avoid rate limiting
          // Increase delay as we process more files
          const baseDelay = 1000; // 1 second base delay
          const progressiveDelay = baseDelay + (overallProgress * 50); // Add 50ms for each file processed
          
          if (i < batch.length - 1) {
            await new Promise(resolve => setTimeout(resolve, progressiveDelay));
          }
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          allResults.push({
            title: '',
            description: '',
            keywords: [],
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            isVideo: isVideoFile(file),
            isEps: isEpsFile(file),
            filename: file.name,
            index: globalIndex
          });
        }
      }
    } catch (error) {
      console.error(`Error processing batch ${batchIndex + 1}:`, error);
      
      // Add error results for all files in this batch
      for (let i = 0; i < batch.length; i++) {
        const file = batch[i];
        const globalIndex = batchIndex * MAX_BATCH_SIZE + i;
        
        allResults.push({
          title: '',
          description: '',
          keywords: [],
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          isVideo: isVideoFile(file),
          isEps: isEpsFile(file),
          filename: file.name,
          index: globalIndex
        });
      }
    }
    
    // Add a longer delay between batches to avoid rate limiting
    if (batchIndex < batches.length - 1) {
      const batchDelay = 3000 + (batchIndex * 1000); // Increase delay for each batch
      console.log(`Waiting ${batchDelay/1000} seconds before processing next batch...`);
      await new Promise(resolve => setTimeout(resolve, batchDelay));
    }
  }
  
  console.log('Final batch processing results:', allResults);
  return allResults;
}

