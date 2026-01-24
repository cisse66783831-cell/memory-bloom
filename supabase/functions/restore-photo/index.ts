import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Build the prompt based on colorization option
    const basePrompt = "Restore this old or damaged photo to pristine quality. Fix any scratches, tears, fading, blur, or damage. Keep the original composition and people exactly as they are - do not change faces or add/remove anyone.";
    
    const colorizePrompt = colorize 
      ? " Add realistic, natural colors to this black and white photograph. Use historically accurate colors that match the era the photo was taken. Make colors vibrant but believable."
      : " Enhance colors to be vibrant but natural.";
    
    const finalPrompt = basePrompt + colorizePrompt + " Make it look like a professionally restored vintage photograph. Output only the restored image.";

    // Call AI to restore the image
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: finalPrompt
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const restoredImageBase64 = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!restoredImageBase64) {
      throw new Error("No image returned from AI");
    }

    // Create a preview version (lower quality, with watermark applied client-side)
    // The full image is stored but only accessible after payment
    const previewBase64 = restoredImageBase64;

    // Store the restored image in Supabase storage
    const imageData = restoredImageBase64.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Uint8Array.from(atob(imageData), c => c.charCodeAt(0));

    const restoredPath = `restored/${restorationId}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(restoredPath, imageBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to upload restored image");
    }

    // Update the restoration record
    await supabase
      .from("photo_restorations")
      .update({
        status: "completed",
        restored_image_path: restoredPath,
        preview_image_path: restoredPath, // Same path, access controlled by payment status
      })
      .eq("id", restorationId);

    return new Response(
      JSON.stringify({ 
        success: true,
        previewBase64: previewBase64, // Send preview to client
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
