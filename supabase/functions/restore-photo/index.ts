import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FALLBACK_VERSION = "c75db81db6cbd809d93cc3b7e7a088a351a3349c9fa02b6d393e35e0d51ba799";

interface ModelConfig {
  replicateId: string;
  modelId: string;
  systemPrompt: string | null;
}

/**
 * Detect if a replicateId is a "deployment" model (owner/model format)
 * vs a legacy version hash (64-char hex string).
 * Deployment models use a different API endpoint.
 */
function isDeploymentModel(replicateId: string): boolean {
  if (!replicateId.includes("/")) return false;
  // A SHA-256 hash is exactly 64 hex characters — those are NOT deployment models
  if (/^[a-f0-9]{64}$/i.test(replicateId)) return false;
  return true;
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

async function getModelForTrial(supabase: any, trialNumber: number, previewMode: boolean): Promise<ModelConfig> {
  try {
    const { data: settings } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["ai_management_mode", "trial_1_model_id", "trial_2_model_id", "trial_3_model_id", "final_hd_model_id"]);

    const settingsMap: Record<string, string> = {};
    for (const s of settings || []) settingsMap[s.key] = s.value;

    const mode = settingsMap["ai_management_mode"] || "manual";

    if (mode === "manual") {
      const settingKey = previewMode
        ? `trial_${Math.min(trialNumber, 3)}_model_id`
        : "final_hd_model_id";
      const modelId = settingsMap[settingKey];

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
          .map((m: any) => ({
            ...m,
            effective_score: m.admin_boost ? m.current_score * 1.2 : m.current_score,
          }))
          .sort((a: any, b: any) => b.effective_score - a.effective_score);

        return { replicateId: ranked[0].replicate_id, modelId: ranked[0].id, systemPrompt: ranked[0].system_prompt };
      }
    }
  } catch (err) {
    console.error("Error fetching model config, using fallback:", err);
  }
  return { replicateId: FALLBACK_VERSION, modelId: "microsoft", systemPrompt: null };
}

function buildModelInput(modelId: string, imageUrl: string, prompt: string, previewMode: boolean, aspectRatio: string, resolution: string, isComboStep = false): Record<string, any> {
  if (modelId === "flux-kontext") {
    return {
      input_image: imageUrl,
      output_format: "png",
      safety_tolerance: 2,
    };
  } else if (modelId === "nano-banana" || modelId === "nano-banana-pro" || modelId === "gemini-flash") {
    return {
      prompt: prompt || "Increase the resolution of this image to 300 dpi, the standard for print. However, do not change anything else. Supprime les imperfections de contour et rend la photo bien nette. Revois les lumières et tout ça doit être comme prise avec un iPhone 14 Pro Max.",
      image_input: [imageUrl],
      aspect_ratio: aspectRatio,
      resolution,
      output_format: "png",
      safety_filter_level: "block_only_high",
    };
  } else if (modelId === "flux-restore") {
    return {
      input_image: imageUrl,
      output_format: "png",
    };
  } else if (modelId === "real-esrgan") {
    const scale = isComboStep ? 2 : (previewMode ? 2 : 4);
    return { image: imageUrl, scale };
  } else if (modelId === "gfpgan") {
    return { img: imageUrl, version: "v1.4", scale: previewMode ? 2 : 4 };
  } else if (modelId === "codeformer") {
    return { image: imageUrl, codeformer_fidelity: 0.7, upscale: isComboStep ? 1 : (previewMode ? 1 : 2) };
  } else {
    return { image: imageUrl };
  }
}

/**
 * Resolve owner/model to latest version hash — ONLY for legacy versioned models.
 * For deployment models (owner/model format), returns null to signal "use deployment endpoint".
 */
async function resolveVersion(replicateId: string, apiToken: string): Promise<string | null> {
  // Already a hash — use as-is with legacy endpoint
  if (!replicateId.includes("/")) return replicateId;
  // Deployment model — no version resolution needed, use deployment endpoint
  if (isDeploymentModel(replicateId)) return null;
  // Legacy owner/model — resolve to version hash
  const [owner, model] = replicateId.split("/");
  const resp = await fetch(`https://api.replicate.com/v1/models/${owner}/${model}`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  if (!resp.ok) throw new Error(`Failed to resolve model ${replicateId}: ${resp.status}`);
  const data = await resp.json();
  const version = data.latest_version?.id;
  if (!version) throw new Error(`No latest version found for ${replicateId}`);
  console.log(`Resolved ${replicateId} → ${version}`);
  return version;
}

/**
 * Build the correct Replicate API call depending on model type:
 * - Deployment models (owner/model format): POST /v1/models/{owner}/{model}/predictions with { input }
 * - Legacy versioned models: POST /v1/predictions with { version, input }
 */
async function callReplicateAPI(
  replicateId: string,
  modelInput: Record<string, any>,
  apiToken: string,
  webhookUrl?: string,
  useWebhook = false,
  resolvedVersionHash?: string | null
): Promise<any> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  };

  let apiUrl: string;
  let body: any;

  const deployment = isDeploymentModel(replicateId);

  if (deployment) {
    // New endpoint for deployment models: no version needed
    apiUrl = `https://api.replicate.com/v1/models/${replicateId}/predictions`;
    body = { input: modelInput };
    console.log(`Using DEPLOYMENT endpoint: ${apiUrl}`);
  } else {
    // Legacy endpoint: requires version hash
    const version = resolvedVersionHash ?? replicateId; // if no hash provided, use as-is
    apiUrl = "https://api.replicate.com/v1/predictions";
    body = { version, input: modelInput };
    console.log(`Using VERSIONED endpoint with version: ${version}`);
  }

  if (useWebhook && webhookUrl) {
    body.webhook = webhookUrl;
    body.webhook_events_filter = ["completed"];
  } else {
    headers["Prefer"] = "wait";
  }

  const createResponse = await fetch(apiUrl, {
    method: "POST", headers, body: JSON.stringify(body),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Replicate API error: ${createResponse.status} - ${errorText}`);
  }

  return await createResponse.json();
}

const MAX_POLL_TIME = 120_000; // 2 minutes max

async function runSingleModel(
  replicateId: string, modelId: string, modelInput: Record<string, any>,
  apiToken: string, webhookUrl: string | undefined, useWebhook: boolean,
  resolvedVersionHash?: string | null
): Promise<{ outputUrl: string; predictionId: string }> {
  let prediction = await callReplicateAPI(
    replicateId, modelInput, apiToken,
    useWebhook ? webhookUrl : undefined,
    useWebhook,
    resolvedVersionHash
  );

  if (useWebhook && webhookUrl) {
    return { outputUrl: "", predictionId: prediction.id };
  }

  // Synchronous polling with timeout
  const startTime = Date.now();
  while (prediction.status !== "succeeded" && prediction.status !== "failed") {
    if (Date.now() - startTime > MAX_POLL_TIME) {
      throw new Error(`Prediction timed out after ${MAX_POLL_TIME / 1000} seconds for model ${modelId}`);
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
    const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    prediction = await pollResponse.json();
  }

  if (prediction.status === "failed") throw new Error(`Restoration failed: ${prediction.error}`);

  const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  if (!outputUrl) throw new Error("No image returned from Replicate");

  return { outputUrl, predictionId: prediction.id };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let restorationId: string | undefined;
  let supabase: any;

  try {
    const { restorationId: rid, imageBase64, colorize = false, previewMode = false, aspectRatio = "match_input_image", trialNumber = 1 } = await req.json();
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
    const REPLICATE_WEBHOOK_URL = Deno.env.get("REPLICATE_WEBHOOK_URL");

    if (!REPLICATE_API_TOKEN) throw new Error("REPLICATE_API_TOKEN is not configured");

    supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Update status
    await supabase
      .from("photo_restorations")
      .update({ status: "processing", trial_number: trialNumber })
      .eq("id", restorationId);

    // Get model dynamically
    const modelConfig = await getModelForTrial(supabase, trialNumber, previewMode);
    console.log(`Using model: ${modelConfig.modelId} (${modelConfig.replicateId}) - trial ${trialNumber}, preview: ${previewMode}, deployment: ${isDeploymentModel(modelConfig.replicateId)}`);

    // Update used_model_id
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

    // Get image
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
      const base64String = btoa(binary);
      imageUrl = `data:image/jpeg;base64,${base64String}`;
    }

    // Always generate in 2K with the requested aspect ratio — no preview/HD distinction
    const outputAspectRatio = aspectRatio;
    const outputResolution = "2K";

    // Build prompt: use model's system_prompt if available, otherwise default
    const defaultPrompt = "Increase the resolution of this image to 300 dpi, the standard for print. However, do not change anything else. Remove all edge imperfections and make the photo sharp and clear. Adjust the lighting and overall quality so it looks like it was taken with an iPhone 14 Pro Max camera — natural colors, precise details, balanced exposure, and professional-grade sharpness.";
    const colorizeAddition = colorize
      ? " Also, colorize this photo naturally if it is black and white, using realistic and vivid colors appropriate to the era and subject."
      : "";

    // ==========================================
    // MODE COMBO: Pipeline séquentiel
    // ==========================================
    if (modelConfig.modelId === "combo-model") {
      console.log("🔥 COMBO MODE ACTIVATED");

      const { data: comboSetting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "combo_pipeline_steps")
        .single();

      let pipelineSteps: string[] = ["real-esrgan", "microsoft", "codeformer"];
      if (comboSetting?.value) {
        try { pipelineSteps = JSON.parse(comboSetting.value); } catch { /* use default */ }
      }

      console.log(`Combo pipeline: ${pipelineSteps.join(" → ")}`);
      let currentImageUrl = imageUrl;

      for (let i = 0; i < pipelineSteps.length; i++) {
        const stepModelId = pipelineSteps[i];
        const stepConfig = await getModelConfig(supabase, stepModelId);
        if (!stepConfig) {
          console.warn(`Combo step ${i + 1}: model '${stepModelId}' not found, skipping`);
          continue;
        }

        const stepPrompt = stepConfig.systemPrompt || (defaultPrompt + colorizeAddition);
        const stepInput = buildModelInput(stepModelId, currentImageUrl, stepPrompt, previewMode, outputAspectRatio, outputResolution, true);

        console.log(`Combo step ${i + 1}/${pipelineSteps.length}: ${stepModelId} (${stepConfig.replicateId})`);

        // Resolve version for this step (null for deployment models)
        const stepVersion = await resolveVersion(stepConfig.replicateId, REPLICATE_API_TOKEN);

        const result = await runSingleModel(
          stepConfig.replicateId, stepModelId, stepInput,
          REPLICATE_API_TOKEN, REPLICATE_WEBHOOK_URL, false, // always sync for combo
          stepVersion
        );

        currentImageUrl = result.outputUrl;

        try {
          const { data: sm } = await supabase.from("ai_models_config").select("total_runs").eq("id", stepModelId).single();
          if (sm) await supabase.from("ai_models_config").update({ total_runs: (sm.total_runs || 0) + 1 }).eq("id", stepModelId);
        } catch { /* ignore */ }
      }

      const imageResponse = await fetch(currentImageUrl);
      if (!imageResponse.ok) throw new Error("Failed to download combo result");
      const imageBuffer = new Uint8Array(await imageResponse.arrayBuffer());

      const dateFolder = new Date().toISOString().slice(0, 10);
      const storagePath = previewMode
        ? `preview/${dateFolder}/${restorationId}_t${trialNumber}.png`
        : `restored/${dateFolder}/${restorationId}.png`;

      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(storagePath, imageBuffer, { contentType: "image/png", upsert: true });
      if (uploadError) throw new Error("Failed to upload combo result");

      const { data: signedData, error: signedError } = await supabase.storage
        .from("photos")
        .createSignedUrl(storagePath, 3600);
      if (signedError || !signedData?.signedUrl) throw new Error("Failed to generate preview URL");

      const updateData = previewMode
        ? { status: "preview_ready", preview_image_path: storagePath }
        : { status: "completed", restored_image_path: storagePath, preview_image_path: storagePath };

      await supabase.from("photo_restorations").update(updateData).eq("id", restorationId);

      return new Response(
        JSON.stringify({ success: true, previewUrl: signedData.signedUrl, modelUsed: "combo-model", pipelineSteps }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==========================================
    // MODE STANDARD: Single model
    // ==========================================
    const fullPrompt = (modelConfig.systemPrompt || defaultPrompt) + colorizeAddition;
    const modelInput = buildModelInput(modelConfig.modelId, imageUrl, fullPrompt, previewMode, outputAspectRatio, outputResolution);

    // Resolve version (returns null for deployment models, hash for legacy models)
    const resolvedVersion = await resolveVersion(modelConfig.replicateId, REPLICATE_API_TOKEN);

    // Always synchronous polling — single generation, store once
    const result = await runSingleModel(
      modelConfig.replicateId, modelConfig.modelId, modelInput,
      REPLICATE_API_TOKEN, undefined, false, resolvedVersion
    );

    const imageResponse = await fetch(result.outputUrl);
    if (!imageResponse.ok) throw new Error("Failed to download restored image");
    const imageBuffer = new Uint8Array(await imageResponse.arrayBuffer());

    const dateFolder = new Date().toISOString().slice(0, 10);
    const storagePath = `preview/${dateFolder}/${restorationId}_t${trialNumber}.png`;

    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(storagePath, imageBuffer, { contentType: "image/png", upsert: true });
    if (uploadError) throw new Error("Failed to upload restored image");

    const { data: signedData, error: signedError } = await supabase.storage
      .from("photos")
      .createSignedUrl(storagePath, 3600);
    if (signedError || !signedData?.signedUrl) throw new Error("Failed to generate preview URL");

    // Store the generated image as preview — same file will be used for HD download after payment
    await supabase.from("photo_restorations").update({
      status: "preview_ready",
      preview_image_path: storagePath,
    }).eq("id", restorationId);

    return new Response(
      JSON.stringify({ success: true, previewUrl: signedData.signedUrl, modelUsed: modelConfig.modelId }),
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
      } catch { /* ignore DB update error */ }
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
