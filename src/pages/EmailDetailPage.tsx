import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface EmailDetail {
  user_id: string;
  gmail_message_id: string;
  thread_id: string;
  subject: string;
  body: string;
  received_at: string;
  archived: boolean;
  unsubscribe_link: string | null;
  ai_summary: string;
  unsubscribed: boolean;
  category_name: string | null;
  category_description: string | null;
}

export default function EmailDetailPage() {
  const { messageId } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState<EmailDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleTokenExpired = async () => {
    setError('Session expired. Please log in again.');
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

  useEffect(() => {
    const fetchEmailDetail = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { handleTokenExpired(); return; }

        const { provider_token } = session;
        if (!provider_token) { handleTokenExpired(); return; }

        const response = await fetch(`http://localhost:8000/emails/${messageId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'X-Google-Token': provider_token,
          }
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => null);
          if (response.status === 401) { handleTokenExpired(); return; }
          throw new Error(errData?.detail || 'Failed to fetch email details');
        }

        const data = await response.json();
        setEmail(data);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchEmailDetail();
  }, [messageId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Email not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-6"
      >
        ← Back to Categories
      </button>

      {/* Email header */}
      <div className="border-b pb-6">
        <h1 className="text-3xl font-bold mb-4">{email.subject}</h1>
        <div className="text-gray-600">
          Received: {new Date(email.received_at).toLocaleString()}
        </div>
        {email.category_name && (
          <div className="mt-2 inline-block bg-gray-100 px-3 py-1 rounded-full text-sm">
            Category: {email.category_name}
          </div>
        )}
      </div>

      {/* AI Summary */}
      <div className="bg-blue-50 p-6 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">AI Summary</h2>
        <p className="text-gray-800">{email.ai_summary}</p>
      </div>

      {/* Email body */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Email Content</h2>
        <div 
          className="prose max-w-none bg-white p-6 rounded-lg border"
          dangerouslySetInnerHTML={{ __html: email.body }}
        />
      </div>

      {/* Additional details */}
      <div className="bg-gray-50 p-6 rounded-lg space-y-2">
        <h2 className="text-lg font-semibold mb-4">Additional Information</h2>
        {email.unsubscribe_link && (
          <p>
            <span className="font-medium">Unsubscribe Link:</span>{' '}
            <a 
              href={email.unsubscribe_link} 
              className="text-blue-600 hover:text-blue-800"
              target="_blank" 
              rel="noopener noreferrer"
            >
              Click here to unsubscribe
            </a>
          </p>
        )}
        <p>
          <span className="font-medium">Status:</span>{' '}
          {email.unsubscribed ? 'Unsubscribed' : 'Subscribed'}
        </p>
        {email.category_description && (
          <p>
            <span className="font-medium">Category Description:</span>{' '}
            {email.category_description}
          </p>
        )}
      </div>
    </div>
  );
} 