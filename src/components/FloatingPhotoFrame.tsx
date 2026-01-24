import { motion } from "framer-motion";

interface FloatingPhotoFrameProps {
  imageSrc?: string;
  className?: string;
}

export function FloatingPhotoFrame({ 
  imageSrc = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80&auto=format&fit=crop",
  className = "" 
}: FloatingPhotoFrameProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className={`relative ${className}`}
    >
      {/* Floating animation wrapper */}
      <motion.div
        animate={{ 
          y: [0, -10, 0],
          rotate: [-2, 2, -2],
        }}
        transition={{ 
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="relative"
      >
        {/* Wood frame effect */}
        <div className="relative p-3 bg-gradient-to-br from-amber-800 via-amber-700 to-amber-900 rounded-lg shadow-elevated">
          {/* Inner gold trim */}
          <div className="p-1 bg-gradient-to-br from-amber-500/30 to-amber-600/20 rounded-sm">
            {/* Photo mat */}
            <div className="p-2 bg-gradient-to-br from-amber-50 to-amber-100">
              {/* Photo */}
              <div className="relative overflow-hidden rounded-sm shadow-inner">
                <img
                  src={imageSrc}
                  alt="Photo de famille restaurée"
                  className="w-full aspect-[4/5] object-cover sepia-[0.15] brightness-[0.98]"
                />
                {/* Subtle vintage overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-amber-900/10 to-transparent pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Frame shadow */}
        <div className="absolute -inset-4 -z-10 bg-foreground/5 blur-2xl rounded-full" />
        
        {/* Warm light glow */}
        <div className="absolute -inset-8 -z-20 bg-primary/5 blur-3xl rounded-full" />
      </motion.div>
    </motion.div>
  );
}