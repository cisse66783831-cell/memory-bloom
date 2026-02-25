import { motion } from "framer-motion";
import heroBeforeAfter from "@/assets/hero-before-after.png";

interface FloatingPhotoFrameProps {
  imageSrc?: string;
  className?: string;
}

export function FloatingPhotoFrame({
  imageSrc = heroBeforeAfter,
  className = ""
}: FloatingPhotoFrameProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className={`relative ${className}`}>

      <motion.div
        animate={{ y: [0, -10, 0], rotate: [-2, 2, -2] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="relative">

        {/* Frame with gold accent */}
        <div className="relative p-3 bg-gradient-to-br from-primary/80 via-primary/60 to-primary/80 rounded-xl shadow-gold">
          <div className="p-1 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg">
            <div className="p-2 bg-card rounded-md">
              <div className="relative overflow-hidden rounded-sm">
                <img
                  src={imageSrc}
                  alt="Photo de famille restaurée"
                  className="w-full aspect-[4/5] sepia-[0.15] brightness-[0.95] object-fill border-solid rounded" />

                <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Glow behind frame */}
        <div className="absolute -inset-8 -z-10 bg-primary/8 blur-3xl rounded-full" />
      </motion.div>
    </motion.div>);

}