import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Download, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Restoration {
  id: string;
  created_at: string;
  status: string;
  is_paid: boolean;
  original_image_path: string;
  preview_image_path: string | null;
  restored_image_path: string | null;
}

export default function History() {
  const { user, isLoading: authLoading } = useAuth();
  const [restorations, setRestorations] = useState<Restoration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      fetchRestorations();
    }
  }, [user, authLoading, navigate]);

  const fetchRestorations = async () => {
    const { data, error } = await supabase
      .from("photo_restorations")
      .select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRestorations(data);
    }
    setIsLoading(false);
  };

  const getImageUrl = async (path: string | null) => {
    if (!path) return null;
    const { data } = await supabase.storage
      .from("photos")
      .createSignedUrl(path, 3600);
    return data?.signedUrl || null;
  };

  const handleDownload = async (restoration: Restoration) => {
    if (!restoration.is_paid || !restoration.restored_image_path) return;
    
    const url = await getImageUrl(restoration.restored_image_path);
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = `revivo-restauration-${restoration.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-sepia flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-sepia">
      <Header />
      
      <main className="container py-8">
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Link>
          
          <h1 className="font-heading text-2xl md:text-3xl text-foreground font-semibold">
            Mes photos restaurées
          </h1>
          <p className="text-muted-foreground mt-2">
            Retrouvez tous vos souvenirs
          </p>
        </div>

        {restorations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 rounded-full bg-secondary mx-auto flex items-center justify-center mb-6">
              <Image className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="font-heading text-2xl text-foreground mb-2 font-semibold">
              Aucune restauration
            </h2>
            <p className="text-muted-foreground mb-6">
              Vous n'avez pas encore restauré de photos.
            </p>
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link to="/">Restaurer une photo</Link>
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restorations.map((restoration, index) => (
              <RestorationCard 
                key={restoration.id} 
                restoration={restoration}
                index={index}
                getImageUrl={getImageUrl}
                onDownload={() => handleDownload(restoration)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function RestorationCard({ 
  restoration, 
  index,
  getImageUrl,
  onDownload,
}: { 
  restoration: Restoration; 
  index: number;
  getImageUrl: (path: string | null) => Promise<string | null>;
  onDownload: () => void;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadImage = async () => {
      const url = await getImageUrl(
        restoration.is_paid 
          ? restoration.restored_image_path 
          : restoration.preview_image_path || restoration.original_image_path
      );
      setImageUrl(url);
    };
    loadImage();
  }, [restoration, getImageUrl]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-card rounded-xl overflow-hidden shadow-soft border border-border"
    >
      <div className="aspect-[4/3] relative bg-secondary">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Aperçu de la restauration"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Image className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
        
        {!restoration.is_paid && (
          <div className="absolute inset-0 bg-foreground/50 flex items-center justify-center">
            <span className="text-primary-foreground font-medium text-sm px-3 py-1 bg-foreground/70 rounded-full">
              Non payé
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Calendar className="w-4 h-4" />
          <span>
            {format(new Date(restoration.created_at), "d MMMM yyyy", { locale: fr })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`
            px-2 py-1 rounded-full text-xs font-medium
            ${restoration.status === "completed" 
              ? "bg-success/10 text-success" 
              : restoration.status === "processing"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
            }
          `}>
            {restoration.status === "completed" && "Terminé"}
            {restoration.status === "processing" && "En cours"}
            {restoration.status === "pending" && "En attente"}
          </span>

          {restoration.is_paid && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
              Payé
            </span>
          )}
        </div>

        {restoration.is_paid && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-4 gap-2"
            onClick={onDownload}
          >
            <Download className="w-4 h-4" />
            Télécharger
          </Button>
        )}
      </div>
    </motion.div>
  );
}