import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Image, 
  Eye, 
  Download, 
  CreditCard, 
  Sparkles, 
  Loader2,
  ImageOff 
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Photo {
  id: string;
  created_at: string;
  status: string;
  is_paid: boolean;
  preview_image_path: string | null;
  restored_image_path: string | null;
  pdf_path: string | null;
}

export function PhotosSection() {
  const { user } = useAuth();
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

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

  const handleViewPreview = (photoId: string) => {
    setSelectedPhoto(photoId);
    // TODO: Implement preview modal
  };

  const handleDownload = async (path: string) => {
    const { data } = supabase.storage.from("photos").getPublicUrl(path);
    window.open(data.publicUrl, "_blank");
  };

  if (isLoading) {
    return (
      <Card>
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
      <Card>
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
            <a href="/">Restaurer ma première photo</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5 text-primary" />
          Mes photos ({photos.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
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
                  <TableCell>
                    {format(new Date(photo.created_at), "dd MMM yyyy", { locale: fr })}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(photo.status, photo.is_paid)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {photo.is_paid ? "Payée" : "Gratuite"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {photo.preview_image_path && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewPreview(photo.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Aperçu
                      </Button>
                    )}
                    {photo.is_paid && photo.restored_image_path ? (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleDownload(photo.restored_image_path!)}
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
  );
}
