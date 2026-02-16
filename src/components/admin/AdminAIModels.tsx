import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Zap, Star, RefreshCw, Power, Rocket } from "lucide-react";
import { Label } from "@/components/ui/label";

interface AIModel {
  id: string;
  name: string;
  replicate_version: string;
  stage: string;
  is_active: boolean;
  current_score: number;
  admin_boost: boolean;
  total_runs: number;
  avg_rating: number;
  conversion_rate: number;
  updated_at: string;
}

export const AdminAIModels = () => {
  const { toast } = useToast();
  const [models, setModels] = useState<AIModel[]>([]);
  const [mode, setMode] = useState<string>("manual");
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [settingRes, modelsRes] = await Promise.all([
      supabase.from("app_settings").select("value").eq("key", "ai_management_mode").single(),
      supabase.from("ai_models_config").select("*").order("current_score", { ascending: false }),
    ]);
    if (settingRes.data) setMode(settingRes.data.value);
    if (modelsRes.data) setModels(modelsRes.data as AIModel[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleMode = async () => {
    const newMode = mode === "manual" ? "auto" : "manual";
    const { error } = await supabase
      .from("app_settings")
      .update({ value: newMode, updated_at: new Date().toISOString() })
      .eq("key", "ai_management_mode");
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setMode(newMode);
      toast({ title: "Mode changé", description: `Mode ${newMode === "auto" ? "Automatique" : "Manuel"} activé.` });
    }
  };

  const toggleActive = async (model: AIModel) => {
    setToggling(model.id);
    const { error } = await supabase
      .from("ai_models_config")
      .update({ is_active: !model.is_active })
      .eq("id", model.id);
    if (!error) {
      setModels(prev => prev.map(m => m.id === model.id ? { ...m, is_active: !m.is_active } : m));
    }
    setToggling(null);
  };

  const toggleBoost = async (model: AIModel) => {
    setToggling(model.id);
    const { error } = await supabase
      .from("ai_models_config")
      .update({ admin_boost: !model.admin_boost })
      .eq("id", model.id);
    if (!error) {
      setModels(prev => prev.map(m => m.id === model.id ? { ...m, admin_boost: !m.admin_boost } : m));
      toast({ title: model.admin_boost ? "Boost retiré" : "Boost activé (+20%)" });
    }
    setToggling(null);
  };

  const setAsActive = async (modelId: string) => {
    setToggling(modelId);
    // Deactivate all, then activate selected
    await supabase.from("ai_models_config").update({ is_active: false }).neq("id", "none");
    const { error } = await supabase.from("ai_models_config").update({ is_active: true }).eq("id", modelId);
    if (!error) {
      setModels(prev => prev.map(m => ({ ...m, is_active: m.id === modelId })));
      toast({ title: "Modèle activé", description: "Ce modèle sera utilisé pour les prochaines restaurations." });
    }
    setToggling(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Mode de gestion IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label htmlFor="ai-mode" className="text-sm font-medium">
              {mode === "manual" ? "Manuel" : "Automatique"}
            </Label>
            <Switch
              id="ai-mode"
              checked={mode === "auto"}
              onCheckedChange={toggleMode}
            />
            <span className="text-sm text-muted-foreground">
              {mode === "manual"
                ? "Vous choisissez le modèle manuellement."
                : "L'algorithme sélectionne le meilleur modèle automatiquement."}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Models Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Modèles IA configurés
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-1" /> Actualiser
          </Button>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Étape</TableHead>
                  <TableHead>Actif</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Boost</TableHead>
                  <TableHead>Runs</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell className="font-medium">{model.name}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs">
                      {model.replicate_version.slice(0, 12)}...
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{model.stage}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={model.is_active ? "default" : "secondary"}>
                        {model.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {Number(model.current_score).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={model.admin_boost}
                        onCheckedChange={() => toggleBoost(model)}
                        disabled={toggling === model.id}
                      />
                    </TableCell>
                    <TableCell>{model.total_runs}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {mode === "manual" ? (
                          <Button
                            size="sm"
                            variant={model.is_active ? "secondary" : "default"}
                            onClick={() => setAsActive(model.id)}
                            disabled={toggling === model.id || model.is_active}
                          >
                            {toggling === model.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Power className="h-3 w-3 mr-1" />
                                {model.is_active ? "Actuel" : "Activer"}
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleActive(model)}
                            disabled={toggling === model.id}
                          >
                            {toggling === model.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Rocket className="h-3 w-3 mr-1" />
                                {model.is_active ? "Désactiver" : "Réactiver"}
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {models.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Aucun modèle configuré.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
