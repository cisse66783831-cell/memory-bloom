import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Zap, Star, RefreshCw, Settings, BarChart3, ScrollText, Rocket } from "lucide-react";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AIModel {
  id: string;
  name: string;
  replicate_id: string;
  cost_per_run: number;
  is_active: boolean;
  status: string;
  admin_boost: boolean;
  current_score: number;
  avg_rating: number;
  conversion_rate: number;
  total_runs: number;
  updated_at: string;
}

interface OptLog {
  id: string;
  created_at: string;
  message: string;
}

export const AdminAIModels = () => {
  const { toast } = useToast();
  const [models, setModels] = useState<AIModel[]>([]);
  const [mode, setMode] = useState<string>("manual");
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [logs, setLogs] = useState<OptLog[]>([]);
  const [manualSettings, setManualSettings] = useState<Record<string, string>>({
    trial_1_model_id: "",
    trial_2_model_id: "",
    trial_3_model_id: "",
    final_hd_model_id: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [settingsRes, modelsRes, logsRes] = await Promise.all([
      supabase.from("app_settings").select("key, value"),
      supabase.from("ai_models_config").select("*").order("current_score", { ascending: false }),
      supabase.from("optimization_logs").select("*").order("created_at", { ascending: false }).limit(50),
    ]);

    if (settingsRes.data) {
      const map: Record<string, string> = {};
      for (const s of settingsRes.data) map[s.key] = s.value;
      setMode(map["ai_management_mode"] || "manual");
      setManualSettings({
        trial_1_model_id: map["trial_1_model_id"] || "",
        trial_2_model_id: map["trial_2_model_id"] || "",
        trial_3_model_id: map["trial_3_model_id"] || "",
        final_hd_model_id: map["final_hd_model_id"] || "",
      });
    }
    if (modelsRes.data) setModels(modelsRes.data as unknown as AIModel[]);
    if (logsRes.data) setLogs(logsRes.data as OptLog[]);
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

  const updateManualSetting = async (key: string, value: string) => {
    const { error } = await supabase
      .from("app_settings")
      .update({ value, updated_at: new Date().toISOString() })
      .eq("key", key);
    if (!error) {
      setManualSettings(prev => ({ ...prev, [key]: value }));
      toast({ title: "Modèle assigné", description: `${key} → ${value}` });
    }
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

  const runOptimization = async () => {
    setToggling("optimize");
    try {
      const { data, error } = await supabase.functions.invoke("auto-optimize-models");
      if (error) throw error;
      toast({ title: "Optimisation terminée", description: data?.message || "Scores recalculés." });
      fetchData();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
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

  const stageLabels: Record<string, string> = {
    trial_1_model_id: "Essai 1 (Aperçu)",
    trial_2_model_id: "Essai 2 (Alternative)",
    trial_3_model_id: "Essai 3 (Dernière chance)",
    final_hd_model_id: "Version HD Finale",
  };

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
            <Switch id="ai-mode" checked={mode === "auto"} onCheckedChange={toggleMode} />
            <span className="text-sm text-muted-foreground">
              {mode === "manual"
                ? "Vous assignez manuellement un modèle à chaque étape."
                : "L'algorithme sélectionne le meilleur modèle par score."}
            </span>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue={mode === "manual" ? "config" : "auto"}>
        <TabsList>
          <TabsTrigger value="config" className="flex items-center gap-1.5">
            <Settings className="h-4 w-4" /> Config Manuel
          </TabsTrigger>
          <TabsTrigger value="auto" className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" /> Vue Auto
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-1.5">
            <ScrollText className="h-4 w-4" /> Logs
          </TabsTrigger>
        </TabsList>

        {/* MANUAL CONFIG */}
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Assignation des modèles par étape
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(stageLabels).map(([key, label]) => (
                <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <Label className="min-w-[200px] text-sm font-medium">{label}</Label>
                  <Select
                    value={manualSettings[key]}
                    onValueChange={(val) => updateManualSetting(key, val)}
                  >
                    <SelectTrigger className="w-full sm:w-[300px]">
                      <SelectValue placeholder="Sélectionner un modèle" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} ({m.cost_per_run}$)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AUTO VIEW */}
        <TabsContent value="auto">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Modèles IA — Classement
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={runOptimization} disabled={toggling === "optimize"}>
                  {toggling === "optimize" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Rocket className="h-4 w-4 mr-1" />}
                  Recalculer
                </Button>
                <Button variant="outline" size="sm" onClick={fetchData}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Actualiser
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Coût</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Note moy.</TableHead>
                      <TableHead>Conv. %</TableHead>
                      <TableHead>Runs</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Boost</TableHead>
                      <TableHead>Actif</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {models.map((model, i) => (
                      <TableRow key={model.id}>
                        <TableCell className="font-mono text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium whitespace-nowrap">{model.name}</TableCell>
                        <TableCell className="whitespace-nowrap">{model.cost_per_run}$</TableCell>
                        <TableCell className="whitespace-nowrap font-mono">
                          {Number(model.current_score).toFixed(3)}
                        </TableCell>
                        <TableCell>{Number(model.avg_rating).toFixed(1)}</TableCell>
                        <TableCell>{(Number(model.conversion_rate) * 100).toFixed(0)}%</TableCell>
                        <TableCell>{model.total_runs}</TableCell>
                        <TableCell>
                          <Badge variant={model.status === "active" ? "default" : "secondary"}>
                            {model.status === "active" ? "Champion" : "Challenger"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={model.admin_boost}
                            onCheckedChange={() => toggleBoost(model)}
                            disabled={toggling === model.id}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={model.is_active}
                            onCheckedChange={() => toggleActive(model)}
                            disabled={toggling === model.id}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LOGS */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="h-5 w-5" />
                Historique d'optimisation
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Aucun log d'optimisation.</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 text-sm border-b border-border/30 pb-2">
                      <span className="text-muted-foreground whitespace-nowrap font-mono text-xs">
                        {format(new Date(log.created_at), "dd/MM HH:mm", { locale: fr })}
                      </span>
                      <span className="text-foreground">{log.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
