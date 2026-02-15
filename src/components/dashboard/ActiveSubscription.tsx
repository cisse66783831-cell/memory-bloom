import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Calendar, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ActiveSub {
  id: string;
  photos_remaining: number;
  expires_at: string;
  plan_name: string;
  plan_photo_count: number;
}

export function ActiveSubscription() {
  const { user } = useAuth();
  const [sub, setSub] = useState<ActiveSub | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("user_subscriptions")
        .select("id, photos_remaining, expires_at, plan_id, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        const { data: plan } = await supabase
          .from("subscription_plans")
          .select("name, photo_count")
          .eq("id", data.plan_id)
          .single();

        setSub({
          id: data.id,
          photos_remaining: data.photos_remaining,
          expires_at: data.expires_at,
          plan_name: plan?.name || "Abonnement",
          plan_photo_count: plan?.photo_count || 0,
        });
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading || !sub) return null;

  const expiresDate = new Date(sub.expires_at);
  const daysLeft = Math.max(0, Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const usedPercent = Math.round(((sub.plan_photo_count - sub.photos_remaining) / sub.plan_photo_count) * 100);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Abonnement {sub.plan_name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Image className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{sub.photos_remaining}</p>
              <p className="text-xs text-muted-foreground">crédits restants</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{daysLeft}</p>
              <p className="text-xs text-muted-foreground">jours restants</p>
            </div>
          </div>
        </div>
        {/* Usage bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{sub.plan_photo_count - sub.photos_remaining} / {sub.plan_photo_count} utilisées</span>
            <span>{usedPercent}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${usedPercent}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
