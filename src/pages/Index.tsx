import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { PhotoUploader } from "@/components/PhotoUploader";
import { FloatingPhotoFrame } from "@/components/FloatingPhotoFrame";
import { ProcessingLoader } from "@/components/ProcessingLoader";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { PaymentSection } from "@/components/PaymentSection";
import { SuccessDownload } from "@/components/SuccessDownload";
import { UpsellSection } from "@/components/UpsellSection";
import { ExamplesGallery } from "@/components/ExamplesGallery";
import { SocialShare } from "@/components/SocialShare";
import { useRestoration, RestorationProvider } from "@/contexts/RestorationContext";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";

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
  const [showUploader, setShowUploader] = useState(false);

  // Handle error toast with useEffect to prevent infinite loop
  useEffect(() => {
    if (error) {
      toast({
        title: "Une erreur s'est produite",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const handlePhotoSelected = async (file: File) => {
    await uploadPhoto(file);
  };

  const handlePayment = async (promoCode?: string) => {
    setIsPaymentLoading(true);
    await processPayment(promoCode);
    setIsPaymentLoading(false);
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

  const scrollToUploader = () => {
    setShowUploader(true);
    setTimeout(() => {
      document.getElementById('uploader-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

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
              {/* Hero Section */}
              {!showUploader && (
                <section className="py-8 md:py-16">
                  <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
                    {/* Left: Text content */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6 }}
                      className="text-center md:text-left"
                    >
                      <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl text-foreground mb-4 font-bold leading-tight">
                        Redonnez vie à vos{" "}
                        <span className="text-gradient">anciennes photos</span>
                      </h1>
                      <p className="text-muted-foreground text-lg md:text-xl mb-8 max-w-lg">
                        Voyez votre photo restaurée avant de payer. Simple, rapide, fait pour vos souvenirs de famille.
                      </p>
                      <Button 
                        onClick={scrollToUploader}
                        size="lg"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-lg px-8 py-6"
                      >
                        Restaurer ma photo
                        <ArrowDown className="w-5 h-5 ml-2" />
                      </Button>
                    </motion.div>

                    {/* Right: Floating frame */}
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                      className="flex justify-center"
                    >
                      <FloatingPhotoFrame className="w-64 md:w-80" />
                    </motion.div>
                  </div>
                </section>
              )}

              {/* Uploader Section */}
              <section id="uploader-section" className={showUploader ? "py-8" : "py-16"}>
                {showUploader && <PhotoUploader onPhotoSelected={handlePhotoSelected} />}
              </section>

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
                  <h1 className="font-heading text-2xl md:text-3xl text-foreground mb-2 font-semibold">
                    Voyez la transformation
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
          <p>© 2026 REVIVO. Vos souvenirs, ravivés.</p>
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