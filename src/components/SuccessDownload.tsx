import { motion } from "framer-motion";
import { Check, Download, FileImage, FileText, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SuccessDownloadProps {
  restoredImageUrl: string;
  onDownloadPng: () => void;
  onDownloadPdf: () => void;
  onContinue: () => void;
}

export function SuccessDownload({ 
  restoredImageUrl, 
  onDownloadPng, 
  onDownloadPdf,
  onContinue 
}: SuccessDownloadProps) {
  return (
    <div className="w-full max-w-2xl mx-auto py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        {/* Success icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-20 h-20 rounded-full bg-success mx-auto flex items-center justify-center mb-6 shadow-glow"
        >
          <Check className="w-10 h-10 text-success-foreground" />
        </motion.div>

        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-3">
          Your Memory is Ready
        </h1>
        
        <p className="text-muted-foreground text-lg mb-8">
          Thank you for preserving this precious moment.
        </p>

        {/* Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <div className="relative rounded-2xl overflow-hidden shadow-elevated mx-auto max-w-md">
            <img
              src={restoredImageUrl}
              alt="Restored photo"
              className="w-full aspect-[4/3] object-cover"
            />
            <div className="absolute inset-0 ring-1 ring-inset ring-foreground/5 rounded-2xl" />
          </div>
        </motion.div>

        {/* Download buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4 max-w-sm mx-auto"
        >
          <Button
            onClick={onDownloadPng}
            variant="hero"
            size="lg"
            className="w-full"
          >
            <FileImage className="w-5 h-5" />
            Download HD PNG
          </Button>

          <Button
            onClick={onDownloadPdf}
            variant="outline"
            size="lg"
            className="w-full"
          >
            <FileText className="w-5 h-5" />
            Download Print PDF
          </Button>
        </motion.div>

        {/* Continue button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8"
        >
          <Button
            onClick={onContinue}
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
          >
            <Heart className="w-4 h-4" />
            Make this a framed print
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
