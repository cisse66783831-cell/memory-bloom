import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Image, Leaf } from "lucide-react";

interface PhotoUploaderProps {
  onPhotoSelected: (file: File) => void;
}

export function PhotoUploader({ onPhotoSelected }: PhotoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === "image/jpeg" || file.type === "image/png")) {
      processFile(file);
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, []);

  const processFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    onPhotoSelected(file);
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-8"
      >
        <h2 className="font-heading text-2xl md:text-3xl text-foreground mb-3 font-semibold">
          Importez votre photo
        </h2>
        <p className="text-muted-foreground text-base md:text-lg max-w-md mx-auto">
          Même si votre photo est ancienne ou abîmée, nous pouvons souvent l'améliorer.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <label
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative block w-full aspect-[4/3] rounded-2xl border-2 border-dashed 
            cursor-pointer transition-all duration-300 overflow-hidden
            ${isDragging 
              ? "border-primary bg-primary/5 scale-[1.02]" 
              : "border-muted hover:border-primary/40 bg-card hover:bg-secondary/30"
            }
            shadow-soft hover:shadow-elevated
          `}
        >
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleFileChange}
            className="hidden"
          />
          
          <AnimatePresence mode="wait">
            {previewUrl ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0"
              >
                <img
                  src={previewUrl}
                  alt="Aperçu"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-center">
                  <p className="text-primary-foreground font-medium">Photo prête</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="upload"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-8"
              >
                <motion.div
                  animate={{ 
                    y: isDragging ? -5 : 0,
                    scale: isDragging ? 1.1 : 1 
                  }}
                  className="mb-6"
                >
                  <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4 mx-auto">
                    <Image className="w-10 h-10 text-primary" />
                  </div>
                </motion.div>
                
                <p className="text-foreground font-medium text-lg mb-2">
                  Déposez votre photo ici
                </p>
                <p className="text-muted-foreground text-sm mb-4">
                  ou cliquez pour parcourir
                </p>
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Leaf className="w-3 h-3 text-primary" />
                  <span>JPG ou PNG acceptés</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </label>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-8 text-center"
      >
        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span>Privé et sécurisé</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span>Traitement rapide</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}