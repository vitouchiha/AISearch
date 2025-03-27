import React from 'react';
import { Save } from 'lucide-react';

interface HeaderProps {
  onSave: () => void;
  isSaving: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onSave, isSaving }) => (
  <header className="border-b border-gray-800 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
    <div className="container mx-auto px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img src="/images/logo.webp" className="w-16 h-16" />
        <h1 className="text-xl font-semibold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
          FilmWhisper
        </h1>
      </div>
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${isSaving ? 'bg-purple-600 opacity-70 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
          }`}
      >
        <Save className="w-4 h-4" />
        {isSaving ? 'Saving...' : 'Generate Manifest!'}
      </button>
    </div>
  </header>
);