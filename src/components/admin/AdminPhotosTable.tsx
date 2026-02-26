import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
  const [regenProgress, setRegenProgress] = useState(0);
  const [regenStatus, setRegenStatus] = useState<string>("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

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

  const startPolling = (photoId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    
    let elapsed = 0;
    const maxTime = 300; // 5 min max
    
    setRegenProgress(10);
    setRegenStatus("Envoi de la requête...");

    pollingRef.current = setInterval(async () => {
      elapsed += 3;
      
      // Simulate progress based on elapsed time
      const simulatedProgress = Math.min(10 + (elapsed / maxTime) * 80, 90);
      
      try {
        const { data } = await supabase
          .from("photo_restorations")
          .select("status, preview_image_path")
          .eq("id", photoId)
          .single();

        if (!data) return;

        if (data.status === "processing") {
          setRegenProgress(Math.max(simulatedProgress, 30));
          setRegenStatus("Traitement par l'IA en cours...");
        } else if (data.status === "preview_ready" || data.status === "completed") {
          setRegenProgress(100);
          setRegenStatus("Régénération terminée ✓");
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
          
          toast({
            title: "Régénération terminée !",
            description: `La photo a été régénérée avec succès.`,
          });

          // Keep success state for 2s then reset
          setTimeout(() => {
            setRegeneratingId(null);
            setRegenProgress(0);
            setRegenStatus("");
          }, 2000);
          return;
        } else if (data.status === "failed") {
          setRegenProgress(0);
          setRegenStatus("Échec de la régénération");
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
          
          toast({
            title: "Échec de la régénération",
            description: "Le modèle n'a pas pu traiter l'image.",
            variant: "destructive",
          });

          setTimeout(() => {
            setRegeneratingId(null);
            setRegenProgress(0);
            setRegenStatus("");
          }, 2000);
          return;
        } else {
          setRegenProgress(Math.max(simulatedProgress, 15));
          setRegenStatus("En attente du traitement...");
        }

        // Timeout after 5 min
        if (elapsed >= maxTime) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
          setRegenStatus("Délai dépassé — vérifiez manuellement");
          setTimeout(() => {
            setRegeneratingId(null);
            setRegenProgress(0);
            setRegenStatus("");
          }, 3000);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 3000);
  };

  const handleRegenerate = async (photo: PhotoRestoration) => {
    if (!photo.original_image_path) {
      toast({ title: "Erreur", description: "Aucune image originale trouvée", variant: "destructive" });
      return;
    }

    setRegeneratingId(photo.id);
    setRegenProgress(5);
    setRegenStatus("Lancement de la régénération...");

    try {
      // Reset restoration status
      await supabase
        .from("photo_restorations")
        .update({ status: "pending", preview_image_path: null, restored_image_path: null })
        .eq("id", photo.id);

      // Call restore-photo edge function
      const { error } = await supabase.functions.invoke("restore-photo", {
        body: {
          restorationId: photo.id,
          trialNumber: 1,
          sessionId: photo.session_id,
        },
      });

      if (error) throw error;

      // Start polling for status updates
      startPolling(photo.id);

    } catch (err: any) {
      console.error("Regenerate error:", err);
      setRegeneratingId(null);
      setRegenProgress(0);
      setRegenStatus("");
      toast({
        title: "Erreur de régénération",
        description: err.message || "Une erreur est survenue",
        variant: "destructive",
      });
    }
  };

  const openWhatsApp = (cleanPhone: string, message: string) => {
    // Use api.whatsapp.com/send for clean UTF-8 encoding
    // encodeURIComponent handles all special chars: emojis, accents, line breaks
    const url = "https://api.whatsapp.com/send?phone=" + cleanPhone + "&text=" + encodeURIComponent(message);
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendWhatsApp = async (photo: PhotoRestoration) => {
    const phone = getUserPhone?.(photo.user_id);
    if (!phone) {
      toast({ title: "Numéro introuvable", description: "Aucun numéro de téléphone associé à cet utilisateur", variant: "destructive" });
      return;
    }

    const userName = getUserName(photo.user_id);
    const cleanPhone = phone.replace(/[\s\-()]/g, "").replace(/^\+/, "");
    const siteUrl = window.location.origin;

    if (photo.is_paid) {
      // Paid: thank you message + download link
      const imagePath = photo.restored_image_path || photo.preview_image_path;
      if (!imagePath) {
        toast({ title: "Aucune image", description: "Aucune image restaurée disponible", variant: "destructive" });
        return;
      }

      try {
        const { data: signedData, error } = await supabase.storage
          .from("photos")
          .createSignedUrl(imagePath, 86400);

        if (error || !signedData?.signedUrl) {
          toast({ title: "Erreur", description: "Impossible de générer le lien", variant: "destructive" });
          return;
        }

        const message = "Bonjour " + userName + ",\n\nMoi c'est Issa, administrateur de REVIVO. Merci d'avoir fait confiance a notre service pour restaurer votre photo !\n\nVotre image restauree en haute qualite est prete. Connectez-vous pour la telecharger :\n" + siteUrl + "/auth?redirect=dashboard\n\nN'hesitez pas a partager REVIVO avec vos proches !\n\nA tres bientot,\nIssa - Equipe REVIVO";

        openWhatsApp(cleanPhone, message);
        toast({ title: "WhatsApp ouvert", description: `Message de remerciement envoyé à ${userName}` });
      } catch (err: any) {
        console.error("WhatsApp error:", err);
        toast({ title: "Erreur", description: err.message || "Impossible d'ouvrir WhatsApp", variant: "destructive" });
      }
    } else {
      // Unpaid: relance message
      const message = "Bonjour " + userName + ",\n\nMoi c'est Issa, administrateur de REVIVO. J'espere que vous allez bien !\n\nJe vous contacte car votre photo restauree est prete et n'attend que vous !\n\nPour seulement 1000F CFA, debloquez votre image en haute qualite et redonnez vie a ce souvenir precieux.\n\nConnectez-vous ici pour finaliser : " + siteUrl + "/auth?redirect=dashboard\n\nSi vous avez des questions, n'hesitez pas a me repondre directement ici !\n\nA tres bientot,\nIssa - Equipe REVIVO";

      openWhatsApp(cleanPhone, message);
      toast({ title: "WhatsApp ouvert", description: `Message de relance envoyé à ${userName}` });
    }
  };

  const handleBulkRelance = () => {
    const unpaidPhotos = filteredPhotos.filter(
      (p) => !p.is_paid && p.user_id && (p.preview_image_path || p.status === "preview_ready")
    );

    if (unpaidPhotos.length === 0) {
      toast({ title: "Aucun utilisateur", description: "Aucune photo non payée à relancer", variant: "destructive" });
      return;
    }

    // Deduplicate by user_id
    const seenUsers = new Set<string>();
    const uniqueUnpaid = unpaidPhotos.filter((p) => {
      if (!p.user_id || seenUsers.has(p.user_id)) return false;
      seenUsers.add(p.user_id);
      return true;
    });

    // Open WhatsApp for each unique user with a small delay
    let opened = 0;
    uniqueUnpaid.forEach((photo, index) => {
      setTimeout(() => {
        const phone = getUserPhone?.(photo.user_id);
        if (!phone) return;

        const userName = getUserName(photo.user_id);
        const cleanPhone = phone.replace(/[\s\-()]/g, "").replace(/^\+/, "");
        const siteUrl = window.location.origin;

        const message = "Bonjour " + userName + ",\n\nMoi c'est Issa, administrateur de REVIVO. J'espere que vous allez bien !\n\nVotre photo restauree est prete et n'attend que vous !\n\nPour seulement 1000F CFA, debloquez votre image en haute qualite.\n\n" + siteUrl + "/auth?redirect=dashboard\n\nA tres bientot,\nIssa - Equipe REVIVO";

        openWhatsApp(cleanPhone, message);
        opened++;
      }, index * 1500); // 1.5s entre chaque pour éviter les blocages
    });

    toast({
      title: "Relance en masse",
      description: `${uniqueUnpaid.length} utilisateur(s) vont être contactés via WhatsApp`,
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            Gestion des photos ({photos.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkRelance}
              className="text-orange-600 border-orange-300 hover:bg-orange-50"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Relancer tous les impayés
            </Button>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Regeneration progress bar */}
          {regeneratingId && (
            <div className="mb-4 p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                  Régénération en cours — {regeneratingId.slice(0, 8)}...
                </span>
                <span className="text-muted-foreground">{Math.round(regenProgress)}%</span>
              </div>
              <Progress value={regenProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">{regenStatus}</p>
            </div>
          )}

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
                    <TableRow key={photo.id} className={regeneratingId === photo.id ? "bg-primary/5" : ""}>
                      <TableCell className="font-mono text-xs">
                        {photo.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate">
                        {getUserName(photo.user_id)}
                      </TableCell>
                      <TableCell>
                        {regeneratingId === photo.id ? (
                          <Badge variant="outline" className="animate-pulse">
                            Régénération...
                          </Badge>
                        ) : (
                          getStatusBadge(photo.status)
                        )}
                      </TableCell>
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
                            disabled={!!regeneratingId || !photo.original_image_path}
                          >
                            {regeneratingId === photo.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                          {photo.user_id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title={photo.is_paid ? "Remercier via WhatsApp" : "Relancer via WhatsApp"}
                              onClick={() => handleSendWhatsApp(photo)}
                              className={photo.is_paid ? "text-green-600 hover:text-green-700 hover:bg-green-50" : "text-orange-500 hover:text-orange-600 hover:bg-orange-50"}
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

              {/* Regeneration progress in modal */}
              {previewPhoto && regeneratingId === previewPhoto.id && (
                <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium flex items-center gap-2">
                      <RefreshCw className="h-3 w-3 animate-spin text-primary" />
                      {regenStatus}
                    </span>
                    <span className="text-muted-foreground">{Math.round(regenProgress)}%</span>
                  </div>
                  <Progress value={regenProgress} className="h-2" />
                </div>
              )}

              {/* Action buttons in modal */}
              {previewPhoto && (
                <div className="flex justify-center gap-3 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRegenerate(previewPhoto)}
                    disabled={!!regeneratingId || !previewPhoto.original_image_path}
                  >
                    {regeneratingId === previewPhoto.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Régénérer
                  </Button>
                  {previewPhoto.user_id && (
                    <Button
                      size="sm"
                      className={previewPhoto.is_paid ? "bg-green-600 hover:bg-green-700 text-white" : "bg-orange-500 hover:bg-orange-600 text-white"}
                      onClick={() => handleSendWhatsApp(previewPhoto)}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      {previewPhoto.is_paid ? "Remercier via WhatsApp" : "Relancer via WhatsApp"}
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
