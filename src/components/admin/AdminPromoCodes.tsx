import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Tag, Plus, Loader2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface PromoCode {
  id: string;
  code: string;
  discount_amount: number;
  usage_limit: number | null;
  usage_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export function AdminPromoCodes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCode, setNewCode] = useState({
    code: "",
    discount_amount: "",
    usage_limit: "",
    expires_at: "",
  });

  // Note: This component requires a promo_codes table to be created
  // For now, showing placeholder UI
  const { data: promoCodes, isLoading } = useQuery<PromoCode[]>({
    queryKey: ["promo-codes"],
    queryFn: async () => {
      // Placeholder - table doesn't exist yet
      return [];
    },
  });

  const handleCreateCode = async () => {
    try {
      // Placeholder for promo code creation
      toast({
        title: "Fonctionnalité à venir",
        description: "La gestion des codes promo sera bientôt disponible",
      });
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Codes promotionnels
          </CardTitle>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Créer un code
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !promoCodes || promoCodes.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Aucun code promotionnel pour l'instant
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer votre premier code
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Réduction</TableHead>
                    <TableHead>Utilisations</TableHead>
                    <TableHead>Expire le</TableHead>
                    <TableHead>Actif</TableHead>
                    <TableHead>Créé le</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promoCodes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell className="font-mono font-medium">
                        {code.code}
                      </TableCell>
                      <TableCell>
                        -{code.discount_amount.toLocaleString("fr-FR")} XOF
                      </TableCell>
                      <TableCell>
                        {code.usage_count}
                        {code.usage_limit && ` / ${code.usage_limit}`}
                      </TableCell>
                      <TableCell>
                        {code.expires_at
                          ? format(new Date(code.expires_at), "dd MMM yyyy", { locale: fr })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {code.is_active ? (
                          <Badge className="gap-1 bg-success">
                            <Check className="h-3 w-3" /> Actif
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <X className="h-3 w-3" /> Inactif
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(code.created_at), "dd MMM yyyy", { locale: fr })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Code Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un code promotionnel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                placeholder="PROMO2024"
                value={newCode.code}
                onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount">Réduction (XOF)</Label>
              <Input
                id="discount"
                type="number"
                placeholder="500"
                value={newCode.discount_amount}
                onChange={(e) => setNewCode({ ...newCode, discount_amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="limit">Limite d'utilisation (optionnel)</Label>
              <Input
                id="limit"
                type="number"
                placeholder="100"
                value={newCode.usage_limit}
                onChange={(e) => setNewCode({ ...newCode, usage_limit: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expires">Date d'expiration (optionnel)</Label>
              <Input
                id="expires"
                type="date"
                value={newCode.expires_at}
                onChange={(e) => setNewCode({ ...newCode, expires_at: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateCode}>
              Créer le code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
