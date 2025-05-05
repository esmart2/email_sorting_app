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
      if (!session?.access_token || !session?.provider_token) return;

      const response = await fetch('http://localhost:8000/emails/store-primary-account', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'X-Google-Token': session.provider_token,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Failed to store primary account:', await response.text());
      }
    } catch (error) {
      console.error('Error storing primary account:', error);
    }
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Store primary account first
        await storePrimaryAccount(session);
        navigate('/categorized-emails', { replace: true });
      }
    });

    return () => {
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

        await fetch('http://localhost:8000/emails/collection', {
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
