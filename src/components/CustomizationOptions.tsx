import React, { useState, useEffect } from 'react';
import { Settings, ChevronDown, ChevronRight, Key, Plus, Save, X } from 'lucide-react';
import FeatureToggle from './FeatureToggle';
import { useText } from '@/hooks/useText';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CustomizationOptionsProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
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

const CustomizationOptions: React.FC<CustomizationOptionsProps> = ({
  enabled,
  onEnabledChange,
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
  const [settingsExpanded, setSettingsExpanded] = useState(true);
  const [apiKeyExpanded, setApiKeyExpanded] = useState(false);
  const [additionalApiKeys, setAdditionalApiKeys] = useState<string[]>([]);
  const [currentApiKey, setCurrentApiKey] = useState(apiKey);
  
  // Load saved API keys from localStorage on component mount
  useEffect(() => {
    const savedKeys = localStorage.getItem('additional-api-keys');
    if (savedKeys) {
      try {
        setAdditionalApiKeys(JSON.parse(savedKeys));
      } catch (e) {
        console.error('Failed to parse saved API keys:', e);
      }
    }
    
    // Set the current API key from props
    setCurrentApiKey(apiKey);
  }, [apiKey]);
  
  const handleResetToDefault = () => {
    onCustomPromptChange('');
    localStorage.setItem('custom-prompt', '');
  };
  
  const handleProhibitedWordsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onProhibitedWordsChange(e.target.value);
  };
  
  const toggleSettings = () => {
    setSettingsExpanded(!settingsExpanded);
    if (!settingsExpanded && apiKeyExpanded) {
      setApiKeyExpanded(false);
    }
  };
  
  const toggleApiKey = () => {
    setApiKeyExpanded(!apiKeyExpanded);
    if (!apiKeyExpanded && settingsExpanded) {
      setSettingsExpanded(false);
    }
  };
  
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentApiKey(e.target.value);
  };
  
  const handleCustomPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onCustomPromptChange(e.target.value);
    localStorage.setItem('custom-prompt', e.target.value);
  };
  
  const handleCustomPromptEnabledChange = (enabled: boolean) => {
    onEnabledChange(enabled);
    localStorage.setItem('custom-prompt-enabled', enabled.toString());
  };
  
  const saveApiKey = () => {
    // Save to localStorage
    localStorage.setItem('gemini-api-key', currentApiKey);
    
    // Update parent component's state
    if (onApiKeyChange) {
      onApiKeyChange(currentApiKey);
    }
    
    // Save additional API keys
    localStorage.setItem('additional-api-keys', JSON.stringify(additionalApiKeys));
    
    toast.success('API Key(s) saved successfully!');
  };
  
  const addNewApiKey = () => {
    setAdditionalApiKeys([...additionalApiKeys, '']);
  };
  
  const updateAdditionalApiKey = (index: number, value: string) => {
    const updatedKeys = [...additionalApiKeys];
    updatedKeys[index] = value;
    setAdditionalApiKeys(updatedKeys);
  };
  
  const removeAdditionalApiKey = (index: number) => {
    const updatedKeys = [...additionalApiKeys];
    updatedKeys.splice(index, 1);
    setAdditionalApiKeys(updatedKeys);
  };
  
  const getApiKey = () => {
    window.open('https://makersuite.google.com/app/apikey', '_blank');
  };

  return <div className="space-y-0">
      {/* Settings Header */}
      <div className="flex items-center justify-between p-2 rounded cursor-pointer hover:bg-gray-700/40 transition-colors" onClick={toggleSettings}>
        <div className="flex items-center space-x-2">
          <h2 className="text-sm font-medium bg-[#F15A29] text-white px-3 py-1 rounded-full inline-block">Settings</h2>
        </div>
        {settingsExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
      </div>

      {settingsExpanded && <div className="space-y-2 ml-2">
          {/* Silhouette */}
          <FeatureToggle 
            title={t('features.silhouette')} 
            description={t('features.silhouetteDesc')} 
            bullets={["Add \"silhouette\" to the end of the title", "Include \"silhouette\" as a keyword", "Mention silhouette in the description"]} 
            tooltipText="Use this for silhouette-style images to improve their discoverability in marketplaces." 
            enabled={silhouetteEnabled} 
            onEnabledChange={onSilhouetteEnabledChange} 
            footer="Use this for silhouette-style images to improve their discoverability in marketplaces." 
          />
          
          {/* Custom Prompt */}
          <FeatureToggle 
            title={t('features.customPrompt')} 
            description={t('features.customPromptDesc')} 
            tooltipText="Create your own custom prompt for AI-generated metadata. This will override the default prompts while still ensuring proper formatting and keyword count." 
            enabled={enabled} 
            onEnabledChange={handleCustomPromptEnabledChange} 
          />
          
          {enabled && <div className="space-y-1 ml-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">Enter your custom prompt:</span>
                <button onClick={handleResetToDefault} className="text-xs text-blue-400 hover:text-blue-300">
                  {t('general.cancel')}
                </button>
              </div>
              <textarea 
                value={customPrompt} 
                onChange={handleCustomPromptChange} 
                placeholder="Enter your custom prompt here. For example: 'Create Valentine's Day themed metadata for this image.'" 
                className="w-full h-32 px-3 py-2 text-sm rounded-md bg-gray-800 border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" 
              />
            </div>}
          
          {/* Transparent Background */}
          <FeatureToggle 
            title="White Background" 
            description={t('features.silhouetteDesc')} 
            bullets={["Add \"isolated on white background\" to the end of the title", "Include \"white background\" as a keyword", "Mention white background in the description"]} 
            tooltipText="Optimize metadata for isolated objects on white background to improve their discoverability in search results." 
            enabled={transparentBgEnabled} 
            onEnabledChange={onTransparentBgEnabledChange} 
            footer="Use this for isolated objects on white background to improve their discoverability." 
          />
          
          {/* Isolated on Transparent Background */}
          <FeatureToggle 
            title="Transparent Background" 
            description={t('features.silhouetteDesc')} 
            bullets={["Add \"isolated on transparent background\" to the end of the title", "Include \"transparent background\" as a keyword", "Mention transparent background in the description"]} 
            tooltipText="Optimize metadata for isolated objects on transparent background to improve their discoverability in search results." 
            enabled={isolatedOnTransparentBgEnabled} 
            onEnabledChange={onIsolatedOnTransparentBgEnabledChange} 
            footer="Use this for isolated objects on transparent background to improve their discoverability." 
          />
          
          {/* Prohibited Words */}
          <FeatureToggle 
            title={t('features.prohibitedWords')} 
            description="Words that should be avoided in the generated metadata." 
            tooltipText="Words that should be avoided in the generated metadata. The AI will try to exclude these terms from titles, descriptions, and keywords." 
            enabled={prohibitedWordsEnabled} 
            onEnabledChange={onProhibitedWordsEnabledChange} 
          />
          
          {prohibitedWordsEnabled && <div className="space-y-1 ml-4">
              <input 
                type="text" 
                value={prohibitedWords} 
                onChange={handleProhibitedWordsChange} 
                placeholder="Enter words to avoid, separated by commas (e.g., vector, clipart, cartoon)" 
                className="w-full px-3 py-2 text-sm rounded-md bg-gray-800 border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              />
              <p className="text-xs text-gray-400">
                Gemini will avoid using these words in the generated metadata. Separate multiple words with commas.
              </p>
            </div>}
            
          {/* Single Word Keywords */}
          <FeatureToggle 
            title="SINGLE WORD KEYWORDS" 
            description="When enabled, generated keywords will be single words only."
            tooltipText="Use this to ensure all generated keywords contain only single words. This will split any multi-word keywords into individual words." 
            enabled={singleWordKeywordsEnabled} 
            onEnabledChange={onSingleWordKeywordsEnabledChange} 
            footer="Helpful for platforms that prefer single-word keywords instead of phrases." 
          />
        </div>}

      {/* API Key Header */}
      <div className="flex items-center justify-between p-2 rounded cursor-pointer hover:bg-gray-700/40 transition-colors border-t border-gray-700" onClick={toggleApiKey}>
        <div className="flex items-center space-x-2">
          <h2 className="text-sm font-medium bg-[#F15A29] text-white px-3 py-1 rounded-full inline-block">API KEY</h2>
        </div>
        {apiKeyExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
      </div>

      {apiKeyExpanded && <div className="space-y-2 ml-2 mt-2">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400">Gemini API Key:</label>
              {currentApiKey && (
                <button 
                  onClick={() => {
                    // If there are additional API keys, promote the first one to main
                    if (additionalApiKeys.length > 0) {
                      const firstAdditional = additionalApiKeys[0];
                      const remainingKeys = additionalApiKeys.slice(1);
                      
                      // Set the first additional key as the main key
                      setCurrentApiKey(firstAdditional);
                      
                      // Update the additional keys list (remove the promoted key)
                      setAdditionalApiKeys(remainingKeys);
                      
                      // Save changes to localStorage
                      localStorage.setItem('gemini-api-key', firstAdditional);
                      localStorage.setItem('additional-api-keys', JSON.stringify(remainingKeys));
                      
                      // Update parent component's state
                      if (onApiKeyChange) {
                        onApiKeyChange(firstAdditional);
                      }
                      
                      toast.success("Main API key removed. Second API key promoted to main.");
                    } else {
                      // If no additional keys, just clear the main key
                      setCurrentApiKey('');
                      
                      // Save changes to localStorage
                      localStorage.removeItem('gemini-api-key');
                      
                      // Update parent component's state
                      if (onApiKeyChange) {
                        onApiKeyChange('');
                      }
                      
                      toast.info("API key cleared. Please add a new key.");
                    }
                  }}
                  className="text-red-400 hover:text-red-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <input 
              type="text" 
              value={currentApiKey} 
              onChange={handleApiKeyChange} 
              placeholder={t('apiKey.placeholder')}
              className="w-full px-3 py-2 text-sm rounded-md bg-gray-800 border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            />
          </div>
          
          {additionalApiKeys.map((key, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Additional API Key {index + 1}:</label>
                <button 
                  onClick={() => removeAdditionalApiKey(index)}
                  className="text-red-400 hover:text-red-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <input 
                type="text" 
                value={key} 
                onChange={(e) => updateAdditionalApiKey(index, e.target.value)} 
                placeholder="Enter additional API key"
                className="w-full px-3 py-2 text-sm rounded-md bg-gray-800 border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              />
            </div>
          ))}
          
          <div className="flex items-center">
            <Button 
              onClick={addNewApiKey}
              className="flex items-center text-gray-200 bg-[#4c4c4c] hover:bg-gray-700 text-sm py-1 px-3 rounded"
            >
              <Plus className="h-4 w-4 mr-1" /> Add Key
            </Button>
          </div>
          
          <Button
            onClick={saveApiKey}
            className="w-full bg-[#F15A29] hover:bg-[#e04d18] text-white py-2 px-4 rounded transition-colors"
          >
            Save
          </Button>
          
          <div className="mt-2">
            <Button
              onClick={getApiKey}
              className="w-full bg-[#482880] hover:bg-[#3a206e] text-white py-1 px-3 rounded text-xs transition-colors"
            >
              GET API KEY
            </Button>
          </div>
          
          <p className="text-xs text-gray-400 mt-1">
            Add multiple API keys to bypass Gemini's 15 requests/min limit
          </p>
        </div>}
    </div>;
};

export default CustomizationOptions;