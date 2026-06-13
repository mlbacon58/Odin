import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;
    const collectionId = formData.get("collectionId") as string | null;

    if (!file) {
      return Response.json({ error: "No file uploaded." }, { status: 400 });
    }

    if (!userId) {
      return Response.json({ error: "Missing user ID." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const safeFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const filePath = `${userId}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw uploadError;
    }

    const { data: document, error: dbError } = await supabase
      .from("documents")
      .insert({
        user_id: userId,
        collection_id: collectionId || null,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        status: "uploaded",
    })
      .select()
      .single();

    if (dbError) {
      console.error("Database insert error:", dbError);
      throw dbError;
    }

    const baseUrl = new URL(req.url).origin;

const reprocessRes = await fetch(`${baseUrl}/api/documents/reprocess`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    documentId: document.id,
  }),
});

const reprocessData = await reprocessRes.json();

if (!reprocessRes.ok) {
  console.error("Auto processing error:", reprocessData);

  return Response.json({
    message: "File uploaded, but automatic processing failed.",
    document,
    processingError: reprocessData.error || "Auto processing failed.",
  });
}

return Response.json({
  message: "File uploaded and processed successfully.",
  document,
  chunks: reprocessData.chunks,
  embedded: reprocessData.embedded,
});
  } catch (error) {
    console.error("Upload route error:", error);

    return Response.json(
      { error: "Failed to upload document." },
      { status: 500 }
    );
  }
}