import React from 'react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { FileImage, MessageSquareText } from "lucide-react";
import { useText } from '@/hooks/useText';

export type GenerationMode = 'metadata' | 'imageToPrompt';

interface GenerationModeSelectorProps {
  selectedMode: GenerationMode;
  onModeChange: (mode: GenerationMode) => void;
}

const GenerationModeSelector: React.FC<GenerationModeSelectorProps> = ({
  selectedMode,
  onModeChange
}) => {
  const t = useText();

  return <div className="space-y-2">
      <h3 className="text-sm font-medium text-[#f68003]">{t('sidebar.modeSelection')}</h3>
      <RadioGroup value={selectedMode} onValueChange={value => onModeChange(value as GenerationMode)} className="grid grid-cols-2 gap-2">
        <div className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
          selectedMode === 'metadata' 
            ? 'bg-[#0a1233] border-2 border-[#FF6B00] shadow-sm' 
            : 'bg-[#192048] border border-gray-700 hover:bg-[#132153]'
        }`}>
          <RadioGroupItem value="metadata" id="metadata" className="sr-only" />
          <Label htmlFor="metadata" className="flex items-center justify-center w-full cursor-pointer">
            <span className="text-sm font-medium text-white">Meta Data</span>
          </Label>
        </div>
        
        <div className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
          selectedMode === 'imageToPrompt' 
            ? 'bg-[#0a1233] border-2 border-[#FF6B00] shadow-sm' 
            : 'bg-[#192048] border border-gray-700 hover:bg-[#132153]'
        }`}>
          <RadioGroupItem value="imageToPrompt" id="imageToPrompt" className="sr-only" />
          <Label htmlFor="imageToPrompt" className="flex items-center justify-center w-full cursor-pointer">
            <span className="text-sm font-medium text-white">Image to Prompt</span>
          </Label>
        </div>
      </RadioGroup>
    </div>;
};

export default GenerationModeSelector;
