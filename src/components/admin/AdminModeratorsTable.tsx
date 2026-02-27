import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Briefcase, Users, Loader2, Eye, Check, UserCheck, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ModeratorProfile {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  created_at: string;
  partnersCount: number;
  totalCommissions: number;
  pendingCommissions: number;
}

interface PartnerDetail {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  partner_code: string | null;
  filleulsCount: number;
  paidFilleulsCount: number;
}

function useAdminModerators() {
  return useQuery({
    queryKey: ["admin-moderators"],
    queryFn: async (): Promise<ModeratorProfile[]> => {
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "moderator");

      if (rolesError) throw rolesError;
      if (!roles || roles.length === 0) return [];

      const moderatorIds = roles.map((r) => r.user_id);

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, email, moderator_code, created_at")
        .in("user_id", moderatorIds);

      if (profilesError) throw profilesError;

      const result = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { count: partnersCount } = await supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("recruited_by_moderator_id", profile.user_id)
            .eq("is_partner", true);

          const { data: commissions } = await supabase
            .from("moderator_commissions")
            .select("commission_amount, status")
            .eq("moderator_user_id", profile.user_id);

          const totalCommissions = commissions?.reduce((s, c) => s + c.commission_amount, 0) || 0;
          const pendingCommissions =
            commissions
              ?.filter((c) => c.status === "pending")
              .reduce((s, c) => s + c.commission_amount, 0) || 0;

          return {
            ...profile,
            partnersCount: partnersCount || 0,
            totalCommissions,
            pendingCommissions,
          };
        })
      );

      return result;
    },
  });
}

function useModeratorPartnerDetails(moderatorUserId: string | null) {
  return useQuery({
    queryKey: ["admin-moderator-partners", moderatorUserId],
    enabled: !!moderatorUserId,
    queryFn: async (): Promise<PartnerDetail[]> => {
      if (!moderatorUserId) return [];

      const { data: partners } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, email, partner_code")
        .eq("recruited_by_moderator_id", moderatorUserId)
        .eq("is_partner", true);

      if (!partners || partners.length === 0) return [];

      const result = await Promise.all(
        partners.map(async (partner) => {
          // Get filleuls of this partner
          const { data: filleuls } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("referred_by_user_id", partner.user_id);

          const filleulIds = filleuls?.map((f) => f.user_id) || [];

          let paidFilleulsCount = 0;
          if (filleulIds.length > 0) {
            const { count } = await supabase
              .from("photo_restorations")
              .select("user_id", { count: "exact", head: true })
              .in("user_id", filleulIds)
              .eq("is_paid", true);
            paidFilleulsCount = count || 0;
          }

          return {
            ...partner,
            filleulsCount: filleulIds.length,
            paidFilleulsCount,
          };
        })
      );

      return result;
    },
  });
}

function useAdminModeratorPayouts() {
  return useQuery({
    queryKey: ["admin-moderator-payouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moderator_payouts")
        .select("*")
        .order("requested_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

export function AdminModeratorsTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: moderators = [], isLoading } = useAdminModerators();
  const { data: payouts = [] } = useAdminModeratorPayouts();
  const [selectedModerator, setSelectedModerator] = useState<string | null>(null);
  const { data: partnerDetails = [], isLoading: partnersDetailsLoading } = useModeratorPartnerDetails(selectedModerator);

  const approvePayoutMutation = useMutation({
    mutationFn: async (payoutId: string) => {
      const { error } = await supabase
        .from("moderator_payouts")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("id", payoutId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-moderator-payouts"] });
      toast({ title: "Versement approuvé" });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (payoutId: string) => {
      const { error } = await supabase
        .from("moderator_payouts")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", payoutId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-moderator-payouts"] });
      toast({ title: "Versement marqué comme payé" });
    },
  });

  const selectedModeratorData = moderators.find((m) => m.user_id === selectedModerator);
  const selectedPayouts = payouts.filter((p) => p.moderator_user_id === selectedModerator);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Modérateurs / Commerciaux ({moderators.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : moderators.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucun modérateur</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Partenaires</TableHead>
                  <TableHead>Commissions totales</TableHead>
                  <TableHead>En attente</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {moderators.map((mod) => (
                  <TableRow key={mod.user_id}>
                    <TableCell className="font-medium">
                      {mod.first_name || ""} {mod.last_name || ""}
                    </TableCell>
                    <TableCell className="text-xs font-mono">{mod.email || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">{(mod as any).moderator_code || "—"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{mod.partnersCount}</Badge>
                    </TableCell>
                    <TableCell>{mod.totalCommissions.toLocaleString("fr-FR")} F</TableCell>
                    <TableCell>{mod.pendingCommissions.toLocaleString("fr-FR")} F</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedModerator(mod.user_id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payout requests */}
      {payouts.filter((p) => p.status !== "paid").length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Demandes de versement en attente</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modérateur</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts
                  .filter((p) => p.status !== "paid")
                  .map((payout) => {
                    const mod = moderators.find((m) => m.user_id === payout.moderator_user_id);
                    return (
                      <TableRow key={payout.id}>
                        <TableCell>
                          {mod ? `${mod.first_name || ""} ${mod.last_name || ""}` : "—"}
                        </TableCell>
                        <TableCell className="font-bold">
                          {payout.amount.toLocaleString("fr-FR")} F
                        </TableCell>
                        <TableCell className="text-xs">
                          {format(new Date(payout.requested_at), "dd MMM yyyy", { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={payout.status === "approved" ? "secondary" : "outline"}>
                            {payout.status === "approved" ? "Approuvé" : "En attente"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {payout.status === "requested" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => approvePayoutMutation.mutate(payout.id)}
                              >
                                Approuver
                              </Button>
                            )}
                            {payout.status === "approved" && (
                              <Button
                                size="sm"
                                onClick={() => markPaidMutation.mutate(payout.id)}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Payé
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selectedModerator} onOpenChange={() => setSelectedModerator(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Détails : {selectedModeratorData?.first_name} {selectedModeratorData?.last_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Partenaires</p>
                <p className="text-xl font-bold">{selectedModeratorData?.partnersCount}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Commissions</p>
                <p className="text-xl font-bold">{selectedModeratorData?.totalCommissions.toLocaleString("fr-FR")} F</p>
              </div>
            </div>

            {/* Partners with filleul details */}
            <div>
              <h4 className="font-medium text-sm mb-3">Partenaires & Filleuls</h4>
              {partnersDetailsLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : partnerDetails.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun partenaire recruté</p>
              ) : (
                <div className="space-y-3">
                  {partnerDetails.map((partner) => (
                    <div key={partner.user_id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">{partner.first_name} {partner.last_name}</p>
                          <p className="text-xs text-muted-foreground">{partner.email}</p>
                        </div>
                        <Badge variant="secondary" className="font-mono text-xs">{partner.partner_code}</Badge>
                      </div>
                      <div className="flex gap-3 text-xs">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span>{partner.filleulsCount} filleul{partner.filleulsCount > 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {partner.paidFilleulsCount > 0 ? (
                            <UserCheck className="h-3 w-3 text-success" />
                          ) : (
                            <UserX className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span>{partner.paidFilleulsCount} payant{partner.paidFilleulsCount > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedPayouts.length > 0 && (
              <>
                <h4 className="font-medium text-sm">Versements</h4>
                {selectedPayouts.map((p) => (
                  <div key={p.id} className="flex justify-between text-sm border-b pb-2">
                    <span>{format(new Date(p.requested_at), "dd MMM yyyy", { locale: fr })}</span>
                    <span className="font-bold">{p.amount.toLocaleString("fr-FR")} F</span>
                    <Badge variant={p.status === "paid" ? "default" : "outline"}>{p.status}</Badge>
                  </div>
                ))}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedModerator(null)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
