import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Printer, Download, Upload, Gamepad2, X, ChevronLeft, ChevronRight, Check, RotateCcw, Library } from 'lucide-react';
import { Flashcard, GameMode } from './types';
import { fetchWordData } from './api';
import confetti from 'canvas-confetti';

// --- Components ---

const FlashcardPreview = ({ 
  card, 
  onDelete, 
  onUpdate, 
  onTogglePrint 
}: { 
  card: Flashcard, 
  onDelete: (id: string) => void, 
  onUpdate: (id: string, updates: Partial<Flashcard>) => void,
  onTogglePrint: (id: string) => void,
  key?: string
}) => {
  return (
    <div className={`relative bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition-all duration-300 group ${card.printSelected ? 'opacity-100' : 'opacity-50 scale-[0.98]'}`}>
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <label className="flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer text-sm font-semibold shadow-sm hover:bg-white transition-colors">
          <input 
            type="checkbox" 
            checked={card.printSelected} 
            onChange={() => onTogglePrint(card.id)} 
            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" 
          />
          Print
        </label>
      </div>

      <button 
        onClick={() => onDelete(card.id)}
        className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-transform hover:scale-110 z-10 opacity-0 group-hover:opacity-100"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <img 
        src={card.mainImg} 
        alt={card.word} 
        className="w-full h-48 object-cover rounded-xl border border-slate-100 mb-4"
      />

      <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
        {card.images.map((img, idx) => (
          <img 
            key={idx} 
            src={img} 
            onClick={() => onUpdate(card.id, { mainImg: img })}
            className={`w-16 h-12 object-cover rounded-lg cursor-pointer transition-all ${card.mainImg === img ? 'ring-2 ring-indigo-500 scale-105' : 'opacity-60 hover:opacity-100'}`}
          />
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-baseline gap-4">
          <h2 
            contentEditable 
            suppressContentEditableWarning
            onBlur={(e) => onUpdate(card.id, { word: e.currentTarget.innerText })}
            className="text-2xl font-bold text-slate-800 outline-none hover:bg-yellow-50 rounded px-1 transition-colors capitalize whitespace-nowrap overflow-hidden"
          >
            {card.word}
          </h2>
          <span 
            contentEditable 
            suppressContentEditableWarning
            onBlur={(e) => onUpdate(card.id, { mainPos: e.currentTarget.innerText })}
            className="text-xs font-bold italic bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-100 outline-none hover:bg-indigo-100"
          >
            {card.mainPos}
          </span>
        </div>

        <p 
          contentEditable 
          suppressContentEditableWarning
          onBlur={(e) => onUpdate(card.id, { mainDef: e.currentTarget.innerText })}
          className="text-slate-600 leading-relaxed outline-none hover:bg-yellow-50 rounded px-1 transition-colors text-sm font-medium"
        >
          {card.mainDef}
        </p>

        {card.allDefs.length > 1 && (
          <div className="pt-4 mt-2 border-t border-dashed border-slate-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider">Alternative Definitions</p>
            <div className="space-y-2">
              {card.allDefs.map((d, idx) => (
                <button 
                  key={idx}
                  onClick={() => onUpdate(card.id, { mainDef: d.def, mainPos: d.pos })}
                  className="w-full text-left p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-500 hover:bg-indigo-50 hover:border-indigo-100 hover:text-indigo-600 transition-all line-clamp-2"
                >
                  <span className="font-bold mr-1 uppercase text-[9px] opacity-70">{d.pos}</span> {d.def}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const GameContainer = ({ cards, onExit }: { cards: Flashcard[], onExit: () => void }) => {
  const [mode, setMode] = useState<GameMode>('review');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState<{ isCorrect: boolean, message: string } | null>(null);
  const [score, setScore] = useState(0);

  const currentCard = cards[currentIndex];

  const checkAnswer = () => {
    if (!currentCard) return;
    const isCorrect = userInput.toLowerCase().trim() === currentCard.word.toLowerCase().trim();
    setFeedback({
      isCorrect,
      message: isCorrect ? 'Perfect!' : `Oops! It's "${currentCard.word}"`
    });

    if (isCorrect) {
      setScore(s => s + 1);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4F46E5', '#10B981', '#F59E0B']
      });
    }
  };

  const nextCard = () => {
    setFlipped(false);
    setUserInput('');
    setFeedback(null);
    setCurrentIndex((currentIndex + 1) % cards.length);
  };

  const prevCard = () => {
    setFlipped(false);
    setUserInput('');
    setFeedback(null);
    setCurrentIndex((currentIndex - 1 + cards.length) % cards.length);
  };

  const getMissingLetterWord = (word: string) => {
    const chars = word.split('');
    const indices = new Set<number>();
    const count = Math.max(1, Math.floor(word.length / 3));
    while(indices.size < count) {
      indices.add(Math.floor(Math.random() * word.length));
    }
    return chars.map((c, i) => indices.has(i) ? '_' : c).join('');
  };

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Gamepad2 className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">No cards to play with!</h2>
        <p className="text-slate-500 mb-6">Create some cards in the editor first.</p>
        <button onClick={onExit} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold">Back to Editor</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full px-4">
      <div className="flex flex-wrap justify-center gap-3 mb-8">
        <button onClick={onExit} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold border border-red-100 flex items-center gap-2 mr-4">
          <X className="w-4 h-4" /> Exit
        </button>
        {(['review', 'blanks', 'spell'] as GameMode[]).map(m => (
          <button 
            key={m}
            onClick={() => { setMode(m); setFeedback(null); setUserInput(''); setFlipped(false); }}
            className={`px-5 py-2 rounded-xl font-bold transition-all ${mode === m ? 'bg-indigo-600 text-white shadow-lg lg:scale-105' : 'bg-white border border-slate-200 text-slate-400'}`}
          >
            {m === 'review' ? 'Flashcards' : m === 'blanks' ? 'Missing Letters' : 'Spelling Test'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden min-h-[500px] flex flex-col relative group">
        <div className="absolute top-6 right-6 text-slate-400 font-bold bg-slate-50 px-3 py-1 rounded-full text-sm">
          {currentIndex + 1} / {cards.length}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          {mode === 'review' ? (
            <div 
              className={`w-full max-w-md h-80 relative cursor-pointer perspective-1000 group`}
              onClick={() => setFlipped(!flipped)}
            >
              <div className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${flipped ? 'rotate-y-180' : ''}`}>
                {/* Front */}
                <div className="absolute inset-0 backface-hidden bg-white border border-slate-100 rounded-2xl flex flex-col items-center justify-center p-6 shadow-sm">
                  <img src={currentCard.mainImg} className="w-full h-40 object-cover rounded-xl mb-6 border border-slate-50" />
                  <p className="text-lg text-slate-500 italic px-4 line-clamp-3">{currentCard.mainDef}</p>
                  <p className="mt-4 text-xs font-bold text-indigo-400 uppercase tracking-widest">Click to reveal</p>
                </div>
                {/* Back */}
                <div className="absolute inset-0 backface-hidden bg-indigo-600 rounded-2xl flex flex-col items-center justify-center p-6 text-white rotate-y-180 shadow-2xl shadow-indigo-200">
                  <h2 className="text-6xl font-black capitalize mb-2">{currentCard.word}</h2>
                  <span className="bg-indigo-500/50 px-4 py-1 rounded-full text-sm font-bold border border-indigo-400/30">{currentCard.mainPos}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-lg space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <img src={currentCard.mainImg} className="w-full h-56 object-cover rounded-3xl shadow-lg border-4 border-slate-50 mx-auto" />
              
              {mode === 'blanks' && !feedback && (
                <div className="text-5xl font-black text-indigo-600 tracking-[0.2em] font-mono bg-slate-50 p-6 rounded-2xl">
                  {getMissingLetterWord(currentCard.word)}
                </div>
              )}

              <p className="text-xl text-slate-600 font-medium leading-relaxed italic border-l-4 border-indigo-100 pl-6 text-left">
                "{currentCard.mainDef}"
              </p>

              <div className="space-y-4">
                <input 
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !feedback && checkAnswer()}
                  placeholder="Type the word here..."
                  autoFocus
                  disabled={!!feedback}
                  className="w-full text-2xl font-bold bg-white border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none rounded-2xl px-6 py-4 text-center transition-all disabled:bg-slate-50"
                />

                {feedback ? (
                  <div className={`p-6 rounded-2xl animate-in zoom-in-95 duration-300 ${feedback.isCorrect ? 'bg-green-50 border-2 border-green-100 text-green-700' : 'bg-red-50 border-2 border-red-100 text-red-700'}`}>
                    <div className="flex items-center justify-center gap-3 mb-2 font-black text-3xl">
                      {feedback.isCorrect ? <Check className="w-8 h-8" /> : <RotateCcw className="w-8 h-8" />}
                      {feedback.message}
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={checkAnswer}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-1 transition-all"
                  >
                    Check Answer
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-between gap-4">
          <button onClick={prevCard} className="flex-1 py-4 px-6 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-100 flex items-center justify-center gap-2 transition-all">
            <ChevronLeft className="w-5 h-5" /> Previous
          </button>
          <button onClick={nextCard} className="flex-1 py-4 px-6 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 flex items-center justify-center gap-2 transition-all group">
            {currentIndex === cards.length - 1 ? 'Start Over' : 'Next Card'}
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      <div className="mt-8 flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200">
        <p className="text-slate-400 font-bold text-sm tracking-widest uppercase">Current Session Score</p>
        <div className="text-2xl font-black text-indigo-600 bg-indigo-50 px-6 py-1 rounded-full">{score} Correct</div>
      </div>
    </div>
  );
};

export default function App() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGameMode, setIsGameMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'library' | 'games'>('library');

  useEffect(() => {
    const saved = localStorage.getItem('vocab_flashcards_v1');
    if (saved) {
      try {
        setCards(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load cards", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('vocab_flashcards_v1', JSON.stringify(cards));
  }, [cards]);

  const addCard = async () => {
    const word = inputValue.trim();
    if (!word) return;
    
    setLoading(true);
    setInputValue('');
    
    try {
      const cardData = await fetchWordData(word);
      const newCard: Flashcard = {
        id: `card-${Date.now()}`,
        word: cardData.word || word,
        mainPos: cardData.mainPos || 'unknown',
        mainDef: cardData.mainDef || 'Custom definition...',
        mainImg: cardData.mainImg || '',
        images: cardData.images || [],
        allDefs: cardData.allDefs || [],
        printSelected: true,
        createdAt: Date.now()
      };
      setCards(prev => [...prev, newCard]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const deleteCard = (id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
  };

  const updateCard = (id: string, updates: Partial<Flashcard>) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const togglePrint = (id: string) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, printSelected: !c.printSelected } : c));
  };

  const clearAll = () => {
    if (confirm("Are you sure you want to delete all cards?")) {
      setCards([]);
    }
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(cards, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flashcards-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (Array.isArray(data)) {
          setCards(data);
        }
      } catch (err) {
        alert("Invalid file format");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 font-sans text-slate-800">
      {/* Sidebar - Theme bg-slate-900 */}
      <div className="w-64 bg-slate-900 flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold">V</div>
          <span className="text-white font-semibold tracking-tight text-lg">VocabEngine 7</span>
        </div>
        <nav className="flex-1 px-4 space-y-1 mt-4">
          <button 
            onClick={() => { setIsGameMode(false); setActiveTab('library'); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${!isGameMode ? 'text-white bg-indigo-600' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Library className="w-5 h-5" />
            Library
          </button>
          <button 
            onClick={() => { setIsGameMode(true); setActiveTab('games'); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isGameMode ? 'text-white bg-indigo-600' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Gamepad2 className="w-5 h-5" />
            Active Practice
          </button>
          <div className="pt-4 pb-2 px-4 uppercase text-[10px] font-bold text-slate-500 tracking-widest">Storage</div>
          <button onClick={exportData} className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 transition-colors rounded-lg">
            <Download className="w-5 h-5" />
            Backup
          </button>
          <label className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 transition-colors rounded-lg cursor-pointer">
            <Upload className="w-5 h-5" />
            Restore
            <input type="file" className="hidden" accept=".json" onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
          </label>
        </nav>
        <div className="p-6 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            </div>
            <div>
              <p className="text-sm text-white font-medium">Dev Instance</p>
              <p className="text-xs text-slate-400">System Admin</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <span className="px-2 py-1 bg-red-50 text-red-600 text-xs font-bold rounded border border-red-100 italic">V7.0 STABLE</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600 font-medium">
              {isGameMode ? 'Practice Module' : 'Vocabulary Library'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {!isGameMode && (
              <div className="relative">
                <input 
                  type="text" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCard()}
                  placeholder="Add new word..."
                  className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 w-64 transition-all"
                />
                <button 
                  onClick={addCard}
                  disabled={loading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-indigo-600 hover:bg-white rounded transition-colors"
                >
                  {loading ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>
            )}
            <button 
              onClick={() => window.print()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              Export to PDF
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 relative">
          {isGameMode ? (
            <GameContainer cards={cards} onExit={() => setIsGameMode(false)} />
          ) : (
            <div className="flex flex-col gap-8">
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-transform hover:scale-[1.02]">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Library Size</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-slate-800">{cards.length}</p>
                    <p className="text-sm text-slate-400">Cards Collected</p>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-transform hover:scale-[1.02]">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Print Batch</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-emerald-600">{cards.filter(c => c.printSelected).length}</p>
                    <p className="text-sm text-slate-400">Selected</p>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-transform hover:scale-[1.02]">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">System Health</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-emerald-600">100%</p>
                    <p className="text-sm text-slate-400">Running</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
                   <h3 className="text-sm font-bold text-slate-600 uppercase tracking-widest">Master List</h3>
                   <button onClick={clearAll} className="text-xs text-red-500 font-bold hover:underline">Clear Library</button>
                </div>
                <div className="p-6">
                  {cards.length === 0 ? (
                    <div className="py-20 text-center opacity-40">
                      <Library className="w-12 h-12 mx-auto mb-4" />
                      <p className="text-sm font-medium">Your library is currently empty.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {cards.map(card => (
                        <FlashcardPreview 
                          key={card.id} 
                          card={card} 
                          onDelete={deleteCard}
                          onUpdate={updateCard}
                          onTogglePrint={togglePrint}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>

        <div className="h-24 bg-slate-900 mx-8 mb-8 rounded-xl p-4 font-mono text-[11px] text-emerald-400/80 overflow-hidden border border-slate-800 shrink-0 shadow-lg">
          <p>&gt; [SYSTEM] CoreEngine v.7 Initialized...</p>
          <p>&gt; [INFO] Integrity check: OK | Cache: Optimized</p>
          <p>&gt; [READY] Standby for user input...</p>
          <p>&gt; [STATUS] Active Cards: {cards.length} | Session: LocalStorage</p>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          .flex-1 { overflow: visible !important; }
          .print-selected { 
            display: flex !important; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center;
            height: 100vh !important; 
            page-break-after: always;
            border: none !important;
            box-shadow: none !important;
            padding: 80px !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .print-selected img:first-of-type { 
            width: auto !important; 
            height: 50vh !important; 
            max-width: 80% !important;
            margin-bottom: 40px !important;
          }
          .print-selected h2 { font-size: 8rem !important; margin-bottom: 2rem !important; }
          .print-selected span { font-size: 2rem !important; border: 4px solid #4F46E5 !important; padding: 1rem 3rem !important; display: inline-block !important; margin-bottom: 4rem !important; }
          .print-selected p { font-size: 3rem !important; max-width: 90% !important; color: #334155 !important; }
          
          header, .w-64, button, label, .h-24, .grid-cols-3, .bg-slate-50, .absolute, .img-thumbnails, .def-options, .scrollbar-hide { display: none !important; }
          div:not(.print-selected) { display: none !important; }
          div.print-selected * { display: block !important; }
          div.print-selected div.absolute { display: none !important; }
          div.print-selected .img-thumbnails { display: none !important; }
          div.print-selected .def-options { display: none !important; }
          main { padding: 0 !important; }
        }

        .perspective-1000 { perspective: 1000px; }
        .backface-hidden { backface-visibility: hidden; }
        .transform-style-3d { transform-style: preserve-3d; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
