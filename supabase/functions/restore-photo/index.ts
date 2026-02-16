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

function buildModelInput(modelId: string, imageUrl: string, prompt: string, previewMode: boolean, aspectRatio: string, resolution: string): Record<string, any> {
  if (modelId === "nano-banana" || modelId === "nano-banana-pro" || modelId === "gemini-flash") {
    return {
      prompt,
      image_input: [imageUrl],
      aspect_ratio: aspectRatio,
      output_format: "png",
      resolution,
    };
  } else if (modelId === "flux-restore") {
    return {
      input_image: imageUrl,
      output_format: "png",
    };
  } else if (modelId === "real-esrgan") {
    return { image: imageUrl, scale: previewMode ? 2 : 4 };
  } else if (modelId === "gfpgan") {
    return { img: imageUrl, version: "v1.4", scale: previewMode ? 2 : 4 };
  } else if (modelId === "codeformer") {
    return { image: imageUrl, codeformer_fidelity: 0.7, upscale: previewMode ? 1 : 2 };
  } else {
    return { image: imageUrl };
  }
}

// Resolve owner/model to latest version hash
async function resolveVersion(replicateId: string, apiToken: string): Promise<string> {
  if (!replicateId.includes("/")) return replicateId; // already a hash
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

async function runSingleModel(
  replicateId: string, modelId: string, modelInput: Record<string, any>,
  apiToken: string, webhookUrl: string | undefined, useWebhook: boolean
): Promise<{ outputUrl: string; predictionId: string }> {
  const version = await resolveVersion(replicateId, apiToken);
  const body: any = { version, input: modelInput };

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  };

  if (useWebhook && webhookUrl) {
    body.webhook = webhookUrl;
    body.webhook_events_filter = ["completed"];
  } else {
    headers["Prefer"] = "wait";
  }

  const createResponse = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST", headers, body: JSON.stringify(body),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Replicate API error: ${createResponse.status} - ${errorText}`);
  }

  let prediction = await createResponse.json();

  if (useWebhook && webhookUrl) {
    return { outputUrl: "", predictionId: prediction.id };
  }

  // Synchronous polling
  while (prediction.status !== "succeeded" && prediction.status !== "failed") {
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

  try {
    const { restorationId, imageBase64, colorize = false, previewMode = false, aspectRatio = "match_input_image", trialNumber = 1 } = await req.json();

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

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Update status
    await supabase
      .from("photo_restorations")
      .update({ status: "processing", trial_number: trialNumber })
      .eq("id", restorationId);

    // Get model dynamically
    const modelConfig = await getModelForTrial(supabase, trialNumber, previewMode);
    console.log(`Using model: ${modelConfig.modelId} (${modelConfig.replicateId}) - trial ${trialNumber}, preview: ${previewMode}`);

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

    const outputAspectRatio = previewMode ? "match_input_image" : aspectRatio;
    const outputResolution = previewMode ? "1K" : "2K";

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

      // Get pipeline steps from app_settings
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
        const stepInput = buildModelInput(stepModelId, currentImageUrl, stepPrompt, previewMode, outputAspectRatio, outputResolution);

        console.log(`Combo step ${i + 1}/${pipelineSteps.length}: ${stepModelId}`);

        const result = await runSingleModel(
          stepConfig.replicateId, stepModelId, stepInput,
          REPLICATE_API_TOKEN, REPLICATE_WEBHOOK_URL, false // always sync for combo
        );

        // Use the output as input for the next step
        currentImageUrl = result.outputUrl;

        // Increment runs for this step model
        try {
          const { data: sm } = await supabase.from("ai_models_config").select("total_runs").eq("id", stepModelId).single();
          if (sm) await supabase.from("ai_models_config").update({ total_runs: (sm.total_runs || 0) + 1 }).eq("id", stepModelId);
        } catch { /* ignore */ }
      }

      // Download final result and upload
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

    const resolvedVersion = await resolveVersion(modelConfig.replicateId, REPLICATE_API_TOKEN);
    const replicateBody: any = { version: resolvedVersion, input: modelInput };

    // Non-preview: use webhook
    if (!previewMode && REPLICATE_WEBHOOK_URL) {
      replicateBody.webhook = REPLICATE_WEBHOOK_URL;
      replicateBody.webhook_events_filter = ["completed"];

      const createResponse = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(replicateBody),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Replicate API error: ${createResponse.status} - ${errorText}`);
      }

      const prediction = await createResponse.json();
      await supabase
        .from("photo_restorations")
        .update({ replicate_prediction_id: prediction.id })
        .eq("id", restorationId);

      return new Response(
        JSON.stringify({ success: true, message: "Processing started", predictionId: prediction.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Preview: synchronous polling
    const result = await runSingleModel(modelConfig.replicateId, modelConfig.modelId, modelInput, REPLICATE_API_TOKEN, undefined, false);

    const imageResponse = await fetch(result.outputUrl);
    if (!imageResponse.ok) throw new Error("Failed to download restored image");
    const imageBuffer = new Uint8Array(await imageResponse.arrayBuffer());

    const dateFolder = new Date().toISOString().slice(0, 10);
    const storagePath = previewMode
      ? `preview/${dateFolder}/${restorationId}_t${trialNumber}.png`
      : `restored/${dateFolder}/${restorationId}.png`;

    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(storagePath, imageBuffer, { contentType: "image/png", upsert: true });
    if (uploadError) throw new Error("Failed to upload restored image");

    const { data: signedData, error: signedError } = await supabase.storage
      .from("photos")
      .createSignedUrl(storagePath, 3600);
    if (signedError || !signedData?.signedUrl) throw new Error("Failed to generate preview URL");

    const updateData = previewMode
      ? { status: "preview_ready", preview_image_path: storagePath }
      : { status: "completed", restored_image_path: storagePath, preview_image_path: storagePath };

    await supabase.from("photo_restorations").update(updateData).eq("id", restorationId);

    return new Response(
      JSON.stringify({ success: true, previewUrl: signedData.signedUrl, modelUsed: modelConfig.modelId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Restore photo error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
