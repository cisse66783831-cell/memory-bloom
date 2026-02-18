import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type RestorationStep = "upload" | "processing" | "comparison" | "success" | "upsell";

export type OutputFormat = "match_input_image" | "1:1" | "3:4" | "4:3" | "9:16" | "16:9";

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
  outputFormat: OutputFormat;
  trialCount: number;
  userRating: number | null;
  modelUsed: string | null;
}

interface RestorationContextType extends RestorationState {
  uploadPhoto: (file: File, colorize?: boolean, outputFormat?: OutputFormat) => Promise<void>;
  retryWithNewModel: () => Promise<void>;
  submitRating: (rating: number) => Promise<void>;
  processPayment: (promoCode?: string, depositMethod?: string, subscriptionPlanId?: string, senderPhone?: string) => Promise<void>;
  checkPaymentStatus: () => Promise<void>;
  downloadFile: (type: "png" | "pdf") => void;
  reset: () => void;
  setStep: (step: RestorationStep) => void;
  setColorize: (colorize: boolean) => void;
  setOutputFormat: (fmt: OutputFormat) => void;
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
    outputFormat: "match_input_image",
    trialCount: 1,
    userRating: null,
    modelUsed: null,
  });

  const setStep = useCallback((step: RestorationStep) => {
    setState((prev) => ({ ...prev, step }));
  }, []);

  const setColorize = useCallback((colorize: boolean) => {
    setState((prev) => ({ ...prev, colorize }));
  }, []);

  const setOutputFormat = useCallback((outputFormat: OutputFormat) => {
    setState((prev) => ({ ...prev, outputFormat }));
  }, []);

  const uploadPhoto = useCallback(async (file: File, colorize: boolean = false, outputFormat?: OutputFormat) => {
    try {
      const currentFormat = outputFormat ?? state.outputFormat;
      setState((prev) => ({ 
        ...prev, 
        step: "processing", 
        progress: 0,
        error: null,
        originalImageUrl: URL.createObjectURL(file),
        colorize,
        trialCount: 1,
        userRating: null,
        modelUsed: null,
      }));

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const originalPath = `original/${state.sessionId}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(originalPath, file, { upsert: true });

      if (uploadError) throw new Error("Failed to upload photo");

      const { data: restoration, error: insertError } = await supabase
        .from("photo_restorations")
        .insert({
          session_id: state.sessionId,
          original_image_path: originalPath,
          status: "pending",
          user_id: (await supabase.auth.getUser()).data.user?.id || null,
        })
        .select()
        .single();

      if (insertError || !restoration) throw new Error("Failed to create restoration");

      setState((prev) => ({ ...prev, restorationId: restoration.id, progress: 10 }));

      const progressInterval = setInterval(() => {
        setState((prev) => {
          if (prev.progress >= 80) { clearInterval(progressInterval); return prev; }
          return { ...prev, progress: prev.progress + Math.random() * 15 };
        });
      }, 800);

      const { data: result, error: restoreError } = await supabase.functions.invoke(
        "restore-photo",
        {
          body: {
            restorationId: restoration.id,
            imageBase64: base64,
            colorize,
            aspectRatio: currentFormat,
            trialNumber: 1,
          },
        }
      );

      clearInterval(progressInterval);

      if (restoreError || !result?.success) {
        throw new Error(result?.error || "Restoration failed");
      }

      // restore-photo is now async (webhook-based) — poll until preview_ready
      // Progress continues while we wait
      const pollInterval = setInterval(() => {
        setState((prev) => {
          if (prev.progress >= 95) return prev;
          return { ...prev, progress: Math.min(prev.progress + 3, 95) };
        });
      }, 2000);

      let previewUrl: string | null = null;
      let modelUsed: string | null = result.modelUsed || null;
      const maxWait = 180_000; // 3 minutes
      const pollStart = Date.now();

      while (!previewUrl && Date.now() - pollStart < maxWait) {
        await new Promise((r) => setTimeout(r, 3000));

        const { data: dbRestoration } = await supabase
          .from("photo_restorations")
          .select("status, preview_image_path, used_model_id")
          .eq("id", restoration.id)
          .single();

        if (dbRestoration?.status === "failed") {
          clearInterval(pollInterval);
          throw new Error("La restauration a échoué. Veuillez réessayer.");
        }

        if (dbRestoration?.status === "preview_ready" && dbRestoration.preview_image_path) {
          // Generate signed URL
          const { data: signed } = await supabase.storage
            .from("photos")
            .createSignedUrl(dbRestoration.preview_image_path, 3600);
          previewUrl = signed?.signedUrl || null;
          modelUsed = dbRestoration.used_model_id || modelUsed;
        }
      }

      clearInterval(pollInterval);

      if (!previewUrl) {
        throw new Error("La génération a pris trop de temps. Veuillez réessayer.");
      }

      setState((prev) => ({
        ...prev,
        step: "comparison",
        progress: 100,
        previewImageUrl: previewUrl,
        restoredImageUrl: previewUrl,
        modelUsed,
      }));

    } catch (error) {
      console.error("Upload error:", error);
      setState((prev) => ({
        ...prev,
        step: "upload",
        error: error instanceof Error ? error.message : "Something went wrong",
      }));
    }
  }, [state.sessionId, state.outputFormat]);

  const submitRating = useCallback(async (rating: number) => {
    if (!state.restorationId) return;
    setState((prev) => ({ ...prev, userRating: rating }));
    
    await supabase
      .from("photo_restorations")
      .update({ user_rating: rating })
      .eq("id", state.restorationId);
  }, [state.restorationId]);

  const retryWithNewModel = useCallback(async () => {
    if (!state.restorationId || state.trialCount >= 3) return;

    const newTrial = state.trialCount + 1;
    setState((prev) => ({ ...prev, step: "processing", progress: 0, trialCount: newTrial, userRating: null }));

    const progressInterval = setInterval(() => {
      setState((prev) => {
        if (prev.progress >= 80) { clearInterval(progressInterval); return prev; }
        return { ...prev, progress: prev.progress + Math.random() * 15 };
      });
    }, 800);

    try {
      const { data: result, error } = await supabase.functions.invoke("restore-photo", {
        body: {
          restorationId: state.restorationId,
          colorize: state.colorize,
          previewMode: true,
          trialNumber: newTrial,
        },
      });

      clearInterval(progressInterval);

      if (error || !result?.success) throw new Error(result?.error || "Retry failed");

      setState((prev) => ({
        ...prev,
        step: "comparison",
        progress: 100,
        previewImageUrl: result.previewUrl,
        restoredImageUrl: result.previewUrl,
        modelUsed: result.modelUsed || null,
      }));
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Retry error:", error);
      setState((prev) => ({
        ...prev,
        step: "comparison",
        error: error instanceof Error ? error.message : "Retry failed",
      }));
    }
  }, [state.restorationId, state.trialCount, state.colorize]);

  const processPayment = useCallback(async (promoCode?: string, depositMethod?: string, subscriptionPlanId?: string, senderPhone?: string) => {
    if (!state.restorationId) return;

    try {
      const { data: result, error } = await supabase.functions.invoke(
        "process-payment",
        {
          body: {
            restorationId: state.restorationId,
            promoCode,
            depositMethod,
            subscriptionPlanId,
            outputFormat: state.outputFormat,
            senderPhone,
          },
        }
      );

      if (error || !result?.success) {
        throw new Error(result?.error || "Payment failed");
      }

      if (result.status === "completed" && result.downloadUrls) {
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
  }, [state.restorationId, state.outputFormat]);

  const checkPaymentStatus = useCallback(async () => {
    if (!state.paymentId) return;

    try {
      const { data: payment } = await supabase
        .from("payments")
        .select("status")
        .eq("id", state.paymentId)
        .single();

      if (payment?.status === "completed") {
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
      outputFormat: "match_input_image",
      trialCount: 1,
      userRating: null,
      modelUsed: null,
    });
  }, []);

  return (
    <RestorationContext.Provider
      value={{
        ...state,
        uploadPhoto,
        retryWithNewModel,
        submitRating,
        processPayment,
        checkPaymentStatus,
        downloadFile,
        reset,
        setStep,
        setColorize,
        setOutputFormat,
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
