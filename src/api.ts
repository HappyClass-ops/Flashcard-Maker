import { Flashcard, Definition } from './types';

export async function fetchDefinitions(word: string): Promise<Definition[]> {
  let allDefs: Definition[] = [];
  try {
    const dictRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (dictRes.ok) {
      const dictData = await dictRes.json();
      if (Array.isArray(dictData)) {
        dictData.forEach((entry: any) => {
          if (entry.meanings) {
            entry.meanings.forEach((meaning: any) => {
              const pos = meaning.partOfSpeech.toLowerCase();
              
              // HEURISTIC: Filter out obvious junk for common words
              // If we are looking for a common word, "pronoun" or "exclamation" is often 
              // a metadata entry in this API that's not helpful for flashcards.
              if (['pronoun', 'conjunction', 'preposition', 'article'].includes(pos) && word.length > 2) {
                return;
              }

              meaning.definitions.forEach((d: any) => {
                allDefs.push({ pos: meaning.partOfSpeech, def: d.definition });
              });
            });
          }
        });
      }
    }
  } catch (e) {
    console.error("Dictionary API Error:", e);
  }

  if (allDefs.length === 0) {
    allDefs = [{ pos: 'unknown', def: 'Custom description...' }];
  }
  // Dedup
  allDefs = allDefs.filter((v, i, a) => a.findIndex(t => t.def === v.def && t.pos === v.pos) === i);
  
  // Group by POS and take up to 8 per POS
  const groupedDefs: { [pos: string]: Definition[] } = {};
  allDefs.forEach(d => {
    if (!groupedDefs[d.pos]) groupedDefs[d.pos] = [];
    if (groupedDefs[d.pos].length < 8) {
      groupedDefs[d.pos].push(d);
    }
  });

  return Object.values(groupedDefs).flat();
}

export async function fetchImages(word: string, definitionContext: string): Promise<string[]> {
  let images: string[] = [];
  const context = definitionContext.toLowerCase();
  
  // 1. Try Unsplash FIRST if API key is present
  try {
    const unsplashKey = localStorage.getItem('unsplash_api_key');
    if (unsplashKey) {
      // Better search query: word + key aspect of definition
      let query = word;
      if (context.includes("animal")) query += " animal";
      if (context.includes("man") || context.includes("woman") || context.includes("person")) query += " person";
      if (context.includes("food")) query += " food";

      const unsplashRes = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=12&orientation=landscape`, {
        headers: {
          Authorization: `Client-ID ${unsplashKey}`
        }
      });
      if (unsplashRes.ok) {
        const unsplashData = await unsplashRes.json();
        if (unsplashData.results && unsplashData.results.length > 0) {
          images = unsplashData.results.map((img: any) => img.urls.regular);
        }
      }
    }
  } catch (e) {
    console.error("Unsplash API Error:", e);
  }

  // 2. Fall back to Wikipedia/Wikimedia
  if (images.length < 5) {
    try {
      let searchQuery = word;
      if (context.includes("animal") || context.includes("bird")) searchQuery = `${word} animal`;
      else if (context.includes("plant") || context.includes("leaf") || context.includes("tree")) searchQuery = `${word} plant`;
      else if (context.includes("tool") || context.includes("object")) searchQuery = `${word} object`;
      else if (context.includes("person") || context.includes("someone")) searchQuery = `${word} person`;
      
      const searchRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(searchQuery)}&gsrlimit=20&prop=pageimages&pithumbsize=800&format=json&origin=*`
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.query && searchData.query.pages) {
          const results = Object.values(searchData.query.pages) as any[];
          results.forEach(p => {
            const title = p.title.toLowerCase();
            const blacklist = ['flag of', 'map of', 'location of', 'seal of', 'coat of arms', 'biography', 'list of', 'disambiguation'];
            const isBlacklisted = blacklist.some(term => title.includes(term));
            
            if (p.thumbnail && !isBlacklisted && !images.includes(p.thumbnail.source)) {
              images.push(p.thumbnail.source);
            }
          });
        }
      }
    } catch (e) {
      console.error("Wiki API Error:", e);
    }
  }

  while (images.length < 3) {
    images.push(`https://placehold.co/600x400/f8fafc/94a3b8?text=${encodeURIComponent(word)}`);
  }
  return images.slice(0, 5);
}
