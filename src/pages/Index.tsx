import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { PhotoUploader } from "@/components/PhotoUploader";
import { MultiPhotoUploader } from "@/components/MultiPhotoUploader";
import { ProcessingLoader } from "@/components/ProcessingLoader";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { PaymentSection } from "@/components/PaymentSection";
import { SuccessDownload } from "@/components/SuccessDownload";
import { UpsellSection } from "@/components/UpsellSection";
import { ExamplesGallery } from "@/components/ExamplesGallery";
import { SocialShare } from "@/components/SocialShare";
import { useRestoration, RestorationProvider } from "@/contexts/RestorationContext";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

// Demo fallback images
const DEMO_AFTER = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=80&auto=format&fit=crop";

function IndexContent() {
  const {
    step,
    progress,
    originalImageUrl,
    previewImageUrl,
    restoredImageUrl,
    downloadUrls,
    error,
    uploadPhoto,
    processPayment,
    downloadFile,
    reset,
    setStep,
  } = useRestoration();

  const { toast } = useToast();
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);

  const handlePhotoSelected = async (file: File) => {
    await uploadPhoto(file);
  };

  const handlePayment = async () => {
    setIsPaymentLoading(true);
    await processPayment();
    setIsPaymentLoading(false);
    
    toast({
      title: "Paiement réussi !",
      description: "Votre photo restaurée est prête à télécharger.",
    });
  };

  const handleDownloadPng = () => {
    if (downloadUrls.png) {
      downloadFile("png");
    }
    toast({
      title: "Téléchargement démarré",
      description: "Votre PNG HD est en cours de téléchargement...",
    });
  };

  const handleDownloadPdf = () => {
    if (downloadUrls.pdf) {
      downloadFile("pdf");
    }
    toast({
      title: "Téléchargement démarré",
      description: "Votre PDF prêt à imprimer est en cours de téléchargement...",
    });
  };

  const handleContinueToUpsell = () => {
    setStep("upsell");
  };

  const handleSelectFrameSize = (size: string, price: number) => {
    toast({
      title: "Excellent choix !",
      description: `Toile ${size} pour ${price.toLocaleString()} F ajoutée au panier.`,
    });
  };

  const handleSkipUpsell = () => {
    toast({
      title: "Merci !",
      description: "Profitez de votre souvenir restauré.",
    });
    reset();
  };

  // Show error toast if there's an error
  if (error) {
    toast({
      title: "Une erreur s'est produite",
      description: error,
      variant: "destructive",
    });
  }

  // Use actual images or fallbacks
  const beforeImage = originalImageUrl || DEMO_AFTER;
  const afterImage = previewImageUrl || restoredImageUrl || DEMO_AFTER;

  return (
    <div className="min-h-screen bg-gradient-sepia">
      <Header />
      
      <main className="container py-8 md:py-12">
        <AnimatePresence mode="wait">
          {step === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <PhotoUploader onPhotoSelected={handlePhotoSelected} />
              <ExamplesGallery />
            </motion.div>
          )}

          {step === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ProcessingLoader progress={Math.min(progress, 100)} />
            </motion.div>
          )}

          {step === "comparison" && (
            <motion.div
              key="comparison"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-8">
                <div className="text-center">
                  <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-2">
                    Voyez la Transformation
                  </h1>
                  <p className="text-muted-foreground">
                    Votre souvenir, restauré avec soin.
                  </p>
                </div>
                
                <BeforeAfterSlider
                  beforeImage={beforeImage}
                  afterImage={afterImage}
                />
                
                <PaymentSection 
                  onPayment={handlePayment}
                  isLoading={isPaymentLoading}
                />
              </div>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SuccessDownload
                restoredImageUrl={afterImage}
                onDownloadPng={handleDownloadPng}
                onDownloadPdf={handleDownloadPdf}
                onContinue={handleContinueToUpsell}
              />
              <SocialShare imageUrl={afterImage} />
            </motion.div>
          )}

          {step === "upsell" && (
            <motion.div
              key="upsell"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <UpsellSection
                restoredImageUrl={afterImage}
                onSelectSize={handleSelectFrameSize}
                onSkip={handleSkipUpsell}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="container py-8 mt-auto">
        <div className="text-center text-sm text-muted-foreground">
          <p>© 2026 MemoryRestore. Préservons vos précieux souvenirs.</p>
        </div>
      </footer>
    </div>
  );
}

export default function Index() {
  return (
    <RestorationProvider>
      <IndexContent />
    </RestorationProvider>
  );
}
