import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, User, LogOut, History, Shield, LayoutDashboard } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdminRole();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border/50 py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="container flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-gold group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-heading text-xl font-bold text-foreground">
            REVIVO
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: "Le Concept", id: "how-it-works" },
            { label: "Exemples", id: "examples" },
            { label: "Tarif", id: "pricing" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="flex items-center gap-2 cursor-pointer">
                    <LayoutDashboard className="w-4 h-4" />
                    Mon espace
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/mes-restaurations" className="flex items-center gap-2 cursor-pointer">
                    <History className="w-4 h-4" />
                    Mes photos
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="flex items-center gap-2 cursor-pointer">
                      <Shield className="w-4 h-4" />
                      Administration
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground px-6">
              <Link to="/auth">Se connecter</Link>
            </Button>
          )}
        </div>
      </div>
    </motion.header>
  );
}
