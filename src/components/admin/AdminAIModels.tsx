import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Zap, Star, RefreshCw, Settings, BarChart3, ScrollText, Rocket, Globe, FileText, Upload, Eye } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  system_prompt: string | null;
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
  const [aiProvider, setAiProvider] = useState<string>("replicate");
  const [orbitModel, setOrbitModel] = useState<string>("gemini-3-pro-image-preview");
  const [loading, setLoading] = useState(true);
  const [maxFreeRestorations, setMaxFreeRestorations] = useState<string>("2");
  const [toggling, setToggling] = useState<string | null>(null);
  const [logs, setLogs] = useState<OptLog[]>([]);
  const [manualSettings, setManualSettings] = useState<Record<string, string>>({
    trial_1_model_id: "",
    trial_2_model_id: "",
    trial_3_model_id: "",
    final_hd_model_id: "",
  });

  // Prompt editor state
  const [selectedPromptModelId, setSelectedPromptModelId] = useState<string>("");
  const [promptText, setPromptText] = useState<string>("");
  const [promptSaving, setPromptSaving] = useState(false);
  const [promptDirty, setPromptDirty] = useState(false);

  // Test state
  const [testFile, setTestFile] = useState<File | null>(null);
  const [testPreview, setTestPreview] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setAiProvider(map["ai_provider"] || "replicate");
      setOrbitModel(map["orbit_model"] || "gemini-3-pro-image-preview");
      setMaxFreeRestorations(map["max_free_restorations"] || "2");
      setManualSettings({
        trial_1_model_id: map["trial_1_model_id"] || "",
        trial_2_model_id: map["trial_2_model_id"] || "",
        trial_3_model_id: map["trial_3_model_id"] || "",
        final_hd_model_id: map["final_hd_model_id"] || "",
      });
    }
    if (modelsRes.data) {
      const modelsData = modelsRes.data as unknown as AIModel[];
      setModels(modelsData);
      // Auto-select first model for prompt editor if none selected
      if (!selectedPromptModelId && modelsData.length > 0) {
        setSelectedPromptModelId(modelsData[0].id);
        setPromptText(modelsData[0].system_prompt || "");
      }
    }
    if (logsRes.data) setLogs(logsRes.data as OptLog[]);
    setLoading(false);
  }, [selectedPromptModelId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Update prompt text when model selection changes
  useEffect(() => {
    if (selectedPromptModelId) {
      const model = models.find(m => m.id === selectedPromptModelId);
      setPromptText(model?.system_prompt || "");
      setPromptDirty(false);
    }
  }, [selectedPromptModelId, models]);

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

  // Prompt functions
  const handleSavePrompt = async () => {
    if (!selectedPromptModelId) return;
    setPromptSaving(true);
    const { error } = await supabase
      .from("ai_models_config")
      .update({ system_prompt: promptText || null })
      .eq("id", selectedPromptModelId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setModels(prev => prev.map(m => m.id === selectedPromptModelId ? { ...m, system_prompt: promptText || null } : m));
      setPromptDirty(false);
      toast({ title: "Prompt sauvegardé ✓" });
    }
    setPromptSaving(false);
  };

  const handleTestFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTestFile(file);
    setTestResult(null);
    const reader = new FileReader();
    reader.onload = () => setTestPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleTestPrompt = async () => {
    if (!testFile || !selectedPromptModelId) return;
    setTestLoading(true);
    setTestResult(null);

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(testFile);
      });

      // Upload to storage
      const testPath = `test/admin-test-${Date.now()}.jpg`;
      await supabase.storage.from("photos").upload(testPath, testFile, { upsert: true });

      // Create a test restoration record
      const { data: restoration, error: insertError } = await supabase
        .from("photo_restorations")
        .insert({
          session_id: `admin-test-${Date.now()}`,
          original_image_path: testPath,
          status: "pending",
          user_id: (await supabase.auth.getUser()).data.user?.id || null,
          used_model_id: selectedPromptModelId,
        })
        .select()
        .single();

      if (insertError || !restoration) throw new Error("Impossible de créer la restauration test");

      // Save the prompt first to ensure the model uses the latest
      if (promptDirty) {
        await supabase
          .from("ai_models_config")
          .update({ system_prompt: promptText || null })
          .eq("id", selectedPromptModelId);
        setModels(prev => prev.map(m => m.id === selectedPromptModelId ? { ...m, system_prompt: promptText || null } : m));
        setPromptDirty(false);
      }

      // Call restore-photo
      const { data: result, error: restoreError } = await supabase.functions.invoke("restore-photo", {
        body: {
          restorationId: restoration.id,
          imageBase64: base64,
          trialNumber: 1,
        },
      });

      if (restoreError || !result?.success) {
        throw new Error(result?.error || "Échec de la restauration test");
      }

      // Poll for result (max 3 min)
      const maxWait = 180_000;
      const start = Date.now();
      while (Date.now() - start < maxWait) {
        await new Promise(r => setTimeout(r, 3000));
        const { data: dbRes } = await supabase
          .from("photo_restorations")
          .select("status, preview_image_path, restored_image_path")
          .eq("id", restoration.id)
          .single();

        if (dbRes?.status === "failed") throw new Error("La restauration test a échoué");

        const imagePath = dbRes?.restored_image_path || dbRes?.preview_image_path;
        if ((dbRes?.status === "completed" || dbRes?.status === "preview_ready") && imagePath) {
          const { data: signed } = await supabase.storage.from("photos").createSignedUrl(imagePath, 3600);
          if (signed?.signedUrl) {
            setTestResult(signed.signedUrl);
            toast({ title: "Test terminé ✓", description: "Le résultat est affiché ci-dessous." });
          }
          break;
        }
      }

      if (!testResult && Date.now() - start >= maxWait) {
        toast({ title: "Timeout", description: "Le test a pris trop de temps.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erreur de test", description: err.message, variant: "destructive" });
    }
    setTestLoading(false);
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
      {/* Provider Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Provider IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label className="text-sm font-medium min-w-[100px]">Provider actif</Label>
            <Select
              value={aiProvider}
              onValueChange={async (val) => {
                const { error } = await supabase
                  .from("app_settings")
                  .upsert({ key: "ai_provider", value: val, updated_at: new Date().toISOString() }, { onConflict: "key" });
                if (!error) {
                  setAiProvider(val);
                  toast({ title: "Provider changé", description: val === "orbit" ? "Orbit activé" : "Replicate activé" });
                }
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="replicate">Replicate</SelectItem>
                <SelectItem value="orbit">Orbit (Gemini)</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant={aiProvider === "orbit" ? "default" : "secondary"}>
              {aiProvider === "orbit" ? "Orbit" : "Replicate"}
            </Badge>
          </div>
          {aiProvider === "orbit" && (
            <div className="flex items-center gap-4 pt-2 border-t border-border/30">
              <Label className="text-sm font-medium min-w-[100px]">Modèle Orbit</Label>
              <Select
                value={orbitModel}
                onValueChange={async (val) => {
                  const { error } = await supabase
                    .from("app_settings")
                    .upsert({ key: "orbit_model", value: val, updated_at: new Date().toISOString() }, { onConflict: "key" });
                  if (!error) {
                    setOrbitModel(val);
                    toast({ title: "Modèle Orbit changé", description: val });
                  }
                }}
              >
                <SelectTrigger className="w-[300px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini-3-pro-image-preview">Gemini 3 Pro Image (4K)</SelectItem>
                  <SelectItem value="gemini-3-pro-preview">Gemini 3 Pro Preview</SelectItem>
                  <SelectItem value="gemini-3-flash-preview">Gemini 3 Flash Preview</SelectItem>
                  <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                  <SelectItem value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Limite de restaurations gratuites */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Limite de restaurations gratuites
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label className="text-sm font-medium min-w-[200px]">
              Nombre max de restaurations non payées par session
            </Label>
            <Input
              type="number"
              min="1"
              max="100"
              value={maxFreeRestorations}
              onChange={(e) => setMaxFreeRestorations(e.target.value)}
              className="w-[100px]"
            />
            <Button
              size="sm"
              onClick={async () => {
                const val = parseInt(maxFreeRestorations, 10);
                if (isNaN(val) || val < 1) {
                  toast({ title: "Erreur", description: "La limite doit être au moins 1", variant: "destructive" });
                  return;
                }
                const { error } = await supabase
                  .from("app_settings")
                  .upsert({ key: "max_free_restorations", value: String(val), updated_at: new Date().toISOString() }, { onConflict: "key" });
                if (!error) {
                  toast({ title: "Limite mise à jour", description: `Maximum ${val} restauration(s) gratuite(s) par session` });
                } else {
                  toast({ title: "Erreur", description: error.message, variant: "destructive" });
                }
              }}
            >
              Enregistrer
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Les utilisateurs doivent payer une restauration existante avant de pouvoir en lancer de nouvelles au-delà de cette limite.
          </p>
        </CardContent>
      </Card>

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
          <TabsTrigger value="prompt" className="flex items-center gap-1.5">
            <FileText className="h-4 w-4" /> Prompt
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

        {/* PROMPT EDITOR */}
        <TabsContent value="prompt">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Editor */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Éditeur de prompt
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Modèle</Label>
                  <Select value={selectedPromptModelId} onValueChange={setSelectedPromptModelId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un modèle" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Prompt système
                    {promptDirty && <Badge variant="secondary" className="ml-2 text-xs">Non sauvegardé</Badge>}
                  </Label>
                  <Textarea
                    value={promptText}
                    onChange={(e) => { setPromptText(e.target.value); setPromptDirty(true); }}
                    placeholder="Entrez le prompt de restauration..."
                    className="min-h-[300px] font-mono text-xs leading-relaxed"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {promptText.length} caractères • Laissez vide pour utiliser le prompt par défaut
                  </p>
                </div>
                <Button onClick={handleSavePrompt} disabled={promptSaving || !promptDirty} className="w-full">
                  {promptSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Sauvegarder le prompt
                </Button>
              </CardContent>
            </Card>

            {/* Right: Test */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Tester le prompt
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Image de test</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleTestFile}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {testFile ? testFile.name : "Choisir une image"}
                  </Button>
                </div>

                {testPreview && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Original</Label>
                    <img src={testPreview} alt="Test original" className="w-full rounded-lg border border-border/50 max-h-48 object-contain bg-secondary/30" />
                  </div>
                )}

                <Button
                  onClick={handleTestPrompt}
                  disabled={testLoading || !testFile || !selectedPromptModelId}
                  className="w-full"
                >
                  {testLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      <Rocket className="h-4 w-4 mr-2" />
                      Lancer le test
                    </>
                  )}
                </Button>

                {testLoading && (
                  <p className="text-xs text-muted-foreground text-center animate-pulse">
                    Le test peut prendre 30s à 2min selon le provider...
                  </p>
                )}

                {testResult && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Résultat</Label>
                    <img src={testResult} alt="Test result" className="w-full rounded-lg border-2 border-primary/30 max-h-64 object-contain bg-secondary/30" />
                    <Button variant="outline" size="sm" asChild className="w-full">
                      <a href={testResult} target="_blank" rel="noopener noreferrer">
                        Voir en plein écran
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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
