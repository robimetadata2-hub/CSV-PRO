import React from 'react';
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Camera, Crown, Diamond, Box, CircleIcon } from 'lucide-react';

export type Platform = 'Freepik' | 'AdobeStock' | 'Shutterstock' | 'Vecteezy' | 'Depositphotos' | '123RF' | 'Alamy' | 'Dreamstime';

interface PlatformSelectorProps {
  selectedPlatforms: Platform[];
  onPlatformChange: (platforms: Platform[]) => void;
}

const platforms: {
  id: Platform;
  icon: React.ReactNode;
  name: string;
  colors: {
    ring: string;
    bg: string;
    glow: string;
  };
}[] = [
  {
    id: 'Alamy',
    icon: <CircleIcon className="h-5 w-5 text-indigo-400" />,
    name: 'General',
    colors: {
      ring: "ring-[#F15A29]",
      bg: "bg-[#F15A29]/10",
      glow: "from-[#F15A29]/30 via-[#F15A29]/20 to-[#e04d18]/10"
    }
  },
  {
    id: 'AdobeStock',
    icon: <span className="text-sm font-bold">St</span>,
    name: 'AdobeStock',
    colors: {
      ring: "ring-[#F15A29]",
      bg: "bg-[#F15A29]/10",
      glow: "from-[#F15A29]/30 via-[#F15A29]/20 to-[#e04d18]/10"
    }
  },
  {
    id: 'Freepik',
    icon: <Crown className="h-5 w-5 text-yellow-400" />,
    name: 'Freepik',
    colors: {
      ring: "ring-[#F15A29]",
      bg: "bg-[#F15A29]/10",
      glow: "from-[#F15A29]/30 via-[#F15A29]/20 to-[#e04d18]/10"
    }
  },
  {
    id: 'Shutterstock',
    icon: <Camera className="h-5 w-5 text-blue-400" />,
    name: 'Shutterstock',
    colors: {
      ring: "ring-[#F15A29]",
      bg: "bg-[#F15A29]/10",
      glow: "from-[#F15A29]/30 via-[#F15A29]/20 to-[#e04d18]/10"
    }
  },
  {
    id: 'Vecteezy',
    icon: <Diamond className="h-5 w-5 text-orange-500" />,
    name: 'Vecteezy',
    colors: {
      ring: "ring-[#F15A29]",
      bg: "bg-[#F15A29]/10",
      glow: "from-[#F15A29]/30 via-[#F15A29]/20 to-[#e04d18]/10"
    }
  },
  {
    id: 'Depositphotos',
    icon: <Diamond className="h-5 w-5 text-blue-500" />,
    name: 'Depositphotos',
    colors: {
      ring: "ring-[#F15A29]",
      bg: "bg-[#F15A29]/10",
      glow: "from-[#F15A29]/30 via-[#F15A29]/20 to-[#e04d18]/10"
    }
  },
  {
    id: '123RF',
    icon: <Box className="h-5 w-5 text-purple-400" />,
    name: '123RF',
    colors: {
      ring: "ring-[#F15A29]",
      bg: "bg-[#F15A29]/10",
      glow: "from-[#F15A29]/30 via-[#F15A29]/20 to-[#e04d18]/10"
    }
  },
  {
    id: 'Dreamstime',
    icon: <CircleIcon className="h-5 w-5 text-green-400" />,
    name: 'Dreamstime',
    colors: {
      ring: "ring-[#F15A29]",
      bg: "bg-[#F15A29]/10",
      glow: "from-[#F15A29]/30 via-[#F15A29]/20 to-[#e04d18]/10"
    }
  }
];

const PlatformSelector: React.FC<PlatformSelectorProps> = ({
  selectedPlatforms,
  onPlatformChange
}) => {
  const togglePlatform = (platform: Platform) => {
    // Changed to only allow single platform selection
    onPlatformChange([platform]);
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium bg-[#F15A29] text-white px-3 py-1 rounded-full inline-block mb-2">PLATFORMS:-</h3>
      <div className="flex overflow-x-auto space-x-2 px-[6px] py-[6px] no-scrollbar">
        {platforms.map(platform => {
          const isSelected = selectedPlatforms.includes(platform.id);
          return (
            <TooltipProvider key={platform.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => togglePlatform(platform.id)}
                    className={cn(
                      "flex items-center space-x-2 rounded-lg px-3 py-1.5 text-sm transition-all relative overflow-hidden",
                      isSelected
                        ? `ring-2 ${platform.colors.ring} ${platform.colors.bg}`
                        : "bg-gray-800 hover:bg-gray-700"
                    )}
                  >
                    {/* Glow Effect Overlay */}
                    <div className={cn(
                      "absolute inset-0 opacity-0 transition-opacity duration-300 rounded-lg pointer-events-none",
                      isSelected
                        ? `bg-gradient-to-r ${platform.colors.glow} opacity-100`
                        : `bg-gradient-to-r ${platform.colors.glow} group-hover:opacity-100`
                    )}
                      style={{
                        boxShadow: isSelected ? `0 0 10px 1px rgba(241, 90, 41, 0.3)` : undefined,
                      }}
                    />
                    <div className="flex h-5 w-5 items-center justify-center rounded bg-gray-700 relative z-10">
                      {platform.icon}
                    </div>
                    <span className="text-sm text-gray-300 relative z-10">{platform.name}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-800 text-gray-200 border-gray-700">
                  <p>{platform.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
};

export default PlatformSelector;
