import React, { useState, useEffect, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import ApiKeyInput from '@/components/ApiKeyInput';
import ImageUploader from '@/components/ImageUploader';
import ResultsDisplay from '@/components/ResultsDisplay';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { ProcessedImage, createImagePreview, generateId, isValidImageType, isValidFileSize } from '@/utils/imageHelpers';
import { isVideoFile } from '@/utils/videoProcessor';
import { isSvgFile } from '@/utils/svgToPng';
import { isEpsFile } from '@/utils/epsMetadataExtractor';
import { analyzeImageWithGemini, analyzeImagesInBatch } from '@/utils/geminiApi';
import { toast } from 'sonner';
import { Sparkles, Loader2, ShieldAlert, Image, Info, Film, LogIn, Clock, Play, ArrowRight, Check, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Platform } from '@/components/PlatformSelector';
import PlatformSelector from '@/components/PlatformSelector';
import GenerationModeSelector, { GenerationMode } from '@/components/GenerationModeSelector';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppHeader from '@/components/AppHeader';
import Sidebar from '@/components/Sidebar';
import { setupVideoDebug, testVideoSupport, testSpecificVideo } from '@/utils/videoDebug';

// Updated payment gateway link
const PAYMENT_GATEWAY_URL = "https://secure-pay.nagorikpay.com/api/execute/9c7e8b9c01fea1eabdf4d4a37b685e0a";

const Index: React.FC = () => {
  const {
    user,
    isLoading,
    canGenerateMetadata,
    incrementCreditsUsed,
    profile,
    apiKey: authApiKey
  } = useAuth();

  const [apiKey, setApiKey] = useState('');
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [titleLength, setTitleLength] = useState(200);
  const [descriptionLength, setDescriptionLength] = useState(200);
  const [keywordCount, setKeywordCount] = useState(50);
  
  // Timer state for processing
  const [elapsedTime, setElapsedTime] = useState(0);
  const [completionTime, setCompletionTime] = useState<string | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  
  // Batch processing states
  const [batchSize] = useState(5); // Fixed batch size of 5
  const [batches, setBatches] = useState<ProcessedImage[][]>([]);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  
  // Default platform is now General (which has ID 'Alamy')
  const [platforms, setPlatforms] = useState<Platform[]>(['Alamy']);
  
  const [generationMode, setGenerationMode] = useState<GenerationMode>('metadata');
  const [selectedTab, setSelectedTab] = useState('image');
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const navigate = useNavigate();

  // Updated default values for metadata customization
  const [minTitleWords, setMinTitleWords] = useState(5);
  const [maxTitleWords, setMaxTitleWords] = useState(20);
  const [minKeywords, setMinKeywords] = useState(20);
  const [maxKeywords, setMaxKeywords] = useState(30);
  const [minDescriptionWords, setMinDescriptionWords] = useState(8);
  const [maxDescriptionWords, setMaxDescriptionWords] = useState(40);
  
  // Custom prompt state
  const [customPromptEnabled, setCustomPromptEnabled] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [prohibitedWords, setProhibitedWords] = useState('');
  const [prohibitedWordsEnabled, setProhibitedWordsEnabled] = useState(false);
  const [transparentBgEnabled, setTransparentBgEnabled] = useState(false);
  const [isolatedOnTransparentBgEnabled, setIsolatedOnTransparentBgEnabled] = useState(false);
  const [silhouetteEnabled, setSilhouetteEnabled] = useState(false);
  const [singleWordKeywordsEnabled, setSingleWordKeywordsEnabled] = useState(false);
  
  // Format time in min:sec format
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };
  
  // Start the timer
  const startTimer = () => {
    // Reset timer state
    setElapsedTime(0);
    setCompletionTime(null);
    
    // Clear any existing interval
    if (timerIntervalRef.current !== null) {
      window.clearInterval(timerIntervalRef.current);
    }
    
    // Start a new interval
    timerIntervalRef.current = window.setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
  };
  
  // Stop the timer
  const stopTimer = () => {
    // Only stop the timer if all batches are processed or if not in batch mode
    const allBatchesProcessed = currentBatchIndex >= batches.length - 1;
    
    if (timerIntervalRef.current !== null && (!isBatchProcessing || allBatchesProcessed)) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
      setCompletionTime(formatTime(elapsedTime));
    }
  };
  
  // Cleanup interval on component unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current !== null) {
        window.clearInterval(timerIntervalRef.current);
      }
    };
  }, []);
  
  // Get API key from localStorage only - no fallback to auth context
  useEffect(() => {
    const savedKey = localStorage.getItem('gemini-api-key');
    if (savedKey) {
      setApiKey(savedKey);
    }
    
    // Load custom prompt settings from localStorage
    const savedCustomPrompt = localStorage.getItem('custom-prompt');
    if (savedCustomPrompt) {
      setCustomPrompt(savedCustomPrompt);
    }
    
    const savedCustomPromptEnabled = localStorage.getItem('custom-prompt-enabled');
    if (savedCustomPromptEnabled) {
      setCustomPromptEnabled(savedCustomPromptEnabled === 'true');
    }
    
    // Load single word keywords setting from localStorage
    const savedSingleWordKeywordsEnabled = localStorage.getItem('single-word-keywords-enabled');
    if (savedSingleWordKeywordsEnabled) {
      setSingleWordKeywordsEnabled(savedSingleWordKeywordsEnabled === 'true');
    }
  }, []);
  
  // Remind users to set API key if not present
  useEffect(() => {
    if (!apiKey && !isLoading) {
      toast.info('Please set your Gemini API key to use the application', {
        duration: 5000,
        id: 'api-key-reminder'
      });
    }
  }, [apiKey, isLoading]);
  
  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  
  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
  };
  
  const handleImagesSelected = (newImages: ProcessedImage[]) => {
    setImages(prev => [...prev, ...newImages]);
    
    // Create batches of images
    const allImages = [...images, ...newImages];
    const pendingImages = allImages.filter(img => img.status === 'pending');
    
    // Create batches of batchSize
    const newBatches: ProcessedImage[][] = [];
    for (let i = 0; i < pendingImages.length; i += batchSize) {
      newBatches.push(pendingImages.slice(i, i + batchSize));
    }
    
    setBatches(newBatches);
    setCurrentBatchIndex(0); // Reset batch index when new images are added
  };
  
  const handleRemoveImage = (id: string) => {
    setImages(prev => {
      const updatedImages = prev.filter(img => img.id !== id);
      
      // Recalculate batches after removing an image
      const pendingImages = updatedImages.filter(img => img.status === 'pending');
      const newBatches: ProcessedImage[][] = [];
      for (let i = 0; i < pendingImages.length; i += batchSize) {
        newBatches.push(pendingImages.slice(i, i + batchSize));
      }
      setBatches(newBatches);
      
      return updatedImages;
    });
  };
  
  const handleClearAll = () => {
    setImages([]);
    setCompletionTime(null);
    setBatches([]);
    setCurrentBatchIndex(0);
  };
  
  const handleTitleLengthChange = (value: number[]) => {
    setTitleLength(value[0]);
  };
  
  const handleDescriptionLengthChange = (value: number[]) => {
    setDescriptionLength(value[0]);
  };
  
  const handleKeywordCountChange = (value: number[]) => {
    setKeywordCount(value[0]);
  };
  
  const handlePlatformChange = (newPlatforms: Platform[]) => {
    setPlatforms(newPlatforms);
  };
  
  const handleModeChange = (mode: GenerationMode) => {
    setGenerationMode(mode);
  };
  
  const handleMinTitleWordsChange = (value: number[]) => {
    setMinTitleWords(value[0]);
  };
  
  const handleMaxTitleWordsChange = (value: number[]) => {
    setMaxTitleWords(value[0]);
  };
  
  const handleMinKeywordsChange = (value: number[]) => {
    setMinKeywords(value[0]);
  };
  
  const handleMaxKeywordsChange = (value: number[]) => {
    setMaxKeywords(value[0]);
  };
  
  const handleMinDescriptionWordsChange = (value: number[]) => {
    setMinDescriptionWords(value[0]);
  };
  
  const handleMaxDescriptionWordsChange = (value: number[]) => {
    setMaxDescriptionWords(value[0]);
  };
  
  const handleCustomPromptEnabledChange = (enabled: boolean) => {
    setCustomPromptEnabled(enabled);
  };
  
  const handleCustomPromptChange = (prompt: string) => {
    setCustomPrompt(prompt);
  };
  
  const handleProhibitedWordsChange = (words: string) => {
    setProhibitedWords(words);
  };
  
  const handleProhibitedWordsEnabledChange = (enabled: boolean) => {
    setProhibitedWordsEnabled(enabled);
  };
  
  const handleTransparentBgEnabledChange = (enabled: boolean) => {
    setTransparentBgEnabled(enabled);
  };
  
  const handleIsolatedOnTransparentBgEnabledChange = (enabled: boolean) => {
    setIsolatedOnTransparentBgEnabled(enabled);
  };
  
  const handleSilhouetteEnabledChange = (enabled: boolean) => {
    setSilhouetteEnabled(enabled);
  };
  
  const handleSingleWordKeywordsEnabledChange = (enabled: boolean) => {
    setSingleWordKeywordsEnabled(enabled);
    localStorage.setItem('single-word-keywords-enabled', enabled.toString());
  };
  
  const handleUpgradePlan = () => {
    window.location.href = PAYMENT_GATEWAY_URL;
  };
  
  // Process a single batch of images
  const processBatch = async (batchIndex: number) => {
    if (batchIndex >= batches.length) {
      setIsBatchProcessing(false);
      setIsProcessing(false);
      stopTimer();
      toast.success('All batches processed successfully!');
      return;
    }
    
    setIsBatchProcessing(true);
    setIsProcessing(true);
    setCurrentBatchIndex(batchIndex);
    
    const currentBatch = batches[batchIndex];
    
    if (currentBatch.length === 0) {
      toast.info('No images in this batch');
      setIsBatchProcessing(false);
      setIsProcessing(false);
      // Automatically move to next batch if current one is empty
      processBatch(batchIndex + 1);
      return;
    }
    
    // Check if user is authenticated first
    if (!user) {
      // Redirect to auth page if not authenticated
      toast.info('Please sign in or sign up to process images');
      navigate('/auth');
      setIsBatchProcessing(false);
      setIsProcessing(false);
      return;
    }
    
    if (!apiKey) {
      toast.error('Please enter your Gemini API key first');
      setIsBatchProcessing(false);
      setIsProcessing(false);
      return;
    }
    
    // Always allow generation regardless of user status
    const canProceed = await incrementCreditsUsed();
    
    if (!canProceed) {
      setIsBatchProcessing(false);
      setIsProcessing(false);
      return;
    }
    
    // Start the timer if it's not already running
    if (!timerIntervalRef.current) {
      startTimer();
    }
    
    // Show batch processing message
    toast.info(`Processing batch ${batchIndex + 1} of ${batches.length} (${currentBatch.length} images)...`, {
      duration: 5000,
    });
    
    try {
      // Update only the current batch images to processing state
      setImages(prev => prev.map(img => 
        currentBatch.some(batchImg => batchImg.id === img.id) ? {
          ...img,
          status: 'processing' as const
        } : img
      ));
      
      // Check for special file types
      const hasSvgFiles = currentBatch.some(img => isSvgFile(img.file));
      const hasVideoFiles = currentBatch.some(img => isVideoFile(img.file));
      
      // Create options object for the API call
      const options = {
        titleLength,
        descriptionLength,
        keywordCount,
        platforms,
        generationMode,
        minTitleWords,
        maxTitleWords,
        minKeywords,
        maxKeywords,
        minDescriptionWords,
        maxDescriptionWords,
        customPromptEnabled,
        customPrompt,
        prohibitedWords,
        prohibitedWordsEnabled,
        transparentBgEnabled,
        isolatedOnTransparentBgEnabled,
        silhouetteEnabled,
        singleWordKeywordsEnabled
      };
      
      // Use batch processing instead of processing one by one
      const pendingFiles = currentBatch.map(img => img.reducedFile || img.file); // Use reducedFile if available, otherwise fall back to original file
      
      // Show batch size information
      console.log(`Processing ${pendingFiles.length} files in batch ${batchIndex + 1} of ${batches.length}`);
      
      try {
        // Try batch processing first
        const batchResults = await analyzeImagesInBatch(pendingFiles, apiKey, options);
        console.log('Batch processing results:', batchResults);
        
        // Match results with original images by both filename and index
        for (let i = 0; i < currentBatch.length; i++) {
          const image = currentBatch[i];
          
          // Try to find a match by filename first
          let result = batchResults.find(res => res.filename === image.file.name);
          
          // If no match by filename, try to find by index
          if (!result) {
            result = batchResults.find(res => res.index === i);
          }
          
          // If still no match, try to find by comparing filenames without extensions
          if (!result) {
            const filenameWithoutExt = image.file.name.replace(/\.[^/.]+$/, "");
            result = batchResults.find(res => {
              const resFilenameWithoutExt = (res.filename || '').replace(/\.[^/.]+$/, "");
              return resFilenameWithoutExt === filenameWithoutExt;
            });
          }
          
          // Last resort: just use the result at the same position if available
          if (!result && i < batchResults.length) {
            result = batchResults[i];
          }
          
          if (result) {
            setImages(prev => prev.map(img => img.id === image.id ? {
              ...img,
              status: result.error ? 'error' as const : 'complete' as const,
              result: result.error ? undefined : {
                title: result.title || '',
                description: result.description || '',
                keywords: result.keywords || [],
                // Include fields for video files
                ...(result.isVideo && {
                  isVideo: true,
                  category: result.category,
                  filename: result.filename
                }),
                // Include fields for EPS files
                ...(result.isEps && {
                  isEps: true
                }),
                // Include prompt and baseModel for Freepik
                ...(platforms.length === 1 && platforms[0] === 'Freepik' && {
                  prompt: result.prompt,
                  baseModel: result.baseModel
                }),
                // Include categories for Shutterstock
                ...(platforms.length === 1 && platforms[0] === 'Shutterstock' && {
                  categories: result.categories
                }),
                // Include categories for AdobeStock
                ...(platforms.length === 1 && platforms[0] === 'AdobeStock' && {
                  categories: result.categories
                })
              },
              error: result.error
            } : img));
          } else {
            // If no result was found for this image, mark it as error
            console.error(`No result found for image: ${image.file.name}`);
            
            setImages(prev => prev.map(img => img.id === image.id ? {
              ...img,
              status: 'error' as const,
              error: 'No metadata generated for this image in the batch response'
            } : img));
          }
        }
      } catch (batchError) {
        console.error('Batch processing failed, falling back to individual processing:', batchError);
        toast.error('Batch processing failed. Falling back to processing images one by one.', {
          duration: 5000,
        });
        
        // Process files with a short delay between each as fallback
        for (const image of currentBatch) {
          try {
            if (currentBatch.indexOf(image) > 0) {
              // Add a longer delay for video files to prevent overwhelming the browser
              const delayTime = isVideoFile(image.file) ? 3000 : 2000;
              await new Promise(resolve => setTimeout(resolve, delayTime));
            }
            
            // Process the image/video with Gemini API
            const fileToProcess = image.reducedFile || image.file; // Use reducedFile if available, otherwise fall back to original
            const result = await analyzeImageWithGemini(fileToProcess, apiKey, options);
            
            setImages(prev => prev.map(img => img.id === image.id ? {
              ...img,
              status: result.error ? 'error' as const : 'complete' as const,
              result: result.error ? undefined : {
                title: result.title,
                description: result.description,
                keywords: result.keywords,
                // Include fields for video files
                ...(result.isVideo && {
                  isVideo: true,
                  category: result.category,
                  filename: result.filename
                }),
                // Include fields for EPS files
                ...(result.isEps && {
                  isEps: true
                }),
                // Include prompt and baseModel for Freepik
                ...(platforms.length === 1 && platforms[0] === 'Freepik' && {
                  prompt: result.prompt,
                  baseModel: result.baseModel
                })
              },
              error: result.error
            } : img));
          } catch (error) {
            console.error(`Error processing image ${image.file.name}:`, error);
            setImages(prev => prev.map(img => img.id === image.id ? {
              ...img,
              status: 'error' as const,
              error: error instanceof Error ? error.message : 'An unknown error occurred'
            } : img));
          }
        }
      }
      
      // Batch completed successfully
      toast.success(`Batch ${batchIndex + 1} of ${batches.length} completed!`);
      
      // Automatically process next batch if there are more batches
      if (batchIndex < batches.length - 1) {
        // Add a small delay before starting the next batch
        setTimeout(() => {
          processBatch(batchIndex + 1);
        }, 1000);
      } else {
        // All batches completed
        stopTimer();
        toast.success('All batches processed successfully!');
      }
      
    } catch (error) {
      console.error('Error processing batch:', error);
      toast.error('An error occurred while processing the batch');
    } finally {
      setIsBatchProcessing(false);
      setIsProcessing(false);
    }
  };

  const handleProcessImages = async () => {
    // Update batches based on current pending images
    const pendingImages = images.filter(img => img.status === 'pending');
    
    if (pendingImages.length === 0) {
      toast.info('No images to process');
      return;
    }
    
    // Create batches of batchSize
    const newBatches: ProcessedImage[][] = [];
    for (let i = 0; i < pendingImages.length; i += batchSize) {
      newBatches.push(pendingImages.slice(i, i + batchSize));
    }
    
    setBatches(newBatches);
    setCurrentBatchIndex(0);
    
    // Process the first batch, which will automatically continue to subsequent batches
    await processBatch(0);
  };

  // This function is now primarily for manual intervention if needed
  const handleProcessNextBatch = async () => {
    if (currentBatchIndex < batches.length - 1) {
      await processBatch(currentBatchIndex + 1);
    } else {
      toast.info('All batches have been processed');
    }
  };
  
  // Function to regenerate metadata for a specific image that failed
  const handleRegenerateImage = (id: string) => {
    // Update the image status from error to pending
    setImages(prev => prev.map(img => img.id === id ? {
      ...img,
      status: 'pending' as const,
      error: undefined // Clear the error message
    } : img));
    
    // Process just this single image using the batch processing
    handleProcessImages();
  };
  
  // Computed values
  const pendingCount = images.filter(img => img.status === 'pending').length;
  const processingCount = images.filter(img => img.status === 'processing').length;
  const completedCount = images.filter(img => img.status === 'complete').length;
  const errorCount = images.filter(img => img.status === 'error').length;
  const remainingCredits = profile?.is_premium ? '∞' : '∞'; // Always show infinity symbol
  
  return (
    <div className="bg-[#25306c] flex flex-col min-h-screen">
      <AppHeader
        remainingCredits={remainingCredits}
        apiKey={apiKey}
        onApiKeyChange={handleApiKeyChange}
      />
      
      <div className="flex flex-1">
        <Sidebar 
          selectedMode={generationMode} 
          onModeChange={handleModeChange} 
          minTitleWords={minTitleWords} 
          onMinTitleWordsChange={handleMinTitleWordsChange} 
          maxTitleWords={maxTitleWords} 
          onMaxTitleWordsChange={handleMaxTitleWordsChange} 
          minKeywords={minKeywords} 
          onMinKeywordsChange={handleMinKeywordsChange} 
          maxKeywords={maxKeywords} 
          onMaxKeywordsChange={handleMaxKeywordsChange} 
          minDescriptionWords={minDescriptionWords} 
          onMinDescriptionWordsChange={handleMinDescriptionWordsChange} 
          maxDescriptionWords={maxDescriptionWords} 
          onMaxDescriptionWordsChange={handleMaxDescriptionWordsChange} 
          selectedPlatforms={platforms} 
          onPlatformChange={handlePlatformChange} 
          customPromptEnabled={customPromptEnabled}
          onCustomPromptEnabledChange={handleCustomPromptEnabledChange}
          customPrompt={customPrompt}
          onCustomPromptChange={handleCustomPromptChange}
          prohibitedWords={prohibitedWords}
          onProhibitedWordsChange={handleProhibitedWordsChange}
          prohibitedWordsEnabled={prohibitedWordsEnabled}
          onProhibitedWordsEnabledChange={handleProhibitedWordsEnabledChange}
          transparentBgEnabled={transparentBgEnabled}
          onTransparentBgEnabledChange={handleTransparentBgEnabledChange}
          isolatedOnTransparentBgEnabled={isolatedOnTransparentBgEnabled}
          onIsolatedOnTransparentBgEnabledChange={handleIsolatedOnTransparentBgEnabledChange}
          silhouetteEnabled={silhouetteEnabled}
          onSilhouetteEnabledChange={handleSilhouetteEnabledChange}
          singleWordKeywordsEnabled={singleWordKeywordsEnabled}
          onSingleWordKeywordsEnabledChange={handleSingleWordKeywordsEnabledChange}
          apiKey={apiKey}
          onApiKeyChange={handleApiKeyChange}
        />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <div className="flex flex-col mb-4 py-[22px] my-0 mx-0 px-0">
                <div className="flex border-b border-gray-700">
                  <PlatformSelector
                    selectedPlatforms={platforms}
                    onPlatformChange={handlePlatformChange}
                  />
                </div>
              </div>
              
              <div className="mt-6">
                <ImageUploader
                  onImagesSelected={handleImagesSelected}
                  isProcessing={isProcessing}
                />
              </div>
              
              {pendingCount > 0 && (
                <div className="flex justify-center mt-8">
                  {!user ? (
                    <Button
                      onClick={() => navigate('/auth')}
                      className="glow-button bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg rounded-md shadow-lg transition-all duration-300 border-none"
                    >
                      <LogIn className="mr-2 h-5 w-5" />
                      Login to Process {pendingCount} Image{pendingCount !== 1 ? 's' : ''}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleProcessImages}
                      disabled={isProcessing || isBatchProcessing || !apiKey}
                      className="glow-button bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg rounded-md shadow-lg transition-all duration-300 border-none"
                    >
                      {isProcessing || isBatchProcessing ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          {isBatchProcessing ? `Auto-processing Batch ${currentBatchIndex + 1}/${batches.length}...` : 'Processing...'}
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-5 w-5" />
                          Auto-process All {pendingCount} Image{pendingCount !== 1 ? 's' : ''}
                        </>
                      )}
                    </Button>
                  )}
                  
                  {/* Timer indicator */}
                  {(isProcessing || isBatchProcessing) && (
                    <Button
                      disabled
                      className="ml-2 bg-gray-700 text-white px-4 py-3 text-lg rounded-md shadow-lg"
                    >
                      <Clock className="h-5 w-5 mr-2" />
                      {isBatchProcessing ? `Batch ${currentBatchIndex + 1}/${batches.length}: ${formatTime(elapsedTime)}` : formatTime(elapsedTime)}
                    </Button>
                  )}
                  
                  {/* Completion time indicator */}
                  {!isProcessing && completionTime && (
                    <Button
                      disabled
                      className="ml-2 bg-green-700 text-white px-4 py-3 text-lg rounded-md shadow-lg"
                    >
                      <Clock className="h-5 w-5 mr-2" />
                      Completed in {completionTime}
                    </Button>
                  )}
                </div>
              )}
              
              <div className="mt-6 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleProcessImages}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2 rounded-md shadow-md flex items-center justify-center gap-2 w-40"
                      disabled={isProcessing || isBatchProcessing || images.filter(img => img.status === 'pending').length === 0}
                    >
                      {isProcessing || isBatchProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      <span>Auto-Process All</span>
                    </Button>
                    
                    {batches.length > 0 && (
                      <div className="flex items-center gap-2 ml-4">
                        <span className="text-sm text-gray-400">
                          Auto-processing: Batch {currentBatchIndex + 1} of {batches.length}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {(isProcessing || isBatchProcessing) && (
                      <div className="text-sm text-blue-400">
                        Processing time: {formatTime(elapsedTime)}
                      </div>
                    )}
                    {completionTime && !isProcessing && !isBatchProcessing && (
                      <div className="text-sm text-green-400">
                        Completed in: {completionTime}
                      </div>
                    )}
                  </div>
                </div>
                
                {batches.length > 0 && (
                  <div className="text-sm text-gray-400 flex flex-wrap gap-2">
                    {batches.map((batch, index) => (
                      <div 
                        key={index} 
                        className={`px-3 py-1 rounded-full ${
                          index === currentBatchIndex && (isProcessing || isBatchProcessing)
                            ? 'bg-blue-600 text-white border-2 border-blue-300' 
                            : index < currentBatchIndex 
                              ? 'bg-green-600 text-white' 
                              : index === currentBatchIndex
                                ? 'bg-yellow-600 text-white'
                                : 'bg-gray-700 text-gray-300'
                        }`}
                      >
                        Batch {index + 1}: {batch.length} images
                        {index === currentBatchIndex && (isProcessing || isBatchProcessing) && (
                          <span className="ml-2">
                            <Loader2 className="h-3 w-3 inline animate-spin" />
                          </span>
                        )}
                        {index < currentBatchIndex && (
                          <span className="ml-2">
                            <Check className="h-3 w-3 inline" />
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="mt-8">
                <ResultsDisplay
                  images={images}
                  onRemoveImage={handleRemoveImage}
                  onClearAll={handleClearAll}
                  generationMode={generationMode}
                  selectedPlatforms={platforms}
                  onRegenerateImage={handleRegenerateImage}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
