import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { Loader2, FileType } from 'lucide-react';
import { GoogleLoginButton } from '@/components/GoogleLoginButton';
import { toast } from 'sonner';

const Auth: React.FC = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = [
    '/images/Robi-Metadata (2).jpg',
    '/images/Robi-Metadata (1).jpg',
  ];
  
  const {
    user,
    isLoading
  } = useAuth();

  // Rotate through all 2 images
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(intervalId); // Clean up on unmount
  }, []);

  // Redirect if already authenticated
  if (!isLoading && user) {
    return <Navigate to="/" replace />;
  }

  const handleGoogleError = (error: any) => {
    console.error('Google authentication error:', error);
    toast.error('Google authentication failed. Please try again.');
  };
  
  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Left section with image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {images.map((image, index) => (
          <img 
            key={image}
            src={image} 
            alt={`Robi Technology Background ${index + 1}`}
            className={`object-cover w-full h-full absolute inset-0 transition-opacity duration-1000 ${
              index === currentImageIndex ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-tr from-black/50 to-transparent z-10">
          {/* Removed the text overlay */}
        </div>
      </div>
      
      {/* Right section with form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 md:p-16">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center">
              <img 
                src="/images/Icon (1).png" 
                alt="CSV PRO Logo" 
                className="h-16 w-auto"
              />
              <span className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400 ml-2 flex items-center">
                CSV PRO
              </span>
            </div>
          </div>
          
          {/* Login Form */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-center mb-2">
              Log in
            </h2>
            <h3 className="text-gray-500 dark:text-gray-400 text-center mb-8">
              Welcome back!
            </h3>
            
            <div className="space-y-5">
              <GoogleLoginButton onError={handleGoogleError} />
              
              <div className="text-center mt-6">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Sign in with your Google account to continue
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-xs">
              By signing in, you agree to our <Link to="/terms" className="text-blue-600 hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
