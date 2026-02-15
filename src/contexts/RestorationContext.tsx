import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type RestorationStep = "upload" | "processing" | "comparison" | "success" | "upsell";

interface RestorationState {
  step: RestorationStep;
  restorationId: string | null;
  sessionId: string;
  originalImageUrl: string | null;
  previewImageUrl: string | null;
  restoredImageUrl: string | null;
  downloadUrls: {
    png: string | null;
    pdf: string | null;
  };
  progress: number;
  error: string | null;
  colorize: boolean;
  paymentStatus: "idle" | "pending" | "completed";
  paymentId: string | null;
}

interface RestorationContextType extends RestorationState {
  uploadPhoto: (file: File, colorize?: boolean) => Promise<void>;
  processPayment: (promoCode?: string, depositMethod?: string, subscriptionPlanId?: string) => Promise<void>;
  checkPaymentStatus: () => Promise<void>;
  downloadFile: (type: "png" | "pdf") => void;
  reset: () => void;
  setStep: (step: RestorationStep) => void;
  setColorize: (colorize: boolean) => void;
}

const RestorationContext = createContext<RestorationContextType | null>(null);

const getSessionId = (): string => {
  let sessionId = localStorage.getItem("photo_restore_session");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem("photo_restore_session", sessionId);
  }
  return sessionId;
};

export function RestorationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RestorationState>({
    step: "upload",
    restorationId: null,
    sessionId: getSessionId(),
    originalImageUrl: null,
    previewImageUrl: null,
    restoredImageUrl: null,
    downloadUrls: { png: null, pdf: null },
    progress: 0,
    error: null,
    colorize: false,
    paymentStatus: "idle",
    paymentId: null,
  });

  const setStep = useCallback((step: RestorationStep) => {
    setState((prev) => ({ ...prev, step }));
  }, []);

  const setColorize = useCallback((colorize: boolean) => {
    setState((prev) => ({ ...prev, colorize }));
  }, []);

  const uploadPhoto = useCallback(async (file: File, colorize: boolean = false) => {
    try {
      setState((prev) => ({ 
        ...prev, 
        step: "processing", 
        progress: 0,
        error: null,
        originalImageUrl: URL.createObjectURL(file),
        colorize,
      }));

      // Upload original to storage
      const originalPath = `original/${state.sessionId}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(originalPath, file, { upsert: true });

      if (uploadError) throw new Error("Failed to upload photo");

      // Create restoration record (no AI call yet — payment first)
      const { data: restoration, error: insertError } = await supabase
        .from("photo_restorations")
        .insert({
          session_id: state.sessionId,
          original_image_path: originalPath,
          status: "pending_payment",
          user_id: (await supabase.auth.getUser()).data.user?.id || null,
        })
        .select()
        .single();

      if (insertError || !restoration) throw new Error("Failed to create restoration");

      // Go directly to payment step (no AI generation yet)
      setState((prev) => ({
        ...prev,
        restorationId: restoration.id,
        step: "comparison",
        progress: 100,
      }));

    } catch (error) {
      console.error("Upload error:", error);
      setState((prev) => ({
        ...prev,
        step: "upload",
        error: error instanceof Error ? error.message : "Something went wrong",
      }));
    }
  }, [state.sessionId, state.colorize]);

  const processPayment = useCallback(async (promoCode?: string, depositMethod?: string, subscriptionPlanId?: string) => {
    if (!state.restorationId) return;

    try {
      const { data: result, error } = await supabase.functions.invoke(
        "process-payment",
        {
          body: { restorationId: state.restorationId, promoCode, depositMethod, subscriptionPlanId },
        }
      );

      if (error || !result?.success) {
        throw new Error(result?.error || "Payment failed");
      }

      if (result.status === "completed" && result.downloadUrls) {
        // Subscription or instant payment
        setState((prev) => ({
          ...prev,
          step: "success",
          paymentStatus: "completed",
          paymentId: result.paymentId,
          downloadUrls: {
            png: result.downloadUrls.png,
            pdf: result.downloadUrls.pdf,
          },
        }));
      } else {
        // Deposit pending validation
        setState((prev) => ({
          ...prev,
          paymentStatus: "pending",
          paymentId: result.paymentId,
        }));
      }

    } catch (error) {
      console.error("Payment error:", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Payment failed",
      }));
    }
  }, [state.restorationId]);

  const checkPaymentStatus = useCallback(async () => {
    if (!state.paymentId) return;

    try {
      const { data: payment } = await supabase
        .from("payments")
        .select("status")
        .eq("id", state.paymentId)
        .single();

      if (payment?.status === "completed") {
        // Payment validated — check if restoration is done
        const { data: restoration } = await supabase
          .from("photo_restorations")
          .select("status, restored_image_path")
          .eq("id", state.restorationId!)
          .single();

        if (restoration?.status === "completed" && restoration.restored_image_path) {
          const { data: pngUrl } = await supabase.storage
            .from("photos")
            .createSignedUrl(restoration.restored_image_path, 3600);

          setState((prev) => ({
            ...prev,
            step: "success",
            paymentStatus: "completed",
            restoredImageUrl: pngUrl?.signedUrl || null,
            downloadUrls: {
              png: pngUrl?.signedUrl || null,
              pdf: pngUrl?.signedUrl || null,
            },
          }));
        }
        // If restoration is still processing, keep polling
      } else if (payment?.status === "rejected") {
        setState((prev) => ({
          ...prev,
          paymentStatus: "idle",
          paymentId: null,
          error: "Votre dépôt a été rejeté. Veuillez réessayer.",
        }));
      }
    } catch (error) {
      console.error("Check payment status error:", error);
    }
  }, [state.paymentId, state.restorationId]);

  const downloadFile = useCallback((type: "png" | "pdf") => {
    const url = state.downloadUrls[type];
    if (url) {
      const link = document.createElement("a");
      link.href = url;
      link.download = `restored-photo.${type}`;
      link.click();
    }
  }, [state.downloadUrls]);

  const reset = useCallback(() => {
    setState({
      step: "upload",
      restorationId: null,
      sessionId: getSessionId(),
      originalImageUrl: null,
      previewImageUrl: null,
      restoredImageUrl: null,
      downloadUrls: { png: null, pdf: null },
      progress: 0,
      error: null,
      colorize: false,
      paymentStatus: "idle",
      paymentId: null,
    });
  }, []);

  return (
    <RestorationContext.Provider
      value={{
        ...state,
        uploadPhoto,
        processPayment,
        checkPaymentStatus,
        downloadFile,
        reset,
        setStep,
        setColorize,
      }}
    >
      {children}
    </RestorationContext.Provider>
  );
}

export function useRestoration() {
  const context = useContext(RestorationContext);
  if (!context) {
    throw new Error("useRestoration must be used within RestorationProvider");
  }
  return context;
}
