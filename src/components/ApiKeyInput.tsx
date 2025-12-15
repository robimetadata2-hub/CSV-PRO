import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Info, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ApiKeyInputProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  compact?: boolean;
}

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ apiKey, onApiKeyChange, compact = false }) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [inputKey, setInputKey] = useState(apiKey);
  const { apiKey: authApiKey } = useAuth();
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [activeKeyIndex, setActiveKeyIndex] = useState(0);

  // Initialize from localStorage only when component mounts - no auto API key
  useEffect(() => {
    const savedKey = localStorage.getItem('gemini-api-key');
    if (savedKey) {
      setInputKey(savedKey);
      onApiKeyChange(savedKey);
    }
    
    // Load multiple API keys if available
    const savedKeys = localStorage.getItem('gemini-api-keys');
    if (savedKeys) {
      try {
        const parsedKeys = JSON.parse(savedKeys);
        if (Array.isArray(parsedKeys) && parsedKeys.length > 0) {
          setApiKeys(parsedKeys);
          // Set first key as input if no key is set
          if (!savedKey) {
            setInputKey(parsedKeys[0]);
            onApiKeyChange(parsedKeys[0]);
          }
        }
      } catch (error) {
        console.error('Failed to parse saved API keys', error);
      }
    }
  }, [onApiKeyChange]);

  // Update when apiKey prop changes
  useEffect(() => {
    if (apiKey) {
      setInputKey(apiKey);
    }
  }, [apiKey]);

  const toggleShowApiKey = () => {
    setShowApiKey(!showApiKey);
  };

  const handleSaveKey = () => {
    if (!inputKey) {
      toast.error('Please enter an API key');
      return;
    }
    
    // Save current key
    localStorage.setItem('gemini-api-key', inputKey);
    onApiKeyChange(inputKey);
    
    // Update keys list if this is a new key
    if (!apiKeys.includes(inputKey)) {
      const updatedKeys = [...apiKeys, inputKey];
      setApiKeys(updatedKeys);
      localStorage.setItem('gemini-api-keys', JSON.stringify(updatedKeys));
      setActiveKeyIndex(updatedKeys.length - 1);
      toast.success('New API key added and saved');
    } else {
      toast.success('API key saved successfully');
    }
  };

  const handleClearKey = () => {
    if (apiKeys.length <= 1) {
      // If this is the last key, clear everything
      localStorage.removeItem('gemini-api-key');
      localStorage.removeItem('gemini-api-keys');
      setInputKey('');
      setApiKeys([]);
      onApiKeyChange('');
      toast.success('API key cleared');
    } else {
      // Remove current key from the list
      const updatedKeys = apiKeys.filter(key => key !== inputKey);
      setApiKeys(updatedKeys);
      localStorage.setItem('gemini-api-keys', JSON.stringify(updatedKeys));
      
      // Set active key to first in list
      setInputKey(updatedKeys[0]);
      localStorage.setItem('gemini-api-key', updatedKeys[0]);
      onApiKeyChange(updatedKeys[0]);
      setActiveKeyIndex(0);
      toast.success('API key removed');
    }
  };

  const handleAddNewKey = () => {
    setInputKey(''); // Clear input for new key
    setActiveKeyIndex(-1); // -1 indicates a new key being added
  };

  const selectKey = (index: number) => {
    const selectedKey = apiKeys[index];
    setInputKey(selectedKey);
    localStorage.setItem('gemini-api-key', selectedKey);
    onApiKeyChange(selectedKey);
    setActiveKeyIndex(index);
    toast.success('Switched to different API key');
  };

  const removeKey = (index: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the selectKey function
    
    const keyToRemove = apiKeys[index];
    const updatedKeys = apiKeys.filter((_, i) => i !== index);
    
    setApiKeys(updatedKeys);
    localStorage.setItem('gemini-api-keys', JSON.stringify(updatedKeys));
    
    if (updatedKeys.length === 0) {
      // If no keys remain
      localStorage.removeItem('gemini-api-key');
      setInputKey('');
      onApiKeyChange('');
      setActiveKeyIndex(-1);
    } else if (keyToRemove === inputKey) {
      // If the active key was removed, switch to the first available key
      setInputKey(updatedKeys[0]);
      localStorage.setItem('gemini-api-key', updatedKeys[0]);
      onApiKeyChange(updatedKeys[0]);
      setActiveKeyIndex(0);
    } else {
      // If another key was removed, adjust the active index if needed
      const newActiveIndex = index < activeKeyIndex ? activeKeyIndex - 1 : activeKeyIndex;
      setActiveKeyIndex(newActiveIndex >= updatedKeys.length ? 0 : newActiveIndex);
    }
    
    toast.success('API key removed');
  };

  if (compact) {
    return (
      <div className="space-y-3">
        {/* API key input field */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={showApiKey ? "text" : "password"}
              placeholder="Enter your Gemini API key"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              className="bg-gray-800 border-gray-700 text-gray-200 focus:ring-amber-500/30 pr-10 h-9"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-gray-400 hover:text-white"
              onClick={toggleShowApiKey}
            >
              {showApiKey ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              <span className="sr-only">
                {showApiKey ? "Hide API Key" : "Show API Key"}
              </span>
            </Button>
          </div>
        </div>
        
        {/* API key chips and Add Key button */}
        <div className="flex flex-nowrap items-center gap-1 mt-1 overflow-x-auto pb-1">
          {apiKeys.map((key, index) => (
            <div 
              key={index}
              onClick={() => selectKey(index)}
              className={`flex items-center px-2 py-1 text-xs rounded cursor-pointer flex-shrink-0 ${
                inputKey === key ? 'bg-[#f68003] text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span className="truncate max-w-[60px]">{key.substring(0, 8)}</span>
            </div>
          ))}
        </div>
        
        <button 
          onClick={handleAddNewKey}
          className="flex items-center text-gray-300 hover:text-white text-sm mt-1"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Key
        </button>
        
        {/* Save/Clear buttons */}
        <div className="flex gap-2 mt-3">
          <Button 
            onClick={handleSaveKey}
            className="bg-[#f68003] hover:bg-[#dd7003] text-white border-none font-medium h-10 flex-1 rounded-md"
          >
            Save
          </Button>
          {inputKey && (
            <Button 
              variant="outline" 
              onClick={handleClearKey}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white font-medium h-10 px-6 rounded-md"
            >
              Clear
            </Button>
          )}
        </div>
        
        {/* Help text */}
        <div className="text-xs text-gray-400">
          <div className="flex items-center gap-1 flex-wrap">
            <span>You need to</span>
            <span className="font-semibold text-[#f68003]">set your own API key</span>
            <span>from</span>
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#f68003] hover:text-[#dd7003] font-medium transition-colors"
            >
              Google Gemini AI
            </a>
          </div>
          
          {/* Rate limit info */}
          <div className="mt-1">
            <span>Add multiple API keys to bypass Gemini's 15 requests/min limit</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg animate-fade-in">
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">API Keys</h2>
          <div className="flex items-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
                    <Info className="h-4 w-4" />
                    <span className="sr-only">API Key Info</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm bg-gray-800 text-gray-200 border-gray-700">
                  <p>Your API keys are stored only in your browser and never sent to our servers. Add multiple keys to bypass Gemini's rate limits.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        {/* API key input field */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={showApiKey ? "text" : "password"}
              placeholder="Enter your Gemini API key"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              className="bg-gray-800 border-gray-700 text-gray-200 focus:ring-amber-500/30 pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-gray-400 hover:text-white"
              onClick={toggleShowApiKey}
            >
              {showApiKey ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              <span className="sr-only">
                {showApiKey ? "Hide API Key" : "Show API Key"}
              </span>
            </Button>
          </div>
          <Button 
            onClick={handleSaveKey}
            className="bg-[#f68003] hover:bg-[#dd7003] text-white border-none"
          >
            Save
          </Button>
          {inputKey && (
            <Button 
              variant="outline" 
              onClick={handleClearKey}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              Clear
            </Button>
          )}
        </div>
        
        {/* Saved keys list */}
        {apiKeys.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {apiKeys.map((key, index) => (
              <div 
                key={index}
                onClick={() => selectKey(index)}
                className={`flex items-center px-3 py-1 text-sm rounded cursor-pointer ${
                  inputKey === key ? 'bg-[#f68003] text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <span className="mr-2 truncate max-w-[80px]">{key.substring(0, 10)}...</span>
                <button 
                  onClick={(e) => removeKey(index, e)} 
                  className="text-gray-400 hover:text-white"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button 
              onClick={handleAddNewKey}
              className="flex items-center px-3 py-1 bg-gray-800 text-gray-300 hover:bg-gray-700 text-sm rounded"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Key
            </button>
          </div>
        )}
        
        {/* Help text */}
        <div className="text-sm text-gray-400 flex items-center gap-2">
          <span>You need to</span>
          <span className="font-semibold text-[#f68003]">set your own API key</span>
          <span>from</span>
          <a 
            href="https://aistudio.google.com/app/apikey" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[#f68003] hover:text-[#dd7003] font-medium transition-colors"
          >
            Google Gemini AI
          </a>
        </div>
        
        {/* Rate limit info */}
        <div className="text-xs text-gray-400 mt-1">
          <span>Add multiple API keys to bypass Gemini's 15 requests/min limit</span>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyInput;
