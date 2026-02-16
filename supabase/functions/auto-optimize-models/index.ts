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
      console.log("Mode is manual, skipping optimization.");
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

    // Recalculate scores
    for (const model of models) {
      const avgRating = Number(model.avg_rating) || 0;
      const conversionRate = Number(model.conversion_rate) || 0;

      let finalScore = (avgRating * 0.7) + (conversionRate * 0.3);
      if (model.admin_boost) {
        finalScore *= 1.2; // 20% bonus
      }

      await supabase
        .from("ai_models_config")
        .update({ current_score: finalScore })
        .eq("id", model.id);

      console.log(`Model ${model.name}: score=${finalScore.toFixed(3)} (boost=${model.admin_boost})`);
    }

    return new Response(
      JSON.stringify({ message: `Optimized ${models.length} models.` }),
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
