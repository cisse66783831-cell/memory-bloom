import { motion } from "framer-motion";
import { Heart } from "lucide-react";

interface ProcessingLoaderProps {
  progress?: number;
}

export function ProcessingLoader({ progress = 0 }: ProcessingLoaderProps) {
  return (
    <div className="w-full max-w-lg mx-auto text-center py-16">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Animated heart icon */}
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="mb-8"
        >
          <div className="w-24 h-24 rounded-full bg-secondary mx-auto flex items-center justify-center shadow-soft">
            <Heart className="w-12 h-12 text-accent fill-accent/30" />
          </div>
        </motion.div>

        <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
          Restoring Your Memory...
        </h2>
        
        <p className="text-muted-foreground text-lg mb-8">
          We're carefully bringing back every detail.
        </p>

        {/* Progress bar */}
        <div className="relative w-full h-2 bg-secondary rounded-full overflow-hidden mb-4">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 bg-accent rounded-full"
          />
          {/* Shimmer effect */}
          <motion.div
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent"
          />
        </div>

        <p className="text-sm text-muted-foreground">
          {progress < 30 && "Analyzing your photo..."}
          {progress >= 30 && progress < 60 && "Enhancing details..."}
          {progress >= 60 && progress < 90 && "Restoring colors..."}
          {progress >= 90 && "Almost there..."}
        </p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 p-6 bg-card rounded-xl shadow-soft"
        >
          <p className="text-sm text-muted-foreground italic">
            "Every photograph is a story preserved in time."
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
