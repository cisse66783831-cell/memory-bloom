import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PARTNER_COMMISSION = 250;
const MAX_MONTHLY_FREE_GENERATIONS = 2;
const UNIT_PRICE = 1000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { restorationId, promoCode, depositMethod, subscriptionPlanId, action, paymentId, outputFormat = "match_input_image", senderPhone } = await req.json();

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // === ADMIN AUTH CHECK for validate/reject actions ===
    if (action === "validate" || action === "reject") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const userSupabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsErr } = await userSupabase.auth.getClaims(token);
      if (claimsErr || !claimsData?.claims?.sub) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const adminUserId = claimsData.claims.sub;
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", adminUserId)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleData) {
        return new Response(
          JSON.stringify({ error: "Admin access required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // === ADMIN VALIDATION ACTION ===
    if (action === "validate" && paymentId) {
      const { data: payment, error: fetchErr } = await supabase
        .from("payments")
        .select("*")
        .eq("id", paymentId)
        .single();

      if (fetchErr || !payment) {
        return new Response(
          JSON.stringify({ error: "Payment not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (payment.status === "completed") {
        return new Response(
          JSON.stringify({ error: "Already validated" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark payment as completed
      await supabase
        .from("payments")
        .update({ status: "completed", admin_validated_at: new Date().toISOString() })
        .eq("id", paymentId);

      // Mark restoration as paid
      await supabase
        .from("photo_restorations")
        .update({ is_paid: true, payment_id: paymentId })
        .eq("id", payment.restoration_id);

      // Get restoration for download URLs
      const { data: restoration } = await supabase
        .from("photo_restorations")
        .select("*")
        .eq("id", payment.restoration_id)
        .single();

      // === CREATE SUBSCRIPTION if payment has provider_reference pointing to a plan ===
      if (payment.provider === "subscription_purchase" && payment.provider_reference && restoration?.user_id) {
        const { data: plan } = await supabase
          .from("subscription_plans")
          .select("*")
          .eq("id", payment.provider_reference)
          .single();

        if (plan) {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + plan.duration_days);

          await supabase.from("user_subscriptions").insert({
            user_id: restoration.user_id,
            plan_id: plan.id,
            payment_id: paymentId,
            photos_remaining: plan.photo_count,
            expires_at: expiresAt.toISOString(),
            status: "active",
          });
        }
      }

      // === UNLOCK IMAGE: no new AI generation — just copy preview path to restored path ===
      if (restoration && restoration.status !== "completed") {
        if (restoration.preview_image_path) {
          // Normal case: image is ready → unlock immediately
          console.log("Unlocking existing generated image for:", payment.restoration_id);
          await supabase
            .from("photo_restorations")
            .update({
              status: "completed",
              restored_image_path: restoration.preview_image_path,
            })
            .eq("id", payment.restoration_id);
        } else {
          // Image not yet generated (e.g. webhook still in progress)
          // is_paid is already set to true above — the webhook will finalize when it arrives
          console.log("Image not yet ready for:", payment.restoration_id, "— webhook will complete it");
        }
      }

      // Handle referral/partner rewards
      if (restoration?.user_id) {
        await handleRewards(supabase, restoration, payment);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Payment validated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === ADMIN REJECT ACTION ===
    if (action === "reject" && paymentId) {
      await supabase
        .from("payments")
        .update({ status: "rejected" })
        .eq("id", paymentId);

      return new Response(
        JSON.stringify({ success: true, message: "Payment rejected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === CREATE PENDING PAYMENT (user deposit flow) ===
    if (!restorationId) {
      return new Response(
        JSON.stringify({ error: "Missing restorationId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    if (restoration.is_paid) {
      return new Response(
        JSON.stringify({ error: "Already paid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for active subscription
    if (restoration.user_id) {
      const { data: activeSub } = await supabase
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", restoration.user_id)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .gt("photos_remaining", 0)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (activeSub) {
        // Use subscription credit
        await supabase
          .from("user_subscriptions")
          .update({ photos_remaining: activeSub.photos_remaining - 1 })
          .eq("id", activeSub.id);

        // Create completed payment
        const { data: payment } = await supabase
          .from("payments")
          .insert({
            restoration_id: restorationId,
            amount: 0,
            currency: "XOF",
            status: "completed",
            provider: "subscription",
            provider_reference: activeSub.id,
            sender_phone: senderPhone || null,
          })
          .select()
          .single();

        // Mark restoration as paid
        await supabase
          .from("photo_restorations")
          .update({ is_paid: true, payment_id: payment?.id })
          .eq("id", restorationId);

      // Unlock image immediately for subscription — no re-generation needed
        const { data: currentRestoration } = await supabase
          .from("photo_restorations")
          .select("preview_image_path")
          .eq("id", restorationId)
          .single();

        if (currentRestoration?.preview_image_path) {
          await supabase
            .from("photo_restorations")
            .update({
              status: "completed",
              restored_image_path: currentRestoration.preview_image_path,
            })
            .eq("id", restorationId);

          const { data: signedData } = await supabase.storage
            .from("photos")
            .createSignedUrl(currentRestoration.preview_image_path, 3600);

          if (signedData?.signedUrl) {
            return new Response(
              JSON.stringify({
                success: true,
                paymentMethod: "subscription",
                status: "completed",
                downloadUrls: {
                  png: signedData.signedUrl,
                  pdf: signedData.signedUrl,
                },
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            paymentMethod: "subscription",
            status: "processing",
            message: "Paiement validé, restauration en cours...",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // === Determine price based on subscription plan or unit ===
    let baseAmount = UNIT_PRICE;
    let providerType = depositMethod || "deposit";
    let providerReference: string | null = null;

    if (subscriptionPlanId) {
      const { data: plan, error: planError } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("id", subscriptionPlanId)
        .eq("is_active", true)
        .single();

      if (planError || !plan) {
        return new Response(
          JSON.stringify({ error: "Plan d'abonnement introuvable" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      baseAmount = plan.price;
      providerType = "subscription_purchase";
      providerReference = plan.id;
    }

    // Calculate price with promo
    let discountAmount = 0;
    let appliedPromoCode: any = null;

    if (promoCode) {
      const { data: promo, error: promoError } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", promoCode.toUpperCase())
        .eq("is_active", true)
        .single();

      if (promo && !promoError) {
        const isExpired = promo.expires_at && new Date(promo.expires_at) < new Date();
        const usageExceeded = promo.usage_limit && promo.usage_count >= promo.usage_limit;

        let isNewUser = true;
        if (promo.new_users_only && restoration.user_id) {
          const { count } = await supabase
            .from("photo_restorations")
            .select("*", { count: "exact", head: true })
            .eq("user_id", restoration.user_id)
            .eq("is_paid", true);
          isNewUser = (count || 0) === 0;
        }

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
        }
      }
    }

    const finalAmount = Math.max(0, baseAmount - discountAmount);

    // Create PENDING payment (awaiting admin validation) with sender_phone
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        restoration_id: restorationId,
        amount: finalAmount,
        currency: "XOF",
        status: "pending",
        provider: providerType,
        provider_reference: providerReference,
        deposit_method: depositMethod || null,
        sender_phone: senderPhone || null,
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
      await supabase
        .from("promo_codes")
        .update({ usage_count: appliedPromoCode.usage_count + 1 })
        .eq("id", appliedPromoCode.id);
    }

    // Update restoration with payment_id
    await supabase
      .from("photo_restorations")
      .update({ payment_id: payment.id })
      .eq("id", restorationId);

    return new Response(
      JSON.stringify({
        success: true,
        paymentMethod: subscriptionPlanId ? "subscription_purchase" : "deposit",
        status: "pending",
        paymentId: payment.id,
        amountDue: finalAmount,
        discountApplied: discountAmount,
        message: "Votre dépôt est en attente de validation. Vous recevrez l'accès dès confirmation.",
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

async function handleRewards(supabase: any, restoration: any, payment: any) {
  const { data: buyerProfile } = await supabase
    .from("profiles")
    .select("referred_by_user_id, email_verified")
    .eq("user_id", restoration.user_id)
    .single();

  // REMOVED email_verified check - reward granted as soon as payment is validated
  if (!buyerProfile?.referred_by_user_id) return;

  const { data: referrerProfile } = await supabase
    .from("profiles")
    .select("user_id, email_verified, free_generations_balance, is_partner, partner_commission_balance")
    .eq("user_id", buyerProfile.referred_by_user_id)
    .single();

  if (!referrerProfile) return;

  if (referrerProfile.is_partner) {
    // Partner commission
    const { data: existing } = await supabase
      .from("partner_commissions")
      .select("id")
      .eq("payment_id", payment.id)
      .single();

    if (!existing) {
      const newBalance = (referrerProfile.partner_commission_balance || 0) + 250;
      await supabase.from("profiles").update({ partner_commission_balance: newBalance }).eq("user_id", referrerProfile.user_id);
      await supabase.from("partner_commissions").insert({
        partner_user_id: referrerProfile.user_id,
        payment_id: payment.id,
        commission_amount: 250,
        status: "pending",
      });
    }
  } else if (referrerProfile.email_verified) {
    // Free generation reward
    const { data: existing } = await supabase
      .from("referrals")
      .select("id")
      .eq("referred_user_id", restoration.user_id)
      .eq("payment_id", payment.id)
      .single();

    if (!existing) {
      const { data: monthlyCount } = await supabase.rpc("get_monthly_referral_reward_count", { p_user_id: referrerProfile.user_id });
      const rewardAmount = (monthlyCount || 0) >= 2 ? 0 : 1;
      if (rewardAmount > 0) {
        await supabase.from("profiles")
          .update({ free_generations_balance: (referrerProfile.free_generations_balance || 0) + 1 })
          .eq("user_id", referrerProfile.user_id);
      }
      await supabase.from("referrals").insert({
        referrer_user_id: referrerProfile.user_id,
        referred_user_id: restoration.user_id,
        payment_id: payment.id,
        reward_type: "free_generation",
        reward_amount: rewardAmount,
      });
    }
  }
}
