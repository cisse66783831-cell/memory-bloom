import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ModelConfig {
  replicateId: string;
  modelId: string;
  systemPrompt: string | null;
}

function isDeploymentModel(replicateId: string): boolean {
  // A versioned model hash is 64 hex chars — not a deployment
  if (/^[a-f0-9]{64}$/i.test(replicateId)) return false;
  // google/nano-banana-pro and similar owner/model paths are deployments
  if (replicateId.startsWith("google/") || replicateId.startsWith("anthropic/") || replicateId.startsWith("meta/")) return true;
  // owner/model path without a version hash = deployment
  if (replicateId.includes("/") && !replicateId.includes(":")) return true;
  return false;
}

async function getModelConfig(supabase: any, modelId: string): Promise<ModelConfig | null> {
  const { data: model } = await supabase
    .from("ai_models_config")
    .select("replicate_id, id, system_prompt")
    .eq("id", modelId)
    .single();
  if (!model) return null;
  return { replicateId: model.replicate_id, modelId: model.id, systemPrompt: model.system_prompt };
}

async function getModelForTrial(supabase: any, trialNumber: number): Promise<ModelConfig> {
  try {
    const { data: settings } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["ai_management_mode", "trial_1_model_id"]);

    const settingsMap: Record<string, string> = {};
    for (const s of settings || []) settingsMap[s.key] = s.value;

    const mode = settingsMap["ai_management_mode"] || "manual";

    if (mode === "manual") {
      const modelId = settingsMap["trial_1_model_id"];
      if (modelId) {
        const config = await getModelConfig(supabase, modelId);
        if (config) return config;
      }
    } else {
      const { data: models } = await supabase
        .from("ai_models_config")
        .select("*")
        .eq("is_active", true)
        .neq("id", "combo-model")
        .order("current_score", { ascending: false });

      if (models && models.length > 0) {
        const ranked = models
          .map((m: any) => ({ ...m, effective_score: m.admin_boost ? m.current_score * 1.2 : m.current_score }))
          .sort((a: any, b: any) => b.effective_score - a.effective_score);
        return { replicateId: ranked[0].replicate_id, modelId: ranked[0].id, systemPrompt: ranked[0].system_prompt };
      }
    }
  } catch (err) {
    console.error("Error fetching model config:", err);
  }
  // Fallback: nano-banana-pro directly
  return { replicateId: "google/nano-banana-pro", modelId: "nano-banana", systemPrompt: null };
}

function buildModelInput(modelId: string, imageUrl: string, prompt: string, aspectRatio: string): Record<string, any> {
  if (modelId === "flux-kontext") {
    return { input_image: imageUrl, output_format: "png", safety_tolerance: 2 };
  } else if (modelId === "nano-banana" || modelId === "nano-banana-pro" || modelId === "gemini-flash") {
    return {
      prompt,
      image_input: [imageUrl],
      aspect_ratio: aspectRatio,
      resolution: "2K",
      output_format: "png",
      safety_filter_level: "block_only_high",
    };
  } else if (modelId === "flux-restore") {
    return { input_image: imageUrl, output_format: "png" };
  } else if (modelId === "real-esrgan") {
    return { image: imageUrl, scale: 4 };
  } else if (modelId === "gfpgan") {
    return { img: imageUrl, version: "v1.4", scale: 4 };
  } else if (modelId === "codeformer") {
    return { image: imageUrl, codeformer_fidelity: 0.7, upscale: 2 };
  } else {
    return { image: imageUrl };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let restorationId: string | undefined;
  let supabase: any;

  try {
    const {
      restorationId: rid,
      imageBase64,
      colorize = false,
      aspectRatio = "match_input_image",
      trialNumber = 1,
    } = await req.json();
    restorationId = rid;

    if (!restorationId) {
      return new Response(
        JSON.stringify({ error: "Missing restorationId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!REPLICATE_API_TOKEN) throw new Error("REPLICATE_API_TOKEN is not configured");

    supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Mark as processing
    await supabase
      .from("photo_restorations")
      .update({ status: "processing", trial_number: trialNumber })
      .eq("id", restorationId);

    // Get model
    const modelConfig = await getModelForTrial(supabase, trialNumber);
    const deployment = isDeploymentModel(modelConfig.replicateId);
    console.log(`Using model: ${modelConfig.modelId} (${modelConfig.replicateId}) - deployment: ${deployment}`);

    await supabase
      .from("photo_restorations")
      .update({ used_model_id: modelConfig.modelId })
      .eq("id", restorationId);

    // Increment total_runs
    try {
      const { data: m } = await supabase
        .from("ai_models_config")
        .select("total_runs")
        .eq("id", modelConfig.modelId)
        .single();
      if (m) {
        await supabase
          .from("ai_models_config")
          .update({ total_runs: (m.total_runs || 0) + 1 })
          .eq("id", modelConfig.modelId);
      }
    } catch (e) {
      console.warn("Could not increment total_runs:", e);
    }

    // Get image as base64 data URL
    let imageUrl: string;
    if (imageBase64) {
      imageUrl = imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
    } else {
      const { data: restoration } = await supabase
        .from("photo_restorations")
        .select("original_image_path")
        .eq("id", restorationId)
        .single();

      if (!restoration?.original_image_path) throw new Error("Original image path not found");

      const { data: fileData, error: downloadError } = await supabase.storage
        .from("photos")
        .download(restoration.original_image_path);

      if (downloadError || !fileData) throw new Error("Failed to download original image");

      const arrayBuffer = await fileData.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
        for (let j = 0; j < chunk.length; j++) {
          binary += String.fromCharCode(chunk[j]);
        }
      }
      imageUrl = `data:image/jpeg;base64,${btoa(binary)}`;
    }

    // Build prompt
    const defaultPrompt = "Increase the resolution of this image to 300 dpi, the standard for print. Do not change anything else. Remove all edge imperfections and make the photo sharp and clear. Adjust the lighting and overall quality so it looks like it was taken with an iPhone 14 Pro Max camera — natural colors, precise details, balanced exposure, and professional-grade sharpness.";
    const colorizeAddition = colorize
      ? " Also, colorize this photo naturally if it is black and white, using realistic and vivid colors appropriate to the era and subject."
      : "";
    const fullPrompt = (modelConfig.systemPrompt || defaultPrompt) + colorizeAddition;

    const modelInput = buildModelInput(modelConfig.modelId, imageUrl, fullPrompt, aspectRatio);

    // Webhook URL for async completion
    const webhookUrl = `${SUPABASE_URL}/functions/v1/replicate-webhook`;

    // Build API request
    const apiHeaders: Record<string, string> = {
      Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
    };

    let apiUrl: string;
    let body: any;

    if (deployment) {
      apiUrl = `https://api.replicate.com/v1/models/${modelConfig.replicateId}/predictions`;
      body = {
        input: modelInput,
        webhook: webhookUrl,
        webhook_events_filter: ["completed"],
      };
      console.log(`DEPLOYMENT endpoint: ${apiUrl}`);
    } else {
      apiUrl = "https://api.replicate.com/v1/predictions";
      body = {
        version: modelConfig.replicateId,
        input: modelInput,
        webhook: webhookUrl,
        webhook_events_filter: ["completed"],
      };
      console.log(`VERSIONED endpoint with version: ${modelConfig.replicateId}`);
    }

    const createResponse = await fetch(apiUrl, {
      method: "POST",
      headers: apiHeaders,
      body: JSON.stringify(body),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Replicate API error: ${createResponse.status} - ${errorText}`);
    }

    const prediction = await createResponse.json();
    console.log(`Prediction created: ${prediction.id}, status: ${prediction.status}`);

    // Save prediction ID so webhook can find this restoration
    await supabase
      .from("photo_restorations")
      .update({ replicate_prediction_id: prediction.id })
      .eq("id", restorationId);

    // Return immediately — webhook will update status when done
    return new Response(
      JSON.stringify({
        success: true,
        predictionId: prediction.id,
        status: "processing",
        modelUsed: modelConfig.modelId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Restore photo error:", error);

    if (restorationId && supabase) {
      try {
        await supabase
          .from("photo_restorations")
          .update({ status: "failed" })
          .eq("id", restorationId);
      } catch { /* ignore */ }
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
