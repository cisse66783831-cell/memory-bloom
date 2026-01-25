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
    const { restorationId } = await req.json();

    if (!restorationId) {
      return new Response(
        JSON.stringify({ error: "Missing restorationId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get the restoration record
    const { data: restoration, error: fetchError } = await supabase
      .from("photo_restorations")
      .select("*")
      .eq("id", restorationId)
      .single();

    if (fetchError || !restoration) {
      return new Response(
        JSON.stringify({ error: "Restoration not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already paid
    if (restoration.is_paid) {
      return new Response(
        JSON.stringify({ error: "Already paid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        restoration_id: restorationId,
        amount: 1000,
        currency: "XOF",
        status: "completed",
        provider: "demo", // In production, integrate real payment
        provider_reference: `demo_${Date.now()}`,
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Payment creation error:", paymentError);
      throw new Error("Failed to create payment record");
    }

    // Update restoration as paid
    await supabase
      .from("photo_restorations")
      .update({
        is_paid: true,
        payment_id: payment.id,
      })
      .eq("id", restorationId);

    // REFERRAL REWARD LOGIC
    // If the buyer was referred and the referrer has verified email, grant +1 free generation
    if (restoration.user_id) {
      const { data: buyerProfile } = await supabase
        .from("profiles")
        .select("referred_by_user_id")
        .eq("user_id", restoration.user_id)
        .single();

      if (buyerProfile?.referred_by_user_id) {
        // Check if this is the first purchase by this user
        const { count: previousPayments } = await supabase
          .from("photo_restorations")
          .select("*", { count: "exact", head: true })
          .eq("user_id", restoration.user_id)
          .eq("is_paid", true)
          .neq("id", restorationId);

        // Only reward on first purchase
        if (previousPayments === 0) {
          // Get referrer profile
          const { data: referrerProfile } = await supabase
            .from("profiles")
            .select("email_verified, free_generations_balance")
            .eq("user_id", buyerProfile.referred_by_user_id)
            .single();

          // Only reward if referrer has verified email
          if (referrerProfile?.email_verified) {
            const newBalance = (referrerProfile.free_generations_balance || 0) + 1;
            
            await supabase
              .from("profiles")
              .update({ free_generations_balance: newBalance })
              .eq("user_id", buyerProfile.referred_by_user_id);

            console.log(`Referral reward granted to ${buyerProfile.referred_by_user_id}: +1 free generation`);
          } else {
            console.log(`Referral reward skipped: referrer ${buyerProfile.referred_by_user_id} email not verified`);
          }
        } else {
          console.log(`Referral reward skipped: not first purchase for user ${restoration.user_id}`);
        }
      }
    }

    // Generate signed URLs for downloads
    const { data: pngUrl } = await supabase.storage
      .from("photos")
      .createSignedUrl(restoration.restored_image_path, 3600); // 1 hour expiry

    return new Response(
      JSON.stringify({
        success: true,
        downloadUrls: {
          png: pngUrl?.signedUrl,
          pdf: pngUrl?.signedUrl, // In production, generate actual PDF
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Process payment error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
