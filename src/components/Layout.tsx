import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, User, Plus, Folder } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200">
        <div className="flex items-center gap-3 px-6 py-6 border-b border-gray-200">
          <Mail className="h-6 w-6 text-gray-700" />
          <span className="text-xl font-bold text-gray-800">EmailSort</span>
        </div>
        
        <nav className="p-4 space-y-2">
          <button
            onClick={() => navigate('/accounts')}
            className="flex items-center gap-3 w-full px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <User className="h-5 w-5" />
            <span>Signed in accounts</span>
          </button>
          
          <button
            onClick={() => navigate('/create-category')}
            className="flex items-center gap-3 w-full px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Create category</span>
          </button>
          
          <button
            onClick={() => navigate('/categorized-emails')}
            className="flex items-center gap-3 w-full px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Folder className="h-5 w-5" />
            <span>Categorized emails</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
} 