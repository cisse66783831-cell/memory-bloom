import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Download, FileImage, FileText, Lock, Shield, Tag, Loader2, Clock, Phone, Copy, CheckCircle2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useValidatePromoCode } from "@/hooks/usePromoCode";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PaymentSectionProps {
  onPayment: (promoCode?: string, depositMethod?: string) => void;
  isLoading?: boolean;
  paymentStatus?: "idle" | "pending" | "completed";
}

const BASE_PRICE = 1000;

interface DepositInstruction {
  id: string;
  method_name: string;
  method_icon: string | null;
  phone_number: string | null;
  account_name: string | null;
  instructions: string | null;
  display_order: number;
}

export function PaymentSection({ onPayment, isLoading, paymentStatus = "idle" }: PaymentSectionProps) {
  const [showPromoField, setShowPromoField] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [depositInstructions, setDepositInstructions] = useState<DepositInstruction[]>([]);
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);
  const { toast } = useToast();

  const validatePromo = useValidatePromoCode();
  const finalPrice = BASE_PRICE - discount;

  useEffect(() => {
    const fetchInstructions = async () => {
      const { data } = await supabase
        .from("deposit_instructions")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (data) setDepositInstructions(data);
    };
    fetchInstructions();
  }, []);

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoError(null);
    const result = await validatePromo.mutateAsync(promoInput.trim());
    if (result.valid) {
      setAppliedCode(promoInput.trim().toUpperCase());
      setDiscount(result.discount);
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

  const handleCopyNumber = (number: string) => {
    navigator.clipboard.writeText(number);
    setCopiedNumber(number);
    toast({ title: "Numéro copié !", description: number });
    setTimeout(() => setCopiedNumber(null), 2000);
  };

  const handleConfirmDeposit = () => {
    if (!selectedMethod) {
      toast({ title: "Choisissez un moyen de paiement", variant: "destructive" });
      return;
    }
    onPayment(appliedCode || undefined, selectedMethod);
  };

  const getMethodColor = (icon: string | null) => {
    switch (icon) {
      case "orange": return "bg-orange-500/10 border-orange-500/30 text-orange-400";
      case "wave": return "bg-blue-500/10 border-blue-500/30 text-blue-400";
      case "mtn": return "bg-yellow-500/10 border-yellow-500/30 text-yellow-400";
      case "moov": return "bg-green-500/10 border-green-500/30 text-green-400";
      default: return "bg-primary/10 border-primary/30 text-primary";
    }
  };

  // Show pending state
  if (paymentStatus === "pending") {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg mx-auto mt-12">
        <div className="glass-card p-8 shadow-glow border-primary/10 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary mx-auto mb-6"
          />
          <h2 className="font-heading text-2xl text-foreground mb-3 font-bold">Dépôt en attente de validation</h2>
          <p className="text-muted-foreground mb-4">
            Votre dépôt a été enregistré. Un administrateur va vérifier et valider votre paiement.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-primary">
            <Clock className="w-4 h-4" />
            <span>Vous serez notifié dès la validation</span>
          </div>
        </div>
      </motion.div>
    );
  }

  const features = [
    { icon: FileImage, text: "Fichier PNG HD" },
    { icon: FileText, text: "PDF prêt à imprimer" },
    { icon: Download, text: "Téléchargement immédiat après validation" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="w-full max-w-lg mx-auto mt-12">
      <div className="glass-card p-8 shadow-glow border-primary/10">
        <div className="text-center mb-8">
          <div className="pill-badge mb-4 mx-auto">
            <Lock className="w-4 h-4" />
            <span>Votre souvenir est prêt</span>
          </div>

          <h2 className="font-heading text-2xl md:text-3xl text-foreground mb-3 font-bold">Débloquer la version finale</h2>

          <div className="flex items-baseline justify-center gap-2">
            {discount > 0 ? (
              <>
                <span className="text-2xl text-muted-foreground line-through">{BASE_PRICE} F</span>
                <span className="font-heading text-5xl md:text-6xl text-foreground font-extrabold">{finalPrice}</span>
                <span className="text-2xl text-muted-foreground">F</span>
              </>
            ) : (
              <>
                <span className="font-heading text-5xl md:text-6xl text-foreground font-extrabold">{BASE_PRICE}</span>
                <span className="text-2xl text-muted-foreground">F</span>
              </>
            )}
          </div>

          <AnimatePresence>
            {appliedCode && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-success/10 text-success rounded-full text-sm font-medium border border-success/20">
                <Tag className="w-3.5 h-3.5" />
                <span>{appliedCode} — -{discount} F</span>
                <button onClick={handleRemovePromo} className="ml-1 hover:text-success/70 transition-colors" aria-label="Retirer le code promo">✕</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Promo code */}
        <div className="mb-6">
          {!showPromoField && !appliedCode && (
            <button onClick={() => setShowPromoField(true)} className="text-sm text-primary hover:text-primary/80 underline underline-offset-2 transition-colors">
              Vous avez un code promo ?
            </button>
          )}
          <AnimatePresence>
            {showPromoField && !appliedCode && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="flex gap-2 mt-2">
                  <Input placeholder="Entrez votre code" value={promoInput} onChange={(e) => setPromoInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()} className="flex-1 uppercase bg-secondary/50 border-border/50" maxLength={20} />
                  <Button variant="outline" onClick={handleApplyPromo} disabled={validatePromo.isPending || !promoInput.trim()} size="sm" className="border-border/50">
                    {validatePromo.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Appliquer"}
                  </Button>
                </div>
                {promoError && <p className="text-sm text-destructive mt-2">{promoError}</p>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Features */}
        <div className="space-y-3 mb-6">
          {features.map((feature, index) => (
            <motion.div key={index} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + index * 0.1 }} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-success" />
              </div>
              <span className="text-foreground text-sm">{feature.text}</span>
            </motion.div>
          ))}
        </div>

        {/* Deposit method selection */}
        <div className="mb-6">
          <p className="text-sm font-medium text-foreground mb-3">Choisissez votre moyen de paiement :</p>
          <div className="grid grid-cols-2 gap-3">
            {depositInstructions.map((method) => (
              <motion.button
                key={method.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedMethod(method.method_name)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedMethod === method.method_name
                    ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                    : "border-border/50 hover:border-border"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${getMethodColor(method.method_icon)}`}>
                  <Phone className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-foreground">{method.method_name}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Show deposit details for selected method */}
        <AnimatePresence>
          {selectedMethod && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              {depositInstructions
                .filter((m) => m.method_name === selectedMethod)
                .map((method) => (
                  <div key={method.id} className="bg-secondary/50 rounded-xl p-4 border border-border/30">
                    <p className="text-sm text-foreground font-medium mb-2">Instructions :</p>
                    {method.phone_number && (
                      <div className="flex items-center justify-between bg-background/50 rounded-lg p-3 mb-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Numéro</p>
                          <p className="text-foreground font-mono font-bold">{method.phone_number}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyNumber(method.phone_number!)}
                          className="h-8"
                        >
                          {copiedNumber === method.phone_number ? (
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    )}
                    {method.account_name && (
                      <p className="text-sm text-muted-foreground">Nom du compte : <span className="text-foreground font-medium">{method.account_name}</span></p>
                    )}
                    <p className="text-sm text-muted-foreground mt-2">
                      Montant à envoyer : <span className="text-foreground font-bold">{finalPrice} F</span>
                    </p>
                    {method.instructions && (
                      <p className="text-xs text-muted-foreground mt-2">{method.instructions}</p>
                    )}
                  </div>
                ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confirm button */}
        <Button
          onClick={handleConfirmDeposit}
          disabled={isLoading || !selectedMethod}
          size="lg"
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg py-6 rounded-full shadow-gold"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Traitement en cours...
            </span>
          ) : (
            <>
              <CreditCard className="w-5 h-5 mr-2" />
              J'ai effectué le dépôt – {finalPrice} F
            </>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Après votre dépôt, un administrateur validera le paiement et vous recevrez l'accès au téléchargement HD.
        </p>

        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span>Paiement vérifié manuellement</span>
        </div>
      </div>
    </motion.div>
  );
}
