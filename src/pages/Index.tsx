import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { PhotoUploader } from "@/components/PhotoUploader";
import { ProcessingLoader } from "@/components/ProcessingLoader";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { PaymentSection } from "@/components/PaymentSection";
import { SuccessDownload } from "@/components/SuccessDownload";
import { UpsellSection } from "@/components/UpsellSection";
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
      title: "Payment successful!",
      description: "Your restored photo is ready for download.",
    });
  };

  const handleDownloadPng = () => {
    if (downloadUrls.png) {
      downloadFile("png");
    }
    toast({
      title: "Download started",
      description: "Your HD PNG is downloading...",
    });
  };

  const handleDownloadPdf = () => {
    if (downloadUrls.pdf) {
      downloadFile("pdf");
    }
    toast({
      title: "Download started",
      description: "Your print-ready PDF is downloading...",
    });
  };

  const handleContinueToUpsell = () => {
    setStep("upsell");
  };

  const handleSelectFrameSize = (size: string, price: number) => {
    toast({
      title: "Great choice!",
      description: `${size} canvas for ${price.toLocaleString()} F added to cart.`,
    });
  };

  const handleSkipUpsell = () => {
    toast({
      title: "Thank you!",
      description: "Enjoy your restored memory.",
    });
    reset();
  };

  // Show error toast if there's an error
  if (error) {
    toast({
      title: "Something went wrong",
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
                    See the Transformation
                  </h1>
                  <p className="text-muted-foreground">
                    Your memory, restored with care.
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
          <p>© 2026 MemoryRestore. Preserving your precious moments.</p>
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
