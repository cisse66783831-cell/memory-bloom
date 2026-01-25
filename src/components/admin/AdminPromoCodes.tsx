import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Tag, Plus, Loader2, Check, X, MoreHorizontal, Trash2, Pause, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePromoCodes, useCreatePromoCode, useUpdatePromoCode, useDeletePromoCode } from "@/hooks/usePromoCode";

export function AdminPromoCodes() {
  const { toast } = useToast();
  const { data: promoCodes, isLoading } = usePromoCodes();
  const createPromoCode = useCreatePromoCode();
  const updatePromoCode = useUpdatePromoCode();
  const deletePromoCode = useDeletePromoCode();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCode, setNewCode] = useState({
    code: "",
    discount_amount: "500",
    usage_limit: "",
    expires_at: "",
    new_users_only: false,
  });

  const handleCreateCode = async () => {
    if (!newCode.code || !newCode.discount_amount) {
      toast({
        title: "Erreur",
        description: "Le code et le montant sont requis",
        variant: "destructive",
      });
      return;
    }

    try {
      await createPromoCode.mutateAsync({
        code: newCode.code,
        discount_amount: parseInt(newCode.discount_amount),
        usage_limit: newCode.usage_limit ? parseInt(newCode.usage_limit) : undefined,
        expires_at: newCode.expires_at || undefined,
        new_users_only: newCode.new_users_only,
      });
      
      toast({
        title: "Code créé",
        description: `Le code ${newCode.code.toUpperCase()} a été créé avec succès`,
      });
      
      setIsDialogOpen(false);
      setNewCode({
        code: "",
        discount_amount: "500",
        usage_limit: "",
        expires_at: "",
        new_users_only: false,
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la création",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    try {
      await updatePromoCode.mutateAsync({
        id,
        updates: { is_active: !currentState },
      });
      toast({
        title: currentState ? "Code désactivé" : "Code activé",
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Supprimer le code ${code} ?`)) return;
    
    try {
      await deletePromoCode.mutateAsync(id);
      toast({
        title: "Code supprimé",
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive",
      });
    }
  };

  // Calculate stats
  const totalCodes = promoCodes?.length || 0;
  const activeCodes = promoCodes?.filter(c => c.is_active).length || 0;
  const totalUses = promoCodes?.reduce((sum, c) => sum + c.usage_count, 0) || 0;
  const totalDiscount = promoCodes?.reduce((sum, c) => sum + (c.usage_count * c.discount_amount), 0) || 0;

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total codes</p>
            <p className="text-2xl font-bold">{totalCodes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Codes actifs</p>
            <p className="text-2xl font-bold text-success">{activeCodes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Utilisations</p>
            <p className="text-2xl font-bold">{totalUses}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Réductions totales</p>
            <p className="text-2xl font-bold text-primary">{totalDiscount.toLocaleString("fr-FR")} XOF</p>
          </CardContent>
        </Card>
      </div>

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
                    <TableHead>Nouveaux uniquement</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promoCodes.map((code) => {
                    const isExpired = code.expires_at && new Date(code.expires_at) < new Date();
                    const isExhausted = code.usage_limit && code.usage_count >= code.usage_limit;
                    
                    return (
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
                          {code.new_users_only ? (
                            <Check className="h-4 w-4 text-success" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell>
                          {!code.is_active ? (
                            <Badge variant="outline" className="gap-1">
                              <X className="h-3 w-3" /> Inactif
                            </Badge>
                          ) : isExpired ? (
                            <Badge variant="destructive" className="gap-1">
                              Expiré
                            </Badge>
                          ) : isExhausted ? (
                            <Badge variant="secondary" className="gap-1">
                              Épuisé
                            </Badge>
                          ) : (
                            <Badge className="gap-1 bg-success">
                              <Check className="h-3 w-3" /> Actif
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => handleToggleActive(code.id, code.is_active)}
                              >
                                {code.is_active ? (
                                  <>
                                    <Pause className="h-4 w-4 mr-2" />
                                    Désactiver
                                  </>
                                ) : (
                                  <>
                                    <Play className="h-4 w-4 mr-2" />
                                    Activer
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDelete(code.id, code.code)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
            <div className="flex items-center justify-between">
              <Label htmlFor="new-users">Nouveaux utilisateurs uniquement</Label>
              <Switch
                id="new-users"
                checked={newCode.new_users_only}
                onCheckedChange={(checked) => setNewCode({ ...newCode, new_users_only: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateCode} disabled={createPromoCode.isPending}>
              {createPromoCode.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer le code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
