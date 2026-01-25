import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Copy, Check, Users, Sparkles, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const referralLink = referralCode
    ? `${window.location.origin}/auth?ref=${referralCode}`
    : "";

  const handleCopyLink = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({
      title: "Lien copié !",
      description: "Partagez ce lien avec vos amis",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = async () => {
    if (!referralCode) return;
    await navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    toast({
      title: "Code copié !",
      description: "Partagez ce code avec vos amis",
    });
    setTimeout(() => setCopiedCode(false), 2000);
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
          Parrainez vos amis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Info text */}
        <p className="text-muted-foreground">
          Quand un ami paie, vous gagnez 1 restauration gratuite.
        </p>

        {/* Referral Code */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Votre code de parrainage</label>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-lg font-mono px-4 py-2">
              {referralCode || "..."}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopyCode}
              className="flex-shrink-0"
            >
              {copiedCode ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Referral Link */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Votre lien de parrainage</label>
          <div className="flex gap-2">
            <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm break-all">
              {referralLink || "Chargement..."}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyLink}
              className="flex-shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
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
            <li>Partagez votre lien avec vos proches</li>
            <li>Ils créent un compte REVIVO</li>
            <li>Quand ils effectuent leur premier achat, vous gagnez 1 restauration gratuite</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
