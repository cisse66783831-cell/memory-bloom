import { motion } from "framer-motion";
import { Check, Download, FileImage, FileText, Lock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaymentSectionProps {
  onPayment: () => void;
  isLoading?: boolean;
}

export function PaymentSection({ onPayment, isLoading }: PaymentSectionProps) {
  const features = [
    { icon: FileImage, text: "High-resolution PNG (no watermark)" },
    { icon: FileText, text: "Print-ready PDF" },
    { icon: Download, text: "Instant download after payment" },
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
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full text-accent mb-4">
            <Lock className="w-4 h-4" />
            <span className="text-sm font-medium">Your memory is ready</span>
          </div>
          
          <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-3">
            Unlock the Full Version
          </h2>
          
          <div className="flex items-baseline justify-center gap-1">
            <span className="font-serif text-5xl md:text-6xl text-foreground font-medium">
              1000
            </span>
            <span className="text-2xl text-muted-foreground">F</span>
          </div>
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
          onClick={onPayment}
          disabled={isLoading}
          variant="hero"
          size="xl"
          className="w-full"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
              />
              Processing...
            </span>
          ) : (
            "Unlock Now – 1000 F"
          )}
        </Button>

        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span>Secure payment • Instant access</span>
        </div>
      </div>
    </motion.div>
  );
}
