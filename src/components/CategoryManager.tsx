import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Category {
  id: string;
  user_id: string;
  category_id: string;
  name: string;
  description: string;
  created_at: string;
}

interface Email {
  id: string;
  gmail_message_id: string;
  thread_id: string;
  subject: string;
  body: string;
  summary: string;
  received_at: string;
  archived: boolean;
  created_at: string;
  category_id?: string;
}

interface CategoryManagerProps {
  onCategorySelect: (categoryId: string) => void;
  selectedCategory: string | null;
}

export default function CategoryManager({ onCategorySelect, selectedCategory }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [categoryEmails, setCategoryEmails] = useState<Record<string, Email[]>>({});

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      const { access_token, provider_token } = session;

      const response = await fetch('http://localhost:8000/categories/', {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'X-Google-Token': provider_token || '',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryEmails = async (categoryId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      const { access_token, provider_token } = session;

      const response = await fetch(`http://localhost:8000/categories/${categoryId}/emails`, {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'X-Google-Token': provider_token || '',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch category emails');
      }

      const emails = await response.json();
      setCategoryEmails(prev => ({
        ...prev,
        [categoryId]: emails
      }));
    } catch (err) {
      console.error('Error fetching category emails:', err);
    }
  };

  const createCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      const { access_token, provider_token } = session;

      const response = await fetch('http://localhost:8000/categories/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'X-Google-Token': provider_token || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCategory),
      });

      if (!response.ok) {
        throw new Error('Failed to create category');
      }

      const data = await response.json();
      setCategories([...categories, data]);
      setNewCategory({ name: '', description: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = async (categoryId: string) => {
    if (expandedCategory === categoryId) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(categoryId);
      if (!categoryEmails[categoryId]) {
        await fetchCategoryEmails(categoryId);
      }
      onCategorySelect(categoryId);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <div className="space-y-6">
      {/* Create Category Form */}
      <div className="bg-white shadow-lg rounded-lg border border-gray-200">
        <div className="px-6 py-8">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-6">Create New Category</h3>
          <form onSubmit={createCategory} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Category Name
              </label>
              <input
                type="text"
                id="name"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex justify-center rounded-full border-2 border-black py-2 px-4 text-sm font-medium text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
            >
              {loading ? 'Creating...' : 'Create Category'}
            </button>
          </form>
        </div>
      </div>

      {/* Categories List */}
      <div className="bg-white shadow-lg rounded-lg border border-gray-200">
        <div className="px-6 py-8">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-6">Your Categories</h3>
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <div className="space-y-4">
            {categories.map((category) => (
              <div key={category.id}>
                <div
                  onClick={() => toggleCategory(category.id)}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-medium text-gray-900">{category.name}</h4>
                        <svg
                          className={`h-3 w-3 text-gray-400 transform transition-transform duration-200 ${
                            expandedCategory === category.id ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">{category.description}</p>
                    </div>
                  </div>
                </div>
                {expandedCategory === category.id && (
                  <div className="mt-2 ml-4 space-y-2">
                    {categoryEmails[category.id]?.map((email) => (
                      <div
                        key={email.id}
                        className="bg-white border border-gray-200 rounded-lg p-2 hover:shadow-md transition-shadow duration-200"
                      >
                        <h5 className="text-sm font-medium text-gray-900 truncate">{email.subject}</h5>
                        <p className="mt-0.5 text-xs text-gray-500 truncate">{email.summary}</p>
                        <p className="mt-0.5 text-xs text-gray-400">{formatDate(email.received_at)}</p>
                      </div>
                    ))}
                    {!categoryEmails[category.id]?.length && (
                      <p className="text-sm text-gray-500 italic">No emails in this category</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 