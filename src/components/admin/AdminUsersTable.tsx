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
import { Users, Check, X, Eye, Sparkles, Search, Loader2, Shield, Building2, UserCheck, UserX, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePromoteToPartner } from "@/hooks/useAdminPartners";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  getReferralCount: (userId: string) => number;
  getUserHasPaid: (userId: string) => boolean;
}

export function AdminUsersTable({
  users,
  isLoading,
  onRefresh,
  getUserTotalPayments,
  getReferrerName,
  getReferralCount,
  getUserHasPaid,
}: AdminUsersTableProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [promotingRole, setPromotingRole] = useState<"moderator" | "partner" | null>(null);
  const [promoteUserId, setPromoteUserId] = useState<string | null>(null);
  const [selectedModeratorId, setSelectedModeratorId] = useState<string>("");
  const [isPromoting, setIsPromoting] = useState(false);
  const [moderators, setModerators] = useState<{ user_id: string; first_name: string | null; last_name: string | null }[]>([]);
  const promoteToPartner = usePromoteToPartner();

  // Load moderators for partner assignment
  const loadModerators = async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "moderator");
    if (!roles || roles.length === 0) { setModerators([]); return; }
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name")
      .in("user_id", roles.map((r) => r.user_id));
    setModerators(profiles || []);
  };

  const handlePromote = async () => {
    if (!promoteUserId || !promotingRole) return;
    setIsPromoting(true);
    try {
      if (promotingRole === "moderator") {
        // Insert moderator role
        const { error } = await supabase.from("user_roles").insert({
          user_id: promoteUserId,
          role: "moderator" as const,
        });
        if (error) throw error;
        // Generate moderator_code
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let modCode: string;
        let codeExists = true;
        do {
          modCode = 'MOD';
          for (let i = 0; i < 6; i++) {
            modCode += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          const { data } = await supabase.from("profiles").select("id").eq("moderator_code", modCode).maybeSingle();
          codeExists = !!data;
        } while (codeExists);
        await supabase.from("profiles").update({ moderator_code: modCode }).eq("user_id", promoteUserId);
        toast({ title: "Modérateur nommé", description: `Code moderateur: ${modCode}` });
      } else {
        // Promote to partner with optional moderator link via RPC
        const modId = selectedModeratorId && selectedModeratorId !== "none" ? selectedModeratorId : undefined;
        await promoteToPartner.mutateAsync({ userId: promoteUserId, moderatorId: modId });
        toast({ title: "Partenaire nommé", description: "L'utilisateur est maintenant partenaire." });
      }
      setPromotingRole(null);
      setPromoteUserId(null);
      setSelectedModeratorId("");
      onRefresh();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsPromoting(false);
    }
  };

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
                    <TableHead>Statut</TableHead>
                    <TableHead>Filleuls</TableHead>
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
                        {(() => {
                          const hasPaid = getUserHasPaid(user.user_id);
                          const referralCount = getReferralCount(user.user_id);
                          return (
                            <div className="flex flex-col gap-1">
                              {hasPaid ? (
                                <Badge className="bg-success gap-1 w-fit">
                                  <UserCheck className="h-3 w-3" />
                                  Client
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="gap-1 w-fit text-warning border-warning">
                                  <UserX className="h-3 w-3" />
                                  Lead
                                </Badge>
                              )}
                              {referralCount > 0 && (
                                <Badge variant="secondary" className="gap-1 w-fit">
                                  <Gift className="h-3 w-3" />
                                  Parrain
                                </Badge>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const count = getReferralCount(user.user_id);
                          return count > 0 ? (
                            <Badge variant="secondary" className="gap-1">
                              <Users className="h-3 w-3" />
                              {count}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          );
                        })()}
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
                            title="Ajuster solde"
                            onClick={() => {
                              setSelectedUser(user);
                              setAdjustAmount(String(user.free_generations_balance));
                            }}
                          >
                            <Sparkles className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Nommer modérateur"
                            onClick={() => {
                              setPromotingRole("moderator");
                              setPromoteUserId(user.user_id);
                            }}
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Nommer partenaire"
                            onClick={() => {
                              setPromotingRole("partner");
                              setPromoteUserId(user.user_id);
                              loadModerators();
                            }}
                          >
                            <Building2 className="h-4 w-4" />
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

      {/* Promote Dialog */}
      <Dialog open={!!promotingRole} onOpenChange={() => { setPromotingRole(null); setPromoteUserId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {promotingRole === "moderator" ? "Nommer modérateur" : "Nommer partenaire"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Confirmer la nomination de cet utilisateur comme{" "}
              <strong>{promotingRole === "moderator" ? "modérateur (commercial)" : "partenaire (influenceur)"}</strong> ?
            </p>
            {promotingRole === "partner" && moderators.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Modérateur recruteur (optionnel)</label>
                <Select value={selectedModeratorId} onValueChange={setSelectedModeratorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Aucun modérateur" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {moderators.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.first_name || ""} {m.last_name || ""} 
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPromotingRole(null); setPromoteUserId(null); }}>
              Annuler
            </Button>
            <Button onClick={handlePromote} disabled={isPromoting}>
              {isPromoting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
