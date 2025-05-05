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

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

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
        user: session?.user ? 'present' : 'missing'
      });

      if (!session?.access_token || !session?.provider_token) {
        console.error('Missing tokens for primary account storage:', {
          hasAccessToken: !!session?.access_token,
          hasProviderToken: !!session?.provider_token
        });
        return;
      }

      console.log('Attempting to store primary account...');
      const response = await fetch(getApiUrl('emails/store-primary-account'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'X-Google-Token': session.provider_token,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to store primary account:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
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
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}
