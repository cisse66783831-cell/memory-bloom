import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Check management mode
    const { data: setting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "ai_management_mode")
      .single();

    if (setting?.value !== "auto") {
      await supabase.from("optimization_logs").insert({ message: "Mode manuel détecté. Optimisation ignorée." });
      return new Response(
        JSON.stringify({ message: "Manual mode, no optimization performed." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all active models
    const { data: models, error } = await supabase
      .from("ai_models_config")
      .select("*")
      .eq("is_active", true);

    if (error) throw error;
    if (!models || models.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active models to optimize." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const logs: string[] = [];

    // Recalculate scores
    for (const model of models) {
      const avgRating = Number(model.avg_rating) || 0;
      const conversionRate = Number(model.conversion_rate) || 0;

      let finalScore = (avgRating * 0.7) + (conversionRate * 0.3);
      if (model.admin_boost) {
        finalScore *= 1.2;
      }

      await supabase
        .from("ai_models_config")
        .update({ current_score: finalScore })
        .eq("id", model.id);

      const logMsg = `${model.name}: score=${finalScore.toFixed(3)} (boost=${model.admin_boost}, runs=${model.total_runs})`;
      logs.push(logMsg);
      console.log(logMsg);
    }

    // Find best model and mark as active champion
    const bestModel = models.reduce((best, m) => {
      const score = m.admin_boost ? (Number(m.avg_rating) * 0.7 + Number(m.conversion_rate) * 0.3) * 1.2 : Number(m.avg_rating) * 0.7 + Number(m.conversion_rate) * 0.3;
      const bestScore = best.admin_boost ? (Number(best.avg_rating) * 0.7 + Number(best.conversion_rate) * 0.3) * 1.2 : Number(best.avg_rating) * 0.7 + Number(best.conversion_rate) * 0.3;
      return score > bestScore ? m : best;
    });

    // Update statuses
    for (const model of models) {
      await supabase
        .from("ai_models_config")
        .update({ status: model.id === bestModel.id ? "active" : "challenger" })
        .eq("id", model.id);
    }

    const summary = `Optimisation terminée: ${models.length} modèles évalués. Champion: ${bestModel.name}`;
    logs.push(summary);

    // Save logs
    await supabase.from("optimization_logs").insert(
      logs.map(msg => ({ message: msg }))
    );

    return new Response(
      JSON.stringify({ message: summary, logs }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Auto-optimize error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
