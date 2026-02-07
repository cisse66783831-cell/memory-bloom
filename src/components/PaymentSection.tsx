import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Download, FileImage, FileText, Lock, Shield, Tag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useValidatePromoCode } from "@/hooks/usePromoCode";

interface PaymentSectionProps {
  onPayment: (promoCode?: string) => void;
  isLoading?: boolean;
}

const BASE_PRICE = 1000;

export function PaymentSection({ onPayment, isLoading }: PaymentSectionProps) {
  const [showPromoField, setShowPromoField] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [promoError, setPromoError] = useState<string | null>(null);

  const validatePromo = useValidatePromoCode();

  const finalPrice = BASE_PRICE - discount;

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoError(null);

    const result = await validatePromo.mutateAsync(promoInput.trim());
    if (result.valid) {
      setAppliedCode(promoInput.trim().toUpperCase());
      setDiscount(result.discount);
      setPromoError(null);
    } else {
      setPromoError(result.message || "Code invalide");
      setAppliedCode(null);
      setDiscount(0);
    }
  };

  const handleRemovePromo = () => {
    setAppliedCode(null);
    setDiscount(0);
    setPromoInput("");
    setPromoError(null);
  };

  const features = [
    { icon: FileImage, text: "Fichier PNG HD" },
    { icon: FileText, text: "PDF prêt à imprimer" },
    { icon: Download, text: "Téléchargement immédiat" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="w-full max-w-lg mx-auto mt-12"
    >
      <div className="bg-card rounded-2xl p-8 shadow-elevated border border-border">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary mb-4">
            <Lock className="w-4 h-4" />
            <span className="text-sm font-medium">Votre souvenir est prêt</span>
          </div>
          
          <h2 className="font-heading text-2xl md:text-3xl text-foreground mb-3 font-semibold">
            Débloquer la version finale
          </h2>
          
          <div className="flex items-baseline justify-center gap-2">
            {discount > 0 ? (
              <>
                <span className="text-2xl text-muted-foreground line-through">
                  {BASE_PRICE} F
                </span>
                <span className="font-heading text-5xl md:text-6xl text-foreground font-bold">
                  {finalPrice}
                </span>
                <span className="text-2xl text-muted-foreground">F</span>
              </>
            ) : (
              <>
                <span className="font-heading text-5xl md:text-6xl text-foreground font-bold">
                  {BASE_PRICE}
                </span>
                <span className="text-2xl text-muted-foreground">F</span>
              </>
            )}
          </div>

          {/* Promo badge */}
          <AnimatePresence>
            {appliedCode && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-success/10 text-success rounded-full text-sm font-medium"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>{appliedCode} — -{discount} F</span>
                <button
                  onClick={handleRemovePromo}
                  className="ml-1 hover:text-success/70 transition-colors"
                  aria-label="Retirer le code promo"
                >
                  ✕
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Promo code section */}
        <div className="mb-6">
          {!showPromoField && !appliedCode && (
            <button
              onClick={() => setShowPromoField(true)}
              className="text-sm text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
            >
              Vous avez un code promo ?
            </button>
          )}

          <AnimatePresence>
            {showPromoField && !appliedCode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Entrez votre code"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                    className="flex-1 uppercase"
                    maxLength={20}
                  />
                  <Button
                    variant="outline"
                    onClick={handleApplyPromo}
                    disabled={validatePromo.isPending || !promoInput.trim()}
                    size="sm"
                  >
                    {validatePromo.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Appliquer"
                    )}
                  </Button>
                </div>
                {promoError && (
                  <p className="text-sm text-destructive mt-2">{promoError}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-4 mb-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-success" />
              </div>
              <span className="text-foreground">{feature.text}</span>
            </motion.div>
          ))}
        </div>

        <Button
          onClick={() => onPayment(appliedCode || undefined)}
          disabled={isLoading}
          size="lg"
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-lg py-6"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
              />
              Traitement en cours...
            </span>
          ) : (
            `Débloquer Maintenant – ${finalPrice} F`
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Vous ne payez que pour recevoir la version finale.
        </p>

        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span>Paiement sécurisé</span>
        </div>
      </div>
    </motion.div>
  );
}
