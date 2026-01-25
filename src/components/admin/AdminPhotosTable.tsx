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
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Image, Eye, RefreshCw, AlertTriangle, Search, Loader2, Check, X } from "lucide-react";

interface PhotoRestoration {
  id: string;
  created_at: string;
  status: string;
  is_paid: boolean;
  user_id: string | null;
  session_id: string;
  preview_image_path: string | null;
  restored_image_path: string | null;
}

interface AdminPhotosTableProps {
  photos: PhotoRestoration[];
  isLoading: boolean;
  getUserName: (userId: string | null) => string;
}

export function AdminPhotosTable({
  photos,
  isLoading,
  getUserName,
}: AdminPhotosTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

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

  return (
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
                  <TableHead>Gratuite</TableHead>
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
                      {!photo.is_paid ? (
                        <Badge variant="secondary">Oui</Badge>
                      ) : (
                        <Badge variant="outline">Non</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {photo.preview_image_path ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      {photo.restored_image_path ? (
                        <Check className="h-4 w-4 text-success" />
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
                        <Button variant="ghost" size="icon" title="Voir">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Retraiter">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Signaler">
                          <AlertTriangle className="h-4 w-4" />
                        </Button>
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
  );
}
