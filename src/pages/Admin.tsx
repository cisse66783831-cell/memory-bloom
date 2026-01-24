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
import { Shield, Image, CreditCard, Loader2 } from 'lucide-react';

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

const Admin = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const [restorations, setRestorations] = useState<Restoration[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
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
        const [restorationsRes, paymentsRes] = await Promise.all([
          supabase
            .from('photo_restorations')
            .select('id, created_at, status, is_paid, user_id, session_id')
            .order('created_at', { ascending: false }),
          supabase
            .from('payments')
            .select('id, created_at, amount, currency, status, provider, restoration_id')
            .order('created_at', { ascending: false }),
        ]);

        if (restorationsRes.data) setRestorations(restorationsRes.data);
        if (paymentsRes.data) setPayments(paymentsRes.data);
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Administration</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Restaurations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{restorations.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Restaurations Complétées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedRestorations}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Restaurations Payées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{paidRestorations}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Revenus Totaux
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalRevenue.toLocaleString('fr-FR')} XOF
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Restorations and Payments */}
        <Tabs defaultValue="restorations" className="space-y-4">
          <TabsList>
            <TabsTrigger value="restorations" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Restaurations
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Paiements
            </TabsTrigger>
          </TabsList>

          <TabsContent value="restorations">
            <Card>
              <CardHeader>
                <CardTitle>Historique des Restaurations</CardTitle>
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
                <CardTitle>Historique des Paiements</CardTitle>
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
