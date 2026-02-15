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
    const payload = await req.json();

    console.log("Webhook received:", JSON.stringify({ id: payload.id, status: payload.status }));

    if (payload.status !== "succeeded") {
      console.log(`Prediction ${payload.id} status: ${payload.status}, ignoring.`);
      
      if (payload.status === "failed") {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

        await supabase
          .from("photo_restorations")
          .update({ status: "failed" })
          .eq("replicate_prediction_id", payload.id);
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Find the restoration by prediction ID
    const { data: restoration, error: fetchError } = await supabase
      .from("photo_restorations")
      .select("*")
      .eq("replicate_prediction_id", payload.id)
      .maybeSingle();

    if (fetchError || !restoration) {
      console.error("Restoration not found for prediction:", payload.id);
      return new Response(
        JSON.stringify({ error: "Restoration not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get output URL
    const outputUrl = Array.isArray(payload.output) ? payload.output[0] : payload.output;

    if (!outputUrl) {
      console.error("No output URL in webhook payload");
      await supabase
        .from("photo_restorations")
        .update({ status: "failed" })
        .eq("id", restoration.id);
      return new Response(
        JSON.stringify({ error: "No output URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Downloading restored image from:", outputUrl);

    // Download the image from Replicate
    const imageResponse = await fetch(outputUrl);
    if (!imageResponse.ok) {
      throw new Error("Failed to download restored image from Replicate");
    }
    const imageBuffer = new Uint8Array(await imageResponse.arrayBuffer());

    // Upload to Supabase Storage
    const storagePath = `restored/${restoration.id}.png`;
    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(storagePath, imageBuffer, {
        contentType: "image/png",
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
        restored_image_path: storagePath,
        preview_image_path: storagePath,
      })
      .eq("id", restoration.id);

    console.log(`Restoration ${restoration.id} completed via webhook.`);

    return new Response(
      JSON.stringify({ ok: true, restorationId: restoration.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
