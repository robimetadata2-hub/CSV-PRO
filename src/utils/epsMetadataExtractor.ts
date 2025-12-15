/**
 * Utility for extracting metadata from EPS (Encapsulated PostScript) files
 * This is necessary because Gemini API doesn't support EPS format directly
 */

/**
 * Checks if a file is an EPS file
 */
export function isEpsFile(file: File): boolean {
  return (
    file.type === 'application/postscript' || 
    file.type === 'application/eps' || 
    file.type === 'application/x-eps' ||
    file.type === 'image/eps' ||
    file.name.toLowerCase().endsWith('.eps')
  );
}

/**
 * Represents metadata extracted from an EPS file
 */
export interface EpsMetadata {
  title?: string;
  creator?: string;
  creationDate?: string;
  boundingBox?: string;
  documentStructuringConventions?: Record<string, string>;
  isEps: boolean;
  filename: string;
  fileSize: number;
  extractedText: string;
  imageCount?: number;
  fontInfo?: string[];
  colors?: string[];
  documentType?: string;
}

/**
 * Extracts metadata from an EPS file
 * @param epsFile - The EPS file to extract metadata from
 * @returns A Promise that resolves to an EpsMetadata object
 */
export async function extractEpsMetadata(epsFile: File): Promise<EpsMetadata> {
  // Read the EPS file as text
  const epsText = await readEpsFileAsText(epsFile);
  
  // Initialize metadata object
  const metadata: EpsMetadata = {
    isEps: true,
    filename: epsFile.name,
    fileSize: epsFile.size,
    extractedText: epsText,
    documentStructuringConventions: {}
  };
  
  // Extract Document Structuring Conventions (DSC) comments
  const dscComments = extractDscComments(epsText);
  
  // Map specific DSC comments to metadata fields
  metadata.title = dscComments['Title'];
  metadata.creator = dscComments['Creator'] || dscComments['Author'];
  metadata.creationDate = dscComments['CreationDate'] || dscComments['ModDate'];
  metadata.boundingBox = dscComments['BoundingBox'];
  
  // Store all DSC comments in the metadata
  metadata.documentStructuringConventions = dscComments;
  
  // Extract file information from the filename to help with content identification
  metadata.documentType = inferDocumentTypeFromFilename(epsFile.name);
  
  // Try to extract additional useful information from the content
  metadata.imageCount = countImageInstances(epsText);
  metadata.fontInfo = extractFontInformation(epsText);
  metadata.colors = extractColorInformation(epsText);
  
  return metadata;
}

/**
 * Helper function to infer the document type from filename
 * This helps provide better context for content identification
 */
function inferDocumentTypeFromFilename(filename: string): string {
  const lowerName = filename.toLowerCase();
  
  // Pattern matching for common design types in filenames
  if (lowerName.includes('icon') || lowerName.includes('icons')) return 'Icon Set';
  if (lowerName.includes('logo')) return 'Logo Design';
  if (lowerName.includes('pattern') || lowerName.includes('texture')) return 'Pattern/Texture';
  if (lowerName.includes('background') || lowerName.includes('bg')) return 'Background';
  if (lowerName.includes('banner') || lowerName.includes('ad')) return 'Banner/Advertisement';
  if (lowerName.includes('chart') || lowerName.includes('graph') || lowerName.includes('diagram')) return 'Chart/Diagram';
  if (lowerName.includes('flyer') || lowerName.includes('brochure')) return 'Flyer/Brochure';
  if (lowerName.includes('infographic')) return 'Infographic';
  if (lowerName.includes('illustration') || lowerName.includes('drawing')) return 'Illustration';
  if (lowerName.includes('character') || lowerName.includes('mascot')) return 'Character Design';
  if (lowerName.includes('set') || lowerName.includes('bundle') || lowerName.includes('collection')) return 'Graphic Set/Collection';
  if (lowerName.includes('frame') || lowerName.includes('border')) return 'Frame/Border Design';
  if (lowerName.includes('card') || lowerName.includes('invitation')) return 'Card/Invitation';
  
  // Check for shapes and elements
  if (lowerName.includes('shape') || lowerName.includes('element')) return 'Graphic Elements';
  
  // Check for specific themes
  if (lowerName.includes('abstract')) return 'Abstract Design';
  if (lowerName.includes('floral') || lowerName.includes('flower')) return 'Floral Design';
  if (lowerName.includes('food') || lowerName.includes('drink')) return 'Food/Drink Illustration';
  if (lowerName.includes('animal') || lowerName.includes('nature')) return 'Nature/Animal Illustration';
  
  // Default value if no patterns match
  return 'Vector Design';
}

/**
 * Counts approximate number of image instances in the EPS content
 * Helps determine if it's a single illustration or a set
 */
function countImageInstances(epsText: string): number {
  // Various patterns that might indicate separate images within an EPS file
  const patterns = [
    /begincmap/gi, // Start of character mappings
    /begincodespacerange/gi, // Start of code space range
    /%%Page:/gi, // Page separators in multi-page documents
    /gsave/gi, // Graphics state save (often used before drawing a new element)
    /showpage/gi // Show page command (typically marks the end of a page or image)
  ];
  
  // Count occurrences of patterns that might indicate separate images
  let instanceCount = 1; // Default to at least 1 image
  
  // Check for multiple page indicators
  const pageMatches = epsText.match(/%%Page:.*?(\d+)/g);
  if (pageMatches && pageMatches.length > 0) {
    return pageMatches.length;
  }
  
  // Check if there are multiple "save/restore" blocks, which often indicate multiple objects
  const saveRestorePairs = Math.min(
    (epsText.match(/gsave/g) || []).length,
    (epsText.match(/grestore/g) || []).length
  );
  
  if (saveRestorePairs > 5) { // Threshold to consider it a set of images
    instanceCount = Math.min(Math.ceil(saveRestorePairs / 3), 20); // Estimate, capped at 20
  }
  
  return instanceCount;
}

/**
 * Extracts font information from the EPS content
 */
function extractFontInformation(epsText: string): string[] {
  const fontInfo: string[] = [];
  
  // Match font definitions and entries
  const fontMatches = epsText.match(/\/[A-Za-z0-9]+(Bold|Italic|Regular|Medium|Light|Condensed|Expanded)?( |\n|\r)+(?:findfont|scalefont|makefont)/g);
  
  if (fontMatches) {
    // Extract unique font names
    const uniqueFonts = new Set<string>();
    
    fontMatches.forEach(match => {
      // Remove the leading slash and any commands after the font name
      const fontName = match.split(/\s+/)[0].replace(/^\//, '');
      uniqueFonts.add(fontName);
    });
    
    fontInfo.push(...Array.from(uniqueFonts));
  }
  
  return fontInfo;
}

/**
 * Extracts color information from the EPS content
 */
function extractColorInformation(epsText: string): string[] {
  const colors: string[] = [];
  const colorSet = new Set<string>();
  
  // Check for CMYK color definitions (common in print designs)
  const cmykMatches = epsText.match(/(\d*\.\d+|\d+) (\d*\.\d+|\d+) (\d*\.\d+|\d+) (\d*\.\d+|\d+) (CMYK|setcmykcolor)/g);
  if (cmykMatches && cmykMatches.length > 0) {
    colorSet.add('CMYK Color Model');
  }
  
  // Check for RGB color definitions
  const rgbMatches = epsText.match(/(\d*\.\d+|\d+) (\d*\.\d+|\d+) (\d*\.\d+|\d+) (RGB|setrgbcolor)/g);
  if (rgbMatches && rgbMatches.length > 0) {
    colorSet.add('RGB Color Model');
  }
  
  // Check for grayscale
  const grayMatches = epsText.match(/(\d*\.\d+|\d+) (setgray)/g);
  if (grayMatches && grayMatches.length > 0) {
    colorSet.add('Grayscale');
  }
  
  // Add color profiles if defined
  if (epsText.includes('ICC Profile')) {
    colorSet.add('ICC Color Profile');
  }
  
  // Check for common color keywords
  const colorKeywords = [
    'black', 'white', 'red', 'green', 'blue', 'yellow', 'cyan', 
    'magenta', 'purple', 'orange', 'pink', 'brown', 'gray', 'grey'
  ];
  
  for (const color of colorKeywords) {
    const regex = new RegExp(`\\b${color}\\b`, 'i');
    if (regex.test(epsText)) {
      colorSet.add(color.charAt(0).toUpperCase() + color.slice(1));
    }
  }
  
  // Convert set to array
  colors.push(...Array.from(colorSet));
  
  return colors;
}

/**
 * Helper function to read an EPS file as text
 */
function readEpsFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Extracts Document Structuring Conventions (DSC) comments from an EPS file
 * @param epsText - The EPS file content as text
 * @returns An object mapping DSC comment names to their values
 */
function extractDscComments(epsText: string): Record<string, string> {
  const dscComments: Record<string, string> = {};
  
  // Regular expression to match DSC comments
  // DSC comments start with %% followed by a keyword and optional value
  const dscRegex = /%%([\w]+)(?::\s*(.*))?$/gm;
  
  let match;
  while ((match = dscRegex.exec(epsText)) !== null) {
    const [, key, value] = match;
    if (key && value) {
      dscComments[key] = value.trim();
    } else if (key) {
      dscComments[key] = '';
    }
  }
  
  // Try to extract title from Comments if not found in Title
  if (!dscComments['Title'] && dscComments['Comments']) {
    const potentialTitle = dscComments['Comments'].split('.')[0];
    if (potentialTitle && potentialTitle.length > 5 && potentialTitle.length < 100) {
      dscComments['ExtractedTitle'] = potentialTitle.trim();
    }
  }
  
  return dscComments;
}

/**
 * Serializes EPS metadata to a format suitable for the Gemini API
 * @param metadata - The EPS metadata to serialize
 * @returns A string representation of the metadata
 */
export function serializeEpsMetadata(metadata: EpsMetadata): string {
  // Create a formatted text representation instead of JSON
  const sections = [
    `EPS FILE METADATA`,
    `================`,
    ``,
    `Filename: ${metadata.filename}`,
    `File Size: ${Math.round(metadata.fileSize / 1024)} KB`,
    `Document Type: ${metadata.documentType || 'Vector Design'}`,
    `Approximate Image Count: ${metadata.imageCount || 1}`,
    ``,
    `DOCUMENT PROPERTIES`,
    `------------------`,
    `Title: ${metadata.title || metadata.documentStructuringConventions?.['ExtractedTitle'] || extractTitleFromFilename(metadata.filename)}`,
    `Creator: ${metadata.creator || 'Unknown'}`,
    `Creation Date: ${metadata.creationDate || 'Unknown'}`,
    `Bounding Box: ${metadata.boundingBox || 'Unknown'}`,
    ``
  ];
  
  // Add color information if available
  if (metadata.colors && metadata.colors.length > 0) {
    sections.push('COLOR INFORMATION');
    sections.push('----------------');
    metadata.colors.forEach(color => {
      sections.push(`- ${color}`);
    });
    sections.push('');
  }
  
  // Add font information if available
  if (metadata.fontInfo && metadata.fontInfo.length > 0) {
    sections.push('FONT INFORMATION');
    sections.push('---------------');
    metadata.fontInfo.forEach(font => {
      sections.push(`- ${font}`);
    });
    sections.push('');
  }
  
  sections.push(`DOCUMENT CONTENT PREVIEW`);
  sections.push(`----------------------`);
  
  // Extract and clean up the text content for a better preview
  let contentPreview = metadata.extractedText;
  
  // Remove binary data and limit length
  contentPreview = contentPreview
    .replace(/[\x00-\x09\x0B-\x1F\x7F-\xFF]+/g, ' ')
    .replace(/%%BeginBinary.*?%%EndBinary/gs, '[Binary Data Removed]')
    .replace(/%%BeginData.*?%%EndData/gs, '[Data Block Removed]')
    .trim();
  
  sections.push(contentPreview.substring(0, 1500) + (contentPreview.length > 1500 ? '...' : ''));
  sections.push('');
  
  // Add DSC comments (skip the ones we already used for basic metadata)
  sections.push(`ADDITIONAL DSC COMMENTS`);
  sections.push(`---------------------`);
  
  const skipKeys = ['Title', 'Creator', 'Author', 'CreationDate', 'ModDate', 'BoundingBox', 'ExtractedTitle'];
  Object.entries(metadata.documentStructuringConventions || {})
    .filter(([key]) => !skipKeys.includes(key))
    .forEach(([key, value]) => {
      if (value && value.trim() !== '') {
        sections.push(`${key}: ${value}`);
      }
    });
  
  return sections.join('\n');
}

/**
 * Extract a title from the filename when no title metadata is available
 */
function extractTitleFromFilename(filename: string): string {
  // Remove file extension
  let cleanName = filename.replace(/\.[^/.]+$/, "");
  
  // Replace underscores and hyphens with spaces
  cleanName = cleanName.replace(/[_-]/g, " ");
  
  // Remove any numbers or special characters at the beginning
  cleanName = cleanName.replace(/^[0-9\s]+/, "");
  
  // Capitalize first letter of each word
  cleanName = cleanName.replace(/\b\w/g, char => char.toUpperCase());
  
  // If the name is still too short, add a generic prefix
  if (cleanName.length < 5) {
    cleanName = "Vector Design " + cleanName;
  }
  
  return cleanName;
}

/**
 * Creates a synthetic image-like representation of EPS metadata
 * This allows us to use the existing image analysis workflow
 * @param metadata - The EPS metadata
 * @returns A File object containing the metadata as plain text
 */
export function createEpsMetadataRepresentation(metadata: EpsMetadata): File {
  // Serialize the metadata
  const serializedMetadata = serializeEpsMetadata(metadata);
  
  // Create a new File from the serialized metadata
  const metadataFile = new File(
    [serializedMetadata], 
    metadata.filename.replace(/\.eps$/i, '-metadata.txt'), 
    {
      type: 'text/plain',
      lastModified: Date.now()
    }
  );
  
  return metadataFile;
} 