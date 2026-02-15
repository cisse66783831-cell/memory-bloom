import { useState, useEffect, forwardRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Image, Eye, Download, CreditCard, Sparkles, Loader2, ImageOff 
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Photo {
  id: string;
  created_at: string;
  status: string;
  is_paid: boolean;
  preview_image_path: string | null;
  restored_image_path: string | null;
  pdf_path: string | null;
}

export const PhotosSection = forwardRef<HTMLDivElement>(function PhotosSection(_props, ref) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const { data: photos, isLoading } = useQuery({
    queryKey: ["user-photos", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("photo_restorations")
        .select("id, created_at, status, is_paid, preview_image_path, restored_image_path, pdf_path")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Photo[];
    },
    enabled: !!user?.id,
  });

  // Generate signed URL when selectedPhoto changes
  useEffect(() => {
    if (!selectedPhoto?.preview_image_path) {
      setPreviewUrl(null);
      return;
    }
    setPreviewLoading(true);
    supabase.storage
      .from("photos")
      .createSignedUrl(selectedPhoto.preview_image_path, 3600)
      .then(({ data, error }) => {
        if (error) {
          console.error("Signed URL error:", error);
          setPreviewUrl(null);
        } else {
          setPreviewUrl(data.signedUrl);
        }
        setPreviewLoading(false);
      });
  }, [selectedPhoto]);

  const getStatusBadge = (status: string, isPaid: boolean) => {
    if (isPaid && status === "completed") {
      return <Badge className="bg-success text-success-foreground">Prête</Badge>;
    }
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      pending: { label: "En attente", variant: "secondary" },
      processing: { label: "En cours", variant: "outline" },
      preview_ready: { label: "Aperçu prêt", variant: "default" },
      completed: { label: "À débloquer", variant: "secondary" },
      failed: { label: "Échec", variant: "destructive" },
    };
    const config = statusConfig[status] || { label: status, variant: "secondary" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleDownload = async (path: string, filename: string) => {
    try {
      toast({ title: "Téléchargement lancé...", description: "Veuillez patienter pendant la récupération du fichier HD." });
      const { data, error } = await supabase.storage.from("photos").download(path);
      if (error) throw error;
      const url = window.URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err) {
      console.error("Erreur download:", err);
      toast({ title: "Erreur", description: "Impossible de récupérer le fichier. Réessayez plus tard.", variant: "destructive" });
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

  return (
    <>
      <Card ref={ref}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            Mes photos ({photos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {photos.map((photo) => (
                  <TableRow key={photo.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(photo.created_at), "dd MMM yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {getStatusBadge(photo.status, photo.is_paid)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {photo.is_paid ? "Payée" : "Gratuite"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2 whitespace-nowrap">
                      {photo.preview_image_path && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPhoto(photo)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Aperçu
                        </Button>
                      )}
                      {photo.is_paid && photo.restored_image_path ? (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleDownload(photo.restored_image_path!, "REVIVO-HD-" + photo.id.slice(0, 8) + ".png")}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Télécharger
                        </Button>
                      ) : photo.status === "completed" || photo.status === "preview_ready" ? (
                        <>
                          <Button variant="default" size="sm" asChild>
                            <a href={`/?photo=${photo.id}`}>
                              <CreditCard className="h-4 w-4 mr-1" />
                              Débloquer
                            </a>
                          </Button>
                          <Button variant="outline" size="sm">
                            <Sparkles className="h-4 w-4 mr-1" />
                            Gratuit
                          </Button>
                        </>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
        </DialogContent>
      </Dialog>
    </>
  );
});
