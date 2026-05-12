import React, { useState, useEffect } from 'react';
import { Search, Loader2, Key, X, Image as ImageIcon } from 'lucide-react';

interface UnsplashPickerProps {
  query: string;
  onSelect: (url: string) => void;
  onClose: () => void;
}

export const UnsplashPicker: React.FC<UnsplashPickerProps> = ({ query, onSelect, onClose }) => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('unsplash_api_key') || '');
  const [isConfiguring, setIsConfiguring] = useState(!localStorage.getItem('unsplash_api_key'));
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(query);
  const [error, setError] = useState('');

  useEffect(() => {
    if (apiKey && !isConfiguring && searchQuery) {
      handleSearch();
    }
  }, [isConfiguring]);

  const handleSaveKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('unsplash_api_key', apiKey.trim());
      setIsConfiguring(false);
      setError('');
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!apiKey) {
      setIsConfiguring(true);
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=12&orientation=landscape`, {
        headers: {
          Authorization: `Client-ID ${apiKey}`
        }
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 401) {
          setError('Invalid API Key. Please check your Unsplash Access Key.');
          setIsConfiguring(true);
        } else {
          setError(data.errors?.[0] || 'Error fetching images');
        }
        setImages([]);
        return;
      }
      
      setImages(data.results || []);
    } catch (err) {
      setError('Network error. Failed to reach Unsplash.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute top-12 right-0 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden transform origin-top-right transition-all print:hidden">
      <div className="bg-slate-50 border-b border-slate-200 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
          <ImageIcon className="w-4 h-4" /> Unsplash Images
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {isConfiguring ? (
        <div className="p-4 space-y-3">
          <div className="text-xs text-slate-600 bg-blue-50 text-blue-800 p-2 rounded border border-blue-100 flex items-start gap-2">
            <Key className="w-4 h-4 shrink-0 mt-0.5" />
            <p>You need a free Unsplash API Key to search directly from the app. You can get one from <a href="https://unsplash.com/developers" target="_blank" rel="noreferrer" className="underline font-bold">Unsplash Developers</a>.</p>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Access Key</label>
            <input 
              type="text" 
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="w-full mt-1 border border-slate-300 rounded px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="YOUR_ACCESS_KEY"
            />
          </div>
          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
          <button 
            onClick={handleSaveKey}
            className="w-full bg-slate-800 text-white py-1.5 rounded text-sm font-bold hover:bg-slate-900 transition-colors"
          >
            Save Key & Continue
          </button>
        </div>
      ) : (
        <div className="p-3">
          <form onSubmit={handleSearch} className="flex gap-2 mb-3">
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="Search images..."
            />
            <button type="submit" className="bg-slate-100 text-slate-600 border border-slate-300 rounded px-3 hover:bg-slate-200 transition-colors">
              <Search className="w-4 h-4" />
            </button>
          </form>
          
          {error && <p className="text-xs text-red-500 font-medium mb-3">{error}</p>}
          
          <div className="h-64 overflow-y-auto pr-1">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : images.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {images.map(img => (
                  <button 
                    key={img.id}
                    onClick={() => onSelect(img.urls.regular)}
                    className="relative group rounded overflow-hidden aspect-video border border-slate-200 hover:border-indigo-500 transition-colors"
                  >
                    <img 
                      src={img.urls.small} 
                      alt={img.alt_description} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-xs font-bold uppercase tracking-wider">Select</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
                No images found for "{searchQuery}"
              </div>
            )}
          </div>
          
          <div className="mt-3 pt-2 border-t border-slate-200 flex justify-between items-center text-[10px]">
            <a href="https://unsplash.com" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-600">Images by Unsplash</a>
            <button onClick={() => setIsConfiguring(true)} className="text-indigo-500 font-medium hover:underline">Change Key</button>
          </div>
        </div>
      )}
    </div>
  );
};
