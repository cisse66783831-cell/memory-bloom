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

    if (!restorationId || !imageBase64) {
      return new Response(
        JSON.stringify({ error: "Missing restorationId or imageBase64" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Update status to processing
    await supabase
      .from("photo_restorations")
      .update({ status: "processing" })
      .eq("id", restorationId);

    // Prepare the image data URL
    const imageUrl = imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;

    // Build the restoration prompt
    const basePrompt = "Increase the resolution of this image to 300 dpi, the standard for print. However, do not change anything else. Remove all edge imperfections and make the photo sharp and clear. Adjust the lighting and overall quality so it looks like it was taken with an iPhone 14 Pro Max camera — natural colors, precise details, balanced exposure, and professional-grade sharpness.";
    const colorizePrompt = colorize 
      ? " Also, colorize this photo naturally if it is black and white, using realistic and vivid colors appropriate to the era and subject."
      : "";
    const fullPrompt = basePrompt + colorizePrompt;

    console.log("Calling Lovable AI with Nano banana pro model...");

    // Call Lovable AI Gateway with image editing (Nano banana pro)
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
              { type: "text", text: fullPrompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Lovable AI error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error("Service temporarily busy, please try again in a moment.");
      }
      if (aiResponse.status === 402) {
        throw new Error("AI credits exhausted. Please add credits to continue.");
      }
      throw new Error(`AI processing error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    console.log("AI response received, extracting image...");

    // Extract the generated image from the response
    const generatedImage = aiResult.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImage) {
      console.error("No image in AI response:", JSON.stringify(aiResult).substring(0, 500));
      throw new Error("No image returned from AI");
    }

    // Convert base64 data URL to binary buffer
    const base64Data = generatedImage.replace(/^data:image\/\w+;base64,/, "");
    const binaryString = atob(base64Data);
    const imageBuffer = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      imageBuffer[i] = binaryString.charCodeAt(i);
    }

    // Store the restored image in Supabase storage
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

    // Generate a signed URL for preview (valid 1 hour)
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
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
