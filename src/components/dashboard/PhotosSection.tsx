import { useState, useEffect, forwardRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Image, Eye, Download, CreditCard, Loader2, ImageOff, ShieldCheck, Star, MessageCircle, RefreshCw, Sparkles,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";

interface Photo {
  id: string;
  created_at: string;
  status: string;
  is_paid: boolean;
  preview_image_path: string | null;
  restored_image_path: string | null;
  pdf_path: string | null;
  trial_number: number;
  user_rating: number | null;
}

const WHATSAPP_NUMBER = "22666783831";
const MAX_TRIALS = 2;

function StarRating({ rating }: { rating: number | null }) {
  if (rating === null) return null;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= rating ? "text-primary fill-primary" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

export const PhotosSection = forwardRef<HTMLDivElement>(function PhotosSection(_props, ref) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const { data: profile } = useProfile();

  const { data: photos, isLoading } = useQuery({
    queryKey: ["user-photos", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("photo_restorations")
        .select("id, created_at, status, is_paid, preview_image_path, restored_image_path, pdf_path, trial_number, user_rating")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Photo[];
    },
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

  // Generate thumbnails for cards
  useEffect(() => {
    if (!photos) return;
    const photosWithImages = photos.filter(
      (p) => p.preview_image_path || p.restored_image_path
    );
    for (const photo of photosWithImages) {
      const path = photo.restored_image_path || photo.preview_image_path;
      if (!path || thumbnails[photo.id]) continue;
      supabase.storage
        .from("photos")
        .createSignedUrl(path, 3600)
        .then(({ data }) => {
          if (data?.signedUrl) {
            setThumbnails((prev) => ({ ...prev, [photo.id]: data.signedUrl }));
          }
        });
    }
  }, [photos]);

  // Generate signed URL for modal preview
  // For unpaid photos: prefer preview_image_path (watermarked version)
  // For paid photos: use restored_image_path (HD version)
  useEffect(() => {
    if (!selectedPhoto) { setPreviewUrl(null); return; }
    const path = selectedPhoto.is_paid
      ? (selectedPhoto.restored_image_path || selectedPhoto.preview_image_path)
      : (selectedPhoto.preview_image_path || selectedPhoto.restored_image_path);
    if (!path) { setPreviewUrl(null); return; }
    setPreviewLoading(true);
    supabase.storage
      .from("photos")
      .createSignedUrl(path, 3600)
      .then(({ data, error }) => {
        setPreviewUrl(error ? null : data?.signedUrl ?? null);
        setPreviewLoading(false);
      });
  }, [selectedPhoto]);

  const handleDownload = async (path: string, photoId: string) => {
    try {
      toast({ title: "Téléchargement lancé...", description: "Récupération du fichier HD." });
      const { data, error } = await supabase.storage.from("photos").download(path);
      if (error) throw error;

      const ext = path.endsWith(".jpg") || path.endsWith(".jpeg") ? ".jpg" : ".png";
      const url = window.URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `REVIVO-HD-${photoId.slice(0, 8)}${ext}`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err) {
      console.error("Erreur download:", err);
      toast({ title: "Erreur", description: "Impossible de récupérer le fichier.", variant: "destructive" });
    }
  };

  const openWhatsApp = (photoId: string) => {
    const message = encodeURIComponent(
      `Bonjour Admin, je suis bloqué sur la photo ${photoId.slice(0, 8)}. Aidez-moi svp.`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank");
  };

  const handleUseFreeCreditOrPay = async (photo: Photo) => {
    const freeBalance = profile?.free_generations_balance || 0;
    
    if (freeBalance > 0) {
      // Use free credit via process-payment
      setUnlockingId(photo.id);
      try {
        const { data: result, error } = await supabase.functions.invoke("process-payment", {
          body: { restorationId: photo.id },
        });

        if (error || !result?.success) {
          throw new Error(result?.error || "Erreur lors de l'utilisation du crédit gratuit");
        }

        toast({ title: "✅ Photo débloquée !", description: "Votre crédit gratuit a été utilisé. Vous pouvez télécharger la photo HD." });
        queryClient.invalidateQueries({ queryKey: ["user-photos"] });
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        setSelectedPhoto(null);

        // Download immediately if URLs available
        if (result.downloadUrls?.png) {
          const link = document.createElement("a");
          link.href = result.downloadUrls.png;
          link.download = `REVIVO-HD-${photo.id.slice(0, 8)}.png`;
          link.click();
        }
      } catch (err) {
        console.error("Free credit error:", err);
        toast({ title: "Erreur", description: err instanceof Error ? err.message : "Impossible d'utiliser le crédit", variant: "destructive" });
      } finally {
        setUnlockingId(null);
      }
    } else {
      // No free credits — navigate to payment page with restoration context
      window.location.href = `/?pay=${photo.id}`;
    }
  };

  if (isLoading) {
    return (
      <Card ref={ref}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            Mes photos
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!photos || photos.length === 0) {
    return (
      <Card ref={ref}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            Mes photos
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <ImageOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">
            Vous n'avez pas encore de photos restaurées
          </p>
          <Button asChild>
            <a href="/?restore=1">Restaurer ma première photo</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isFailed = (photo: Photo) => photo.status === "failed";

  const showWhatsApp = (photo: Photo) => !photo.is_paid && photo.status === "failed";

  return (
    <>
      <Card ref={ref}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            Mes photos ({photos.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Security Alert */}
          <Alert className="border-primary/30 bg-primary/5">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              🛡️ <strong>Sécurité :</strong> Vos photos sont supprimées automatiquement de nos serveurs 48h après leur création. Pensez à les télécharger.
            </AlertDescription>
          </Alert>

          {/* Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {photos.map((photo) => {
              const failed = isFailed(photo);
              const isProcessing = photo.status === "processing" || photo.status === "pending";
              const isPreview = (photo.status === "preview_ready" || photo.status === "completed") && !photo.is_paid;
              const isCompleted = photo.is_paid && photo.status === "completed";

              return (
                <div
                  key={photo.id}
                  className={`rounded-xl border overflow-hidden transition-all ${
                    failed
                      ? "border-destructive/40 bg-destructive/5"
                      : isCompleted
                        ? "border-green-500/40 bg-green-500/5"
                        : "border-border bg-card"
                  }`}
                >
                  {/* Image / Skeleton */}
                  <div className="aspect-square relative bg-muted/30 overflow-hidden">
                    {isProcessing ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
                        <Skeleton className="w-full h-full absolute inset-0" />
                        <RefreshCw className="h-8 w-8 text-primary animate-spin relative z-10" />
                        <span className="text-xs text-muted-foreground relative z-10">IA au travail...</span>
                      </div>
                    ) : thumbnails[photo.id] ? (
                      <>
                        <img
                          src={thumbnails[photo.id]}
                          alt="Photo restaurée"
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onContextMenu={(e) => !photo.is_paid && e.preventDefault()}
                        />
                        {/* Watermark REVIVO on unpaid photos */}
                        {!photo.is_paid && (photo.status === "preview_ready" || photo.status === "completed") && (
                          <div
                            className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none select-none overflow-hidden"
                            onContextMenu={(e) => e.preventDefault()}
                          >
                            {[0, 1, 2].map((row) => (
                              <div key={row} className="flex gap-8 my-4 -rotate-30">
                                {[0, 1, 2].map((col) => (
                                  <span
                                    key={col}
                                    className="text-3xl font-black tracking-widest text-foreground/25 whitespace-nowrap"
                                    style={{ textShadow: "0 1px 4px rgba(0,0,0,0.15)" }}
                                  >
                                    REVIVO
                                  </span>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ImageOff className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                    )}

                    {/* Status Badge overlay */}
                    <div className="absolute top-2 left-2">
                      {isProcessing && (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" /> IA au travail...
                        </Badge>
                      )}
                      {isPreview && !failed && (
                        <Badge className="text-[10px] bg-primary/90">Aperçu Gratuit</Badge>
                      )}
                      {isCompleted && (
                        <Badge className="text-[10px] bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]">✅ HD Dispo</Badge>
                      )}
                      {failed && (
                        <Badge variant="destructive" className="text-[10px]">Échec</Badge>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(photo.created_at), "dd MMM yyyy", { locale: fr })}
                      </span>
                      <StarRating rating={photo.user_rating} />
                    </div>

                    {/* Actions */}
                    {isProcessing && (
                      <p className="text-xs text-muted-foreground text-center">Traitement en cours...</p>
                    )}

                    {isPreview && !failed && (
                      <Button
                        className="w-full"
                        size="sm"
                        onClick={() => handleUseFreeCreditOrPay(photo)}
                        disabled={unlockingId === photo.id}
                      >
                        {unlockingId === photo.id ? (
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (profile?.free_generations_balance || 0) > 0 ? (
                          <Sparkles className="h-4 w-4 mr-1.5" />
                        ) : (
                          <Eye className="h-4 w-4 mr-1.5" />
                        )}
                        {unlockingId === photo.id
                          ? "Déblocage..."
                          : (profile?.free_generations_balance || 0) > 0
                            ? "DÉBLOQUER (crédit gratuit)"
                            : "VOIR & DÉBLOQUER"
                        }
                      </Button>
                    )}

                    {isCompleted && photo.restored_image_path && (
                      <Button
                        className="w-full bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-[hsl(var(--success-foreground))]"
                        size="sm"
                        onClick={() => handleDownload(photo.restored_image_path!, photo.id)}
                      >
                        <Download className="h-4 w-4 mr-1.5" />
                        TÉLÉCHARGER
                      </Button>
                    )}

                    {failed && (
                      <Button
                        className="w-full bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-[hsl(var(--success-foreground))]"
                        size="sm"
                        onClick={() => openWhatsApp(photo.id)}
                      >
                        <MessageCircle className="h-4 w-4 mr-1.5" />
                        Contacter l'Expert
                      </Button>
                    )}

                    {/* WhatsApp button for exhausted trials (not failed, not paid) */}
                    {!failed && showWhatsApp(photo) && !isProcessing && (
                      <Button
                        className="w-full"
                        variant="outline"
                        size="sm"
                        onClick={() => openWhatsApp(photo.id)}
                      >
                        <MessageCircle className="h-4 w-4 mr-1.5 text-green-500" />
                        Pas satisfait ? Confier à l'Expert
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Aperçu de la restauration</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-[200px]">
            {previewLoading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : previewUrl ? (
              <img
                src={previewUrl}
                alt="Aperçu restauration"
                className="max-w-full max-h-[60vh] rounded-lg object-contain"
              />
            ) : (
              <p className="text-muted-foreground">Impossible de charger l'aperçu</p>
            )}
          </div>
          {selectedPhoto && !selectedPhoto.is_paid && selectedPhoto.preview_image_path && (
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1"
                onClick={() => handleUseFreeCreditOrPay(selectedPhoto)}
                disabled={unlockingId === selectedPhoto.id}
              >
                {unlockingId === selectedPhoto.id ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (profile?.free_generations_balance || 0) > 0 ? (
                  <Sparkles className="h-4 w-4 mr-1.5" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-1.5" />
                )}
                {unlockingId === selectedPhoto.id
                  ? "Déblocage..."
                  : (profile?.free_generations_balance || 0) > 0
                    ? `Utiliser 1 crédit gratuit (${profile?.free_generations_balance} dispo)`
                    : "Débloquer le HD (1 000 F)"
                }
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
});
