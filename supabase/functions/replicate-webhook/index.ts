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

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    if (payload.status === "failed") {
      console.log(`Prediction ${payload.id} failed.`);
      const { error: failErr } = await supabase
        .from("photo_restorations")
        .update({ status: "failed" })
        .eq("replicate_prediction_id", payload.id);

      if (failErr) console.error("Failed to update status to failed:", JSON.stringify(failErr));

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.status !== "succeeded") {
      console.log(`Prediction ${payload.id} status: ${payload.status}, ignoring.`);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the restoration by prediction ID
    console.log(`Looking up restoration for prediction: ${payload.id}`);
    const { data: restoration, error: fetchError } = await supabase
      .from("photo_restorations")
      .select("*")
      .eq("replicate_prediction_id", payload.id)
      .maybeSingle();

    if (fetchError) {
      console.error("DB fetch error:", JSON.stringify(fetchError));
      return new Response(
        JSON.stringify({ error: "DB fetch error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!restoration) {
      console.error("Restoration not found for prediction:", payload.id);
      // Try to find by any recent processing restoration as fallback
      return new Response(
        JSON.stringify({ error: "Restoration not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found restoration: ${restoration.id}, status: ${restoration.status}, is_paid: ${restoration.is_paid}`);

    // Get output URL from Replicate response
    const outputUrl = Array.isArray(payload.output) ? payload.output[0] : payload.output;

    if (!outputUrl) {
      console.error("No output URL in webhook payload. Output:", JSON.stringify(payload.output));
      const { error: noOutErr } = await supabase
        .from("photo_restorations")
        .update({ status: "failed" })
        .eq("id", restoration.id);
      if (noOutErr) console.error("Error updating to failed:", JSON.stringify(noOutErr));

      return new Response(
        JSON.stringify({ error: "No output URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Downloading restored image from:", outputUrl);

    // Download the image from Replicate
    const imageResponse = await fetch(outputUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download restored image: ${imageResponse.status}`);
    }
    const imageBuffer = new Uint8Array(await imageResponse.arrayBuffer());
    console.log(`Image downloaded, size: ${imageBuffer.length} bytes`);

    // Store in preview/ folder
    const dateFolder = new Date().toISOString().slice(0, 10);
    const storagePath = `preview/${dateFolder}/${restoration.id}_t${restoration.trial_number || 1}.png`;

    console.log(`Uploading to storage path: ${storagePath}`);
    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(storagePath, imageBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", JSON.stringify(uploadError));
      throw new Error(`Failed to upload restored image: ${uploadError.message}`);
    }

    console.log(`Image successfully uploaded to: ${storagePath}`);

    // Determine final status based on payment state
    const updateData: Record<string, string> = {
      preview_image_path: storagePath,
      status: "preview_ready",
    };

    if (restoration.is_paid) {
      console.log(`Restoration ${restoration.id} is already paid — marking as completed directly`);
      updateData.status = "completed";
      updateData.restored_image_path = storagePath;
    }

    console.log(`Updating restoration ${restoration.id} with:`, JSON.stringify(updateData));
    const { error: updateError, data: updateData2 } = await supabase
      .from("photo_restorations")
      .update(updateData)
      .eq("id", restoration.id)
      .select();

    if (updateError) {
      console.error("CRITICAL: Failed to update restoration in DB:", JSON.stringify(updateError));
      throw new Error(`DB update failed: ${updateError.message}`);
    }

    console.log(`DB update result:`, JSON.stringify(updateData2));
    console.log(`Restoration ${restoration.id} successfully updated to status: ${updateData.status}`);

    return new Response(
      JSON.stringify({ ok: true, restorationId: restoration.id, status: updateData.status }),
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
