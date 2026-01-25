import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PARTNER_COMMISSION = 250; // Fixed 250 F CFA per payment
const MAX_MONTHLY_FREE_GENERATIONS = 2; // Max free generation rewards per user per month

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { restorationId, promoCode } = await req.json();

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

    let baseAmount = 1000;
    let discountAmount = 0;
    let appliedPromoCode = null;

    // PROMO CODE VALIDATION
    if (promoCode) {
      const { data: promo, error: promoError } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", promoCode.toUpperCase())
        .eq("is_active", true)
        .single();

      if (promo && !promoError) {
        // Check if not expired
        const isExpired = promo.expires_at && new Date(promo.expires_at) < new Date();
        
        // Check usage limit
        const usageExceeded = promo.usage_limit && promo.usage_count >= promo.usage_limit;
        
        // Check if new users only
        let isNewUser = true;
        if (promo.new_users_only && restoration.user_id) {
          const { count: previousPayments } = await supabase
            .from("photo_restorations")
            .select("*", { count: "exact", head: true })
            .eq("user_id", restoration.user_id)
            .eq("is_paid", true);
          
          isNewUser = (previousPayments || 0) === 0;
        }

        // Check if user already used this code
        let alreadyUsed = false;
        if (restoration.user_id) {
          const { data: existingUse } = await supabase
            .from("promo_code_uses")
            .select("id")
            .eq("promo_code_id", promo.id)
            .eq("user_id", restoration.user_id)
            .single();
          
          alreadyUsed = !!existingUse;
        }

        if (!isExpired && !usageExceeded && isNewUser && !alreadyUsed) {
          discountAmount = promo.discount_amount;
          appliedPromoCode = promo;
          console.log(`Promo code ${promoCode} applied: -${discountAmount} XOF`);
        } else {
          console.log(`Promo code ${promoCode} invalid: expired=${isExpired}, usage=${usageExceeded}, newUser=${isNewUser}, used=${alreadyUsed}`);
        }
      }
    }

    const finalAmount = Math.max(0, baseAmount - discountAmount);

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        restoration_id: restorationId,
        amount: finalAmount,
        currency: "XOF",
        status: "completed",
        provider: "demo",
        provider_reference: `demo_${Date.now()}`,
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Payment creation error:", paymentError);
      throw new Error("Failed to create payment record");
    }

    // Record promo code use
    if (appliedPromoCode && restoration.user_id) {
      await supabase
        .from("promo_code_uses")
        .insert({
          promo_code_id: appliedPromoCode.id,
          user_id: restoration.user_id,
          payment_id: payment.id,
        });

      // Increment usage count
      await supabase
        .from("promo_codes")
        .update({ usage_count: appliedPromoCode.usage_count + 1 })
        .eq("id", appliedPromoCode.id);

      // If promo is linked to a partner, grant partner commission
      if (appliedPromoCode.linked_partner_user_id) {
        await grantPartnerCommission(supabase, appliedPromoCode.linked_partner_user_id, payment.id);
      }
    }

    // Update restoration as paid
    await supabase
      .from("photo_restorations")
      .update({
        is_paid: true,
        payment_id: payment.id,
      })
      .eq("id", restorationId);

    // REFERRAL & PARTNER REWARD LOGIC
    if (restoration.user_id) {
      const { data: buyerProfile } = await supabase
        .from("profiles")
        .select("referred_by_user_id, email_verified")
        .eq("user_id", restoration.user_id)
        .single();

      if (buyerProfile?.referred_by_user_id) {
        // Check if buyer has verified email
        if (!buyerProfile.email_verified) {
          console.log(`Referral reward skipped: buyer ${restoration.user_id} email not verified`);
        } else {
          // Get referrer profile
          const { data: referrerProfile } = await supabase
            .from("profiles")
            .select("user_id, email_verified, free_generations_balance, is_partner, partner_commission_balance")
            .eq("user_id", buyerProfile.referred_by_user_id)
            .single();

          if (referrerProfile) {
            // Check if referrer is a partner
            if (referrerProfile.is_partner) {
              // PARTNER COMMISSION FLOW
              await grantPartnerCommission(supabase, referrerProfile.user_id, payment.id);
            } else {
              // USER REFERRAL FLOW - Free generation reward
              await grantUserReferralReward(
                supabase, 
                referrerProfile, 
                buyerProfile.referred_by_user_id, 
                restoration.user_id, 
                payment.id
              );
            }
          }
        }
      }
    }

    // Generate signed URLs for downloads
    const { data: pngUrl } = await supabase.storage
      .from("photos")
      .createSignedUrl(restoration.restored_image_path, 3600);

    return new Response(
      JSON.stringify({
        success: true,
        amountPaid: finalAmount,
        discountApplied: discountAmount,
        downloadUrls: {
          png: pngUrl?.signedUrl,
          pdf: pngUrl?.signedUrl,
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

async function grantPartnerCommission(
  supabase: any,
  partnerUserId: string,
  paymentId: string
) {
  const { data: existingCommission } = await supabase
    .from("partner_commissions")
    .select("id")
    .eq("payment_id", paymentId)
    .single();

  if (existingCommission) {
    console.log(`Partner commission already granted for payment ${paymentId}`);
    return;
  }

  const { data: partner } = await supabase
    .from("profiles")
    .select("partner_commission_balance")
    .eq("user_id", partnerUserId)
    .single();

  const newBalance = (partner?.partner_commission_balance || 0) + PARTNER_COMMISSION;

  await supabase
    .from("profiles")
    .update({ partner_commission_balance: newBalance })
    .eq("user_id", partnerUserId);

  await supabase
    .from("partner_commissions")
    .insert({
      partner_user_id: partnerUserId,
      payment_id: paymentId,
      commission_amount: PARTNER_COMMISSION,
      status: "pending",
    });

  console.log(`Partner commission granted to ${partnerUserId}: +${PARTNER_COMMISSION} XOF`);
}

async function grantUserReferralReward(
  supabase: any,
  referrerProfile: any,
  referrerUserId: string,
  referredUserId: string,
  paymentId: string
) {
  const { data: existingReferral } = await supabase
    .from("referrals")
    .select("id")
    .eq("referred_user_id", referredUserId)
    .eq("payment_id", paymentId)
    .single();

  if (existingReferral) {
    console.log(`Referral reward already granted for payment ${paymentId}`);
    return;
  }

  if (!referrerProfile.email_verified) {
    console.log(`Referral reward skipped: referrer ${referrerUserId} email not verified`);
    return;
  }

  const { data: monthlyCount } = await supabase.rpc("get_monthly_referral_reward_count", {
    p_user_id: referrerUserId,
  });

  if ((monthlyCount || 0) >= MAX_MONTHLY_FREE_GENERATIONS) {
    console.log(`Referral reward skipped: referrer ${referrerUserId} reached monthly limit`);
    await supabase.from("referrals").insert({
      referrer_user_id: referrerUserId,
      referred_user_id: referredUserId,
      payment_id: paymentId,
      reward_type: "free_generation",
      reward_amount: 0,
    });
    return;
  }

  const newBalance = (referrerProfile.free_generations_balance || 0) + 1;

  await supabase
    .from("profiles")
    .update({ free_generations_balance: newBalance })
    .eq("user_id", referrerUserId);

  await supabase.from("referrals").insert({
    referrer_user_id: referrerUserId,
    referred_user_id: referredUserId,
    payment_id: paymentId,
    reward_type: "free_generation",
    reward_amount: 1,
  });

  console.log(`Referral reward granted to ${referrerUserId}: +1 free generation`);
}
