import React from 'react';
import { Bot, Key, BookOpen } from 'lucide-react';


export type Tab = 'ai' | 'apis' | 'trakt' | 'simkl' | 'extra-catalogs';

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => (
  <nav className="bg-black/98 space-y-1">
    <button
      type="button"
      onClick={() => setActiveTab('ai')}
      className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'ai'
          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
          : 'hover:bg-white/5 text-gray-400 border border-transparent'
        }`}
    >
      <Bot className="w-5 h-5" />
      <span className="font-medium">AI Providers</span>
    </button>
    <button
      type="button"
      onClick={() => setActiveTab('apis')}
      className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'apis'
          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
          : 'hover:bg-white/5 text-gray-400 border border-transparent'
        }`}
    >
      <Key className="w-5 h-5" />
      <span className="font-medium">API Keys</span>
    </button>
    <button
      type="button"
      onClick={() => setActiveTab('trakt')}
      className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'trakt'
          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
          : 'hover:bg-white/5 text-gray-400 border border-transparent'
        }`}
    >
      <img src="/images/icons/Trakt.svg" alt="Trakt Icon" className="w-5 h-5" />
      <span className="font-medium">Trakt</span>
    </button>
    <button
      type="button"
      disabled
      onClick={() => setActiveTab('simkl')}
      className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'simkl'
          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
          : 'hover:bg-white/5 text-gray-400 border border-transparent'
        }`}
    >
      <img src="/images/icons/Simkl.svg" alt="Simkl Icon" className="w-5 h-5" />
      <span className="font-medium">Simkl (coming soon)</span>
    </button>
    <button
      type="button"
      onClick={() => setActiveTab('extra-catalogs')}
      className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'extra-catalogs'
          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
          : 'hover:bg-white/5 text-gray-400 border border-transparent'
        }`}
    >
      <BookOpen className="w-5 h-5" />
      <span className="font-medium">Additional Catalogs</span>
    </button>
  </nav>
);