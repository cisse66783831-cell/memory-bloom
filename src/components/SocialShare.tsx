import { motion } from "framer-motion";
import { Facebook, MessageCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface SocialShareProps {
  imageUrl: string;
}

export function SocialShare({ imageUrl }: SocialShareProps) {
  const { toast } = useToast();

  const shareText = "Je viens de restaurer une photo ancienne avec REVIVO ! Decouvrez le resultat";
  const shareUrl = window.location.href;

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "width=600,height=400");
  };

  const shareToWhatsApp = () => {
    const text = shareText + "\n\n" + shareUrl;
    const url = "https://api.whatsapp.com/send?text=" + encodeURIComponent(text);
    window.open(url, "_blank");
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Lien copié !",
        description: "Le lien a été copié dans le presse-papier.",
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de copier le lien.",
        variant: "destructive",
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="mt-8 pt-6 border-t border-border"
    >
      <p className="text-sm text-muted-foreground text-center mb-4">
        Partagez votre souvenir restauré
      </p>
      
      <div className="flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="lg"
          onClick={shareToFacebook}
          className="gap-2"
        >
          <Facebook className="w-5 h-5 text-[#1877F2]" />
          Facebook
        </Button>
        
        <Button
          variant="outline"
          size="lg"
          onClick={shareToWhatsApp}
          className="gap-2"
        >
          <MessageCircle className="w-5 h-5 text-[#25D366]" />
          WhatsApp
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          onClick={copyLink}
          className="h-11 w-11"
        >
          <Share2 className="w-5 h-5" />
        </Button>
      </div>
    </motion.div>
  );
}
