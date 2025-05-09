import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { supabase } from '../lib/supabase';
import { getApiUrl } from '../lib/config';

interface LinkedAccount {
  email: string;
  created_at: string;
}

export default function AccountsPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  const fetchLinkedAccounts = async () => {
    setActionInProgress(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No session found');
      }

      // Check if provider token is a literal string 'present'
      if (session.provider_token === 'present') {
        console.error('Provider token is literal "present" string, not a real token');
        setError('Invalid provider token. Please sign out and sign in again.');
        return;
      }

      const res = await fetch(getApiUrl('emails/accounts/linked'), {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'X-Google-Token': session.provider_token || '',
          'Content-Type': 'application/json',
        }
      });

      if (!res.ok) {
        const errorData = await res.text();
        console.error('API Error:', {
          status: res.status,
          error: errorData
        });
        throw new Error(`Failed to fetch linked accounts: ${errorData}`);
      }

      const data = await res.json();
      const filteredAccounts = data.filter((account: LinkedAccount) => account.email !== user?.email);
      setLinkedAccounts(filteredAccounts);
    } catch (err) {
      console.error('Error in fetchLinkedAccounts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch linked accounts');
    } finally {
      setActionInProgress(false);
    }
  };

  useEffect(() => {
    if (user && !authLoading) {
      fetchLinkedAccounts();
    }
  }, [user, authLoading]);

  const handleLinkAccount = async () => {
    try {
      setActionInProgress(true);
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error getting session:', error);
        setError('Failed to get authentication session');
        return;
      }

      if (!data.session?.access_token) {
        console.error('No valid session found');
        setError('No active session found');
        return;
      }

      // Store the current URL to return to after linking
      sessionStorage.setItem('returnTo', window.location.pathname);

      // Redirect to backend with Supabase token
      const token = encodeURIComponent(data.session.access_token);
      const redirectUrl = `${getApiUrl('gmail/link')}?token=${token}`;
      
      window.location.href = redirectUrl;

    } catch (err) {
      console.error('Error during account linking:', err);
      setError(err instanceof Error ? err.message : 'Failed to initiate account linking');
    } finally {
      setActionInProgress(false);
    }
  };

  // Show loading state while auth is being checked
  if (authLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center py-12">
          <p className="text-gray-500">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Signed in Accounts</h1>
        {user && (
          <Button
            onClick={handleLinkAccount}
            disabled={actionInProgress}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {actionInProgress ? 'Connecting...' : 'Connect another Gmail inbox'}
          </Button>
        )}
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {user && (
        <div className="space-y-4">
          {/* Primary Account */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium">{user.email}</h2>
                <p className="text-sm text-gray-500">Primary Google Account</p>
              </div>
              <Button
                variant="outline"
                onClick={signOut}
                disabled={actionInProgress}
              >
                {actionInProgress ? 'Signing out...' : 'Sign Out'}
              </Button>
            </div>
          </div>

          {/* Linked Accounts */}
          {linkedAccounts.map(account => (
            <div key={account.email} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium">{account.email}</h2>
                  <p className="text-sm text-gray-500">
                    Connected {new Date(account.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!user && (
        <div className="text-center">
          <p className="text-gray-600 mb-4">No accounts connected</p>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
            disabled={actionInProgress}
          >
            Sign In with Google
          </Button>
        </div>
      )}
    </div>
  );
} 