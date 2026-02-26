import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Gift, Copy, Check, Users, Sparkles, TrendingUp, MessageCircle, Facebook, Share2, Pencil, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ReferralSectionProps {
  referralCode: string | null;
  totalInvited: number;
  successfulReferrals: number;
  generationsEarned: number;
  generationsUsed: number;
  onCodeUpdated?: () => void;
}

export function ReferralSection({
  referralCode,
  totalInvited,
  successfulReferrals,
  generationsEarned,
  generationsUsed,
  onCodeUpdated,
}: ReferralSectionProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [customCode, setCustomCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveCustomCode = async () => {
    if (!user?.id || !customCode.trim()) return;
    const code = customCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (code.length < 4 || code.length > 15) {
      toast({ title: "Code invalide", description: "Le code doit contenir entre 4 et 15 caractères alphanumériques.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      // Check uniqueness
      const { data: existing } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("referral_code", code)
        .neq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        toast({ title: "Code déjà pris", description: "Ce code est déjà utilisé par un autre utilisateur.", variant: "destructive" });
        setIsSaving(false);
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ referral_code: code })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({ title: "Code mis à jour !", description: `Votre nouveau code est : ${code}` });
      setIsEditing(false);
      setCustomCode("");
      onCodeUpdated?.();
    } catch {
      toast({ title: "Erreur", description: "Impossible de mettre à jour le code.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const shareMessage = referralCode
    ? "J'utilise REVIVO pour restaurer mes anciennes photos et c'est incroyable ! Essaie toi aussi pour redonner vie a tes vieux souvenirs. Inscris-toi et profite de -10% sur ta premiere restauration avec mon code : " + referralCode + "\n\n" + window.location.origin
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
    const url = "https://api.whatsapp.com/send?text=" + encodeURIComponent(shareMessage);
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

        {/* Promo Code Badge + Edit */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">Votre code :</span>
            <Badge variant="secondary" className="text-lg font-mono px-4 py-2">
              {referralCode || "..."}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setIsEditing(!isEditing); setCustomCode(referralCode || ""); }}
              className="gap-1 text-muted-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
              Personnaliser
            </Button>
          </div>
          {isEditing && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
              <Input
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                placeholder="Ex: REVISSA, PHOTOALI..."
                className="font-mono uppercase max-w-[200px]"
                maxLength={15}
              />
              <Button onClick={handleSaveCustomCode} disabled={isSaving} size="sm">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Valider"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                Annuler
              </Button>
            </div>
          )}
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
