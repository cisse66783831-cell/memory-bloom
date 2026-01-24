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
          <h2 className="font-heading text-2xl md:text-3xl text-foreground mb-3 font-semibold">
            Transformez ce souvenir en tableau
          </h2>
          <p className="text-muted-foreground text-lg">
            Impressions sur toile de qualité, livrées chez vous.
          </p>
        </div>

        {/* Mockup with wood frame */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative mb-10"
        >
          <div className="relative mx-auto max-w-sm">
            {/* Wood frame mockup */}
            <div className="relative p-3 bg-gradient-to-br from-amber-800 via-amber-700 to-amber-900 rounded-lg shadow-elevated">
              {/* Inner gold trim */}
              <div className="p-1 bg-gradient-to-br from-amber-500/30 to-amber-600/20 rounded-sm">
                {/* Photo mat */}
                <div className="p-2 bg-gradient-to-br from-amber-50 to-amber-100">
                  <img
                    src={restoredImageUrl}
                    alt="Aperçu encadré"
                    className="w-full aspect-[4/3] object-cover"
                  />
                </div>
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
                    ? "border-primary bg-primary/5 shadow-glow" 
                    : "border-border bg-card hover:border-primary/40"
                  }
                `}
              >
                {size.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                    Le plus populaire
                  </div>
                )}
                
                <div className="text-center">
                  <p className="font-heading text-xl text-foreground mb-1 font-medium">
                    {size.label}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {size.price.toLocaleString()} <span className="text-sm text-muted-foreground font-normal">F</span>
                  </p>
                </div>

                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-success" />
                    <span>Toile de qualité</span>
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
            Non merci, plus tard
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}