import { motion } from "framer-motion";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpsellSectionProps {
  restoredImageUrl: string;
  onSelectSize: (size: string, price: number) => void;
  onSkip: () => void;
}

const frameSizes = [
  { id: "small", label: "20x30 cm", price: 2500, popular: false },
  { id: "medium", label: "30x40 cm", price: 3500, popular: true },
  { id: "large", label: "50x70 cm", price: 5000, popular: false },
];

export function UpsellSection({ restoredImageUrl, onSelectSize, onSkip }: UpsellSectionProps) {
  return (
    <div className="w-full max-w-3xl mx-auto py-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-3">
            Transformez Ce Souvenir en Œuvre d'Art
          </h2>
          <p className="text-muted-foreground text-lg">
            Impressions sur toile premium, livrées chez vous.
          </p>
        </div>

        {/* Mockup */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative mb-10"
        >
          <div className="relative mx-auto max-w-sm">
            {/* Frame mockup */}
            <div className="relative bg-foreground/10 p-4 rounded-lg shadow-elevated">
              <div className="absolute inset-0 bg-gradient-to-br from-foreground/5 to-transparent rounded-lg" />
              <div className="relative bg-primary-foreground p-2 shadow-inner">
                <img
                  src={restoredImageUrl}
                  alt="Framed preview"
                  className="w-full aspect-[4/3] object-cover"
                />
              </div>
            </div>
            {/* Shadow effect */}
            <div className="absolute -inset-4 -z-10 bg-foreground/5 blur-2xl rounded-full" />
          </div>
        </motion.div>

        {/* Size options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {frameSizes.map((size, index) => (
            <motion.div
              key={size.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
            >
              <button
                onClick={() => onSelectSize(size.id, size.price)}
                className={`
                  relative w-full p-6 rounded-xl border-2 transition-all duration-300
                  hover:scale-[1.02] hover:shadow-elevated
                  ${size.popular 
                    ? "border-accent bg-accent/5 shadow-glow" 
                    : "border-border bg-card hover:border-primary/40"
                  }
                `}
              >
                {size.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent text-accent-foreground text-xs font-medium rounded-full">
                    Le Plus Populaire
                  </div>
                )}
                
                <div className="text-center">
                  <p className="font-serif text-xl text-foreground mb-1">
                    {size.label}
                  </p>
                  <p className="text-2xl font-medium text-foreground">
                    {size.price.toLocaleString()} <span className="text-sm text-muted-foreground">F</span>
                  </p>
                </div>

                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-success" />
                    <span>Toile premium</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-success" />
                    <span>Prêt à accrocher</span>
                  </div>
                </div>
              </button>
            </motion.div>
          ))}
        </div>

        {/* Skip button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center"
        >
          <Button
            onClick={onSkip}
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
            Non merci, je suis satisfait de mon téléchargement
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
