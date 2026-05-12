import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Printer, Download, Upload, Gamepad2, X, ChevronLeft, ChevronRight, Check, RotateCcw, Library, Edit2, Lock, Link, Image as ImageIcon, Volume2, Folder as FolderIcon, FolderOpen, FolderPlus, MoreVertical, Move, RotateCw, FolderMinus, Settings as SettingsIcon } from 'lucide-react';
import { Flashcard, GameMode, Definition, PrintSettings, Folder } from './types';
import { fetchDefinitions, fetchImages } from './api';
import confetti from 'canvas-confetti';
import { UnsplashPicker } from './components/UnsplashPicker';
import { PrintView } from './components/PrintView';
import { motion, AnimatePresence, Reorder } from 'motion/react';

// --- Helpers ---

export const getPosColors = (pos: string) => {
  switch (pos.toLowerCase()) {
    case 'noun': return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', hover: 'hover:bg-blue-100', printBg: '#eff6ff', printBorder: '#bfdbfe', printText: '#1d4ed8' };
    case 'verb': return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', hover: 'hover:bg-red-100', printBg: '#fef2f2', printBorder: '#fecaca', printText: '#b91c1c' };
    case 'adjective': return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', hover: 'hover:bg-emerald-100', printBg: '#ecfdf5', printBorder: '#a7f3d0', printText: '#047857' };
    case 'adverb': return { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', hover: 'hover:bg-purple-100', printBg: '#faf5ff', printBorder: '#e9d5ff', printText: '#7e22ce' };
    default: return { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-700', hover: 'hover:bg-slate-200', printBg: '#f1f5f9', printBorder: '#cbd5e1', printText: '#334155' };
  }
};

const speak = (text: string) => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
};

const formatInterval = (days: number) => {
  if (days < 0.01) return '10m';
  if (days < 1) {
    const hours = Math.round(days * 24);
    if (hours < 1) return '< 1h';
    return `${hours}h`;
  }
  if (days === 1) return '1d';
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${Math.round(days / 365)}y`;
};

// --- Components ---

const FlashcardPreview = ({ 
  card, 
  onDelete, 
  onUpdate, 
  onTogglePrint,
  folders,
  onMoveToFolder,
  activeFolderId
}: { 
  card: Flashcard, 
  onDelete: (id: string) => void, 
  onUpdate: (id: string, updates: Partial<Flashcard>) => void,
  onTogglePrint: (id: string) => void,
  folders?: Folder[],
  onMoveToFolder?: (cardId: string, folderId: string | undefined) => void,
  activeFolderId?: string,
  includeDefs?: boolean,
  key?: string
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showUnsplash, setShowUnsplash] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  const colors = getPosColors(card.mainPos);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !imgRef.current) return;
    
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    onUpdate(card.id, { 
      imagePosition: { 
        x: Math.max(0, Math.min(100, x)), 
        y: Math.max(0, Math.min(100, y)) 
      } 
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const isEditing = card.isEditing ?? false;
  const isCustomFolder = !!folders?.some(f => f.id === activeFolderId);

  return (
    <div 
      className={`relative bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition-all duration-300 group ${card.printSelected ? 'opacity-100 print-selected' : 'opacity-50 scale-[0.98] print-hidden'}`}
      draggable={!isEditing}
      onDragStart={(e) => {
        if (isEditing) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData('text/plain', card.id);
        e.dataTransfer.effectAllowed = 'move';
        
        // Custom drag image
        const ghost = document.createElement('div');
        ghost.className = 'w-48 h-32 bg-white rounded-2xl shadow-2xl border-4 border-indigo-500 overflow-hidden absolute -left-[9999px] flex items-center justify-center p-4 transform scale-75 opacity-90';
        ghost.innerHTML = `
          <div style="text-align: center;">
            <span style="display: block; font-size: 24px; margin-bottom: 8px;">✨</span>
            <span style="display: block; color: #4338ca; font-weight: bold; font-size: 14px; background: #e0e7ff; padding: 4px 12px; border-radius: 999px;">Moving: ${card.word}</span>
          </div>
        `;
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 96, 64);
        setTimeout(() => document.body.removeChild(ghost), 0);
      }}
    >
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 print:hidden">
        <label className="flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer text-sm font-semibold shadow-sm hover:bg-white transition-colors"
               onClick={(e) => e.stopPropagation()}>
          <input 
            type="checkbox" 
            checked={card.printSelected} 
            onChange={(e) => { e.stopPropagation(); onTogglePrint(card.id); }} 
            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" 
          />
          Select
        </label>
        <button 
          onClick={() => speak(card.word)}
          className="p-1.5 bg-white/90 backdrop-blur rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 shadow-sm transition-colors"
          title="Listen"
        >
          <Volume2 className="w-4 h-4" />
        </button>
      </div>

      <div className="absolute -top-3 -right-3 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-all print:hidden">
        <button 
          onClick={() => onUpdate(card.id, { isEditing: !isEditing })}
          className={`w-8 h-8 ${isEditing ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-slate-500 hover:bg-slate-600'} text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110`}
          title={isEditing ? "Lock Card" : "Edit Card"}
        >
          {isEditing ? <Lock className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
        </button>
        
        {isCustomFolder && (
          <button 
            onClick={(e) => { e.stopPropagation(); onMoveToFolder?.(card.id, undefined); }}
            className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-orange-600 transition-transform hover:scale-110"
            title="Remove from Folder"
          >
            <FolderMinus className="w-4 h-4" />
          </button>
        )}
        
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
          className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-transform hover:scale-110"
          title="Delete Card"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div 
        className={`relative w-full h-48 overflow-hidden rounded-xl border border-slate-100 mb-4 ${isEditing ? 'cursor-move' : ''} group/img`}
        onMouseDown={isEditing ? handleMouseDown : undefined}
        onMouseMove={isEditing ? handleMouseMove : undefined}
        onMouseUp={isEditing ? handleMouseUp : undefined}
        onMouseLeave={isEditing ? handleMouseUp : undefined}
      >
        <img 
          ref={imgRef}
          src={card.mainImg} 
          alt={card.word} 
          draggable={false}
          className="w-full h-full object-cover select-none pointer-events-none"
          style={{ 
            objectPosition: `${card.imagePosition?.x ?? 50}% ${card.imagePosition?.y ?? 50}%` 
          }}
        />
        {isEditing && (
          <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover/img:opacity-100 pointer-events-none">
            <span className="bg-black/50 text-white text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider">Drag to Center</span>
          </div>
        )}
      </div>

      {isEditing && (
        <div className="mb-4 space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {card.images.map((img, idx) => (
              <img 
                key={idx} 
                src={img} 
                onClick={() => onUpdate(card.id, { mainImg: img })}
                className={`w-16 h-12 object-cover rounded-lg cursor-pointer transition-all shrink-0 ${card.mainImg === img ? 'ring-2 ring-indigo-500 scale-105' : 'opacity-60 hover:opacity-100'}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <Link className="w-4 h-4 text-slate-400 shrink-0" />
            <input 
              type="text" 
              placeholder="Paste Image URL (e.g. from Unsplash)..." 
              className="bg-transparent border-none text-xs w-full focus:outline-none text-slate-600"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const url = e.currentTarget.value;
                  if (url) {
                    onUpdate(card.id, { 
                      images: [url, ...card.images],
                      mainImg: url,
                      imagePosition: { x: 50, y: 50 }
                    });
                    e.currentTarget.value = '';
                  }
                }
              }}
            />
            <div className="relative">
              <button 
                onClick={() => setShowUnsplash(!showUnsplash)}
                className="text-[10px] bg-slate-200 text-slate-800 px-2 py-1 rounded hover:bg-slate-300 font-bold whitespace-nowrap flex items-center gap-1"
              >
                <ImageIcon className="w-3 h-3" />
                Unsplash
              </button>
              {showUnsplash && (
                <UnsplashPicker 
                  query={card.word} 
                  onClose={() => setShowUnsplash(false)} 
                  onSelect={(url) => {
                    onUpdate(card.id, { 
                      images: [url, ...card.images],
                      mainImg: url,
                      imagePosition: { x: 50, y: 50 }
                    });
                    setShowUnsplash(false);
                  }} 
                />
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex justify-between items-start gap-2">
          <h2 
            contentEditable={isEditing} 
            suppressContentEditableWarning
            onBlur={(e) => onUpdate(card.id, { word: e.currentTarget.innerText })}
            className={`text-2xl font-bold text-slate-800 outline-none rounded px-1 transition-colors capitalize ${isEditing ? 'hover:bg-yellow-50 focus:bg-yellow-50' : ''}`}
            style={{ wordBreak: 'break-word', overflowWrap: 'break-word', hyphens: 'auto' }}
          >
            {card.word}
          </h2>
          <span 
            contentEditable={isEditing} 
            suppressContentEditableWarning
            onBlur={(e) => onUpdate(card.id, { mainPos: e.currentTarget.innerText })}
            className={`text-xs font-bold italic shrink-0 ${colors.bg} ${colors.text} px-3 py-1 rounded-full border ${colors.border} outline-none ${isEditing ? colors.hover : ''} ${isEditing ? 'focus:' + colors.bg.replace('bg-', 'bg-').replace('100', '200') : ''}`}
          >
            {card.mainPos}
          </span>
        </div>

        <p 
          contentEditable={isEditing} 
          suppressContentEditableWarning
          onBlur={(e) => onUpdate(card.id, { mainDef: e.currentTarget.innerText })}
          className={`text-slate-600 leading-relaxed outline-none rounded px-1 transition-colors text-sm font-medium ${isEditing ? 'hover:bg-yellow-50 focus:bg-yellow-50' : ''}`}
          style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
        >
          {card.mainDef}
        </p>

        {!isEditing && (
          <div className="pt-2 mt-2 border-t border-slate-100/50 flex items-center justify-between text-[10px] font-bold tracking-wider">
            {card.isExcluded ? (
              <button 
                onClick={(e) => { e.stopPropagation(); onUpdate(card.id, { isExcluded: false }); }}
                className="text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1"
                title="Include in Practice"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300" /> Skipped
              </button>
            ) : (!card.reps || card.reps === 0) ? (
              <button 
                onClick={(e) => { e.stopPropagation(); onUpdate(card.id, { isExcluded: true }); }}
                className="text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                title="Exclude from Practice"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300" /> ○ Unstudied
              </button>
            ) : (
              <button 
                onClick={(e) => { e.stopPropagation(); onUpdate(card.id, { isExcluded: true }); }}
                className={`${card.dueDate && card.dueDate <= Date.now() ? "text-indigo-600" : "text-emerald-600"} hover:text-red-500 transition-colors flex items-center gap-1`}
                title="Exclude from Practice"
              >
                <div className={`w-1.5 h-1.5 rounded-full ${card.dueDate && card.dueDate <= Date.now() ? "bg-indigo-500 animate-pulse" : "bg-emerald-500"}`} />
                {card.dueDate && card.dueDate <= Date.now() ? '● Due Now' : `● Next: ${new Date(card.dueDate || 0).toLocaleDateString()}`}
              </button>
            )}
          </div>
        )}

        {isEditing && card.mainDef.length > 120 && (
          <p className="text-[9px] text-amber-600 font-bold bg-amber-50 p-1 rounded border border-amber-100">
            ⚠ Description is very long!
          </p>
        )}

        {isEditing && card.allDefs.filter(d => d.pos.toLowerCase() === card.mainPos.toLowerCase()).length > 1 && (
          <div className="pt-4 mt-2 border-t border-dashed border-slate-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider">Alternative Descriptions</p>
            <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
              {card.allDefs
                .filter(d => d.pos.toLowerCase() === card.mainPos.toLowerCase())
                .filter(d => d.def !== card.mainDef)
                .map((d, idx) => (
                  <button 
                    key={idx}
                    onClick={() => onUpdate(card.id, { mainDef: d.def, mainPos: d.pos })}
                    className="w-full text-left p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-500 hover:bg-indigo-50 hover:border-indigo-100 hover:text-indigo-600 transition-all break-words"
                  >
                    {d.def}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const GameContainer = ({ cards, onExit, onUpdateCard }: { cards: Flashcard[], onExit: () => void, onUpdateCard: (id: string, updates: Partial<Flashcard>) => void }) => {
  const [mode, setMode] = useState<GameMode>('review');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState<{ isCorrect: boolean, message: string } | null>(null);
  const [showSRSButtons, setShowSRSButtons] = useState(false);
  const [selectedSRS, setSelectedSRS] = useState<number | null>(null);

  const currentCard = cards[currentIndex];
  
  // SRS Logic
  const handleSRSResponse = (quality: number) => {
    if (!currentCard) return;
    
    setSelectedSRS(quality);
    
    if (quality === 5) { // 'Easy' - Exclude as requested
      onUpdateCard(currentCard.id, { isExcluded: true });
    } else {
      let nextInterval = 1;
      let nextReps = (currentCard.reps || 0) + 1;

      if (quality === 0) { // 'Again'
        nextInterval = 0.007; // ~10 mins
        nextReps = 0;
      } else if (quality === 2) { // 'Hard'
        nextInterval = 1;
      } else if (quality === 3) { // 'Good'
        nextInterval = 3;
      }

      onUpdateCard(currentCard.id, {
        reps: nextReps,
        interval: nextInterval,
        dueDate: Date.now() + Math.round(nextInterval * 24 * 60 * 60 * 1000)
      });
    }

    setTimeout(() => {
      setSelectedSRS(null);
      nextCard();
    }, 600);
  };

  if (!currentCard || cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Gamepad2 className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">No cards due for practice!</h2>
        <p className="text-slate-500 mb-6">Create some cards or wait until they are due.</p>
        <button onClick={onExit} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold">Back to Editor</button>
      </div>
    );
  }

  const colors = getPosColors(currentCard.mainPos);

  const getNextInterval = (card: Flashcard, quality: number) => {
    if (quality === 0) return 0.007;
    if (quality === 2) return 1;
    if (quality === 3) return 3;
    if (quality === 5) return 0; // Excluded
    return 1;
  };

  const checkAnswer = () => {
    if (!currentCard) return;
    const isCorrect = userInput.toLowerCase().trim() === currentCard.word.toLowerCase().trim();
    setFeedback({
      isCorrect,
      message: isCorrect ? 'Perfect!' : `Oops! It's "${currentCard.word}"`
    });

    if (isCorrect) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4F46E5', '#10B981', '#F59E0B']
      });
      setTimeout(() => nextCard(), 1500);
    } else {
      setTimeout(() => nextCard(), 2500);
    }
  };

  const nextCard = () => {
    setFlipped(false);
    setShowSRSButtons(false);
    setSelectedSRS(null);
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
                <div 
                  className="absolute inset-0 backface-hidden bg-white border border-slate-100 rounded-2xl flex flex-col items-center justify-center p-6 shadow-sm"
                  onClick={() => { setFlipped(!flipped); setShowSRSButtons(true); }}
                >
                  <img src={currentCard.mainImg} className="w-full h-40 object-cover rounded-xl mb-6 border border-slate-50" />
                  <p className="text-lg text-slate-500 italic px-4 line-clamp-3">{currentCard.mainDef}</p>
                  <p className="mt-4 text-xs font-bold text-indigo-400 uppercase tracking-widest">Click to reveal</p>
                </div>
                {/* Back */}
                <div 
                  className={`absolute inset-0 backface-hidden ${colors.bg} rounded-2xl flex flex-col items-center justify-center p-6 text-slate-800 rotate-y-180 shadow-lg border border-slate-100`}
                  onClick={() => setFlipped(!flipped)}
                >
                  <button 
                    onClick={(e) => { e.stopPropagation(); speak(currentCard.word); }}
                    className="absolute top-6 left-6 p-3 bg-white/80 rounded-2xl text-slate-600 hover:text-indigo-600 shadow-sm transition-all hover:scale-110"
                  >
                    <Volume2 className="w-6 h-6" />
                  </button>
                  <h2 className="text-6xl font-black capitalize mb-4">{currentCard.word}</h2>
                  <span className={`px-4 py-1 rounded-full text-sm font-bold border ${colors.border} ${colors.text} bg-white/50`}>{currentCard.mainPos}</span>
                  
                  {showSRSButtons && (
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 px-4 animate-in slide-in-from-bottom-2">
                       {[
                         { q: 0, label: 'Again', color: 'bg-red-500', hover: 'hover:bg-red-600' },
                         { q: 2, label: 'Hard', color: 'bg-amber-500', hover: 'hover:bg-amber-600' },
                         { q: 3, label: 'Good', color: 'bg-emerald-500', hover: 'hover:bg-emerald-600' },
                         { q: 5, label: 'Easy (Skip)', color: 'bg-indigo-500', hover: 'hover:bg-indigo-600' }
                       ].map(btn => (
                         <button 
                           key={btn.q}
                           onClick={(e) => { e.stopPropagation(); handleSRSResponse(btn.q); }} 
                           className={`flex flex-col items-center justify-center px-4 py-2 ${btn.color} ${btn.hover} text-white rounded-xl shadow-lg transition-all ${selectedSRS === btn.q ? 'ring-4 ring-white ring-offset-2 scale-110 z-10' : 'hover:scale-105 hover:-translate-y-1'} ${selectedSRS !== null && selectedSRS !== btn.q ? 'opacity-30 scale-90 blur-[1px]' : ''}`}
                           disabled={selectedSRS !== null}
                         >
                           <span className="text-xs font-black uppercase tracking-wider">{btn.label}</span>
                           <span className="text-[10px] font-bold opacity-80 mt-0.5">
                             {btn.q === 5 ? 'Done' : formatInterval(getNextInterval(currentCard, btn.q))}
                           </span>
                         </button>
                       ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full max-lg space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="relative group">
                <img src={currentCard.mainImg} className="w-full h-56 object-cover rounded-3xl shadow-lg border-4 border-slate-50 mx-auto" />
                <button 
                  onClick={() => speak(currentCard.word)}
                  className="absolute bottom-4 right-4 p-3 bg-white shadow-xl rounded-2xl text-indigo-600 hover:scale-110 transition-transform"
                >
                   <Volume2 className="w-6 h-6" />
                </button>
              </div>
              
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
    </div>
  );
};

export default function App() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | 'all'>('all');
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGameMode, setIsGameMode] = useState(false);
  const [isCustomStudy, setIsCustomStudy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'library' | 'printed' | 'practice'>('library');
  const [printLayout, setPrintLayout] = useState<'1x1' | '2x1' | '2x2'>('1x1');
  const [printIncludeDefs, setPrintIncludeDefs] = useState(true);
  
  const [printSettings, setPrintSettings] = useState<PrintSettings>({
    borderColor: '#cbd5e1',
    borderRadius: 'rounded-2xl',
    showSparkles: false,
    wordBg: '#ffffff',
    posText: '#4f46e5',
    titleColor: '#1e293b'
  });

  const [showPrintWarning, setShowPrintWarning] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [showApiSetup, setShowApiSetup] = useState(false);

  // Creation Flow State
  type CreateStep = 'idle' | 'word-class' | 'definition' | 'image' | 'edit-def';
  const [createStep, setCreateStep] = useState<CreateStep>('idle');
  const [pendingWord, setPendingWord] = useState('');
  const [pendingDefinitions, setPendingDefinitions] = useState<Definition[]>([]);
  const [pendingWordClasses, setPendingWordClasses] = useState<string[]>([]);
  const [selectedPos, setSelectedPos] = useState('');
  const [selectedDef, setSelectedDef] = useState<Definition | null>(null);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [selectedImg, setSelectedImg] = useState('');
  const [editedDefText, setEditedDefText] = useState('');
  const [unsplashSearchQuery, setUnsplashSearchQuery] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('vocab_flashcards_v1');
    const savedFolders = localStorage.getItem('vocab_folders_v1');
    const syncTime = localStorage.getItem('vocab_last_sync');
    if (syncTime) setLastSync(parseInt(syncTime));

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCards(parsed);
      } catch (e) {
        console.error("Failed to load cards", e);
      }
    }

    if (savedFolders) {
      try {
        setFolders(JSON.parse(savedFolders));
      } catch (e) {
        console.error("Failed to load folders", e);
      }
    }
    
    // Check API Key
    const unsplashKey = localStorage.getItem('unsplash_api_key');
    if (!unsplashKey) {
      setTimeout(() => setShowApiSetup(true), 2000);
    }
  }, []);

  const saveData = (newCards: Flashcard[], newFolders: Folder[]) => {
    localStorage.setItem('vocab_flashcards_v1', JSON.stringify(newCards));
    localStorage.setItem('vocab_folders_v1', JSON.stringify(newFolders));
    const now = Date.now();
    localStorage.setItem('vocab_last_sync', now.toString());
    setLastSync(now);
  };

  useEffect(() => {
    if (cards.length > 0 || folders.length > 0) {
      saveData(cards, folders);
    }
  }, [cards, folders]);

  const addFolder = (name: string) => {
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name,
      createdAt: Date.now()
    };
    setFolders(prev => [...prev, newFolder]);
  };

  const deleteFolder = (id: string) => {
    if (confirm("Delete this folder? Cards will return to the Master List.")) {
      setFolders(prev => prev.filter(f => f.id !== id));
      setCards(prev => prev.map(c => c.folderId === id ? { ...c, folderId: undefined } : c));
      if (activeFolderId === id) setActiveFolderId('all');
    }
  };

  const addCard = async () => {
    const word = inputValue.trim();
    if (!word) return;
    
    if (cards.some(c => c.word.toLowerCase() === word.toLowerCase())) {
      if (!window.confirm(`The word "${word}" is already in your library. Add another flashcard for it anyway?`)) {
        return;
      }
    }
    
    setLoading(true);
    setInputValue('');
    
    try {
      const allDefs = await fetchDefinitions(word);
      const classes = Array.from(new Set(allDefs.map(d => d.pos))).filter(Boolean);
      
      setPendingWord(word);
      setPendingDefinitions(allDefs);
      setPendingWordClasses(classes.length > 0 ? classes : ['unknown']);
      setCreateStep('word-class');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleWordClassSelect = (pos: string) => {
    setSelectedPos(pos);
    setCreateStep('definition');
  };

  const handleDefinitionSelect = async (def: Definition | null) => {
    const chosenDef = def || { pos: selectedPos, def: '' };
    setSelectedDef(chosenDef);
    setEditedDefText(chosenDef.def);
    
    setCreateStep('image');
    setLoading(true);
    setUnsplashSearchQuery(pendingWord);
    try {
      const images = await fetchImages(pendingWord, chosenDef.def);
      setPendingImages(images);
    } catch (e) {
      console.error(e);
      setPendingImages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsplashSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    try {
      const searchedImages = await fetchImages(unsplashSearchQuery, selectedDef?.def || '');
      setPendingImages(searchedImages);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (img: string) => {
    setSelectedImg(img);
    setCreateStep('edit-def');
  };

  const finalizeCardCreation = () => {
    const newCard: Flashcard = {
      id: `card-${Date.now()}`,
      word: pendingWord,
      mainPos: selectedPos || 'unknown',
      mainDef: editedDefText || 'Custom description...',
      mainImg: selectedImg || '',
      imagePosition: { x: 50, y: 50 },
      images: pendingImages, // save fetched images for future edits
      allDefs: pendingDefinitions,
      printSelected: true,
      createdAt: Date.now(),
      isEditing: false
    };
    
    setCards(prev => [...prev, newCard]);
    setCreateStep('idle');
  };

  const cancelCardCreation = () => {
    setCreateStep('idle');
  };

  const handlePrint = () => {
    // Mark as printed
    setCards(prev => prev.map(c => c.printSelected ? { ...c, hasBeenPrinted: true } : c));
    
    if (window.self !== window.top) {
      setShowPrintWarning(true);
      setTimeout(() => setShowPrintWarning(false), 8000);
      return;
    }
    window.focus();
    window.print();
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

  const onMoveToFolder = (cardId: string, folderId: string | undefined) => {
    updateCard(cardId, { folderId });
  };

  const posList = Array.from(new Set(cards.map(c => c.mainPos.toLowerCase()))).filter(Boolean).sort();

  const getFilteredCards = () => {
    let filtered = cards;
    if (activeFolderId === 'all') {
      // no filter
    } else if (posList.includes(activeFolderId)) {
      filtered = cards.filter(c => c.mainPos.toLowerCase() === activeFolderId.toLowerCase());
    } else {
      filtered = cards.filter(c => c.folderId === activeFolderId);
    }
    return filtered;
  };

  const resetAllProgress = () => {
    if (confirm("This will reset all Space Repetition memory. Continue?")) {
      setCards(prev => prev.map(c => ({
        ...c,
        reps: 0,
        interval: 0,
        easeFactor: 2.5,
        dueDate: undefined
      })));
    }
  };

  return (
    <>
      <div className="flex h-screen w-full overflow-hidden bg-slate-50 font-sans text-slate-800 print:hidden">
        {/* Sidebar - Theme bg-slate-900 */}
      <div className="w-72 bg-slate-900 flex flex-col shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg">
              F
            </div>
            <div>
              <h1 className="font-black tracking-wide leading-tight">Flashcard Maker</h1>
              <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">by Mr Hemnell</p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 space-y-6 pb-8">
          <nav className="space-y-1">
            <button 
              onClick={() => { setIsGameMode(false); setIsCustomStudy(false); setActiveTab('library'); setActiveFolderId('all'); }}
              onDragOver={(e) => { e.preventDefault(); setDragOverFolderId('all'); e.currentTarget.classList.add('bg-indigo-600/50', 'scale-105', 'z-10'); }}
              onDragLeave={(e) => { setDragOverFolderId(null); e.currentTarget.classList.remove('bg-indigo-600/50', 'scale-105', 'z-10'); }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverFolderId(null);
                e.currentTarget.classList.remove('bg-indigo-600/50', 'scale-105', 'z-10');
                const cardId = e.dataTransfer.getData('text/plain');
                if (cardId) onMoveToFolder(cardId, undefined);
              }}
              className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-300 ${activeTab === 'library' && activeFolderId === 'all' && !isCustomStudy ? 'text-white bg-indigo-600 shadow-lg shadow-indigo-900/40' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              {dragOverFolderId === 'all' ? <FolderOpen className="w-5 h-5 text-indigo-400" /> : <Library className="w-5 h-5" />}
              Library
            </button>
            
            <button 
              onClick={() => { setIsGameMode(false); setIsCustomStudy(false); setActiveTab('printed'); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'printed' ? 'text-white bg-indigo-600 shadow-lg shadow-indigo-900/40' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Printer className="w-5 h-5" />
              Printed Cards
            </button>

            <button 
              onClick={() => { setIsGameMode(true); setIsCustomStudy(false); setActiveTab('practice'); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'practice' ? 'text-white bg-indigo-600 shadow-lg shadow-indigo-900/40' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Gamepad2 className="w-5 h-5" />
              Practice (SRS)
            </button>
          </nav>

          <div>
             <div className="px-4 uppercase text-[10px] font-black text-slate-500 tracking-widest mb-2 flex justify-between items-center">
                <span>Smart Filters</span>
             </div>
             <div className="space-y-1">
               {posList.length === 0 && <p className="px-4 text-[10px] text-slate-700 italic">No words added yet.</p>}
               {posList.map(pos => (
                 <button 
                   key={pos}
                   onClick={() => { setActiveTab('library'); setActiveFolderId(pos); setIsGameMode(false); setIsCustomStudy(false); }}
                   className={`w-full flex items-center justify-between gap-3 px-4 py-2 rounded-lg text-sm font-bold transition-all capitalize ${activeFolderId === pos ? 'text-white bg-indigo-500/20' : 'text-slate-500 hover:bg-slate-800 hover:text-white'}`}
                 >
                   <div className="flex items-center gap-3">
                     <div className={`w-2 h-2 rounded-full ${pos === 'noun' ? 'bg-blue-500' : pos === 'verb' ? 'bg-red-500' : pos === 'adjective' ? 'bg-emerald-500' : pos === 'adverb' ? 'bg-purple-500' : 'bg-slate-400'}`} />
                     {pos}s
                   </div>
                   <span className="text-[10px] opacity-60">{cards.filter(c => c.mainPos.toLowerCase() === pos).length}</span>
                 </button>
               ))}
             </div>
          </div>

          <div>
             <div className="px-4 uppercase text-[10px] font-black text-slate-500 tracking-widest mb-2 flex justify-between items-center">
                <span>My Folders</span>
                <button 
                  onClick={() => {
                    const name = prompt("Folder Name:");
                    if (name) addFolder(name);
                  }}
                  className="p-1 hover:bg-slate-800 rounded transition-colors text-indigo-400"
                >
                  <FolderPlus className="w-4 h-4" />
                </button>
             </div>
             <div className="space-y-1">
               {folders.map(folder => (
                 <div key={folder.id} className="group flex items-center gap-1 pr-1">
                   <button 
                    onClick={() => { setActiveTab('library'); setActiveFolderId(folder.id); setIsGameMode(false); }}
                    onDragOver={(e) => { e.preventDefault(); setDragOverFolderId(folder.id); e.currentTarget.classList.add('bg-indigo-500/40', 'scale-105', 'z-10'); }}
                    onDragLeave={(e) => { setDragOverFolderId(null); e.currentTarget.classList.remove('bg-indigo-500/40', 'scale-105', 'z-10'); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverFolderId(null);
                      e.currentTarget.classList.remove('bg-indigo-500/40', 'scale-105', 'z-10');
                      const cardId = e.dataTransfer.getData('text/plain');
                      if (cardId) onMoveToFolder(cardId, folder.id);
                    }}
                    className={`relative flex-1 flex items-center justify-between gap-3 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${activeFolderId === folder.id ? 'text-white bg-indigo-500/20' : 'text-slate-500 hover:bg-slate-800 hover:text-white'}`}
                   >
                     <div className="flex items-center gap-3">
                       {dragOverFolderId === folder.id ? <FolderOpen className="w-4 h-4 text-indigo-400" /> : <FolderIcon className="w-4 h-4 opacity-70" />}
                       <span className="truncate max-w-[120px]">{folder.name}</span>
                     </div>
                     <span className="text-[10px] opacity-60">{cards.filter(c => c.folderId === folder.id).length}</span>
                   </button>
                   <button 
                    onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }}
                    className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                   >
                     <X className="w-3 h-3" />
                   </button>
                 </div>
               ))}
               {folders.length === 0 && <p className="px-4 text-[10px] text-slate-700 italic">No custom folders yet.</p>}
             </div>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-1">
             <button onClick={resetAllProgress} className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-all rounded-xl text-sm font-bold">
               <RotateCw className="w-5 h-5" />
               Reset Memory
             </button>
             <button onClick={exportData} className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white transition-all rounded-xl text-sm font-bold">
               <Download className="w-5 h-5" />
               Backup JSON
             </button>
             <label className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white transition-all rounded-xl text-sm font-bold cursor-pointer">
               <Upload className="w-5 h-5" />
               Restore JSON
               <input type="file" className="hidden" accept=".json" onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
             </label>
          </div>
        </div>

        <div className="p-6 border-t border-slate-800">
          <button 
            onClick={handlePrint}
            disabled={cards.filter(c => c.printSelected).length === 0}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-lg font-black tracking-wider shadow-lg shadow-indigo-900/50 hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            <Printer className="w-6 h-6" />
            PRINT ({cards.filter(c => c.printSelected).length})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded border border-indigo-100 uppercase tracking-widest">Interactive</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600 font-medium">
              {isGameMode ? 'Practice Module' : 'Vocabulary Library'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {!isGameMode && activeTab === 'printed' && (
              <div className="flex items-center gap-4 pr-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 font-medium hover:text-slate-900 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={printIncludeDefs}
                    onChange={(e) => setPrintIncludeDefs(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  Backs
                </label>
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                  {(['1x1', '2x1', '2x2'] as const).map(layout => (
                    <button
                      key={layout}
                      onClick={() => setPrintLayout(layout)}
                      className={`px-3 py-1.5 text-[10px] uppercase font-bold rounded-md transition-all ${printLayout === layout ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {layout}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => setShowSettings(true)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors flex items-center gap-2"
                >
                  <SettingsIcon className="w-4 h-4" />
                  Settings
                </button>
              </div>
            )}
            {!isGameMode && activeTab === 'library' && (
              <>
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
                <button 
                  onClick={() => { setIsGameMode(true); setIsCustomStudy(true); setActiveTab('library'); }}
                  disabled={cards.filter(c => c.printSelected).length === 0}
                  className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title="Study your printed selection as a custom quiz"
                >
                  <Gamepad2 className="w-4 h-4" />
                  Study Selected ({cards.filter(c => c.printSelected).length})
                </button>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 relative">
          {showPrintWarning && (
            <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded uppercase text-amber-800 text-sm font-bold shadow-sm flex items-center justify-between">
              <div>
                <span className="block mb-1">To print documents properly, please open this app in a New Tab.</span>
                <span className="text-xs text-amber-600/80 normal-case font-medium">If you are using AI Studio preview, click the "Open Developer App" button at the top right of this panel.</span>
              </div>
              <button onClick={() => setShowPrintWarning(false)} className="text-amber-500 hover:text-amber-700">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {isGameMode ? (
            <GameContainer 
              cards={(isCustomStudy 
                ? cards.filter(c => c.printSelected)
                : activeTab === 'practice' 
                  ? (activeFolderId === 'all' 
                      ? cards.filter(c => !c.dueDate || c.dueDate <= Date.now()) 
                      : getFilteredCards().filter(c => !c.dueDate || c.dueDate <= Date.now())
                    )
                  : getFilteredCards()
              ).filter(c => !c.isExcluded)} 
              onExit={() => { setIsGameMode(false); setIsCustomStudy(false); }} 
              onUpdateCard={updateCard} 
            />
          ) : activeTab === 'printed' ? (
            <div className="flex flex-col gap-6">
               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                 <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                   <Printer className="w-5 h-5 text-indigo-600" />
                   Previously Printed Cards
                 </h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cards.filter(c => c.hasBeenPrinted).length === 0 ? (
                      <div className="col-span-full py-12 text-center text-slate-400 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        No cards have been printed yet.
                      </div>
                    ) : (
                      cards.filter(c => c.hasBeenPrinted).map(card => (
                        <FlashcardPreview 
                          key={card.id} 
                          card={card} 
                          onDelete={deleteCard}
                          onUpdate={updateCard}
                          onTogglePrint={togglePrint}
                        />
                      ))
                    )}
                 </div>
               </div>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              <div className="grid grid-cols-2 gap-6">
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
              </div>

              <div id="flashcard-container" className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col transition-all">
                <div className="bg-slate-50 border-b border-slate-200 p-6 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
                   <div className="flex items-center gap-3">
                     <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                       {activeFolderId === 'all' 
                         ? 'Master List' 
                         : ['noun', 'verb', 'adjective', 'adverb'].includes(activeFolderId)
                           ? `${activeFolderId}s Collection`
                           : folders.find(f => f.id === activeFolderId)?.name ?? 'Folder View'
                       }
                     </h3>
                     <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px] font-bold">{getFilteredCards().length} Cards</span>
                   </div>
                   {activeFolderId === 'all' && (
                     <button onClick={clearAll} className="text-xs text-red-500 font-bold hover:underline">Clear Library</button>
                   )}
                </div>
                <div className="p-8">
                  {getFilteredCards().length === 0 ? (
                     <div className="py-24 text-center">
                       <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                         <Library className="w-10 h-10 text-slate-300" />
                       </div>
                       <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No cards found in this category.</p>
                       <p className="text-[10px] text-slate-400 mt-2">Add some words above or move cards here!</p>
                     </div>
                  ) : (
                    <motion.div 
                      layout
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    >
                      <AnimatePresence mode="popLayout">
                        {getFilteredCards().map(card => (
                          <motion.div
                            key={card.id}
                            layout
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.3, type: "spring", bounce: 0.3 }}
                          >
                            <FlashcardPreview 
                              card={card} 
                              onDelete={deleteCard}
                              onUpdate={updateCard}
                              onTogglePrint={togglePrint}
                              folders={folders}
                              onMoveToFolder={onMoveToFolder}
                              activeFolderId={activeFolderId}
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          )}

          {createStep !== 'idle' && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl shrink-0">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 capitalize">"{pendingWord}"</h3>
                    <p className="text-sm text-slate-500">
                      {createStep === 'word-class' && 'Pick the word class'}
                      {createStep === 'definition' && 'Pick the description you want to learn'}
                      {createStep === 'image' && 'Search and pick an image'}
                      {createStep === 'edit-def' && 'Review and edit (optional)'}
                    </p>
                  </div>
                  <button onClick={cancelCardCreation} className="text-slate-400 hover:text-slate-600">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1 h-full">
                  {createStep === 'word-class' && (
                    <div className="grid grid-cols-2 gap-3 h-full pb-4">
                      {pendingWordClasses.map(pos => (
                        <button
                          key={pos}
                          onClick={() => handleWordClassSelect(pos)}
                          className="p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all font-bold text-slate-700 capitalize text-center"
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  )}

                  {createStep === 'definition' && (
                    <div className="space-y-3 pb-4">
                      {pendingDefinitions.filter(d => d.pos.toLowerCase() === selectedPos.toLowerCase()).map((d, i) => (
                        <button
                          key={i}
                          onClick={() => handleDefinitionSelect(d)}
                          className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 group transition-all"
                        >
                          <span className="text-slate-700 font-medium group-hover:text-slate-900 break-words">{d.def}</span>
                        </button>
                      ))}
                      <button
                        onClick={() => handleDefinitionSelect(null)}
                        className="w-full text-left p-4 rounded-xl border border-dashed border-slate-300 text-slate-500 hover:border-slate-400 hover:bg-slate-50 transition-all font-medium text-center"
                      >
                        None of these - I'll write my own
                      </button>
                    </div>
                  )}

                  {createStep === 'image' && (
                    <div className="flex flex-col h-full min-h-[400px]">
                      <form onSubmit={handleUnsplashSearch} className="flex gap-2 shrink-0 mb-4">
                        <input
                          type="text"
                          value={unsplashSearchQuery}
                          onChange={(e) => setUnsplashSearchQuery(e.target.value)}
                          placeholder="Search Unsplash..."
                          className="flex-1 border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
                          {loading ? 'Searching...' : 'Search'}
                        </button>
                      </form>

                      {pendingImages.length > 0 ? (
                         <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-3 content-start pb-4">
                           {pendingImages.map((img, i) => (
                             <button
                               key={i}
                               onClick={() => handleImageSelect(img)}
                               className="relative aspect-[4/3] rounded-xl overflow-hidden group border-2 border-transparent hover:border-indigo-500 transition-all"
                             >
                                <img src={img} alt="Search result" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                  <span className="bg-white text-slate-900 font-bold px-3 py-1 rounded shadow-sm text-sm">Select</span>
                                </div>
                             </button>
                           ))}
                         </div>
                      ) : (
                         <div className="flex-1 flex items-center justify-center text-slate-400 text-center px-8">
                           {loading ? 'Fetching amazing images...' : 'No images found. Try another search term!'}
                         </div>
                      )}
                    </div>
                  )}

                  {createStep === 'edit-def' && (
                     <div className="space-y-4 pb-4">
                        <div className="aspect-[4/3] w-full max-w-sm mx-auto rounded-xl overflow-hidden border border-slate-200">
                          <img src={selectedImg} className="w-full h-full object-cover" alt="Selected" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Finalize Description</label>
                          <textarea
                            value={editedDefText}
                            onChange={(e) => setEditedDefText(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg p-3 text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-32"
                            placeholder="Type description here..."
                          />
                          {editedDefText.length > 120 && (
                            <p className="text-xs text-amber-600 mt-1 font-medium bg-amber-50 p-2 rounded border border-amber-200">
                              Warning: This description is long and may be cut off when printed.
                            </p>
                          )}
                        </div>
                        <button
                          onClick={finalizeCardCreation}
                          className="w-full bg-indigo-600 text-white font-bold text-lg py-3 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                          Create Flashcard
                        </button>
                     </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Footer info removed */}
      </div>
    </div>

    <div className="hidden print:block w-full text-black bg-white">
      <PrintView 
        cards={cards.filter(c => c.printSelected)} 
        layout={printLayout} 
        includeDefs={printIncludeDefs} 
        settings={printSettings}
      />
    </div>

    {showSettings && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden">
        <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <button onClick={() => setShowSettings(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
          
          <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
            <SettingsIcon className="w-6 h-6 text-indigo-500" />
            Settings
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Print Customization</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Border Color</label>
                    <input type="color" value={printSettings.borderColor} onChange={e => setPrintSettings(s => ({...s, borderColor: e.target.value}))} className="w-full h-10 rounded-lg cursor-pointer bg-white" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Background</label>
                    <input type="color" value={printSettings.wordBg} onChange={e => setPrintSettings(s => ({...s, wordBg: e.target.value}))} className="w-full h-10 rounded-lg cursor-pointer bg-white" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Word Color</label>
                    <input type="color" value={printSettings.titleColor} onChange={e => setPrintSettings(s => ({...s, titleColor: e.target.value}))} className="w-full h-10 rounded-lg cursor-pointer bg-white" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Corners</label>
                    <select value={printSettings.borderRadius} onChange={e => setPrintSettings(s => ({...s, borderRadius: e.target.value}))} className="w-full text-sm font-bold p-3 w-full bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500 transition-colors">
                       <option value="rounded-none">Square</option>
                       <option value="rounded-lg">Rounded</option>
                       <option value="rounded-3xl">Pill</option>
                    </select>
                 </div>
                 <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-3 cursor-pointer text-sm font-bold text-slate-700 p-2 hover:bg-slate-100 rounded-lg transition-colors">
                      <input type="checkbox" checked={printSettings.showSparkles} onChange={e => setPrintSettings(s => ({...s, showSparkles: e.target.checked}))} className="rounded text-indigo-600 w-5 h-5" />
                      Show Sparkles
                    </label>
                 </div>
                 <div className="flex flex-col justify-end">
                    <button 
                      onClick={() => setPrintSettings({ borderColor: '#cbd5e1', borderRadius: 'rounded-2xl', showSparkles: false, wordBg: '#ffffff', posText: '#4f46e5', titleColor: '#1e293b' })} 
                      className="text-sm font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 p-2.5 rounded-lg transition-colors w-full"
                    >
                      Reset Defaults
                    </button>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

    {showApiSetup && (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500">
        <div className="bg-white rounded-3xl p-10 max-w-lg w-full shadow-2xl border border-white relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl" />
          
          <div className="relative">
            <div className="w-20 h-20 bg-indigo-600 text-white rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-indigo-200 mx-auto transform -rotate-6">
              <ImageIcon className="w-10 h-10" />
            </div>
            
            <h2 className="text-3xl font-black text-slate-800 mb-4 text-center leading-tight">Image API Required</h2>
            <p className="text-slate-500 mb-8 text-center text-lg leading-relaxed">
              To fetch high-quality images for your vocabulary, you need an <span className="font-bold text-slate-700">Unsplash API Access Key</span>. Without it, the app will use simple placeholders.
            </p>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Unsplash Access Key</label>
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Paste key here (starts with client-id...)" 
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-mono text-sm shadow-sm"
                  onChange={(e) => {
                    localStorage.setItem('unsplash_api_key', e.target.value);
                  }}
                />
              </div>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => setShowApiSetup(false)}
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-1 transition-all"
                >
                  Save & Continue
                </button>
                <button 
                  onClick={() => setShowApiSetup(false)}
                  className="w-full py-4 text-slate-400 font-bold hover:text-slate-600 transition-colors"
                >
                  I'll do this later
                </button>
              </div>

              <div className="pt-6 border-t border-slate-100 text-center">
                <a 
                  href="https://unsplash.com/developers" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:underline bg-indigo-50 px-4 py-2 rounded-full"
                >
                  <Link className="w-4 h-4" /> Get a free developer key here
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .backface-hidden { backface-visibility: hidden; }
        .transform-style-3d { transform-style: preserve-3d; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
}
