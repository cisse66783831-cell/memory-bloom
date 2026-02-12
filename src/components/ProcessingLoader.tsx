import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface ProcessingLoaderProps {
  progress?: number;
}

export function ProcessingLoader({ progress = 0 }: ProcessingLoaderProps) {
  const getStepStatus = (step: number) => {
    if (progress < 33 && step === 1) return "active";
    if (progress >= 33 && progress < 66 && step === 2) return "active";
    if (progress >= 66 && step === 3) return "active";
    if ((step === 1 && progress >= 33) || (step === 2 && progress >= 66)) return "completed";
    return "pending";
  };

  const steps = [
    { id: 1, label: "Analyse de la photo" },
    { id: 2, label: "Restauration des détails" },
    { id: 3, label: "Finition du souvenir" },
  ];

  return (
    <div className="w-full max-w-lg mx-auto text-center py-16">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="mb-8"
        >
          <div className="w-24 h-24 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center shadow-glow border border-primary/20">
            <Sparkles className="w-12 h-12 text-primary" />
          </div>
        </motion.div>

        <h2 className="font-heading text-2xl md:text-3xl text-foreground mb-3 font-bold">
          Nous redonnons vie à votre photo...
        </h2>
        <p className="text-muted-foreground text-lg mb-8">Un instant, nous prenons soin de chaque détail.</p>

        <div className="space-y-3 mb-8 text-left max-w-xs mx-auto">
          {steps.map((step, index) => {
            const status = getStepStatus(step.id);
            return (
              <motion.div key={step.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                  status === "completed" ? "bg-success text-success-foreground" :
                  status === "active" ? "bg-primary text-primary-foreground animate-pulse" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {status === "completed" ? "✓" : step.id}
                </div>
                <span className={`text-sm ${status === "active" ? "text-foreground font-medium" : "text-muted-foreground"}`}>{step.label}</span>
              </motion.div>
            );
          })}
        </div>

        <div className="relative w-full h-2 bg-secondary rounded-full overflow-hidden mb-4">
          <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 bg-primary rounded-full" />
          <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-12 p-6 glass-card">
          <p className="text-sm text-muted-foreground italic">
            « Chaque photo est une histoire de famille qui mérite d'être préservée. »
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
