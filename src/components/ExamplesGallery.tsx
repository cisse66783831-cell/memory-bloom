import { useState, forwardRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";

// Import example images
import before1 from "@/assets/examples/before-1.jpg";
import after1 from "@/assets/examples/after-1.jpg";
import before2 from "@/assets/examples/before-2.jpg";
import after2 from "@/assets/examples/after-2.jpg";
import before3 from "@/assets/examples/before-3.jpg";
import after3 from "@/assets/examples/after-3.jpg";

const examples = [
  {
    id: 1,
    before: before1,
    after: after1,
    title: "Portrait de famille",
    description: "Photo des années 1940 restaurée",
  },
  {
    id: 2,
    before: before2,
    after: after2,
    title: "Photo de mariage",
    description: "Souvenir de 1960 sublimé",
  },
  {
    id: 3,
    before: before3,
    after: after3,
    title: "Portrait d'enfant",
    description: "Mémoire des années 1950",
  },
];

export const ExamplesGallery = forwardRef<HTMLElement, object>((_, ref) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAfter, setShowAfter] = useState(false);

  const nextExample = () => {
    setShowAfter(false);
    setCurrentIndex((prev) => (prev + 1) % examples.length);
  };

  const prevExample = () => {
    setShowAfter(false);
    setCurrentIndex((prev) => (prev - 1 + examples.length) % examples.length);
  };

  const currentExample = examples[currentIndex];

  return (
    <section ref={ref} className="py-16 bg-secondary/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary mb-4">
            <Leaf className="w-4 h-4" />
            <span className="text-sm font-medium">Exemples de restaurations</span>
          </div>
          <h2 className="font-heading text-2xl md:text-3xl text-foreground mb-3 font-semibold">
            Découvrez ce que nous pouvons faire
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Voyez comment nous redonnons vie à de vraies photos de famille.
          </p>
        </motion.div>

        <div className="max-w-2xl mx-auto">
          {/* Main comparison */}
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-elevated mb-6"
          >
            {/* Before image */}
            <img
              src={currentExample.before}
              alt={`Avant - ${currentExample.title}`}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                showAfter ? "opacity-0" : "opacity-100"
              }`}
            />
            
            {/* After image */}
            <img
              src={currentExample.after}
              alt={`Après - ${currentExample.title}`}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                showAfter ? "opacity-100" : "opacity-0"
              }`}
            />

            {/* Toggle label */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <button
                onClick={() => setShowAfter(!showAfter)}
                className="px-6 py-2 bg-foreground/80 backdrop-blur-sm rounded-full text-primary-foreground text-sm font-medium transition-all hover:bg-foreground"
              >
                {showAfter ? "Voir l'original" : "Voir le résultat"}
              </button>
            </div>

            {/* Status badge */}
            <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-medium ${
              showAfter 
                ? "bg-primary text-primary-foreground" 
                : "bg-foreground/70 text-primary-foreground"
            }`}>
              {showAfter ? "Après" : "Avant"}
            </div>
          </motion.div>

          {/* Info & navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={prevExample}
              className="rounded-full"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            <div className="text-center">
              <h3 className="font-heading text-xl text-foreground font-medium">
                {currentExample.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {currentExample.description}
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={nextExample}
              className="rounded-full"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Dots */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {examples.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setShowAfter(false);
                  setCurrentIndex(index);
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? "bg-primary w-6"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
});

ExamplesGallery.displayName = "ExamplesGallery";