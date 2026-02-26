import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Image, Eye, RefreshCw, Search, Loader2, Check, X, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PhotoRestoration {
  id: string;
  created_at: string;
  status: string;
  is_paid: boolean;
  user_id: string | null;
  session_id: string;
  preview_image_path: string | null;
  restored_image_path: string | null;
  original_image_path: string | null;
}

interface AdminPhotosTableProps {
  photos: PhotoRestoration[];
  isLoading: boolean;
  getUserName: (userId: string | null) => string;
  getUserPhone?: (userId: string | null) => string;
}

export function AdminPhotosTable({
  photos,
  isLoading,
  getUserName,
  getUserPhone,
}: AdminPhotosTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<PhotoRestoration | null>(null);
  const [previewUrls, setPreviewUrls] = useState<{ before: string | null; after: string | null }>({
    before: null,
    after: null,
  });
  const [previewLoading, setPreviewLoading] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const { toast } = useToast();

  const filteredPhotos = photos.filter((photo) => {
    const search = searchTerm.toLowerCase();
    return (
      photo.id.toLowerCase().includes(search) ||
      photo.status.toLowerCase().includes(search) ||
      getUserName(photo.user_id).toLowerCase().includes(search)
    );
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
      completed: { variant: "default", label: "Terminée" },
      pending: { variant: "secondary", label: "En attente" },
      processing: { variant: "outline", label: "En cours" },
      preview_ready: { variant: "default", label: "Aperçu prêt" },
      failed: { variant: "destructive", label: "Échec" },
    };
    const statusConfig = config[status] || { variant: "secondary", label: status };
    return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>;
  };

  const openPreview = async (photo: PhotoRestoration) => {
    setPreviewOpen(true);
    setPreviewPhoto(photo);
    setPreviewUrls({ before: null, after: null });
    setPreviewLoading(true);

    const promises: Promise<void>[] = [];

    if (photo.original_image_path) {
      promises.push(
        supabase.storage
          .from("photos")
          .createSignedUrl(photo.original_image_path, 3600)
          .then(({ data }) => {
            if (data?.signedUrl) {
              setPreviewUrls((prev) => ({ ...prev, before: data.signedUrl }));
            }
          })
      );
    }

    const afterPath = photo.restored_image_path || photo.preview_image_path;
    if (afterPath) {
      promises.push(
        supabase.storage
          .from("photos")
          .createSignedUrl(afterPath, 3600)
          .then(({ data }) => {
            if (data?.signedUrl) {
              setPreviewUrls((prev) => ({ ...prev, after: data.signedUrl }));
            }
          })
      );
    }

    await Promise.all(promises);
    setPreviewLoading(false);
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewPhoto(null);
    setPreviewUrls({ before: null, after: null });
  };

  const handleRegenerate = async (photo: PhotoRestoration) => {
    if (!photo.original_image_path) {
      toast({ title: "Erreur", description: "Aucune image originale trouvée", variant: "destructive" });
      return;
    }

    setRegeneratingId(photo.id);
    try {
      // Reset restoration status
      await supabase
        .from("photo_restorations")
        .update({ status: "pending", preview_image_path: null, restored_image_path: null })
        .eq("id", photo.id);

      // Call restore-photo edge function
      const { data, error } = await supabase.functions.invoke("restore-photo", {
        body: {
          restorationId: photo.id,
          trialNumber: 1,
          sessionId: photo.session_id,
        },
      });

      if (error) throw error;

      toast({
        title: "Régénération lancée",
        description: `La photo ${photo.id.slice(0, 8)} est en cours de retraitement.`,
      });
    } catch (err: any) {
      console.error("Regenerate error:", err);
      toast({
        title: "Erreur de régénération",
        description: err.message || "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleSendWhatsApp = async (photo: PhotoRestoration) => {
    const phone = getUserPhone?.(photo.user_id);
    if (!phone) {
      toast({ title: "Numéro introuvable", description: "Aucun numéro de téléphone associé à cet utilisateur", variant: "destructive" });
      return;
    }

    // Get signed URL for the restored image
    const imagePath = photo.restored_image_path || photo.preview_image_path;
    if (!imagePath) {
      toast({ title: "Aucune image", description: "Aucune image restaurée disponible", variant: "destructive" });
      return;
    }

    const { data: signedData } = await supabase.storage
      .from("photos")
      .createSignedUrl(imagePath, 86400); // 24h

    const imageUrl = signedData?.signedUrl || "";
    const userName = getUserName(photo.user_id);

    // Clean phone number (remove spaces, ensure format)
    const cleanPhone = phone.replace(/\s+/g, "").replace(/^\+/, "");

    const message = `Bonjour ${userName} 👋\n\nMerci d'avoir choisi REVIVO pour restaurer votre photo ! 🎉\n\nVotre image restaurée en haute qualité est prête :\n${imageUrl}\n\nN'hésitez pas à partager REVIVO avec vos proches pour qu'ils puissent aussi redonner vie à leurs souvenirs ! 📸✨\n\nL'équipe REVIVO 💛`;

    window.open(
      `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            Gestion des photos ({photos.length})
          </CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredPhotos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune photo trouvée
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Payée</TableHead>
                    <TableHead>Aperçu</TableHead>
                    <TableHead>Final</TableHead>
                    <TableHead>Créée le</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPhotos.map((photo) => (
                    <TableRow key={photo.id}>
                      <TableCell className="font-mono text-xs">
                        {photo.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate">
                        {getUserName(photo.user_id)}
                      </TableCell>
                      <TableCell>{getStatusBadge(photo.status)}</TableCell>
                      <TableCell>
                        {photo.is_paid ? (
                          <Badge variant="default">Oui</Badge>
                        ) : (
                          <Badge variant="secondary">Non</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {photo.preview_image_path ? (
                          <Check className="h-4 w-4 text-primary" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        {photo.restored_image_path ? (
                          <Check className="h-4 w-4 text-primary" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(photo.created_at), "dd MMM yyyy HH:mm", {
                          locale: fr,
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Voir"
                            onClick={() => openPreview(photo)}
                            disabled={!photo.original_image_path && !photo.preview_image_path && !photo.restored_image_path}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Régénérer"
                            onClick={() => handleRegenerate(photo)}
                            disabled={regeneratingId === photo.id || !photo.original_image_path}
                          >
                            {regeneratingId === photo.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                          {photo.is_paid && (photo.restored_image_path || photo.preview_image_path) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Envoyer via WhatsApp"
                              onClick={() => handleSendWhatsApp(photo)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Aperçu de la restauration
            </DialogTitle>
            {previewPhoto && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground pt-1">
                <span className="font-mono">ID: {previewPhoto.id.slice(0, 8)}...</span>
                {getStatusBadge(previewPhoto.status)}
                {previewPhoto.is_paid ? (
                  <Badge variant="default" className="text-xs">Payée</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Non payée</Badge>
                )}
              </div>
            )}
          </DialogHeader>

          {previewLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 mt-2">
                {/* AVANT */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-center text-muted-foreground">AVANT (Original)</p>
                  <div className="aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                    {previewUrls.before ? (
                      <img
                        src={previewUrls.before}
                        alt="Photo originale"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <X className="h-8 w-8" />
                        <span className="text-xs">Aucune image originale</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* APRÈS */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-center text-muted-foreground">
                    APRÈS {previewPhoto && !previewPhoto.is_paid ? "(Aperçu — non payé)" : "(Restaurée HD)"}
                  </p>
                  <div className="aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center relative">
                    {previewUrls.after ? (
                      <>
                        <img
                          src={previewUrls.after}
                          alt="Photo restaurée"
                          className="w-full h-full object-contain"
                        />
                        {previewPhoto && !previewPhoto.is_paid && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none overflow-hidden">
                            {[0, 1, 2].map((row) => (
                              <div key={row} className="flex gap-6 my-3 -rotate-30">
                                {[0, 1, 2].map((col) => (
                                  <span
                                    key={col}
                                    className="text-2xl font-black tracking-widest text-foreground/20 whitespace-nowrap"
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
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <X className="h-8 w-8" />
                        <span className="text-xs">Aucune image restaurée</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons in modal */}
              {previewPhoto && (
                <div className="flex justify-center gap-3 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRegenerate(previewPhoto)}
                    disabled={regeneratingId === previewPhoto.id || !previewPhoto.original_image_path}
                  >
                    {regeneratingId === previewPhoto.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Régénérer
                  </Button>
                  {previewPhoto.is_paid && (previewPhoto.restored_image_path || previewPhoto.preview_image_path) && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleSendWhatsApp(previewPhoto)}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Envoyer via WhatsApp
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
