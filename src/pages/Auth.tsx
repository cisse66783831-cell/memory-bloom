import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowLeft } from "lucide-react";
import logoRevivo from "@/assets/logo-revivo.svg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { SignupForm } from "@/components/SignupForm";


export default function Auth() {
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const referralCode = searchParams.get("ref");
  const moderatorCode = searchParams.get("mod") || sessionStorage.getItem("moderator_code");
  const [isLogin, setIsLogin] = useState(redirectParam !== "restore" && !referralCode && !moderatorCode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Connexion réussie !",
        description: "Bienvenue sur REVIVO.",
      });
      navigate("/dashboard");
    }
  };

  const handleSignup = async (data: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    password: string;
    referralCode?: string;
    promoCode?: string;
    moderatorCode?: string;
  }) => {
    setIsLoading(true);

    const { error } = await signUp(
      data.email, 
      data.password, 
      {
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
        referralCode: data.referralCode,
        promoCode: data.promoCode,
        moderatorCode: data.moderatorCode,
      }
    );

    setIsLoading(false);

    if (error) {
      return { error };
    }

    toast({
      title: "Compte créé !",
      description: "Bienvenue sur REVIVO !",
    });
    if (redirectParam === "restore") {
      navigate("/?restore=1");
    } else {
      navigate("/dashboard");
    }
    return { error: null };
  };

  const handleGoogleSignIn = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-sepia flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <img src={logoRevivo} alt="REVIVO" className="h-16 w-auto mx-auto mb-4" />
            <h1 className="font-heading text-3xl text-foreground font-semibold">
              {isLogin ? "Bon retour !" : "Créer votre compte REVIVO"}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isLogin 
                ? "Connectez-vous pour retrouver vos photos" 
                : "Créez un compte pour sauvegarder vos photos et retrouver vos souvenirs à tout moment."}
            </p>
          </div>

          {/* Form */}
          <div className="bg-card rounded-2xl p-8 shadow-elevated border border-border">
            {isLogin ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="votre@email.com"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? "Chargement..." : "Se connecter"}
                </Button>
              </form>
            ) : (
              <SignupForm 
                onSubmit={handleSignup}
                referralCode={referralCode}
                moderatorCode={moderatorCode}
                isLoading={isLoading}
              />
            )}

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Ou</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full font-medium"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Créer un compte" : "Déjà un compte ? Se connecter"}
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
