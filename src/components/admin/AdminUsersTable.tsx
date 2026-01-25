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
  DialogFooter,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Users, Check, X, Eye, Sparkles, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;
  email_verified: boolean;
  referral_code: string | null;
  referred_by_user_id: string | null;
  free_generations_balance: number;
  created_at: string;
}

interface AdminUsersTableProps {
  users: UserProfile[];
  isLoading: boolean;
  onRefresh: () => void;
  getUserTotalPayments: (userId: string) => number;
  getReferrerName: (userId: string | null) => string;
}

export function AdminUsersTable({
  users,
  isLoading,
  onRefresh,
  getUserTotalPayments,
  getReferrerName,
}: AdminUsersTableProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);

  const filteredUsers = users.filter((user) => {
    const search = searchTerm.toLowerCase();
    return (
      user.first_name?.toLowerCase().includes(search) ||
      user.last_name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.phone_number?.includes(search) ||
      user.referral_code?.toLowerCase().includes(search)
    );
  });

  const handleAdjustBalance = async () => {
    if (!selectedUser || !adjustAmount) return;

    setIsAdjusting(true);
    try {
      const newBalance = parseInt(adjustAmount, 10);
      if (isNaN(newBalance) || newBalance < 0) {
        throw new Error("Montant invalide");
      }

      const { error } = await supabase
        .from("profiles")
        .update({ free_generations_balance: newBalance })
        .eq("user_id", selectedUser.user_id);

      if (error) throw error;

      toast({
        title: "Solde mis à jour",
        description: `Nouveau solde: ${newBalance} génération(s)`,
      });

      setSelectedUser(null);
      setAdjustAmount("");
      onRefresh();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsAdjusting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Gestion des utilisateurs ({users.length})
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
          ) : filteredUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucun utilisateur trouvé
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prénom</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Email vérifié</TableHead>
                    <TableHead>Code parrainage</TableHead>
                    <TableHead>Parrainé par</TableHead>
                    <TableHead>Générations</TableHead>
                    <TableHead>Paiements</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.first_name || "—"}</TableCell>
                      <TableCell>{user.last_name || "—"}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[150px] truncate">
                        {user.email || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {user.phone_number || "—"}
                      </TableCell>
                      <TableCell>
                        {user.email_verified ? (
                          <Badge className="gap-1 bg-success">
                            <Check className="h-3 w-3" />
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <X className="h-3 w-3" />
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {user.referral_code || "—"}
                      </TableCell>
                      <TableCell className="text-xs max-w-[100px] truncate">
                        {getReferrerName(user.referred_by_user_id)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {user.free_generations_balance}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {getUserTotalPayments(user.user_id).toLocaleString("fr-FR")} XOF
                      </TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(user.created_at), "dd MMM yyyy", {
                          locale: fr,
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedUser(user);
                              setAdjustAmount(String(user.free_generations_balance));
                            }}
                          >
                            <Sparkles className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
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

      {/* Adjust Balance Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajuster le solde de générations</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Utilisateur: <strong>{selectedUser?.first_name} {selectedUser?.last_name}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Solde actuel: <strong>{selectedUser?.free_generations_balance}</strong>
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nouveau solde</label>
              <Input
                type="number"
                min="0"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="Entrez le nouveau solde"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Annuler
            </Button>
            <Button onClick={handleAdjustBalance} disabled={isAdjusting}>
              {isAdjusting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Mettre à jour
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
