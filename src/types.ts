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
  images: string[];
  allDefs: Definition[];
  printSelected: boolean;
  createdAt: number;
}

export type GameMode = 'review' | 'blanks' | 'spell';
