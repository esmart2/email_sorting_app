import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../lib/config';

interface Email {
  id: string;
  gmail_message_id: string;
  subject: string;
  summary: string;
  received_at: string;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

interface EmailsByCategory {
  [categoryId: string]: Email[];
}

export default function CategorizedEmailsPage() {
  const navigate = useNavigate();
  const [emailsByCategory, setEmailsByCategory] = useState<EmailsByCategory>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [actionInProgress, setActionInProgress] = useState(false);

  const handleTokenExpired = async () => {
    setError('Session expired. Please log in again.');
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

  const validateSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('No session available');
      handleTokenExpired();
      return null;
    }

    if (!session.provider_token || session.provider_token === 'present') {
      console.error('Invalid or missing provider token');
      setError('Your Google authentication has expired. Please sign in again.');
      handleTokenExpired();
      return null;
    }

    return session;
  };

  const fetchEmails = async () => {
    console.log('fetchEmails called');
    try {
      const session = await validateSession();
      if (!session) return;

      const apiUrl = getApiUrl('emails');
      console.log('Making API request to:', apiUrl);

      try {
        const res = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'X-Google-Token': session.provider_token || '',
            'Content-Type': 'application/json',
          },
          cache: 'no-store'
        });

        console.log('Emails API response status:', res.status);

        if (!res.ok) {
          const errData = await res.text();
          console.error('Failed to fetch emails response:', errData);
          
          if (res.status === 401) {
            handleTokenExpired();
            return;
          }
          
          throw new Error(errData || 'Failed to fetch emails');
        }

        const emails = await res.json() as Email[];
        console.log(`Received ${emails.length} emails from API`);
        
        const grouped = emails.reduce<EmailsByCategory>((acc, email) => {
          const cat = email.category_id || 'uncategorized';
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(email);
          return acc;
        }, {});
        
        setEmailsByCategory(grouped);
      } catch (fetchError) {
        console.error('Fetch error in fetchEmails:', fetchError);
        throw fetchError;
      }
    } catch (err) {
      console.error('Error in fetchEmails:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const fetchCategories = async () => {
    console.log('fetchCategories called');
    try {
      const session = await validateSession();
      if (!session) return;

      const apiUrl = getApiUrl('categories');
      console.log('Making categories API request to:', apiUrl);
      
      try {
        const res = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'X-Google-Token': session.provider_token || '',
          },
          cache: 'no-store'
        });

        console.log('Categories API response status:', res.status);

        if (!res.ok) {
          const errData = await res.text();
          console.error('Failed to fetch categories response:', errData);
          
          if (res.status === 401) {
            handleTokenExpired();
            return;
          }
          
          throw new Error(errData || 'Failed to fetch categories');
        }

        const cats = await res.json() as Category[];
        console.log(`Received ${cats.length} categories from API`);
        setCategories(cats);
      } catch (fetchError) {
        console.error('Fetch error in fetchCategories:', fetchError);
        throw fetchError;
      }
    } catch (err) {
      console.error('Error in fetchCategories:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleEmailSelection = (gmail_message_id: string) => {
    setSelectedEmails(prev => {
      const next = new Set(prev);
      if (next.has(gmail_message_id)) {
        next.delete(gmail_message_id);
      } else {
        next.add(gmail_message_id);
      }
      return next;
    });
  };

  const formatDate = (s: string) => {
    try { return new Date(s).toLocaleDateString(); }
    catch { return s; }
  };

  const loadData = async () => {
    console.log('loadData called - starting to fetch data');
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchEmails(), fetchCategories()]);
      console.log('All data loaded successfully');
    } catch (err) {
      console.error('Error in loadData:', err);
      setError('Failed to load data. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmails = async () => {
    if (selectedEmails.size === 0) return;
    
    setActionInProgress(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { handleTokenExpired(); return; }

      const { provider_token } = session;
      if (!provider_token) { handleTokenExpired(); return; }

      const response = await fetch(getApiUrl('emails/delete'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'X-Google-Token': provider_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gmail_message_ids: Array.from(selectedEmails)
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        if (response.status === 401) { handleTokenExpired(); return; }
        throw new Error(errData?.detail || 'Failed to delete emails');
      }

      // Clear selection and refresh data
      setSelectedEmails(new Set());
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to delete emails');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleUnsubscribeEmails = async () => {
    if (selectedEmails.size === 0) return;
    setActionInProgress(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { handleTokenExpired(); return; }

      const { provider_token } = session;
      if (!provider_token) { handleTokenExpired(); return; }

      // Process each email sequentially
      for (const messageId of selectedEmails) {
        const response = await fetch(getApiUrl(`emails/unsubscribe/${messageId}`), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'X-Google-Token': provider_token,
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => null);
          if (response.status === 401) { handleTokenExpired(); return; }
          throw new Error(errData?.detail || 'Failed to unsubscribe from emails');
        }
      }

      // Clear selection and refresh data
      setSelectedEmails(new Set());
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to unsubscribe from emails');
    } finally {
      setActionInProgress(false);
    }
  };

  const triggerEmailCollection = async () => {
    try {
      const session = await validateSession();
      if (!session) return;

      const response = await fetch('https://emal-sorting-api.onrender.com/emails/collection', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleTokenExpired();
          return;
        }
        console.error('Email collection trigger failed:', response.status);
      }
    } catch (err) {
      console.error('Error triggering email collection:', err);
    }
  };

  useEffect(() => { 
    console.log('CategorizedEmailsPage mounted - loading data'); 
    loadData(); 
    
    // Initial trigger of email collection
    triggerEmailCollection();
  }, []);

  useEffect(() => {
    // Set up both intervals
    const emailFetchInterval = setInterval(fetchEmails, 30000); // Fetch emails every 30 seconds
    const collectionTriggerInterval = setInterval(triggerEmailCollection, 60000); // Trigger collection every 60 seconds

    // Cleanup both intervals on unmount
    return () => {
      clearInterval(emailFetchInterval);
      clearInterval(collectionTriggerInterval);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Email Categories</h1>
        
        {selectedEmails.size > 0 && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleUnsubscribeEmails}
              disabled={actionInProgress}
            >
              {actionInProgress ? 'Processing...' : `Unsubscribe (${selectedEmails.size})`}
            </Button>
            <Button
              variant="outline"
              onClick={handleDeleteEmails}
              disabled={actionInProgress}
            >
              {actionInProgress ? 'Processing...' : `Delete (${selectedEmails.size})`}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.length ? categories.map(category => (
            <div key={category.id} className="mb-8">
              {/* Category Header */}
              <div className="mb-2">
                <h2 className="text-3xl font-bold mb-2">{category.name}</h2>
                <p className="text-xl mb-4">{category.description}</p>
              </div>
              
              {/* Emails List */}
              <div className="space-y-1">
                {emailsByCategory[category.id]?.length ? (
                  emailsByCategory[category.id].map(email => (
                    <div
                      key={email.id}
                      className="flex items-center bg-white border-2 border-gray-300"
                    >
                      {/* Checkbox */}
                      <div className="px-4">
                        <input
                          type="checkbox"
                          checked={selectedEmails.has(email.gmail_message_id)}
                          onChange={() => handleEmailSelection(email.gmail_message_id)}
                          className="h-5 w-5 border-gray-300"
                        />
                      </div>

                      {/* Email Content */}
                      <div className="flex-1 flex items-center py-2">
                        <div className="flex-1">
                          <div 
                            className="text-lg text-blue-600 hover:text-blue-800 cursor-pointer"
                            onClick={() => navigate(`/email/${email.gmail_message_id}`)}
                          >
                            {email.subject}
                          </div>
                        </div>
                        <div className="px-4 text-gray-600">
                          {formatDate(email.received_at)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xl">
                    No emails in this category yet
                  </div>
                )}
              </div>
            </div>
          )) : (
            <div className="text-center py-6">
              <p className="text-gray-500">No categories found. Create a category to get started!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}