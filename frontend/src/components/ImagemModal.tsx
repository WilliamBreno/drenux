import { useEffect, useRef, useState } from 'react';

interface Props {
  fotos: { id: number; url: string }[];
  indiceInicial?: number;
  onFechar: () => void;
}

export function ImagemModal({ fotos, indiceInicial = 0, onFechar }: Props) {
  const [indice, setIndice] = useState(indiceInicial);
  const touchStartX = useRef<number | null>(null);

  // Fecha com Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onFechar();
      if (e.key === 'ArrowLeft') anterior();
      if (e.key === 'ArrowRight') proximo();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [indice]);

  // Bloqueia scroll do body enquanto aberto
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  function anterior() {
    setIndice((i) => (i === 0 ? fotos.length - 1 : i - 1));
  }

  function proximo() {
    setIndice((i) => (i === fotos.length - 1 ? 0 : i + 1));
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) proximo();
      else anterior();
    }
    touchStartX.current = null;
  }

  const foto = fotos[indice];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onFechar}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Botão fechar */}
      <button
        onClick={onFechar}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        aria-label="Fechar"
      >
        ✕
      </button>

      {/* Imagem */}
      <img
        src={foto.url}
        alt={`Foto ${indice + 1}`}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl"
      />

      {/* Setas — só se tiver mais de uma foto */}
      {fotos.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); anterior(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 text-xl"
            aria-label="Foto anterior"
          >
            ‹
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); proximo(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 text-xl"
            aria-label="Próxima foto"
          >
            ›
          </button>

          {/* Dots */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
            {fotos.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setIndice(i); }}
                className={`h-2 rounded-full transition-all ${i === indice ? 'w-6 bg-white' : 'w-2 bg-white/40'}`}
                aria-label={`Ir para foto ${i + 1}`}
              />
            ))}
          </div>

          {/* Contador */}
          <div className="absolute top-4 left-4 rounded-full bg-black/40 px-3 py-1 text-xs text-white">
            {indice + 1} / {fotos.length}
          </div>
        </>
      )}
    </div>
  );
}