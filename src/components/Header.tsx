import { motion } from "framer-motion";
import { Heart } from "lucide-react";

export function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full py-6 px-4"
    >
      <div className="container flex items-center justify-center">
        <a href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-soft group-hover:shadow-elevated transition-shadow">
            <Heart className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-serif text-2xl text-foreground">
            MemoryRestore
          </span>
        </a>
      </div>
    </motion.header>
  );
}
