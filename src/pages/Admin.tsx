import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Shield, Image, CreditCard, Loader2, Users, Check, X } from 'lucide-react';

interface Restoration {
  id: string;
  created_at: string;
  status: string;
  is_paid: boolean;
  user_id: string | null;
  session_id: string;
}

interface Payment {
  id: string;
  created_at: string;
  amount: number;
  currency: string;
  status: string;
  provider: string | null;
  restoration_id: string;
}

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

const Admin = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const [restorations, setRestorations] = useState<Restoration[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!adminLoading && !isAdmin && user) {
      navigate('/');
    }
  }, [isAdmin, adminLoading, user, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!isAdmin) return;

      try {
        const [restorationsRes, paymentsRes, usersRes] = await Promise.all([
          supabase
            .from('photo_restorations')
            .select('id, created_at, status, is_paid, user_id, session_id')
            .order('created_at', { ascending: false }),
          supabase
            .from('payments')
            .select('id, created_at, amount, currency, status, provider, restoration_id')
            .order('created_at', { ascending: false }),
          supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false }),
        ]);

        if (restorationsRes.data) setRestorations(restorationsRes.data);
        if (paymentsRes.data) setPayments(paymentsRes.data);
        if (usersRes.data) setUsers(usersRes.data as UserProfile[]);
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoadingData(false);
      }
    };

    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      completed: 'default',
      pending: 'secondary',
      processing: 'outline',
      failed: 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const totalRevenue = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  const completedRestorations = restorations.filter((r) => r.status === 'completed').length;
  const paidRestorations = restorations.filter((r) => r.is_paid).length;
  const totalUsers = users.length;
  const verifiedUsers = users.filter((u) => u.email_verified).length;

  // Calculate total payments per user
  const getUserTotalPayments = (userId: string) => {
    const userRestorations = restorations.filter((r) => r.user_id === userId && r.is_paid);
    return userRestorations.length * 1000; // Assuming 1000 XOF per restoration
  };

  // Get referrer name
  const getReferrerName = (referredByUserId: string | null) => {
    if (!referredByUserId) return '-';
    const referrer = users.find((u) => u.user_id === referredByUserId);
    if (!referrer) return referredByUserId.slice(0, 8) + '...';
    return `${referrer.first_name || ''} ${referrer.last_name || ''}`.trim() || referrer.email || '-';
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="font-heading text-3xl font-bold">Administration REVIVO</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total restaurations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{restorations.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Restaurations terminées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedRestorations}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Restaurations payées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{paidRestorations}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Utilisateurs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground">{verifiedUsers} vérifiés</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Revenus totaux
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalRevenue.toLocaleString('fr-FR')} XOF
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Restorations, Payments, and Users */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="restorations" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Restaurations
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Paiements
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des utilisateurs</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : users.length === 0 ? (
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
                          <TableHead>Générations gratuites</TableHead>
                          <TableHead>Paiements totaux</TableHead>
                          <TableHead>Date création</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((profile) => (
                          <TableRow key={profile.id}>
                            <TableCell>{profile.first_name || '-'}</TableCell>
                            <TableCell>{profile.last_name || '-'}</TableCell>
                            <TableCell className="font-mono text-xs">
                              {profile.email || '-'}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {profile.phone_number || '-'}
                            </TableCell>
                            <TableCell>
                              {profile.email_verified ? (
                                <Badge variant="default" className="gap-1">
                                  <Check className="h-3 w-3" /> Oui
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="gap-1">
                                  <X className="h-3 w-3" /> Non
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {profile.referral_code || '-'}
                            </TableCell>
                            <TableCell className="text-xs">
                              {getReferrerName(profile.referred_by_user_id)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {profile.free_generations_balance}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {getUserTotalPayments(profile.user_id).toLocaleString('fr-FR')} XOF
                            </TableCell>
                            <TableCell>
                              {format(new Date(profile.created_at), 'dd MMM yyyy', {
                                locale: fr,
                              })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="restorations">
            <Card>
              <CardHeader>
                <CardTitle>Historique des restaurations</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : restorations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Aucune restauration trouvée
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Payé</TableHead>
                        <TableHead>Utilisateur</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {restorations.map((restoration) => (
                        <TableRow key={restoration.id}>
                          <TableCell className="font-mono text-xs">
                            {restoration.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>
                            {format(new Date(restoration.created_at), 'dd MMM yyyy HH:mm', {
                              locale: fr,
                            })}
                          </TableCell>
                          <TableCell>{getStatusBadge(restoration.status)}</TableCell>
                          <TableCell>
                            <Badge variant={restoration.is_paid ? 'default' : 'outline'}>
                              {restoration.is_paid ? 'Oui' : 'Non'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {restoration.user_id ? restoration.user_id.slice(0, 8) + '...' : 'Anonyme'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Historique des paiements</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : payments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Aucun paiement trouvé
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Fournisseur</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono text-xs">
                            {payment.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>
                            {format(new Date(payment.created_at), 'dd MMM yyyy HH:mm', {
                              locale: fr,
                            })}
                          </TableCell>
                          <TableCell>
                            {payment.amount.toLocaleString('fr-FR')} {payment.currency}
                          </TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          <TableCell>{payment.provider || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
