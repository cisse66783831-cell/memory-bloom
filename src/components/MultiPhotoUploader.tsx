import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Image, Heart, X, Plus, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MultiPhotoUploaderProps {
  onPhotosSelected: (files: File[], colorize: boolean) => void;
}

const PRICING = {
  1: 1000,
  2: 1800,
  3: 2500,
};

const getPriceForCount = (count: number): number => {
  if (count >= 3) return PRICING[3] + (count - 3) * 800;
  return PRICING[count as 1 | 2 | 3] || PRICING[1];
};

const getSavingsPercent = (count: number): number => {
  if (count <= 1) return 0;
  const fullPrice = count * PRICING[1];
  const discountedPrice = getPriceForCount(count);
  return Math.round(((fullPrice - discountedPrice) / fullPrice) * 100);
};

export function MultiPhotoUploader({ onPhotosSelected }: MultiPhotoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [colorize, setColorize] = useState(false);

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
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === "image/jpeg" || f.type === "image/png"
    );
    addFiles(files);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addFiles(files);
  }, []);

  const addFiles = (newFiles: File[]) => {
    const allFiles = [...selectedFiles, ...newFiles].slice(0, 5); // Max 5 photos
    setSelectedFiles(allFiles);
    
    const newPreviews = allFiles.map((file) => URL.createObjectURL(file));
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews(newPreviews);
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (selectedFiles.length > 0) {
      onPhotosSelected(selectedFiles, colorize);
    }
  };

  const currentPrice = getPriceForCount(selectedFiles.length);
  const savings = getSavingsPercent(selectedFiles.length);

  return (
    <div className="w-full max-w-xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-8"
      >
        <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-foreground mb-4 leading-tight">
          Redonnez Vie à<br />
          <span className="text-gradient">Vos Souvenirs</span>
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl max-w-md mx-auto">
          Photos anciennes, abîmées ou floues acceptées. Nous restaurons la magie.
        </p>
      </motion.div>

      {/* Photos grid */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-6"
      >
        <div className="grid grid-cols-3 gap-3">
          <AnimatePresence mode="popLayout">
            {previews.map((preview, index) => (
              <motion.div
                key={preview}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative aspect-square rounded-xl overflow-hidden shadow-soft group"
              >
                <img
                  src={preview}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removeFile(index)}
                  className="absolute top-2 right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add more button */}
          {selectedFiles.length < 5 && (
            <motion.label
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative aspect-square rounded-xl border-2 border-dashed cursor-pointer
                flex flex-col items-center justify-center transition-all
                ${isDragging 
                  ? "border-accent bg-accent/5" 
                  : "border-border hover:border-primary/40 bg-card"
                }
              `}
            >
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleFileChange}
                multiple
                className="hidden"
              />
              <Plus className="w-8 h-8 text-muted-foreground mb-2" />
              <span className="text-xs text-muted-foreground">
                {selectedFiles.length === 0 ? "Ajouter" : "Ajouter plus"}
              </span>
            </motion.label>
          )}
        </div>
      </motion.div>

      {/* Colorization option */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-6"
      >
        <label className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border cursor-pointer hover:border-primary/40 transition-colors">
          <input
            type="checkbox"
            checked={colorize}
            onChange={(e) => setColorize(e.target.checked)}
            className="w-5 h-5 rounded border-border text-accent focus:ring-accent"
          />
          <div className="flex-1">
            <span className="font-medium text-foreground">Colorisation automatique</span>
            <p className="text-sm text-muted-foreground">
              Ajoutez des couleurs naturelles à vos photos noir et blanc
            </p>
          </div>
          <span className="text-sm text-accent font-medium">+500 F</span>
        </label>
      </motion.div>

      {/* Pricing info */}
      {selectedFiles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-accent/10 rounded-xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {selectedFiles.length} photo{selectedFiles.length > 1 ? "s" : ""} sélectionnée{selectedFiles.length > 1 ? "s" : ""}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-2xl text-foreground font-medium">
                  {(currentPrice + (colorize ? 500 * selectedFiles.length : 0)).toLocaleString()} F
                </span>
                {savings > 0 && (
                  <span className="text-sm text-success flex items-center gap-1">
                    <Percent className="w-3 h-3" />
                    -{savings}%
                  </span>
                )}
              </div>
            </div>
            <Button
              onClick={handleSubmit}
              variant="hero"
              size="lg"
              disabled={selectedFiles.length === 0}
            >
              Restaurer
            </Button>
          </div>
        </motion.div>
      )}

      {/* Footer badges */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center"
      >
        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span>Privé et Sécurisé</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span>Traitement Rapide</span>
          </div>
        </div>
        
        {/* Pricing info */}
        <p className="text-xs text-muted-foreground mt-4">
          Prix dégressif : 1 photo = 1000 F • 2 photos = 1800 F • 3+ photos = 2500 F
        </p>
      </motion.div>
    </div>
  );
}
