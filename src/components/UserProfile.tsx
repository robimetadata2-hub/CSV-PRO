import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Crown, Infinity, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

const UserProfile: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  
  if (!user || !profile) return null;

  // Show unlimited credits for all users
  const remainingCredits = '∞';

  // Get user's profile picture from their metadata or user object
  // For Google auth, the picture is typically in user.user_metadata.avatar_url
  const getProfilePicture = () => {
    if (user.user_metadata?.avatar_url) {
      return user.user_metadata.avatar_url;
    }
    if (user.user_metadata?.picture) {
      return user.user_metadata.picture;
    }
    // Fallback to first letter of email
    return null;
  };

  const profilePicture = getProfilePicture();

  // Calculate time remaining if premium user
  const getTimeRemaining = () => {
    if (!profile.expiration_date) return null;
    const expirationDate = new Date(profile.expiration_date);
    if (expirationDate < new Date()) return null;
    return formatDistanceToNow(expirationDate, { addSuffix: true });
  };

  const timeRemaining = getTimeRemaining();

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg">
      <div className="p-4 px-4">
        <div className="flex items-center space-x-3">
          <Avatar className="ring-2 ring-blue-500/50">
            <AvatarImage src={profilePicture} alt={user.email} />
            <AvatarFallback className="bg-blue-900">
              {user.email.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-white">{user.email}</p>
            <div className="flex items-center text-sm text-gray-400">
              {profile.is_premium ? (
                <div className="flex items-center text-amber-400">
                  <Crown className="h-3 w-3 mr-1 bg-[#0d0e0d]" />
                  <span className="text-[#01fa01]">Premium User</span>
                  {timeRemaining && (
                    <div className="flex items-center ml-2 text-orange-500">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>{timeRemaining}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center text-amber-400">
                  <Crown className="h-3 w-3 mr-1 bg-[#0d0e0d]" />
                  <span className="text-red-500">Free User</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 space-y-3 border-t border-gray-800">
        <div className="flex items-center justify-between mb-1">
          <span className="text-orange-500 text-xl">Credits remaining</span>
          <div className="flex items-center font-medium text-amber-400">
            <Infinity className="h-4 w-4 mr-1 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-800">
        <Button 
          variant="ghost" 
          className="w-full justify-center text-gray-400 hover:text-white hover:bg-gray-800"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default UserProfile;
