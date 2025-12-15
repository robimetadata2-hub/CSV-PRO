import React, { useState, useEffect } from 'react';
import { FileType, RefreshCcw, PanelLeftClose, PanelLeftOpen, LogIn, CreditCard, Video, FileVideo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import UserProfile from '@/components/UserProfile';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AppHeaderProps {
  remainingCredits: string | number;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  remainingCredits,
  apiKey,
  onApiKeyChange
}) => {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const navigate = useNavigate();
  const {
    user,
    apiKey: authApiKey
  } = useAuth();
  
  // Load sidebar state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-visible');
    if (savedState !== null) {
      setSidebarVisible(savedState === 'true');
    }
    
    // Apply the sidebar visibility class to the body
    document.body.classList.toggle('sidebar-hidden', !sidebarVisible);
  }, []);

  // Update when authApiKey changes (e.g., when a user logs in)
  useEffect(() => {
    if (authApiKey && !apiKey) {
      onApiKeyChange(authApiKey);
    }
  }, [authApiKey, apiKey, onApiKeyChange]);
  
  const openWhatsAppSupport = () => {
    window.open("https://chat.whatsapp.com/FX3SIHK7Fec63XWh3P06jt", "_blank");
  };
  
  const openTutorialVideo = () => {
    window.open("https://youtu.be/b9vaiQuA2Yw", "_blank");
  };
  
  const openEpsProcessVideo = () => {
    window.open("https://youtu.be/FJL8F1vn55Q?si=dUpFZQlYSFg6Xvi8", "_blank");
  };

  // Get user's profile picture from their metadata or user object
  const getProfilePicture = () => {
    if (!user) return '';
    
    if (user.user_metadata?.avatar_url) {
      return user.user_metadata.avatar_url;
    }
    if (user.user_metadata?.picture) {
      return user.user_metadata.picture;
    }
    
    // Fallback to empty string
    return '';
  };
  
  const navigateToHome = () => {
    navigate('/');
  };
  
  const toggleSidebar = () => {
    const newState = !sidebarVisible;
    setSidebarVisible(newState);
    localStorage.setItem('sidebar-visible', String(newState));
    document.body.classList.toggle('sidebar-hidden', !newState);
    
    // Dispatch a custom event to notify Sidebar component
    window.dispatchEvent(new CustomEvent('toggle-sidebar', { detail: { visible: newState } }));
  };
  
  const handleRefresh = () => {
    window.location.reload();
  };
  
  return <header className="bg-secondary border-b border-gray-700 py-2 px-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <h1 onClick={navigateToHome} className="text-xl font-bold flex items-center cursor-pointer hover:opacity-80 transition-opacity">
            <img src="/paintbrush-logo.png" alt="Robi Technology" className="h-12 w-auto mr-3" />
            <span className="text-[#F15A29] text-xl font-bold">CSV PRO</span>
          </h1>
          
          {/* Sidebar toggle button - Modified to only show the icon */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar}
            className="ml-4 text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors"
            title={sidebarVisible ? "Hide Sidebar" : "Show Sidebar"}
          >
            {sidebarVisible ? 
              <PanelLeftClose className="h-4 w-4" /> : 
              <PanelLeftOpen className="h-4 w-4" />
            }
          </Button>
          
          {/* Refresh button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="ml-2 text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors"
            title="Refresh page"
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Center action buttons */}
        <div className="flex items-center space-x-2 absolute left-1/2 transform -translate-x-1/2">
          {user && <>
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-[#F15A29] text-white border-[#F15A29] hover:bg-[#e04d18] hover:shadow-lg transition-all duration-200 ease-in-out hover:scale-105 rounded-full px-4 font-medium"
              onClick={() => navigate('/pricing')}
            >
              Pricing
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-[#F15A29] text-white border-[#F15A29] hover:bg-[#e04d18] hover:shadow-lg transition-all duration-200 ease-in-out hover:scale-105 rounded-full px-4 font-medium"
              onClick={openTutorialVideo}
            >
              Tutorial
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-[#F15A29] text-white border-[#F15A29] hover:bg-[#e04d18] hover:shadow-lg transition-all duration-200 ease-in-out hover:scale-105 rounded-full px-4 font-medium"
              onClick={openWhatsAppSupport}
            >
              Support
            </Button>
          </>}
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Show the login button for non-authenticated users */}
          {!user && (
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-blue-600 hover:bg-blue-700 text-white border-blue-700 transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1" 
              onClick={() => navigate('/auth')}
            >
              <LogIn className="h-4 w-4 mr-1" />
              Login / Sign Up
            </Button>
          )}
        
          {user && <HoverCard>
              <HoverCardTrigger asChild>
                <div className="h-8 w-8 rounded-full flex items-center justify-center cursor-pointer overflow-hidden">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={getProfilePicture()} alt={user.email} />
                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium">
                      {user.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </HoverCardTrigger>
              <HoverCardContent className="w-80">
                <UserProfile />
              </HoverCardContent>
            </HoverCard>}
        </div>
      </div>
    </header>;
};

export default AppHeader;
