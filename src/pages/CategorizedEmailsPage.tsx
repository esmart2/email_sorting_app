import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';

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

  const fetchEmails = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { handleTokenExpired(); return; }

      const { provider_token } = session;
      if (!provider_token) { handleTokenExpired(); return; }

      const res = await fetch('http://localhost:8000/emails/', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'X-Google-Token': provider_token,
          'Content-Type': 'application/json',
        }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        if (res.status === 401) { handleTokenExpired(); return; }
        throw new Error(errData?.detail || 'Failed to fetch emails');
      }

      const emails: Email[] = await res.json();
      const grouped = emails.reduce<EmailsByCategory>((acc, email) => {
        const cat = email.category_id || 'uncategorized';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(email);
        return acc;
      }, {});
      setEmailsByCategory(grouped);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const fetchCategories = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { handleTokenExpired(); return; }

      const { provider_token } = session;
      if (!provider_token) { handleTokenExpired(); return; }

      const res = await fetch('http://localhost:8000/categories/', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'X-Google-Token': provider_token,
        }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        if (res.status === 401) { handleTokenExpired(); return; }
        throw new Error(errData?.detail || 'Failed to fetch categories');
      }

      const cats: Category[] = await res.json();
      setCategories(cats);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleEmailSelection = (emailId: string, gmail_message_id: string) => {
    setSelectedEmails(prev => {
      const next = new Set(prev);
      next.has(gmail_message_id) ? next.delete(gmail_message_id) : next.add(gmail_message_id);
      return next;
    });
  };

  const formatDate = (s: string) => {
    try { return new Date(s).toLocaleDateString(); }
    catch { return s; }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchEmails(), fetchCategories()]);
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

      const response = await fetch('http://localhost:8000/emails/delete', {
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
        const response = await fetch(`http://localhost:8000/emails/unsubscribe/${messageId}`, {
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

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    const id = setInterval(fetchEmails, 30000);
    return () => clearInterval(id);
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
                          onChange={() => handleEmailSelection(email.id, email.gmail_message_id)}
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