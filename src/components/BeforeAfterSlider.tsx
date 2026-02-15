import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { GripVertical, ChevronLeft, ChevronRight } from "lucide-react";

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  watermarkText?: string;
}

export function BeforeAfterSlider({ 
  beforeImage, 
  afterImage, 
  watermarkText = "APERÇU REVIVO" 
}: BeforeAfterSliderProps) {
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
  const handleMouseUp = useCallback(() => setIsDragging(false), []);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) handleMove(e.clientX);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  // Keyboard accessibility
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setSliderPosition((prev) => Math.max(prev - step, 0));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setSliderPosition((prev) => Math.min(prev + step, 100));
    }
  }, []);

  // Global mouseup listener
  useEffect(() => {
    if (isDragging) {
      const handler = () => setIsDragging(false);
      window.addEventListener("mouseup", handler);
      window.addEventListener("touchend", handler);
      return () => {
        window.removeEventListener("mouseup", handler);
        window.removeEventListener("touchend", handler);
      };
    }
  }, [isDragging]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-4xl mx-auto"
    >
      {/* Instruction */}
      <div className="text-center mb-6">
        <p className="text-muted-foreground text-sm flex items-center justify-center gap-2">
          <ChevronLeft className="w-4 h-4" />
          <GripVertical className="w-4 h-4" />
          <ChevronRight className="w-4 h-4" />
          <span>Faites glisser pour comparer (ou utilisez les touches ← →)</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Ceci est un aperçu protégé. Le fichier HD est disponible après paiement.
        </p>
      </div>

      {/* Slider container */}
      <div
        ref={containerRef}
        role="slider"
        aria-label="Comparaison avant/après de la photo restaurée"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(sliderPosition)}
        aria-valuetext={`${Math.round(sliderPosition)}% avant, ${Math.round(100 - sliderPosition)}% après`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-elevated cursor-col-resize select-none border-2 border-border/40 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchMove={handleTouchMove}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
      >
        {/* After image (background) */}
        <img
          src={afterImage}
          alt="Photo restaurée — résultat après traitement IA"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {/* Before image (clipped) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img
            src={beforeImage}
            alt="Photo originale — avant restauration"
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
        </div>

        {/* Watermark overlay on restored side */}
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
        >
          <div className="w-full h-full flex flex-col items-center justify-center gap-16">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex gap-12">
                {[0, 1].map((col) => (
                  <p
                    key={col}
                    className="text-foreground/10 text-lg md:text-2xl font-heading font-bold rotate-[-25deg] select-none tracking-[0.2em] whitespace-nowrap"
                  >
                    {watermarkText}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Slider line */}
        <div
          className="absolute top-0 bottom-0 w-[3px] bg-primary/80 shadow-[0_0_8px_rgba(212,168,83,0.5)]"
          style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
        >
          {/* Slider handle */}
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-primary shadow-gold border-2 border-primary-foreground/30 flex items-center justify-center transition-transform duration-150 ${
              isDragging ? "scale-110 shadow-lg" : "scale-100"
            }`}
          >
            <ChevronLeft className="w-4 h-4 text-primary-foreground -mr-1" />
            <ChevronRight className="w-4 h-4 text-primary-foreground -ml-1" />
          </div>
        </div>

        {/* Labels */}
        <div className="absolute bottom-4 left-4 px-4 py-2 bg-card/80 backdrop-blur-md rounded-full border border-border/60 shadow-sm">
          <span className="text-foreground text-xs font-semibold uppercase tracking-widest">
            Avant
          </span>
        </div>
        <div className="absolute bottom-4 right-4 px-4 py-2 bg-primary/90 backdrop-blur-md rounded-full shadow-gold">
          <span className="text-primary-foreground text-xs font-semibold uppercase tracking-widest">
            Après
          </span>
        </div>

        {/* Percentage indicator */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-card/70 backdrop-blur-sm rounded-full border border-border/40">
          <span className="text-foreground/70 text-[10px] font-mono">
            {Math.round(sliderPosition)}% / {Math.round(100 - sliderPosition)}%
          </span>
        </div>
      </div>
    </motion.div>
  );
}
