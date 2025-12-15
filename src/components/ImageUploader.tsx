import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Upload, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ProcessedImage, createImagePreview, generateId, isValidImageType, isValidFileSize, formatFileSize, reduceImageSize } from '@/utils/imageHelpers';
import { isVideoFile } from '@/utils/videoProcessor';
import { isEpsFile } from '@/utils/epsMetadataExtractor';

interface ImageUploaderProps {
  onImagesSelected: (images: ProcessedImage[]) => void;
  isProcessing: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImagesSelected,
  isProcessing
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'images' | 'videos' | 'vectors'>('vectors');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<string>('');

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const processFiles = useCallback(async (files: FileList) => {
    setIsUploading(true);
    setUploadProgress(0);
    
    const processedImages: ProcessedImage[] = [];
    const promises: Promise<ProcessedImage>[] = [];
    const filesToProcess = Array.from(files);
    let videoCount = 0;
    let imageCount = 0;
    let epsCount = 0;
    
    // Setup progress tracking
    const totalFiles = filesToProcess.length;
    let completedFiles = 0;
    
    for (const file of filesToProcess) {
      setCurrentFile(file.name);
      
      const promise = (async () => {
        // Validate file is an image or video
        if (!isValidImageType(file)) {
          toast.error(`${file.name} is not a valid file. Supported formats: JPEG, PNG, SVG, EPS, MP4, MOV, and other image/video formats.`);
          return null;
        }

        // Validate file size
        if (!isValidFileSize(file)) {
          toast.error(`${file.name} exceeds the 10GB size limit.`);
          return null;
        }

        // Track file type
        if (isVideoFile(file)) {
          videoCount++;
        } else if (isEpsFile(file)) {
          epsCount++;
        } else {
          imageCount++;
        }
        
        try {
          // Create preview from original file for high quality display
          const previewUrl = await createImagePreview(file);
          
          // Create a reduced version of the file for API processing, but don't use it for preview
          let reducedFile = file;
          if (!isVideoFile(file) && !isEpsFile(file) && file.type.startsWith('image/')) {
            try {
              reducedFile = await reduceImageSize(file);
              console.log(`Image optimized for API: ${file.name} - Size reduced by ${Math.round((1 - (reducedFile.size / file.size)) * 100)}%`);
            } catch (reductionError) {
              console.warn(`Image reduction failed for ${file.name}, using original:`, reductionError);
              // Continue with original file if reduction fails
              reducedFile = file;
            }
          }
          
          // Update progress after each file is processed
          completedFiles++;
          const progress = Math.round((completedFiles / totalFiles) * 100);
          setUploadProgress(progress);
          
          return {
            id: generateId(),
            file: file, // Keep original file for UI display
            reducedFile: reducedFile, // Store reduced file for API processing
            previewUrl,
            status: 'pending' as const
          };
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          toast.error(`Failed to process ${file.name}`);
          
          // Still update progress even if file fails
          completedFiles++;
          const progress = Math.round((completedFiles / totalFiles) * 100);
          setUploadProgress(progress);
          
          return null;
        }
      })();
      promises.push(promise as Promise<ProcessedImage>);
    }
    
    const results = await Promise.all(promises);

    // Filter out any null results from failed processing
    const validResults = results.filter(Boolean) as ProcessedImage[];
    if (validResults.length > 0) {
      onImagesSelected(validResults);

      // Create a more specific success message
      let successMsg = '';
      const typesAdded = [];
      if (imageCount > 0) {
        typesAdded.push(`${imageCount} image${imageCount !== 1 ? 's' : ''}`);
      }
      if (videoCount > 0) {
        typesAdded.push(`${videoCount} video${videoCount !== 1 ? 's' : ''}`);
      }
      if (epsCount > 0) {
        typesAdded.push(`${epsCount} EPS file${epsCount !== 1 ? 's' : ''}`);
      }
      if (typesAdded.length > 1) {
        const lastType = typesAdded.pop();
        successMsg = `Added ${typesAdded.join(', ')} and ${lastType}`;
      } else if (typesAdded.length === 1) {
        successMsg = `Added ${typesAdded[0]}`;
      } else {
        successMsg = `${validResults.length} file${validResults.length !== 1 ? 's' : ''} added`;
      }
      
      // Add note about image optimization
      if (imageCount > 0) {
        toast.success(successMsg + " (Images will be optimized for API processing)");
      } else {
        toast.success(successMsg);
      }
    } else if (files.length > 0) {
      toast.error('No valid files were found to process.');
    }
    
    // Reset upload state
    setCurrentFile('');
    setIsUploading(false);
    setUploadProgress(0);
  }, [onImagesSelected]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      // Reset the file input so the same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [processFiles]);

  const handleBrowseClick = useCallback(() => {
    if (!isProcessing && !isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [isProcessing, isUploading]);

  const handleTabClick = useCallback((tab: 'images' | 'videos' | 'vectors', e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the dropzone click
    setActiveTab(tab);
    
    // Also open the file manager when tabs are clicked
    if (!isProcessing && !isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [isProcessing, isUploading]);

  return (
    <div className="dropzone-container bg-[#192048] border border-solid border-gray-700 rounded-xl overflow-hidden shadow-lg">      
      <div 
        className={`drop-zone flex flex-col items-center justify-center p-12 transition-all duration-300 ${isUploading ? 'cursor-not-allowed' : 'cursor-pointer'} ${isDragging ? 'dropzone-active bg-blue-900/10 border-blue-400' : 'hover:bg-gray-800/30'}`} 
        onDragOver={handleDragOver} 
        onDragEnter={handleDragEnter} 
        onDragLeave={handleDragLeave} 
        onDrop={handleDrop} 
        onClick={isUploading ? undefined : handleBrowseClick}
        data-testid="drop-zone"
      >
        <div className={`${isUploading ? 'bg-blue-600/50 animate-pulse' : 'bg-gray-500/50'} p-5 rounded-full mb-5 cursor-pointer hover:bg-gray-500/70 transition-colors`}>
          {isUploading ? (
            <Loader2 className="h-12 w-12 text-white animate-spin" />
          ) : (
            <img src="/upload-icon.png" alt="Upload" className="h-12 w-12" />
          )}
        </div>
        
        <h3 className="text-2xl font-bold text-white mb-3 font-['Inter']">
          {isUploading ? `Uploading Files (${uploadProgress}%)` : 'Upload Files'}
        </h3>
        
        {isUploading && (
          <>
            <div className="w-full max-w-xs mb-3">
              <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out animate-pulse"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
            <p className="text-blue-300 text-sm mb-4 truncate max-w-xs">
              Processing: {currentFile}
            </p>
          </>
        )}
        
        {!isUploading && (
          <div className="flex gap-2 mb-5">
            <button 
              className={`px-5 py-2 rounded-full text-white font-semibold text-sm ${activeTab === 'images' ? 'bg-blue-600' : 'bg-blue-500/80'}`} 
              onClick={(e) => handleTabClick('images', e)}
            >
              JPG/PNG
            </button>
            <button 
              className={`px-5 py-2 rounded-full text-white font-semibold text-sm ${activeTab === 'vectors' ? 'bg-purple-600' : 'bg-purple-500/80'}`} 
              onClick={(e) => handleTabClick('vectors', e)}
            >
              SVG
            </button>
            <button 
              className={`px-5 py-2 rounded-full text-white font-semibold text-sm ${activeTab === 'videos' ? 'bg-red-600' : 'bg-red-500/80'}`} 
              onClick={(e) => handleTabClick('videos', e)}
            >
              Videos
            </button>
          </div>
        )}
        
        <div className="privacy-notice flex items-center justify-center mb-2">
          <Lock className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-gray-400 text-sm">Data Protection Statement</span>
        </div>
        
        <p className="text-gray-400 text-sm text-center mb-2 max-w-md">We analyze files on-device only, then purge all data after extracting metadata.</p>
        
        <p className="text-blue-400 text-sm font-semibold mt-1">Upload a maximum of 500 files in a single action</p>
        
        <p className="text-green-400 text-xs mt-3">High-quality previews with optimized processing (200x200px)</p>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileInputChange} 
          accept="image/jpeg,image/png,image/jpg,image/svg+xml,application/postscript,application/eps,image/eps,application/illustrator,video/mp4,video/quicktime,video/webm,video/ogg,video/x-msvideo,video/x-ms-wmv" 
          multiple 
          className="hidden" 
          disabled={isProcessing || isUploading} 
        />
      </div>
    </div>
  );
};

export default ImageUploader;
