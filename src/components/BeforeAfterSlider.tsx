import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { GripVertical } from "lucide-react";

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
}

export function BeforeAfterSlider({ beforeImage, afterImage }: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    setSliderPosition(Math.min(Math.max((x / rect.width) * 100, 0), 100));
  }, []);

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e: React.MouseEvent) => { if (isDragging) handleMove(e.clientX); };
  const handleTouchMove = (e: React.TouchEvent) => { handleMove(e.touches[0].clientX); };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <p className="text-muted-foreground text-sm flex items-center justify-center gap-2">
          <GripVertical className="w-4 h-4" /> Faites glisser pour voir la différence
        </p>
        <p className="text-xs text-muted-foreground mt-1">Ceci est un aperçu. Le fichier final est disponible après paiement.</p>
      </div>

      <div ref={containerRef}
        className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-elevated cursor-col-resize select-none border border-border/30"
        onMouseMove={handleMouseMove} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp} onTouchMove={handleTouchMove} onTouchStart={handleMouseDown} onTouchEnd={handleMouseUp}
      >
        <img src={afterImage} alt="Photo restaurée" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}>
          <img src={beforeImage} alt="Photo originale" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
        </div>

        <div className="absolute inset-0 pointer-events-none opacity-15" style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}>
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-foreground text-2xl font-heading font-semibold rotate-[-30deg] select-none tracking-wider">APERÇU</p>
          </div>
        </div>

        <div className="absolute top-0 bottom-0 w-0.5 bg-foreground/50" style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}>
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-primary shadow-gold border-2 border-primary-foreground/20 flex items-center justify-center transition-transform duration-150 ${isDragging ? "scale-110" : "scale-100"}`}>
            <GripVertical className="w-5 h-5 text-primary-foreground" />
          </div>
        </div>

        <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-card/70 backdrop-blur-sm rounded-full border border-border/50">
          <span className="text-foreground text-xs font-medium uppercase tracking-wide">Avant</span>
        </div>
        <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-primary/90 backdrop-blur-sm rounded-full">
          <span className="text-primary-foreground text-xs font-medium uppercase tracking-wide">Après</span>
        </div>
      </div>
    </motion.div>
  );
}
