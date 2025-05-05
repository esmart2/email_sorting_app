"use client"
import { Mail, User, Plus, Folder } from 'lucide-react'
import CategoryManager from './CategoryManager'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface SidebarProps {
  onCategorySelect: (categoryId: string | null) => void;
  selectedCategory: string | null;
}

export default function Sidebar({ onCategorySelect, selectedCategory }: SidebarProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  return (
    <aside className="w-72 bg-gray-50 border-r border-gray-200 h-screen flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-3 px-6 py-6 border-b border-gray-200">
          <Mail className="h-7 w-7 text-gray-700" />
          <span className="text-2xl font-bold text-gray-800">EmailSort</span>
        </div>
        <nav className="flex flex-col gap-2 px-6 py-4">
          <a onClick={() => navigate('/accounts')} className="flex items-center gap-2 text-gray-700 text-base py-2 hover:text-black cursor-pointer">
            <User className="h-5 w-5" />
            <span>Signed in accounts</span>
          </a>
          <a onClick={() => navigate('/create-category')} className="flex items-center gap-2 text-gray-700 text-base py-2 hover:text-black cursor-pointer">
            <Plus className="h-5 w-5" />
            <span>Create category</span>
          </a>
          <a onClick={() => navigate('/categorized-emails')} className="flex items-center gap-2 text-gray-700 text-base py-2 hover:text-black cursor-pointer">
            <Folder className="h-5 w-5" />
            <span>Categorized emails</span>
          </a>
          <a onClick={signOut} className="flex items-center gap-2 text-red-600 text-base py-2 hover:text-red-800 cursor-pointer">
            <User className="h-5 w-5" />
            <span>Sign Out</span>
          </a>
        </nav>
        <div className="px-4 pb-4">
          <CategoryManager onCategorySelect={onCategorySelect} selectedCategory={selectedCategory} />
        </div>
      </div>
      <footer className="px-6 py-4 text-xs text-gray-400 border-t border-gray-200">EmailSort v1.0.0</footer>
    </aside>
  )
}
