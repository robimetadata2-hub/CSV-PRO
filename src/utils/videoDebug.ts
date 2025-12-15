/**
 * Debug utility for checking video support in the browser
 */

/**
 * Tests if the browser supports video playback and thumbnail extraction
 * Call this function in the console to check video compatibility
 */
export function testVideoSupport(): void {
  console.group('Video Support Debug');
  
  // Check if video element is supported
  const hasVideoSupport = !!document.createElement('video').canPlayType;
  console.log(`Basic video support: ${hasVideoSupport ? 'YES' : 'NO'}`);
  
  // Check for specific format support
  const video = document.createElement('video');
  const formats = {
    mp4: video.canPlayType('video/mp4'),
    webm: video.canPlayType('video/webm'),
    ogg: video.canPlayType('video/ogg'),
    mov: video.canPlayType('video/quicktime'),
  };
  
  console.log('Format support:');
  Object.entries(formats).forEach(([format, support]) => {
    const supportLevel = support === '' ? 'NO' : support === 'maybe' ? 'MAYBE' : 'YES';
    console.log(`  - ${format.toUpperCase()}: ${supportLevel}`);
  });
  
  // Check if canvas is supported for thumbnail extraction
  const hasCanvasSupport = !!document.createElement('canvas').getContext('2d');
  console.log(`Canvas support (for thumbnail extraction): ${hasCanvasSupport ? 'YES' : 'NO'}`);
  
  // Check if Blob and URL.createObjectURL are supported
  const hasBlobSupport = typeof Blob !== 'undefined';
  const hasURLSupport = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';
  console.log(`Blob support: ${hasBlobSupport ? 'YES' : 'NO'}`);
  console.log(`URL.createObjectURL support: ${hasURLSupport ? 'YES' : 'NO'}`);
  
  console.log('');
  console.log('To test a specific video file:');
  console.log('1. Select a video file via file input');
  console.log('2. Call testSpecificVideo(file) in the console');
  console.groupEnd();
}

/**
 * Tests a specific video file for compatibility
 * @param file - The video file to test
 */
export async function testSpecificVideo(file: File): Promise<void> {
  console.group(`Testing video file: ${file.name} (${file.type})`);
  
  try {
    // Check basic properties
    console.log(`Size: ${file.size} bytes`);
    console.log(`Last modified: ${new Date(file.lastModified).toLocaleString()}`);
    
    // Create object URL
    try {
      const objectUrl = URL.createObjectURL(file);
      console.log(`Object URL created: ${objectUrl}`);
      URL.revokeObjectURL(objectUrl);
    } catch (urlError) {
      console.error('Failed to create object URL:', urlError);
    }
    
    // Create video element and try to load the file
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    // Create a promise that resolves when metadata is loaded
    const metadataPromise = new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => {
        console.log('✅ Metadata loaded successfully');
        console.log(`Duration: ${video.duration} seconds`);
        console.log(`Dimensions: ${video.videoWidth}x${video.videoHeight}`);
        resolve();
      };
      
      video.onerror = () => {
        console.error('❌ Error loading video:', video.error?.message || 'Unknown error');
        reject(new Error('Video loading failed'));
      };
      
      // Set a timeout in case the video never loads
      setTimeout(() => {
        if (video.readyState === 0) {
          console.error('❌ Video loading timed out after 5 seconds');
          reject(new Error('Video loading timed out'));
        }
      }, 5000);
    });
    
    // Start loading the video
    video.src = URL.createObjectURL(file);
    console.log('Loading video metadata...');
    
    // Wait for metadata
    await metadataPromise;
    
    console.log('Video passes basic compatibility tests');
  } catch (error) {
    console.error('Video test failed:', error);
  }
  
  console.groupEnd();
}

/**
 * Makes debug functions available globally for console usage without logging
 */
export function setupVideoDebug(): void {
  // Make the functions available to the global scope
  (window as any).testVideoSupport = testVideoSupport;
  (window as any).testSpecificVideo = testSpecificVideo;
  
  // No console log
} 