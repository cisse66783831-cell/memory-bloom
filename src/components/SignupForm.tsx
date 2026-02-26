import { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Lock, Phone, Heart, Loader2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const signupSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères").max(50),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(50),
  email: z.string().email("Adresse email invalide"),
  phoneNumber: z.string().regex(
    /^\+?[1-9]\d{8,14}$/,
    "Numéro de téléphone invalide (ex: +22890123456)"
  ),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

type SignupFormData = z.infer<typeof signupSchema>;

interface SignupFormProps {
  onSubmit: (data: SignupFormData & { referralCode?: string }) => Promise<{ error: Error | null }>;
  referralCode?: string | null;
  isLoading: boolean;
}

export function SignupForm({ onSubmit, referralCode, isLoading }: SignupFormProps) {
  const [formData, setFormData] = useState<SignupFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
  });
  const [promoCode, setPromoCode] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof SignupFormData, string>>>({});
  const { toast } = useToast();

  const handleChange = (field: keyof SignupFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const result = signupSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof SignupFormData, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof SignupFormData;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    const { error } = await onSubmit({
      ...formData,
      referralCode: referralCode || promoCode.trim() || undefined,
    });

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {referralCode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 bg-accent/50 rounded-lg border border-accent text-sm"
        >
          <Heart className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-foreground">Vous avez été invité par un ami ❤️</span>
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Prénom
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              value={formData.firstName}
              onChange={handleChange("firstName")}
              placeholder="Jean"
              className={`pl-10 ${errors.firstName ? "border-destructive" : ""}`}
              required
            />
          </div>
          {errors.firstName && (
            <p className="text-xs text-destructive mt-1">{errors.firstName}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Nom
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              value={formData.lastName}
              onChange={handleChange("lastName")}
              placeholder="Dupont"
              className={`pl-10 ${errors.lastName ? "border-destructive" : ""}`}
              required
            />
          </div>
          {errors.lastName && (
            <p className="text-xs text-destructive mt-1">{errors.lastName}</p>
          )}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          Adresse email
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="email"
            value={formData.email}
            onChange={handleChange("email")}
            placeholder="votre@email.com"
            className={`pl-10 ${errors.email ? "border-destructive" : ""}`}
            required
          />
        </div>
        {errors.email && (
          <p className="text-xs text-destructive mt-1">{errors.email}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          Numéro de téléphone
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="tel"
            value={formData.phoneNumber}
            onChange={handleChange("phoneNumber")}
            placeholder="+22890123456"
            className={`pl-10 ${errors.phoneNumber ? "border-destructive" : ""}`}
            required
          />
        </div>
        {errors.phoneNumber && (
          <p className="text-xs text-destructive mt-1">{errors.phoneNumber}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          Incluez l'indicatif pays (ex: +228, +33)
        </p>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          Mot de passe
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="password"
            value={formData.password}
            onChange={handleChange("password")}
            placeholder="••••••••"
            className={`pl-10 ${errors.password ? "border-destructive" : ""}`}
            required
            minLength={8}
          />
        </div>
        {errors.password && (
          <p className="text-xs text-destructive mt-1">{errors.password}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          Minimum 8 caractères
        </p>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          Code promo <span className="text-muted-foreground font-normal">(optionnel)</span>
        </label>
        <div className="relative">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            placeholder="MONCODE"
            className="pl-10 uppercase"
            maxLength={20}
          />
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Création du compte...
          </>
        ) : (
          "Créer mon compte"
        )}
      </Button>
    </form>
  );
}
