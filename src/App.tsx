import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './components/Login';
import AccountsPage from './pages/AccountsPage';
import CreateCategoryPage from './pages/CreateCategoryPage';
import CategorizedEmailsPage from './pages/CategorizedEmailsPage';
import EmailDetailPage from './pages/EmailDetailPage';
import { useEffect } from 'react';
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

  useEffect(() => {
    console.log('PrivateRoute state:', { hasUser: !!user, loading });
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

  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const storePrimaryAccount = async (session: any) => {
    try {
      console.log('Store primary account called with session:', {
        hasSession: !!session,
        accessToken: session?.access_token ? 'present' : 'missing',
        providerToken: session?.provider_token ? 'present' : 'missing',
      });

      if (!session?.access_token || !session?.provider_token) {
        console.error('Missing tokens for primary account storage');
        return;
      }

      const response = await fetch(getApiUrl('emails/store-primary-account'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'X-Google-Token': session.provider_token,
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
        
        if (response.status === 401) {
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
      console.log('Auth state changed in AppRoutes:', {
        event,
        hasSession: !!session,
        hasUser: !!user,
        accessToken: session?.access_token ? 'present' : 'missing',
        providerToken: session?.provider_token,
      });

      if (event === 'SIGNED_IN' && session) {
        try {
          // Store primary account first
          await storePrimaryAccount(session);
          
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

    return () => {
      console.log('Cleaning up auth listener...');
      authListener.subscription.unsubscribe();
    };
  }, [navigate, user]);

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
    // Handle the OAuth redirect
    const handleOAuthCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Failed to get session:', error);
          return;
        }

        console.log('Current session:', {
          hasSession: !!session,
          accessToken: session?.access_token ? 'present' : 'missing',
          providerToken: session?.provider_token
        });

        // If we have a hash or code in the URL, try to exchange it
        if (window.location.hash || window.location.search.includes('code=')) {
          console.log('Found OAuth callback data, exchanging...');
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Session exchange failed:', error);
            return;
          }

          console.log('Session after exchange:', {
            hasSession: !!data.session,
            accessToken: data.session?.access_token ? 'present' : 'missing',
            providerToken: data.session?.provider_token
          });
        }
      } catch (err) {
        console.error('OAuth callback error:', err);
      }
    };

    // Call it immediately
    handleOAuthCallback();

    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed in root App:', {
        event,
        hasSession: !!session,
        accessToken: session?.access_token ? 'present' : 'missing',
        providerToken: session?.provider_token
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}
