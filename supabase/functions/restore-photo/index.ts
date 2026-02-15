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
    const { restorationId, imageBase64, colorize = false } = await req.json();

    if (!restorationId) {
      return new Response(
        JSON.stringify({ error: "Missing restorationId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!REPLICATE_API_TOKEN) {
      throw new Error("REPLICATE_API_TOKEN is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Update status to processing
    await supabase
      .from("photo_restorations")
      .update({ status: "processing" })
      .eq("id", restorationId);

    // Get the image: either from provided base64 or from storage
    let imageUrl: string;

    if (imageBase64) {
      imageUrl = imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
    } else {
      // Read original image from storage
      const { data: restoration } = await supabase
        .from("photo_restorations")
        .select("original_image_path")
        .eq("id", restorationId)
        .single();

      if (!restoration?.original_image_path) {
        throw new Error("Original image path not found for restoration");
      }

      const { data: fileData, error: downloadError } = await supabase.storage
        .from("photos")
        .download(restoration.original_image_path);

      if (downloadError || !fileData) {
        throw new Error("Failed to download original image from storage");
      }

      const arrayBuffer = await fileData.arrayBuffer();
      const base64String = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      imageUrl = `data:image/jpeg;base64,${base64String}`;
    }

    // Build the restoration prompt
    const basePrompt = "Increase the resolution of this image to 300 dpi, the standard for print. However, do not change anything else. Remove all edge imperfections and make the photo sharp and clear. Adjust the lighting and overall quality so it looks like it was taken with an iPhone 14 Pro Max camera — natural colors, precise details, balanced exposure, and professional-grade sharpness.";
    const colorizeAddition = colorize
      ? " Also, colorize this photo naturally if it is black and white, using realistic and vivid colors appropriate to the era and subject."
      : "";
    const fullPrompt = basePrompt + colorizeAddition;

    console.log("Calling Replicate with google/nano-banana-pro model...");

    // Call Replicate
    const createResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
        Prefer: "wait",
      },
      body: JSON.stringify({
        version: "f5318740f60d79bf0c480216aaf9ca7614977553170eacd19ff8cbcda2409ac8",
        input: {
          prompt: fullPrompt,
          image_input: [imageUrl],
          aspect_ratio: "match_input_image",
          output_format: "png",
          resolution: "2K",
        },
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error("Replicate API error:", createResponse.status, errorText);
      throw new Error(`Replicate API error: ${createResponse.status} - ${errorText}`);
    }

    let prediction = await createResponse.json();

    // Poll for completion
    while (prediction.status !== "succeeded" && prediction.status !== "failed") {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
      });
      prediction = await pollResponse.json();
    }

    if (prediction.status === "failed") {
      console.error("Replicate prediction failed:", prediction.error);
      throw new Error(`Restoration failed: ${prediction.error}`);
    }

    const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;

    if (!outputUrl) {
      throw new Error("No image returned from Replicate");
    }

    console.log("Downloading restored image from:", typeof outputUrl === 'string' ? outputUrl.substring(0, 80) : outputUrl);

    // Download the restored image
    const imageResponse = await fetch(outputUrl);
    if (!imageResponse.ok) {
      throw new Error("Failed to download restored image from Replicate");
    }
    const imageBuffer = new Uint8Array(await imageResponse.arrayBuffer());

    // Store the restored image
    const restoredPath = `restored/${restorationId}.png`;
    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(restoredPath, imageBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to upload restored image");
    }

    // Generate a signed URL
    const { data: signedData, error: signedError } = await supabase.storage
      .from("photos")
      .createSignedUrl(restoredPath, 3600);

    if (signedError || !signedData?.signedUrl) {
      console.error("Signed URL error:", signedError);
      throw new Error("Failed to generate preview URL");
    }

    // Update the restoration record
    await supabase
      .from("photo_restorations")
      .update({
        status: "completed",
        restored_image_path: restoredPath,
        preview_image_path: restoredPath,
      })
      .eq("id", restorationId);

    return new Response(
      JSON.stringify({
        success: true,
        previewUrl: signedData.signedUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Restore photo error:", error);

    // Try to update status to failed
    try {
      const { restorationId } = await new Response(error instanceof Error ? "" : "").json().catch(() => ({}));
    } catch {}

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});