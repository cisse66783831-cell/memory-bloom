import { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from "react";
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
  loadExistingRestoration: (id: string, originalUrl: string, previewUrl: string) => void;
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

  // Refs to track polling state without re-renders
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);
  const POLL_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  // ============================================================
  // Non-blocking polling via useEffect — survives re-renders
  // ============================================================
  useEffect(() => {
    if (state.step !== "processing" || !state.restorationId) return;

    pollStartRef.current = Date.now();

    pollIntervalRef.current = setInterval(async () => {
      // Timeout check
      if (Date.now() - pollStartRef.current > POLL_TIMEOUT) {
        clearInterval(pollIntervalRef.current!);
        setState((prev) => ({
          ...prev,
          step: "upload",
          error: "La génération a pris trop de temps. Veuillez réessayer.",
        }));
        return;
      }

      try {
        const { data: dbRestoration } = await supabase
          .from("photo_restorations")
          .select("status, preview_image_path, restored_image_path, used_model_id")
          .eq("id", state.restorationId!)
          .single();

        if (dbRestoration?.status === "failed") {
          clearInterval(pollIntervalRef.current!);
          setState((prev) => ({
            ...prev,
            step: "upload",
            error: "La restauration a échoué. Veuillez réessayer.",
          }));
          return;
        }

        if (
          (dbRestoration?.status === "preview_ready" || dbRestoration?.status === "completed") &&
          (dbRestoration.preview_image_path || dbRestoration.restored_image_path)
        ) {
          clearInterval(pollIntervalRef.current!);
          // Stop progress animation
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

          const imagePath = dbRestoration.preview_image_path || dbRestoration.restored_image_path;
          const { data: signed } = await supabase.storage
            .from("photos")
            .createSignedUrl(imagePath!, 3600);

          const previewUrl = signed?.signedUrl || null;

          if (!previewUrl) {
            setState((prev) => ({
              ...prev,
              step: "upload",
              error: "Impossible de charger l'aperçu. Veuillez réessayer.",
            }));
            return;
          }

          setState((prev) => ({
            ...prev,
            step: "comparison",
            progress: 100,
            previewImageUrl: previewUrl,
            restoredImageUrl: previewUrl,
            modelUsed: dbRestoration.used_model_id || prev.modelUsed,
          }));
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    }, 3000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [state.step, state.restorationId]);

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

      // Clear any previous polling
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

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
        restorationId: null,
        previewImageUrl: null,
        restoredImageUrl: null,
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

      // Save restorationId — this triggers the useEffect poll
      setState((prev) => ({ ...prev, restorationId: restoration.id, progress: 10 }));

      // Start fake progress animation
      progressIntervalRef.current = setInterval(() => {
        setState((prev) => {
          if (prev.progress >= 85) {
            clearInterval(progressIntervalRef.current!);
            return prev;
          }
          return { ...prev, progress: prev.progress + Math.random() * 8 };
        });
      }, 1500);

      // Call restore-photo — returns immediately with predictionId
      const { data: result, error: restoreError } = await supabase.functions.invoke(
        "restore-photo",
        {
          body: {
            restorationId: restoration.id,
            imageBase64: base64,
            colorize,
            aspectRatio: currentFormat,
            trialNumber: 1,
            sessionId: state.sessionId,
          },
        }
      );

      if (restoreError) {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        throw new Error("Une erreur est survenue lors de la restauration. Veuillez réessayer.");
      }

      if (!result?.success) {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        if (result?.error === "LIMIT_REACHED") {
          throw new Error(result?.message || "Vous avez atteint la limite de 2 restaurations gratuites. Veuillez payer une restauration existante avant d'en lancer une nouvelle.");
        }
        throw new Error(result?.message || result?.error || "Une erreur est survenue lors de la restauration. Veuillez réessayer.");
      }

      // useEffect poll takes over from here — no blocking while loop

    } catch (error) {
      console.error("Upload error:", error);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
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

    progressIntervalRef.current = setInterval(() => {
      setState((prev) => {
        if (prev.progress >= 80) { clearInterval(progressIntervalRef.current!); return prev; }
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

      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

      if (error || !result?.success) throw new Error(result?.error || "Retry failed");

      // The useEffect poll will detect preview_ready and transition to comparison
      // If result already contains previewUrl (sync mode), use it directly
      if (result.previewUrl) {
        setState((prev) => ({
          ...prev,
          step: "comparison",
          progress: 100,
          previewImageUrl: result.previewUrl,
          restoredImageUrl: result.previewUrl,
          modelUsed: result.modelUsed || null,
        }));
      }
    } catch (error) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
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
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
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

  const loadExistingRestoration = useCallback((id: string, originalUrl: string, previewUrl: string) => {
    setState((prev) => ({
      ...prev,
      restorationId: id,
      originalImageUrl: originalUrl,
      previewImageUrl: previewUrl,
      restoredImageUrl: previewUrl,
      step: "comparison" as RestorationStep,
    }));
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
        loadExistingRestoration,
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
