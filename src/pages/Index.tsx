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
import { ArrowRight, Upload, Sparkles, Download, Star, ChevronDown, Shield, Zap, Clock } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const DEMO_AFTER = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=80&auto=format&fit=crop";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.6 },
};

const stagger = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

function IndexContent() {
  const {
    step, progress, originalImageUrl, previewImageUrl, restoredImageUrl,
    downloadUrls, error, uploadPhoto, processPayment, downloadFile, reset, setStep,
  } = useRestoration();

  const { toast } = useToast();
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [showUploader, setShowUploader] = useState(false);

  useEffect(() => {
    if (error) {
      toast({ title: "Une erreur s'est produite", description: error, variant: "destructive" });
    }
  }, [error, toast]);

  const handlePhotoSelected = async (file: File) => { await uploadPhoto(file); };
  const handlePayment = async (promoCode?: string) => {
    setIsPaymentLoading(true);
    await processPayment(promoCode);
    setIsPaymentLoading(false);
  };
  const handleDownloadPng = () => { if (downloadUrls.png) downloadFile("png"); toast({ title: "Téléchargement démarré", description: "Votre PNG HD est en cours de téléchargement..." }); };
  const handleDownloadPdf = () => { if (downloadUrls.pdf) downloadFile("pdf"); toast({ title: "Téléchargement démarré", description: "Votre PDF prêt à imprimer est en cours de téléchargement..." }); };
  const handleContinueToUpsell = () => setStep("upsell");
  const handleSelectFrameSize = (size: string, price: number) => { toast({ title: "Excellent choix !", description: `Toile ${size} pour ${price.toLocaleString()} F ajoutée au panier.` }); };
  const handleSkipUpsell = () => { toast({ title: "Merci !", description: "Profitez de votre souvenir restauré." }); reset(); };

  const scrollToUploader = () => {
    setShowUploader(true);
    setTimeout(() => {
      document.getElementById("uploader-section")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const beforeImage = originalImageUrl || DEMO_AFTER;
  const afterImage = previewImageUrl || restoredImageUrl || DEMO_AFTER;

  const steps = [
    { icon: Upload, title: "Importez votre photo", desc: "Déposez votre photo ancienne ou abîmée en quelques secondes." },
    { icon: Sparkles, title: "La magie opère", desc: "Notre technologie analyse et restaure chaque détail avec soin." },
    { icon: Download, title: "Téléchargez le résultat", desc: "Récupérez votre souvenir restauré en HD, prêt à imprimer." },
  ];

  const faqs = [
    { q: "Est-ce que ma photo reste privée ?", a: "Absolument. Vos photos sont traitées de façon sécurisée et ne sont jamais partagées. Elles sont supprimées automatiquement après 30 jours." },
    { q: "Quels types de photos puis-je restaurer ?", a: "Portraits, photos de famille, paysages, photos de mariage… Même les photos très anciennes, jaunies ou abîmées peuvent être améliorées." },
    { q: "Combien de temps prend la restauration ?", a: "Le traitement prend généralement entre 30 secondes et 2 minutes, selon la complexité de votre photo." },
    { q: "Est-ce que je peux voir le résultat avant de payer ?", a: "Oui ! Vous voyez un aperçu basse résolution avec un comparateur avant/après. Le fichier HD n'est débloqué qu'après paiement." },
    { q: "Quels formats de fichier recevrai-je ?", a: "Vous recevez un fichier PNG haute résolution et un PDF prêt à imprimer, parfait pour encadrer." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        <AnimatePresence mode="wait">
          {step === "upload" && (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>

              {/* HERO */}
              {!showUploader && (
                <section className="pt-28 pb-20 md:pt-36 md:pb-28 relative overflow-hidden">
                  {/* Background glow */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

                  <div className="container relative">
                    <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
                      <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.7 }}
                        className="text-center md:text-left"
                      >
                        <div className="pill-badge mb-6">
                          <Sparkles className="w-4 h-4" />
                          <span>Vos souvenirs méritent une seconde vie</span>
                        </div>

                        <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl text-foreground mb-6 font-extrabold leading-[1.1] tracking-tight">
                          Redonnez vie à vos{" "}
                          <em className="text-gradient not-italic">anciennes photos</em>
                        </h1>

                        <p className="text-muted-foreground text-lg md:text-xl mb-8 max-w-lg">
                          Voyez votre photo restaurée avant de payer. Simple, rapide, fait pour vos souvenirs de famille.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 mb-10 justify-center md:justify-start">
                          <Button
                            onClick={scrollToUploader}
                            size="lg"
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base px-8 py-6 rounded-full shadow-gold"
                          >
                            Restaurer ma photo
                            <ArrowRight className="w-5 h-5 ml-2" />
                          </Button>
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={() => document.getElementById("examples")?.scrollIntoView({ behavior: "smooth" })}
                            className="rounded-full border-border/50 text-foreground hover:bg-secondary px-8 py-6"
                          >
                            Voir des exemples
                          </Button>
                        </div>

                        {/* Social proof */}
                        <div className="flex items-center gap-4 justify-center md:justify-start">
                          <div className="flex -space-x-2">
                            {[1, 2, 3, 4].map((i) => (
                              <div key={i} className="w-8 h-8 rounded-full bg-secondary border-2 border-background flex items-center justify-center text-xs text-muted-foreground font-medium">
                                {String.fromCharCode(64 + i)}
                              </div>
                            ))}
                          </div>
                          <div className="text-left">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <Star key={i} className="w-3.5 h-3.5 fill-primary text-primary" />
                              ))}
                              <span className="text-sm text-foreground font-medium ml-1">4.9</span>
                            </div>
                            <p className="text-xs text-muted-foreground">+2 000 photos restaurées</p>
                          </div>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.7, delay: 0.2 }}
                        className="flex justify-center"
                      >
                        <FloatingPhotoFrame className="w-64 md:w-80" />
                      </motion.div>
                    </div>
                  </div>
                </section>
              )}

              {/* UPLOADER */}
              <section id="uploader-section" className={showUploader ? "py-8 pt-28" : ""}>
                {showUploader && <PhotoUploader onPhotoSelected={handlePhotoSelected} />}
              </section>

              {/* HOW IT WORKS */}
              {!showUploader && (
                <section id="how-it-works" className="py-20 md:py-28">
                  <div className="container">
                    <motion.div {...fadeInUp} className="text-center mb-16">
                      <div className="pill-badge mb-4 mx-auto">
                        <span>Comment ça marche</span>
                      </div>
                      <h2 className="font-heading text-3xl md:text-4xl text-foreground font-bold mb-4">
                        Trois étapes simples
                      </h2>
                      <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                        De votre photo ancienne à un souvenir restauré en quelques minutes.
                      </p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                      {steps.map((s, i) => (
                        <motion.div
                          key={i}
                          {...stagger}
                          transition={{ delay: 0.1 + i * 0.15, duration: 0.5 }}
                          whileHover={{ y: -4 }}
                          className="glass-card p-8 text-center group cursor-default"
                        >
                          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5 group-hover:bg-primary/20 transition-colors">
                            <s.icon className="w-7 h-7 text-primary" />
                          </div>
                          <div className="text-xs text-primary font-semibold mb-2 tracking-wider uppercase">
                            Étape {i + 1}
                          </div>
                          <h3 className="font-heading text-lg text-foreground font-semibold mb-2">{s.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* EXAMPLES */}
              {!showUploader && (
                <div id="examples">
                  <ExamplesGallery />
                </div>
              )}

              {/* PRICING PREVIEW */}
              {!showUploader && (
                <section id="pricing" className="py-20 md:py-28">
                  <div className="container">
                    <motion.div {...fadeInUp} className="text-center mb-12">
                      <div className="pill-badge mb-4 mx-auto">
                        <span>Tarif simple</span>
                      </div>
                      <h2 className="font-heading text-3xl md:text-4xl text-foreground font-bold mb-4">
                        Un prix, un souvenir restauré
                      </h2>
                    </motion.div>

                    <motion.div {...fadeInUp} className="max-w-md mx-auto">
                      <div className="glass-card p-8 md:p-10 text-center border-primary/20 shadow-glow">
                        <div className="flex items-baseline justify-center gap-1 mb-6">
                          <span className="font-heading text-5xl md:text-6xl text-foreground font-extrabold">1 000</span>
                          <span className="text-2xl text-muted-foreground">F</span>
                        </div>

                        <div className="space-y-3 mb-8 text-left">
                          {[
                            { icon: Zap, text: "Fichier PNG haute résolution" },
                            { icon: Download, text: "PDF prêt à imprimer" },
                            { icon: Clock, text: "Résultat en moins de 2 minutes" },
                            { icon: Shield, text: "Aperçu gratuit avant paiement" },
                          ].map((f, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                                <f.icon className="w-3.5 h-3.5 text-success" />
                              </div>
                              <span className="text-sm text-foreground">{f.text}</span>
                            </div>
                          ))}
                        </div>

                        <Button
                          onClick={scrollToUploader}
                          size="lg"
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base py-6 rounded-full shadow-gold"
                        >
                          Commencer maintenant
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>

                        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5" />
                            <span>Paiement sécurisé</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5" />
                            <span>Accès immédiat</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </section>
              )}

              {/* FAQ */}
              {!showUploader && (
                <section className="py-20 md:py-28">
                  <div className="container max-w-2xl">
                    <motion.div {...fadeInUp} className="text-center mb-12">
                      <div className="pill-badge mb-4 mx-auto">
                        <span>Questions fréquentes</span>
                      </div>
                      <h2 className="font-heading text-3xl md:text-4xl text-foreground font-bold">
                        Tout ce que vous devez savoir
                      </h2>
                    </motion.div>

                    <motion.div {...fadeInUp}>
                      <Accordion type="single" collapsible className="space-y-3">
                        {faqs.map((faq, i) => (
                          <AccordionItem key={i} value={`faq-${i}`} className="glass-card px-6 border-border/30">
                            <AccordionTrigger className="text-left text-foreground font-medium hover:no-underline py-5">
                              {faq.q}
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                              {faq.a}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </motion.div>
                  </div>
                </section>
              )}
            </motion.div>
          )}

          {step === "processing" && (
            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="pt-24">
              <ProcessingLoader progress={Math.min(progress, 100)} />
            </motion.div>
          )}

          {step === "comparison" && (
            <motion.div key="comparison" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="pt-24">
              <div className="container space-y-8 py-8">
                <div className="text-center">
                  <h1 className="font-heading text-2xl md:text-3xl text-foreground mb-2 font-bold">Voyez la transformation</h1>
                  <p className="text-muted-foreground">Votre souvenir, restauré avec soin.</p>
                </div>
                <BeforeAfterSlider beforeImage={beforeImage} afterImage={afterImage} />
                <PaymentSection onPayment={handlePayment} isLoading={isPaymentLoading} />
              </div>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="pt-24">
              <div className="container">
                <SuccessDownload restoredImageUrl={afterImage} onDownloadPng={handleDownloadPng} onDownloadPdf={handleDownloadPdf} onContinue={handleContinueToUpsell} />
                <SocialShare imageUrl={afterImage} />
              </div>
            </motion.div>
          )}

          {step === "upsell" && (
            <motion.div key="upsell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="pt-24">
              <div className="container">
                <UpsellSection restoredImageUrl={afterImage} onSelectSize={handleSelectFrameSize} onSkip={handleSkipUpsell} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 mt-auto">
        <div className="container py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-heading text-sm font-semibold text-foreground">REVIVO</span>
            </div>
            <p className="text-sm text-muted-foreground">© 2026 REVIVO. Vos souvenirs, ravivés.</p>
          </div>
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
