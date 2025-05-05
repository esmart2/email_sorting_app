import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authInfo, setAuthInfo] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    console.log('Login component mounted');
    
    // Check if we have auth error params in the URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('error')) {
      setError(urlParams.get('error') || 'Authentication error occurred');
    }
    
    // Check if we already have a session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check in Login:', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        providerTokenType: typeof session?.provider_token,
        isProviderTokenPresent: session?.provider_token === 'present'
      });
      
      // If we have a session but the provider token is just "present" (not a real token),
      // we need to re-authenticate
      if (session && session.provider_token === 'present') {
        console.log('Provider token is invalid - showing re-auth message');
        setAuthInfo('Your Google authentication has expired. Please sign in again to refresh your access.');
        // Sign out to clear the invalid session
        supabase.auth.signOut();
        return;
      }
      
      if (session) {
        console.log('Existing session found in Login, redirecting...');
        navigate('/categorized-emails', { replace: true });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed in Login:', {
        event,
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        hasProviderToken: !!session?.provider_token,
        providerTokenType: typeof session?.provider_token,
        isProviderTokenPresent: session?.provider_token === 'present'
      });
      
      if (event === 'SIGNED_IN' && session) {
        // Check for invalid provider token
        if (session.provider_token === 'present') {
          console.log('Signed in but provider token is invalid - showing warning');
          setAuthInfo('Your Google authentication is incomplete. Please sign out and sign in again.');
          return;
        }
        
        navigate('/categorized-emails', { replace: true });
      }
    });

    return () => {
      console.log('Login component unmounting, cleaning up subscription');
      subscription.unsubscribe();
    }
  }, [navigate]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      setAuthInfo(null);
      
      // Clear any existing sessions first to ensure we get fresh tokens
      await supabase.auth.signOut();
      
      // Determine the redirect URL based on environment
      const redirectURL = import.meta.env.PROD 
        ? 'https://email-sorting-app.onrender.com/categorized-emails'
        : `${window.location.origin}/categorized-emails`;

      console.log('Initiating Google OAuth login with redirect URL:', redirectURL);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectURL,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          scopes: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.settings.basic https://www.googleapis.com/auth/gmail.labels email profile'
        }
      });

      if (error) {
        console.error('OAuth error:', error);
        throw error;
      }
      
      if (!data) {
        console.error('No data returned from auth');
        throw new Error('No data returned from auth');
      }

      console.log('Sign in initiated successfully:', {
        hasData: !!data,
        url: data.url
      });
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <svg className="h-12 w-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Welcome to EmailSort
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in to manage your email categories
        </p>
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {authInfo && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-700">{authInfo}</p>
          </div>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </>
            ) : (
              <>
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign in with Google
              </>
            )}
          </button>
          
          {/* Add sign out button if we're in an invalid state */}
          {authInfo && (
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.reload();
              }}
              className="w-full mt-4 flex justify-center items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Sign Out and Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  )
} 