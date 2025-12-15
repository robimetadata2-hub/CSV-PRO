import React, { useState, useEffect } from 'react';
import GenerationModeSelector, { GenerationMode } from '@/components/GenerationModeSelector';
import CustomizationControls from '@/components/CustomizationControls';
import CustomizationOptions from '@/components/CustomizationOptions';
import UserProfile from '@/components/UserProfile';
import { Platform } from './PlatformSelector';
import { useText } from '@/hooks/useText';

interface SidebarProps {
  selectedMode: GenerationMode;
  onModeChange: (mode: GenerationMode) => void;
  minTitleWords: number;
  onMinTitleWordsChange: (value: number[]) => void;
  maxTitleWords: number;
  onMaxTitleWordsChange: (value: number[]) => void;
  minKeywords: number;
  onMinKeywordsChange: (value: number[]) => void;
  maxKeywords: number;
  onMaxKeywordsChange: (value: number[]) => void;
  minDescriptionWords: number;
  onMinDescriptionWordsChange: (value: number[]) => void;
  maxDescriptionWords: number;
  onMaxDescriptionWordsChange: (value: number[]) => void;
  selectedPlatforms: Platform[];
  onPlatformChange: (platforms: Platform[]) => void;
  customPromptEnabled: boolean;
  onCustomPromptEnabledChange: (enabled: boolean) => void;
  customPrompt: string;
  onCustomPromptChange: (prompt: string) => void;
  prohibitedWords: string;
  onProhibitedWordsChange: (words: string) => void;
  prohibitedWordsEnabled: boolean;
  onProhibitedWordsEnabledChange: (enabled: boolean) => void;
  transparentBgEnabled: boolean;
  onTransparentBgEnabledChange: (enabled: boolean) => void;
  isolatedOnTransparentBgEnabled?: boolean;
  onIsolatedOnTransparentBgEnabledChange?: (enabled: boolean) => void;
  silhouetteEnabled?: boolean;
  onSilhouetteEnabledChange?: (enabled: boolean) => void;
  singleWordKeywordsEnabled?: boolean;
  onSingleWordKeywordsEnabledChange?: (enabled: boolean) => void;
  apiKey?: string;
  onApiKeyChange?: (key: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  selectedMode,
  onModeChange,
  minTitleWords,
  onMinTitleWordsChange,
  maxTitleWords,
  onMaxTitleWordsChange,
  minKeywords,
  onMinKeywordsChange,
  maxKeywords,
  onMaxKeywordsChange,
  minDescriptionWords,
  onMinDescriptionWordsChange,
  maxDescriptionWords,
  onMaxDescriptionWordsChange,
  selectedPlatforms,
  onPlatformChange,
  customPromptEnabled,
  onCustomPromptEnabledChange,
  customPrompt,
  onCustomPromptChange,
  prohibitedWords,
  onProhibitedWordsChange,
  prohibitedWordsEnabled,
  onProhibitedWordsEnabledChange,
  transparentBgEnabled,
  onTransparentBgEnabledChange,
  isolatedOnTransparentBgEnabled = false,
  onIsolatedOnTransparentBgEnabledChange = () => {},
  silhouetteEnabled = false,
  onSilhouetteEnabledChange = () => {},
  singleWordKeywordsEnabled = false,
  onSingleWordKeywordsEnabledChange = () => {},
  apiKey = '',
  onApiKeyChange = () => {}
}) => {
  const t = useText();
  const [isVisible, setIsVisible] = useState(true);
  
  // Load sidebar visibility state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-visible');
    if (savedState !== null) {
      setIsVisible(savedState === 'true');
    }
  }, []);
  
  // Listen for toggle events from the header
  useEffect(() => {
    const handleToggleSidebar = (event: CustomEvent) => {
      setIsVisible(event.detail.visible);
    };
    
    window.addEventListener('toggle-sidebar', handleToggleSidebar as EventListener);
    
    return () => {
      window.removeEventListener('toggle-sidebar', handleToggleSidebar as EventListener);
    };
  }, []);
  
  if (!isVisible) {
    return null;
  }
  
  return <aside className="w-80 bg-secondary border-r border-gray-700 flex flex-col h-screen overflow-auto">
      <div className="p-3 border-b border-gray-700">
        <GenerationModeSelector selectedMode={selectedMode} onModeChange={onModeChange} />
      </div>
      
      <div className="p-4 border-b border-gray-700 py-[8px]">
        <h3 className="text-sm font-medium mb-4 bg-[#F15A29] text-white px-3 py-1 rounded-full inline-block">Metadata Customization</h3>
        <CustomizationControls 
          minTitleWords={minTitleWords} 
          onMinTitleWordsChange={onMinTitleWordsChange} 
          maxTitleWords={maxTitleWords} 
          onMaxTitleWordsChange={onMaxTitleWordsChange} 
          minKeywords={minKeywords} 
          onMinKeywordsChange={onMinKeywordsChange} 
          maxKeywords={maxKeywords} 
          onMaxKeywordsChange={onMaxKeywordsChange} 
          minDescriptionWords={minDescriptionWords} 
          onMinDescriptionWordsChange={onMinDescriptionWordsChange} 
          maxDescriptionWords={maxDescriptionWords} 
          onMaxDescriptionWordsChange={onMaxDescriptionWordsChange} 
          selectedPlatforms={selectedPlatforms} 
        />
      </div>
      
      <div className="p-4 border-b border-gray-700 flex-1 overflow-auto py-[8px]">
        <CustomizationOptions 
          enabled={customPromptEnabled} 
          onEnabledChange={onCustomPromptEnabledChange} 
          customPrompt={customPrompt} 
          onCustomPromptChange={onCustomPromptChange} 
          prohibitedWords={prohibitedWords} 
          onProhibitedWordsChange={onProhibitedWordsChange} 
          prohibitedWordsEnabled={prohibitedWordsEnabled} 
          onProhibitedWordsEnabledChange={onProhibitedWordsEnabledChange} 
          transparentBgEnabled={transparentBgEnabled} 
          onTransparentBgEnabledChange={onTransparentBgEnabledChange} 
          isolatedOnTransparentBgEnabled={isolatedOnTransparentBgEnabled} 
          onIsolatedOnTransparentBgEnabledChange={onIsolatedOnTransparentBgEnabledChange} 
          silhouetteEnabled={silhouetteEnabled} 
          onSilhouetteEnabledChange={onSilhouetteEnabledChange} 
          singleWordKeywordsEnabled={singleWordKeywordsEnabled}
          onSingleWordKeywordsEnabledChange={onSingleWordKeywordsEnabledChange}
          apiKey={apiKey}
          onApiKeyChange={onApiKeyChange}
        />
      </div>
    </aside>;
};

export default Sidebar;
