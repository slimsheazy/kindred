import React, { useState, useEffect, useRef } from 'react';
import { MOCK_JOURNAL_ENTRIES } from '../constants';
import type { JournalEntry, UserData } from '../types';
import { cloudService } from '../services/cloudService';

const JournalEntryCard: React.FC<{ entry: JournalEntry }> = ({ entry }) => (
  <div className="glass-panel rounded-3xl p-6 shadow-lg animate-fade-in-up">
    <div className="flex items-center mb-4">
      <img src={entry.authorImage} alt={entry.author} className="w-10 h-10 rounded-full mr-3 border-2 border-white shadow-sm" />
      <div>
        <p className="font-bold text-slate-800">{entry.author}</p>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{entry.date}</p>
      </div>
    </div>
    <p className="text-slate-700 mb-4 leading-relaxed whitespace-pre-wrap">{entry.text}</p>
    {entry.image && (
        <div className="rounded-2xl overflow-hidden shadow-md border border-white/50 bg-slate-100">
            <img src={entry.image} alt="Journal memory" className="w-full h-auto object-cover max-h-96" />
        </div>
    )}
  </div>
);

const Journal: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newText, setNewText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('bonds_user_data');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setUserData(user);
      loadEntries(user.partnerCode || 'default');
    }
  }, []);

  const loadEntries = async (code: string) => {
    const cloudEntries = await cloudService.getJournalEntries(code);
    if (cloudEntries.length > 0) {
        setEntries(cloudEntries);
    } else {
        // Fix: Removed 'as any' since MOCK_JOURNAL_ENTRIES is now correctly typed
        setEntries(MOCK_JOURNAL_ENTRIES);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim() || !userData) return;

    const entry: JournalEntry = {
      id: Date.now().toString(),
      authorId: userData.id,
      author: userData.userName,
      authorImage: `https://picsum.photos/seed/${userData.id}/100/100`,
      date: 'Just now',
      timestamp: Date.now(),
      text: newText,
      image: selectedImage || undefined
    };

    await cloudService.saveJournalEntry(userData.partnerCode || 'default', entry);
    setEntries([entry, ...entries]);
    setNewText('');
    setSelectedImage(null);
    setShowAdd(false);
  };

  return (
    <div className="p-2 md:p-4 pb-20">
      <header className="mb-8 mt-4 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-light text-white tracking-tight">Shared Journal</h1>
          <p className="text-white/70 mt-1">Synced with {userData?.partnerName || 'Partner'}</p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
            showAdd ? 'bg-rose-500 text-white rotate-45' : 'bg-white text-slate-800'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </header>

      {showAdd && (
        <div className="mb-8 glass-panel rounded-3xl p-6 shadow-xl animate-fade-in-up border-white">
          <h3 className="text-slate-800 font-bold mb-4">Capture a moment...</h3>
          <form onSubmit={handleAddEntry}>
            <textarea 
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="What's on your mind? Thoughts about today, a shared memory, or a note of appreciation..."
              className="w-full h-32 bg-white/40 border border-white/60 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-rose-200 transition-all text-slate-800 placeholder-slate-400"
            />
            
            {selectedImage && (
                <div className="mt-4 relative rounded-2xl overflow-hidden h-40 group">
                    <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                        type="button"
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70 transition-colors"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-3 bg-white/60 text-slate-700 rounded-xl font-medium flex items-center justify-center gap-2 border border-white/80"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
                {isUploading ? 'Loading...' : selectedImage ? 'Change Image' : 'Add Photo'}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageSelect} 
                className="hidden" 
                accept="image/*" 
              />
              <button 
                type="submit"
                disabled={!newText.trim() || isUploading}
                className="flex-[2] py-3 bg-slate-900 text-white rounded-xl font-bold disabled:opacity-50 shadow-lg"
              >
                Save to Journal
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-6">
        {entries.map((entry) => (
          <JournalEntryCard key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
};

export default Journal;