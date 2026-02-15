import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Zap, Clock, Download, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.6 },
};

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  photo_count: number;
  price: number;
}

const UNIT_PRICE = 1000;

interface PricingPreviewProps {
  scrollToUploader: () => void;
}

export function PricingPreview({ scrollToUploader }: PricingPreviewProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

  useEffect(() => {
    supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("price")
      .then(({ data }) => {
        if (data) setPlans(data);
      });
  }, []);

  const getSavingsPercent = (plan: SubscriptionPlan) =>
    Math.round((1 - plan.price / plan.photo_count / UNIT_PRICE) * 100);

  return (
    <section id="pricing" className="py-20 md:py-28">
      <div className="container">
        <motion.div {...fadeInUp} className="text-center mb-12">
          <div className="pill-badge mb-4 mx-auto">
            <span>Nos tarifs</span>
          </div>
          <h2 className="font-heading text-3xl md:text-4xl text-foreground font-bold mb-4">
            Choisissez la formule idéale
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            À l'unité ou en abonnement, restaurez vos souvenirs au meilleur prix.
          </p>
        </motion.div>

        <motion.div {...fadeInUp} className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Unit price */}
          <div className="glass-card p-8 text-center border-border/30">
            <h3 className="font-heading text-lg font-semibold text-foreground mb-2">À l'unité</h3>
            <p className="text-sm text-muted-foreground mb-6">Pour une restauration ponctuelle</p>
            <div className="flex items-baseline justify-center gap-1 mb-6">
              <span className="font-heading text-5xl text-foreground font-extrabold">1 000</span>
              <span className="text-xl text-muted-foreground">F</span>
            </div>
            <p className="text-sm text-muted-foreground mb-6">par photo</p>

            <div className="space-y-3 mb-8 text-left">
              {["PNG haute résolution", "PDF prêt à imprimer", "Résultat rapide", "Aperçu gratuit"].map((t, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-success" />
                  </div>
                  <span className="text-sm text-foreground">{t}</span>
                </div>
              ))}
            </div>

            <Button
              onClick={scrollToUploader}
              variant="outline"
              size="lg"
              className="w-full rounded-full border-border/50"
            >
              Commencer
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* Subscription plans */}
          {plans.map((plan, idx) => {
            const isPopular = idx === plans.length - 1;
            return (
              <div
                key={plan.id}
                className={`glass-card p-8 text-center relative ${
                  isPopular ? "border-primary/30 shadow-glow" : "border-border/30"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Populaire
                  </div>
                )}
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {plan.photo_count} photos / mois
                </p>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="font-heading text-5xl text-foreground font-extrabold">
                    {plan.price.toLocaleString()}
                  </span>
                  <span className="text-xl text-muted-foreground">F</span>
                </div>
                <div className="flex items-center justify-center gap-2 mb-6">
                  <span className="text-sm text-muted-foreground line-through">
                    {(plan.photo_count * UNIT_PRICE).toLocaleString()} F
                  </span>
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full">
                    -{getSavingsPercent(plan)}%
                  </span>
                </div>

                <div className="space-y-3 mb-8 text-left">
                  {[
                    "Tout de l'offre unitaire",
                    `${plan.photo_count} restaurations incluses`,
                    `${Math.round(plan.price / plan.photo_count)} F / photo`,
                    plan.description || "Économisez chaque mois",
                  ].map((t, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-success" />
                      </div>
                      <span className="text-sm text-foreground">{t}</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={scrollToUploader}
                  size="lg"
                  className={`w-full rounded-full ${
                    isPopular
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-gold"
                      : "bg-primary/10 hover:bg-primary/20 text-primary"
                  }`}
                >
                  Choisir {plan.name}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            );
          })}
        </motion.div>

        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>Paiement sécurisé</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            <span>Accès immédiat</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Résultat en moins de 2 min</span>
          </div>
        </div>
      </div>
    </section>
  );
}
