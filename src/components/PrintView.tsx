import React from 'react';
import { Flashcard, PrintSettings } from '../types';
import { getPosColors } from '../App';

interface PrintViewProps {
  cards: Flashcard[];
  layout: '1x1' | '2x1' | '2x2';
  includeDefs: boolean;
  settings: PrintSettings;
}

export const PrintView: React.FC<PrintViewProps> = ({ cards, layout, includeDefs, settings }) => {
  if (cards.length === 0) return null;

  const getCustomStyles = () => `
    .print-card-front, .print-card-back { 
      border-color: ${settings.borderColor} !important; 
      background-color: ${settings.wordBg} !important;
      border-radius: ${settings.borderRadius === 'rounded-none' ? '0' : settings.borderRadius === 'rounded-lg' ? '1rem' : '2.5rem'} !important;
    }
    .print-card-front h2 { color: ${settings.titleColor} !important; }
    .print-pos-tag { color: ${settings.posText} !important; }
    ${settings.showSparkles ? `
      .print-card-front::before {
        content: '✨';
        position: absolute;
        top: 1rem;
        right: 1rem;
        font-size: 2rem;
      }
      .print-card-front::after {
        content: '✨';
        position: absolute;
        bottom: 1rem;
        left: 1rem;
        font-size: 2rem;
      }
    ` : ''}
  `;

  if (layout === '1x1') {
    return (
      <div className="print-container font-sans">
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            @page { size: portrait; margin: 0; }
            ${getCustomStyles()}
            .print-container { background: white; color: black; }
            .print-page { width: 100vw; height: 100vh; page-break-after: always; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; box-sizing: border-box; background: white; }
            .print-card-front, .print-card-back { width: 100%; height: 100%; border-width: 4px; border-style: solid; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; padding: 4rem; text-align: center; position: relative; }
            .print-card-front img { width: 100%; height: 60%; object-fit: cover; border-radius: 1rem; margin-bottom: 3rem; }
            .print-card-front h2 { font-size: 8rem; font-weight: 800; margin: 0; text-transform: capitalize; overflow-wrap: break-word; word-wrap: break-word; word-break: break-word; max-width: 100%; }
            .print-pos-tag { font-size: 2.5rem; font-weight: 700; border: 4px solid currentColor; padding: 1rem 3rem; border-radius: 999px; margin-bottom: 3rem; max-width: 90%; overflow-wrap: break-word; }
            .print-card-back p { font-size: 5rem; font-weight: 600; color: #334155; line-height: 1.5; max-width: 90%; display: -webkit-box; -webkit-line-clamp: 8; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: break-word; }
          }
        `}} />
        {cards.map((card) => {
          const colors = getPosColors(card.mainPos);
          return (
            <React.Fragment key={card.id}>
              <div className="print-page">
                <div className="print-card-front">
                  {card.mainImg && (
                    <img 
                      src={card.mainImg} 
                      alt={card.word}
                      style={{ objectPosition: `${card.imagePosition?.x ?? 50}% ${card.imagePosition?.y ?? 50}%` }}
                    />
                  )}
                  <div className="print-pos-tag">
                    {card.mainPos}
                  </div>
                  <h2>{card.word}</h2>
                </div>
              </div>
              <div className="print-page">
                <div className="print-card-back">
                  <p>{includeDefs ? card.mainDef : ' '}</p>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  const getGridStyles = () => {
    if (layout === '2x1') {
      return `
        @page { size: landscape; margin: 0; }
        .print-page { width: 100vw; height: 100vh; page-break-after: always; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr; background: white; overflow: hidden; }
      `;
    }
    return `
      @page { size: portrait; margin: 0; }
      .print-page { width: 100vw; height: 100vh; page-break-after: always; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; background: white; overflow: hidden; }
    `;
  };

  const cardsPerPage = layout === '2x1' ? 2 : 4;
  const chunks = [];
  for (let i = 0; i < cards.length; i += cardsPerPage) {
    chunks.push(cards.slice(i, i + cardsPerPage));
  }

  return (
    <div className="print-container font-sans">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          ${getGridStyles()}
          ${getCustomStyles()}
          .print-container { background: white; color: black; }
          .print-card-cell { width: 100%; height: 100%; border: 1px dashed #cbd5e1; padding: 1.5rem; display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; text-align: center; }
          .print-card-front, .print-card-back { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; border-width: 3px; border-style: solid; }
          .print-card-front img { width: 100%; height: 45%; object-fit: cover; border-radius: 0.5rem; margin-bottom: 2rem; }
          .print-card-front h2 { font-size: ${layout === '2x1' ? '4rem' : '3rem'}; font-weight: 800; margin: 0; text-transform: capitalize; overflow-wrap: break-word; max-width: 100%; }
          .print-pos-tag { font-size: ${layout === '2x1' ? '1.5rem' : '1rem'}; font-weight: 700; border-width: 2px; border-style: solid; padding: 0.5rem 1.5rem; border-radius: 999px; margin-bottom: 1.5rem; max-width: 90%; overflow-wrap: break-word; }
          .print-card-back p { font-size: ${layout === '2x1' ? '2.5rem' : '1.75rem'}; font-weight: 600; color: #334155; line-height: 1.4; padding: 2rem; display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: break-word; }
        }
      `}} />

      {chunks.map((chunk, chunkIdx) => {
        const paddedChunk = [...chunk];
        while (paddedChunk.length < cardsPerPage) {
          paddedChunk.push(null as any);
        }
        
        let backChunk = [];
        if (layout === '2x1') {
          backChunk = [paddedChunk[1], paddedChunk[0]];
        } else {
          backChunk = [paddedChunk[1], paddedChunk[0], paddedChunk[3], paddedChunk[2]];
        }

        return (
          <React.Fragment key={chunkIdx}>
            <div className="print-page">
              {paddedChunk.map((card, i) => (
                <div key={`front-${i}`} className="print-card-cell">
                  {card && (
                    <div className="print-card-front">
                      {card.mainImg && (
                        <img 
                          src={card.mainImg} 
                          alt={card.word}
                          style={{ objectPosition: `${card.imagePosition?.x ?? 50}% ${card.imagePosition?.y ?? 50}%` }}
                        />
                      )}
                      <div className="print-pos-tag">
                        {card.mainPos}
                      </div>
                      <h2>{card.word}</h2>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="print-page">
              {backChunk.map((card, i) => (
                <div key={`back-${i}`} className="print-card-cell">
                  {card && includeDefs && (
                    <div className="print-card-back">
                      <p>{card.mainDef}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
