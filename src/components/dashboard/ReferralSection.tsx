import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Copy, Check, Users, Sparkles, TrendingUp, MessageCircle, Facebook, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

interface ReferralSectionProps {
  referralCode: string | null;
  totalInvited: number;
  successfulReferrals: number;
  generationsEarned: number;
  generationsUsed: number;
}

export function ReferralSection({
  referralCode,
  totalInvited,
  successfulReferrals,
  generationsEarned,
  generationsUsed,
}: ReferralSectionProps) {
  const { toast } = useToast();
  const [copiedMessage, setCopiedMessage] = useState(false);

  const shareMessage = referralCode
    ? `🎉 J'utilise REVIVO pour restaurer mes anciennes photos et c'est incroyable ! Essaie toi aussi et utilise mon code promo ${referralCode} pour avoir -10% sur ta première restauration 📸✨\n\n👉 ${window.location.origin}/auth?ref=${referralCode}`
    : "";

  const handleCopyMessage = async () => {
    if (!shareMessage) return;
    await navigator.clipboard.writeText(shareMessage);
    setCopiedMessage(true);
    toast({
      title: "Message copié !",
      description: "Partagez-le sur vos réseaux sociaux",
    });
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const shareToWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(url, "_blank");
  };

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}&quote=${encodeURIComponent(shareMessage)}`;
    window.open(url, "_blank", "width=600,height=400");
  };

  const stats = [
    { label: "Amis invités", value: totalInvited, icon: Users },
    { label: "Parrainages réussis", value: successfulReferrals, icon: TrendingUp },
    { label: "Générations gagnées", value: generationsEarned, icon: Sparkles },
    { label: "Générations utilisées", value: generationsUsed, icon: Gift },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          Invitez vos amis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Info text */}
        <p className="text-muted-foreground">
          Partagez ce message pour inviter vos amis. Ils recevront <strong>-10% sur leur premier achat</strong> et vous gagnerez <strong>1 restauration gratuite</strong> quand ils paient !
        </p>

        {/* Promo Code Badge */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Votre code :</span>
          <Badge variant="secondary" className="text-lg font-mono px-4 py-2">
            {referralCode || "..."}
          </Badge>
        </div>

        {/* Shareable message */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Message à partager</label>
          <Textarea
            readOnly
            value={shareMessage}
            className="bg-muted border-border/50 text-sm min-h-[120px] resize-none"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleCopyMessage}
              variant="outline"
              className="gap-2"
            >
              {copiedMessage ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Copier le message
            </Button>
            <Button
              onClick={shareToWhatsApp}
              variant="outline"
              className="gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
            <Button
              onClick={shareToFacebook}
              variant="outline"
              className="gap-2"
            >
              <Facebook className="h-4 w-4" />
              Facebook
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <stat.icon className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="pt-4 border-t">
          <h4 className="font-medium mb-3">Comment ça marche ?</h4>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Partagez votre message sur les réseaux sociaux</li>
            <li>Vos amis s'inscrivent avec votre code promo</li>
            <li>Ils reçoivent -10% sur leur premier achat</li>
            <li>Vous gagnez 1 restauration gratuite quand ils paient</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
