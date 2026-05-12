import { Flashcard, Definition } from './types';

export async function fetchWordData(word: string): Promise<Partial<Flashcard>> {
  let allDefs: Definition[] = [];
  try {
    const dictRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (dictRes.ok) {
      const dictData = await dictRes.json();
      if (Array.isArray(dictData) && dictData[0].meanings) {
        dictData[0].meanings.forEach((meaning: any) => {
          meaning.definitions.forEach((d: any) => {
            allDefs.push({ pos: meaning.partOfSpeech, def: d.definition });
          });
        });
      }
    }
  } catch (e) {
    console.error("Dictionary API Error:", e);
  }

  if (allDefs.length === 0) {
    allDefs = [{ pos: 'noun', def: 'Custom definition...' }];
  }
  // Dedup and limit
  allDefs = allDefs.filter((v, i, a) => a.findIndex(t => t.def === v.def) === i).slice(0, 5);

  let images: string[] = [];
  try {
    const wikiRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(word)}&gsrlimit=10&prop=pageimages&pithumbsize=600&format=json&origin=*`
    );
    if (wikiRes.ok) {
      const wikiData = await wikiRes.json();
      if (wikiData.query && wikiData.query.pages) {
        Object.values(wikiData.query.pages).forEach((page: any) => {
          if (page.thumbnail) images.push(page.thumbnail.source);
        });
      }
    }
  } catch (e) {
    console.error("Wiki API Error:", e);
  }

  // Fill with placeholders if needed
  while (images.length < 3) {
    images.push(`https://placehold.co/600x400/f8fafc/94a3b8?text=${encodeURIComponent(word)}`);
  }
  images = images.slice(0, 5);

  return {
    word,
    mainPos: allDefs[0].pos,
    mainDef: allDefs[0].def,
    mainImg: images[0],
    images,
    allDefs,
    printSelected: true,
    createdAt: Date.now()
  };
}
