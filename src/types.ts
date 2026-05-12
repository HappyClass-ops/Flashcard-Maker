export type PartOfSpeech = 'noun' | 'verb' | 'adjective' | 'adverb' | 'preposition' | 'conjunction' | 'pronoun' | 'interjection' | 'unknown';

export interface Definition {
  pos: string;
  def: string;
}

export interface Flashcard {
  id: string;
  word: string;
  mainPos: string;
  mainDef: string;
  mainImg: string;
  imagePosition: { x: number; y: number }; // Percentage 0-100
  images: string[];
  allDefs: Definition[];
  printSelected: boolean;
  createdAt: number;
  isEditing?: boolean;
  hasBeenPrinted?: boolean;
  
  // SRS properties
  dueDate?: number;
  interval?: number;
  easeFactor?: number;
  reps?: number;
  isExcluded?: boolean;
  folderId?: string;
}

export interface Folder {
  id: string;
  name: string;
  icon?: string;
  createdAt: number;
}

export interface PrintSettings {
  borderColor: string;
  borderRadius: string;
  showSparkles: boolean;
  wordBg: string;
  posText: string;
  titleColor: string;
}

export type GameMode = 'review' | 'blanks' | 'spell';
