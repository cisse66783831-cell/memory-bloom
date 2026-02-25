import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_PROMPT = `You are a professional photo restoration and enhancement AI. Your task is to regenerate this photo realistically with the following strict rules:

COMPOSITION & STRUCTURE (do not change):
- Preserve the exact original composition, camera angle, subject position, and environment layout
- Do not change the location or scene structure
- Do not add or remove any objects

SUBJECT ENHANCEMENT:
- Regenerate the character/subject with photorealistic skin texture and details
- Preserve the person identity and pose exactly
- Remove all imperfections, blemishes, and artifacts from the subject
- Natural, clean, realistic appearance

ENVIRONMENT ENHANCEMENT:
- Regenerate the environment keeping the same structure and object positions
- Make surfaces look clean and new, remove noise and artifacts
- Enhance material quality for a modern, realistic look

IMAGE QUALITY:
- Ultra high resolution, 300 DPI, print-ready quality
- Ultra sharp details, remove all blur and compression artifacts
- Professional quality output

LIGHTING & COLOR:
- Auto-correct white balance and optimize exposure
- Enhance dynamic range with modern HDR processing
- Natural color restoration and realistic color grading

CAMERA SIMULATION:
- Simulate iPhone 14 Pro Max photo processing style
- Modern smartphone HDR, realistic depth and natural sharpness
- Must look like a recent photo taken with a high-end smartphone

OUTPUT:
- Photorealistic style, brand new condition appearance
- Modern, clean, recent photo look
- Avoid any artificial or CGI look
- Maximum quality, same format as input`;

interface ModelConfig {
  replicateId: string;
  modelId: string;
  systemPrompt: string | null;
}

function isDeploymentModel(replicateId: string): boolean {
  // 64-char hex = versioned model, not a deployment
  if (/^[a-f0-9]{64}$/i.test(replicateId)) return false;
  // owner/model paths without a version hash = deployment endpoint
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
  return { replicateId: "google/nano-banana-pro", modelId: "nano-banana", systemPrompt: null };
}

function buildModelInput(modelId: string, replicateId: string, imageUrl: string, prompt: string, aspectRatio: string): Record<string, any> {
  console.log(`Building input for modelId=${modelId}, replicateId=${replicateId}, prompt_length=${prompt.length}`);

  // Nano Banana Pro — google/nano-banana-pro on Replicate
  if (replicateId.startsWith("google/") || modelId === "nano-banana" || modelId === "nano-banana-pro") {
    return {
      prompt,
      image_input: [imageUrl],
    };
  }

  if (modelId === "flux-kontext") {
    return { input_image: imageUrl, prompt, output_format: "png", safety_tolerance: 2 };
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
  if (modelId === "microsoft") {
    return { image: imageUrl };
  }

  return { image: imageUrl, prompt };
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
      sessionId: clientSessionId,
    } = await req.json();
    restorationId = rid;

    if (!restorationId) {
      return new Response(
        JSON.stringify({ error: "Missing restorationId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // === LIMIT CHECK: max 2 unpaid generations per session/user ===
    if (clientSessionId) {
      const { count } = await supabase
        .from("photo_restorations")
        .select("id", { count: "exact", head: true })
        .eq("session_id", clientSessionId)
        .eq("is_paid", false)
        .in("status", ["preview_ready", "processing", "pending", "completed"]);

      if (count !== null && count >= 2) {
        // Return 200 with success:false so the Supabase client can read the body
        return new Response(
          JSON.stringify({ success: false, error: "LIMIT_REACHED", message: "Vous avez atteint la limite de 2 restaurations gratuites. Veuillez payer une restauration existante avant d'en lancer une nouvelle." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Mark as processing
    await supabase
      .from("photo_restorations")
      .update({ status: "processing", trial_number: trialNumber })
      .eq("id", restorationId);

    // Get model
    const modelConfig = await getModelForTrial(supabase, trialNumber);
    const deployment = isDeploymentModel(modelConfig.replicateId);
    console.log(`Using model: ${modelConfig.modelId} (${modelConfig.replicateId}) — deployment: ${deployment}`);

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
    console.log(`Full prompt (${fullPrompt.length} chars)`);

    // Determine AI provider
    const { data: providerSetting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "ai_provider")
      .single();
    const aiProvider = providerSetting?.value || "replicate";
    console.log(`AI Provider: ${aiProvider}`);

    if (aiProvider === "orbit") {
      // ===== ORBIT PROVIDER (OpenAI-compatible API with Gemini image models) =====
      const ORBIT_BASE_URL = Deno.env.get("ORBIT_BASE_URL");
      const ORBIT_AUTH_TOKEN = Deno.env.get("ORBIT_AUTH_TOKEN");
      if (!ORBIT_BASE_URL || !ORBIT_AUTH_TOKEN) throw new Error("Orbit credentials not configured");

      // Get orbit model from settings
      const { data: orbitModelSetting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "orbit_model")
        .single();
      const orbitModel = orbitModelSetting?.value || "gemini-3-pro-image-preview";

      // Build the full API URL - append /v1/chat/completions if not already present
      const baseUrl = ORBIT_BASE_URL.replace(/\/+$/, "");
      const orbitApiUrl = baseUrl.includes("/v1/chat/completions") ? baseUrl : `${baseUrl}/v1/chat/completions`;
      console.log(`Orbit model: ${orbitModel}, URL: ${orbitApiUrl}`);

      const orbitResponse = await fetch(orbitApiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ORBIT_AUTH_TOKEN}`,
          "x-api-key": ORBIT_AUTH_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: orbitModel,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: fullPrompt },
                { type: "image_url", image_url: { url: imageUrl } },
              ],
            },
          ],
          modalities: ["image", "text"],
        }),
      });

      if (!orbitResponse.ok) {
        const errText = await orbitResponse.text();
        throw new Error(`Orbit API error: ${orbitResponse.status} - ${errText}`);
      }

      const orbitResult = await orbitResponse.json();
      console.log("Orbit response keys:", JSON.stringify(Object.keys(orbitResult)));
      if (orbitResult.choices?.[0]) {
        const msg = orbitResult.choices[0].message;
        console.log("Message keys:", JSON.stringify(Object.keys(msg || {})));
        if (msg?.images) console.log("Images count:", msg.images.length);
      }

      // Extract image from response
      let restoredImageData: string | null = null;
      const choices = orbitResult.choices || [];
      for (const choice of choices) {
        const msg = choice.message;
        // Format 1: images array (Gemini image models)
        if (msg?.images && Array.isArray(msg.images)) {
          for (const img of msg.images) {
            if (img.image_url?.url) {
              restoredImageData = img.image_url.url;
              break;
            }
          }
          if (restoredImageData) break;
        }
        // Format 2: content is string (base64 or URL)
        const content = msg?.content;
        if (typeof content === "string") {
          if (content.startsWith("data:image")) {
            restoredImageData = content;
          } else if (content.startsWith("http")) {
            restoredImageData = content;
          }
        }
        // Format 3: content is array with image parts
        if (Array.isArray(content)) {
          for (const part of content) {
            if (part.type === "image_url" && part.image_url?.url) {
              restoredImageData = part.image_url.url;
            } else if (part.type === "image" && part.source?.data) {
              restoredImageData = `data:image/${part.source.media_type || "png"};base64,${part.source.data}`;
            }
          }
        }
        if (restoredImageData) break;
      }

      if (!restoredImageData) {
        console.error("Orbit response structure:", JSON.stringify(orbitResult).slice(0, 500));
        throw new Error("No image found in Orbit response");
      }

      // Upload restored image to storage
      const restoredPath = `restored/${restorationId}.png`;
      let uploadData: Uint8Array;

      if (restoredImageData.startsWith("data:")) {
        const b64 = restoredImageData.split(",")[1];
        const binaryStr = atob(b64);
        uploadData = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) uploadData[i] = binaryStr.charCodeAt(i);
      } else {
        // It's a URL, download it
        const imgResp = await fetch(restoredImageData);
        const imgBuf = await imgResp.arrayBuffer();
        uploadData = new Uint8Array(imgBuf);
      }

      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(restoredPath, uploadData, { contentType: "image/png", upsert: true });

      if (uploadError) throw new Error(`Upload error: ${uploadError.message}`);

      // Update restoration record
      await supabase
        .from("photo_restorations")
        .update({
          restored_image_path: restoredPath,
          preview_image_path: restoredPath,
          status: "completed",
        })
        .eq("id", restorationId);

      return new Response(
        JSON.stringify({
          success: true,
          status: "completed",
          modelUsed: modelConfig.modelId,
          provider: "orbit",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      // ===== REPLICATE PROVIDER =====
      const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN");
      if (!REPLICATE_API_TOKEN) throw new Error("REPLICATE_API_TOKEN is not configured");

      const modelInput = buildModelInput(modelConfig.modelId, modelConfig.replicateId, imageUrl, fullPrompt, aspectRatio);

      const webhookUrl = `${SUPABASE_URL}/functions/v1/replicate-webhook`;

      let apiUrl: string;
      let body: any;

      if (deployment) {
        apiUrl = `https://api.replicate.com/v1/models/${modelConfig.replicateId}/predictions`;
        body = {
          input: modelInput,
          webhook: webhookUrl,
          webhook_events_filter: ["completed"],
        };
      } else {
        apiUrl = "https://api.replicate.com/v1/predictions";
        body = {
          version: modelConfig.replicateId,
          input: modelInput,
          webhook: webhookUrl,
          webhook_events_filter: ["completed"],
        };
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
      console.log(`Prediction created: ${prediction.id}, status: ${prediction.status}`);

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
          provider: "replicate",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
