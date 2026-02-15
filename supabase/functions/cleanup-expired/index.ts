import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const hours72Ago = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();
    const days30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Get unpaid restorations older than 72h
    const { data: unpaid, error: e1 } = await supabase
      .from("photo_restorations")
      .select("id, original_image_path, preview_image_path, restored_image_path")
      .neq("status", "completed")
      .lt("created_at", hours72Ago);

    // 2. Get paid restorations older than 30 days
    const { data: paid, error: e2 } = await supabase
      .from("photo_restorations")
      .select("id, original_image_path, preview_image_path, restored_image_path")
      .eq("status", "completed")
      .lt("created_at", days30Ago);

    if (e1 || e2) {
      throw new Error(`Query error: ${e1?.message || e2?.message}`);
    }

    const toDelete = [...(unpaid || []), ...(paid || [])];
    let deletedFiles = 0;
    let deletedRows = 0;

    for (const row of toDelete) {
      // Delete storage files
      const paths = [row.original_image_path, row.preview_image_path, row.restored_image_path].filter(Boolean) as string[];
      if (paths.length > 0) {
        const { error: storageErr } = await supabase.storage.from("photos").remove(paths);
        if (!storageErr) deletedFiles += paths.length;
      }

      // Delete DB row
      const { error: delErr } = await supabase
        .from("photo_restorations")
        .delete()
        .eq("id", row.id);
      if (!delErr) deletedRows++;
    }

    const result = { deletedRows, deletedFiles, processed: toDelete.length };
    console.log("Cleanup result:", result);

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Cleanup error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
