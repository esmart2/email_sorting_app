import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './components/Login';
import AccountsPage from './pages/AccountsPage';
import CreateCategoryPage from './pages/CreateCategoryPage';
import CategorizedEmailsPage from './pages/CategorizedEmailsPage';
import EmailDetailPage from './pages/EmailDetailPage';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { getApiUrl } from './lib/config';

// Add error logging
console.log('Environment Variables:', {
  hasSupabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
  hasSupabaseKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
  apiUrl: import.meta.env.VITE_API_URL,
  siteUrl: import.meta.env.VITE_SITE_URL,
  currentUrl: window.location.href
});

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [tokenError, setTokenError] = useState<string | null>(null);

  useEffect(() => {
    console.log('PrivateRoute state:', { hasUser: !!user, loading });
    
    // Check if we have a valid provider token
    async function checkTokens() {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Token check:', {
        hasAccessToken: !!session?.access_token,
        accessTokenType: typeof session?.access_token,
        hasProviderToken: !!session?.provider_token,
        providerTokenType: typeof session?.provider_token,
        providerTokenValue: session?.provider_token ? 
          (session.provider_token === 'present' ? 'LITERAL_PRESENT' : 'VALID_TOKEN') : 'MISSING'
      });
      
      if (session?.provider_token === 'present') {
        console.error('Provider token is literal "present" string, not a real token');
        setTokenError('Your Google authorization has expired. Please sign out and sign in again.');
      }
    }
    
    if (user) {
      checkTokens();
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  if (tokenError) {
    return (
      <Layout>
        <div className="min-h-screen py-8">
          <div className="max-w-2xl mx-auto px-4">
            <div className="bg-red-50 border border-red-300 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-red-700 mb-2">Authentication Error</h2>
              <p className="text-red-700 mb-4">{tokenError}</p>
              <button 
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = '/';
                }}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Sign Out and Try Again
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const storePrimaryAccount = async (session: any) => {
    try {
      console.log('Store primary account called with session:', {
        hasSession: !!session,
        accessToken: session?.access_token ? (typeof session.access_token === 'string' ? 'present' : 'object') : 'missing',
        providerToken: session?.provider_token ? 
          (session.provider_token === 'present' ? 'LITERAL_PRESENT' : 'VALID_TOKEN') : 'MISSING',
        user: session?.user ? 'present' : 'missing'
      });

      if (!session?.access_token) {
        console.error('Missing access token for primary account storage');
        return;
      }

      // FORCE API CALL: Use placeholder for debugging if token is "present"
      let provider_token = session.provider_token;
      if (provider_token === 'present') {
        console.error('Provider token is the literal string "present" - using placeholder for debugging');
        provider_token = 'debug_placeholder_token';
      } else if (!provider_token) {
        console.error('Missing provider token for primary account storage');
        return;
      }

      console.log('🔄 FORCE ATTEMPTING to store primary account...');
      const response = await fetch(getApiUrl('emails/store-primary-account'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'X-Google-Token': provider_token,
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      });

      console.log('Primary account API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to store primary account:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        
        // If we get a 401, the token is invalid - sign out and try again
        if (response.status === 401) {
          console.error('Auth tokens are invalid or expired - signing out');
          await supabase.auth.signOut();
          navigate('/', { replace: true });
        }
      } else {
        console.log('Successfully stored primary account');
      }
    } catch (error) {
      console.error('Error storing primary account:', error);
    }
  };

  useEffect(() => {
    console.log('Setting up auth listener...');
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed in App:', {
        event,
        hasSession: !!session,
        hasUser: !!user,
        accessToken: session?.access_token ? 'present' : 'missing',
        providerToken: session?.provider_token ? 'present' : 'missing',
        user: session?.user ? 'present' : 'missing'
      });

      if (event === 'SIGNED_IN') {
        try {
          // Wait a moment for session to be fully established
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Get fresh session
          const { data: { session: freshSession } } = await supabase.auth.getSession();
          
          if (!freshSession) {
            console.error('No session available after sign in');
            return;
          }

          console.log('Processing sign in with fresh session:', {
            accessToken: freshSession?.access_token ? 'present' : 'missing',
            providerToken: freshSession?.provider_token ? 'present' : 'missing',
            user: freshSession?.user ? 'present' : 'missing'
          });
          
          // Store primary account first
          await storePrimaryAccount(freshSession);
          
          console.log('After storePrimaryAccount, navigating to /categorized-emails');
          navigate('/categorized-emails', { replace: true });
        } catch (error) {
          console.error('Error during sign in process:', error);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('SIGNED_OUT event received, redirecting to login');
        navigate('/', { replace: true });
      }
    });

    // Check initial session with detailed logging
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', {
        hasSession: !!session,
        accessToken: session?.access_token ? 'present' : 'missing',
        providerToken: session?.provider_token ? 'present' : 'missing',
        user: session?.user ? 'present' : 'missing'
      });
    });

    return () => {
      console.log('Cleaning up auth listener...');
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  // Add email collection interval
  useEffect(() => {
    if (!user) return;

    const collectEmails = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { provider_token } = session;
        if (!provider_token) return;

        await fetch(getApiUrl('emails/collection'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'X-Google-Token': provider_token,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.error('Error collecting emails:', error);
      }
    };

    // Initial collection
    collectEmails();

    // Set up interval
    const intervalId = setInterval(collectEmails, 1800000); // 30 minutes

    return () => clearInterval(intervalId);
  }, [user]);

  return (
    <Routes>
      <Route path="/" element={!user ? <Login /> : <Navigate to="/categorized-emails" replace />} />
      
      <Route path="/accounts" element={
        <PrivateRoute>
          <AccountsPage />
        </PrivateRoute>
      } />
      
      <Route path="/create-category" element={
        <PrivateRoute>
          <CreateCategoryPage />
        </PrivateRoute>
      } />
      
      <Route path="/categorized-emails" element={
        <PrivateRoute>
          <CategorizedEmailsPage />
        </PrivateRoute>
      } />

      <Route path="/email/:messageId" element={
        <PrivateRoute>
          <EmailDetailPage />
        </PrivateRoute>
      } />
    </Routes>
  );
}

export default function App() {
  useEffect(() => {
    // Add error event listener
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
    });

    // Add unhandled promise rejection listener
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
    });

    // Handle the OAuth redirect and token exchange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        console.log('Auth state changed in App:', {
          event,
          hasSession: !!session,
          accessToken: session?.access_token ? 'present' : 'missing',
          providerToken: session?.provider_token
        });
      }
    });

    // Get the hash fragment from the URL
    const hashFragment = window.location.hash;
    if (hashFragment) {
      console.log('Found hash fragment, exchanging tokens...');
      supabase.auth.getSession()
        .then(({ data: { session } }) => {
          console.log('Session after URL exchange:', {
            hasSession: !!session,
            accessToken: session?.access_token ? 'present' : 'missing',
            providerToken: session?.provider_token
          });
        })
        .catch(console.error);
    }

    return () => {
      console.log('Cleaning up auth listener...');
      subscription.unsubscribe();
    };
  }, []);

  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}
