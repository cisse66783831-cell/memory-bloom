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
}

interface RestorationContextType extends RestorationState {
  uploadPhoto: (file: File, colorize?: boolean) => Promise<void>;
  processPayment: () => Promise<void>;
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

      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Upload original to storage
      const originalPath = `original/${state.sessionId}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(originalPath, file, { upsert: true });

      if (uploadError) throw new Error("Failed to upload photo");

      // Create restoration record
      const { data: restoration, error: insertError } = await supabase
        .from("photo_restorations")
        .insert({
          session_id: state.sessionId,
          original_image_path: originalPath,
          status: "pending",
        })
        .select()
        .single();

      if (insertError || !restoration) throw new Error("Failed to create restoration");

      setState((prev) => ({ ...prev, restorationId: restoration.id, progress: 10 }));

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setState((prev) => {
          if (prev.progress >= 80) {
            clearInterval(progressInterval);
            return prev;
          }
          return { ...prev, progress: prev.progress + Math.random() * 15 };
        });
      }, 800);

      // Call AI restoration with colorize option
      const { data: result, error: restoreError } = await supabase.functions.invoke(
        "restore-photo",
        {
          body: {
            restorationId: restoration.id,
            imageBase64: base64,
            colorize: state.colorize,
          },
        }
      );

      clearInterval(progressInterval);

      if (restoreError || !result?.success) {
        throw new Error(result?.error || "Restoration failed");
      }

      setState((prev) => ({
        ...prev,
        step: "comparison",
        progress: 100,
        previewImageUrl: result.previewBase64,
        restoredImageUrl: result.previewBase64,
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

  const processPayment = useCallback(async () => {
    if (!state.restorationId) return;

    try {
      const { data: result, error } = await supabase.functions.invoke(
        "process-payment",
        {
          body: { restorationId: state.restorationId },
        }
      );

      if (error || !result?.success) {
        throw new Error(result?.error || "Payment failed");
      }

      setState((prev) => ({
        ...prev,
        step: "success",
        downloadUrls: {
          png: result.downloadUrls.png,
          pdf: result.downloadUrls.pdf,
        },
      }));

    } catch (error) {
      console.error("Payment error:", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Payment failed",
      }));
    }
  }, [state.restorationId]);

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
    });
  }, []);

  return (
    <RestorationContext.Provider
      value={{
        ...state,
        uploadPhoto,
        processPayment,
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
