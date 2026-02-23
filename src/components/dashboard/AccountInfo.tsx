import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, Check, X, Loader2, Send } from "lucide-react";
import { Profile } from "@/hooks/useProfile";
import { useResendVerificationEmail } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";

interface AccountInfoProps {
  profile: Profile | null;
  email: string | undefined;
}

export function AccountInfo({ profile, email }: AccountInfoProps) {
  const { toast } = useToast();
  const resendEmail = useResendVerificationEmail();

  const handleResendVerification = async () => {
    if (!email) return;

    try {
      await resendEmail.mutateAsync(email);
      toast({
        title: "Email envoyé !",
        description: "Vérifiez votre boîte de réception",
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer l'email",
        variant: "destructive",
      });
    }
  };

  const fields = [
    {
      label: "Prénom",
      value: profile?.first_name || "—",
      icon: User,
    },
    {
      label: "Nom",
      value: profile?.last_name || "—",
      icon: User,
    },
    {
      label: "Email",
      value: profile?.email || email || "—",
      icon: Mail,
      verified: profile?.email_verified,
    },
    {
      label: "Téléphone",
      value: profile?.phone_number || "—",
      icon: Phone,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Informations du compte
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((field) => (
          <div
            key={field.label}
            className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
          >
            <div className="flex items-center gap-3">
              <field.icon className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{field.label}</p>
                <p className="font-medium">{field.value}</p>
              </div>
            </div>
            {field.verified !== undefined && (
              <Badge
                variant={field.verified ? "default" : "outline"}
                className="gap-1"
              >
                {field.verified ? (
                  <>
                    <Check className="h-3 w-3" /> Vérifié
                  </>
                ) : (
                  <>
                    <X className="h-3 w-3" /> Non vérifié
                  </>
                )}
              </Badge>
            )}
          </div>
        ))}

      </CardContent>
    </Card>
  );
}
