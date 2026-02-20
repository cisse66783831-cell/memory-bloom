import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_PROMPT = "Increase the resolution of this image to 300 dpi, the standard for print. However, do not change anything else. Supprime les imperfections de contour et rend la photo bien nette. Revois les lumières et tout ça doit être comme prise avec un iPhone 14 Pro Max.";

interface ModelConfig {
  replicateId: string;
  modelId: string;
  systemPrompt: string | null;
  useGateway?: boolean;
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
  // Fallback: nano-banana via gateway
  return { replicateId: "google/nano-banana-pro", modelId: "nano-banana", systemPrompt: null, useGateway: true };
}

function isNanoBananaModel(modelId: string, replicateId: string): boolean {
  return modelId === "nano-banana" || modelId === "nano-banana-pro" || replicateId.startsWith("google/");
}

function isDeploymentModel(replicateId: string): boolean {
  if (/^[a-f0-9]{64}$/i.test(replicateId)) return false;
  if (replicateId.startsWith("anthropic/") || replicateId.startsWith("meta/")) return true;
  if (replicateId.includes("/") && !replicateId.includes(":")) return true;
  return false;
}

function buildReplicateInput(modelId: string, imageUrl: string, aspectRatio: string): Record<string, any> {
  if (modelId === "flux-kontext") {
    return { input_image: imageUrl, output_format: "png", safety_tolerance: 2 };
  }
  if (modelId === "flux-restore") {
    return { input_image: imageUrl, output_format: "png" };
  }
  if (modelId === "real-esrgan") {
    return { image: imageUrl, scale: 4 };
  }
  if (modelId === "gfpgan") {
    return { img: imageUrl, version: "v1.4", scale: 4 };
  }
  if (modelId === "codeformer") {
    return { image: imageUrl, codeformer_fidelity: 0.7, upscale: 2 };
  }
  return { image: imageUrl };
}

/**
 * Process image via Lovable AI Gateway (Gemini image editing)
 * Returns the restored image path in storage
 */
async function processViaGateway(
  supabase: any,
  restorationId: string,
  imageUrl: string,
  prompt: string,
  LOVABLE_API_KEY: string
): Promise<string> {
  console.log(`[Gateway] Calling Lovable AI with gemini-3-pro-image-preview`);
  console.log(`[Gateway] Prompt (${prompt.length} chars): "${prompt.substring(0, 120)}..."`);

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-pro-image-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      modalities: ["image", "text"],
    }),
  });

  if (!aiResponse.ok) {
    const errText = await aiResponse.text();
    if (aiResponse.status === 429) throw new Error("Rate limit atteint, réessayez dans quelques instants.");
    if (aiResponse.status === 402) throw new Error("Crédit insuffisant sur le gateway IA.");
    throw new Error(`Gateway error ${aiResponse.status}: ${errText}`);
  }

  const aiData = await aiResponse.json();
  console.log(`[Gateway] Response received, parsing image...`);

  const editedImageUrl: string | undefined = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!editedImageUrl) {
    console.error("[Gateway] Full response:", JSON.stringify(aiData).substring(0, 500));
    throw new Error("Aucune image retournée par le gateway IA.");
  }

  // Decode base64 and upload to storage
  const base64Data = editedImageUrl.replace(/^data:image\/\w+;base64,/, "");
  const binaryStr = atob(base64Data);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  const restoredPath = `restored/${restorationId}/restored.png`;
  const { error: uploadError } = await supabase.storage
    .from("photos")
    .upload(restoredPath, bytes, { contentType: "image/png", upsert: true });

  if (uploadError) throw new Error(`Storage upload error: ${uploadError.message}`);

  console.log(`[Gateway] Image uploaded to: ${restoredPath}`);
  return restoredPath;
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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Mark as processing
    await supabase
      .from("photo_restorations")
      .update({ status: "processing", trial_number: trialNumber })
      .eq("id", restorationId);

    // Get model config
    const modelConfig = await getModelForTrial(supabase, trialNumber);
    const useGateway = isNanoBananaModel(modelConfig.modelId, modelConfig.replicateId);
    console.log(`Model: ${modelConfig.modelId} (${modelConfig.replicateId}) — gateway: ${useGateway}`);

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
    const colorizeAddition = colorize
      ? " Also, colorize this photo naturally if it is black and white, using realistic and vivid colors appropriate to the era and subject."
      : "";
    const fullPrompt = (modelConfig.systemPrompt || DEFAULT_PROMPT) + colorizeAddition;
    console.log(`Prompt (${fullPrompt.length} chars): "${fullPrompt.substring(0, 80)}..."`);

    // ============================================================
    // ROUTE A: Lovable AI Gateway (Nano Banana / Gemini models)
    // ============================================================
    if (useGateway) {
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      const restoredPath = await processViaGateway(
        supabase,
        restorationId,
        imageUrl,
        fullPrompt,
        LOVABLE_API_KEY
      );

      // Get the restoration to check if already paid
      const { data: restoration } = await supabase
        .from("photo_restorations")
        .select("is_paid")
        .eq("id", restorationId)
        .single();

      const finalStatus = restoration?.is_paid ? "completed" : "preview_ready";

      await supabase
        .from("photo_restorations")
        .update({
          status: finalStatus,
          preview_image_path: restoredPath,
          restored_image_path: finalStatus === "completed" ? restoredPath : null,
        })
        .eq("id", restorationId);

      console.log(`[Gateway] Done — status: ${finalStatus}, path: ${restoredPath}`);

      return new Response(
        JSON.stringify({
          success: true,
          status: finalStatus,
          modelUsed: modelConfig.modelId,
          restoredPath,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // ROUTE B: Replicate (other models — flux, real-esrgan, etc.)
    // ============================================================
    if (!REPLICATE_API_TOKEN) throw new Error("REPLICATE_API_TOKEN is not configured");

    const modelInput = buildReplicateInput(modelConfig.modelId, imageUrl, aspectRatio);
    const deployment = isDeploymentModel(modelConfig.replicateId);
    const webhookUrl = `${SUPABASE_URL}/functions/v1/replicate-webhook`;

    let apiUrl: string;
    let body: any;

    if (deployment) {
      apiUrl = `https://api.replicate.com/v1/models/${modelConfig.replicateId}/predictions`;
      body = { input: modelInput, webhook: webhookUrl, webhook_events_filter: ["completed"] };
    } else {
      apiUrl = "https://api.replicate.com/v1/predictions";
      body = { version: modelConfig.replicateId, input: modelInput, webhook: webhookUrl, webhook_events_filter: ["completed"] };
    }

    const createResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Replicate API error: ${createResponse.status} - ${errorText}`);
    }

    const prediction = await createResponse.json();
    console.log(`Replicate prediction created: ${prediction.id}`);

    await supabase
      .from("photo_restorations")
      .update({ replicate_prediction_id: prediction.id })
      .eq("id", restorationId);

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
