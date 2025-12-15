import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Parse the hash from the URL
    const handleAuthCallback = async () => {
      try {
        // Check if we have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
          setError('Authentication failed. Please try again.');
          toast.error('Authentication failed');
          setTimeout(() => navigate('/'), 2000);
          return;
        }

        if (session) {
          toast.success('Successfully signed in!');
          navigate('/');
        } else {
          // Try to exchange the code for a session
          const { error: signInError } = await supabase.auth.getUser();
          
          if (signInError) {
            console.error('Error during auth state change:', signInError);
            setError('Authentication failed. Please try again.');
            toast.error('Authentication failed');
            setTimeout(() => navigate('/'), 2000);
          } else {
            toast.success('Successfully signed in!');
            navigate('/');
          }
        }
      } catch (err) {
        console.error('Error during auth callback:', err);
        setError('An unexpected error occurred. Please try again.');
        toast.error('Authentication error');
        setTimeout(() => navigate('/'), 2000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center text-center p-4">
        <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Authentication Error</h2>
        <p className="text-gray-500 mb-4">{error}</p>
        <p className="text-sm">Redirecting you back...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
      <p className="text-gray-500">Completing authentication, please wait...</p>
    </div>
  );
} 