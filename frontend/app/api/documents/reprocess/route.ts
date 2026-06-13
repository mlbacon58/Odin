import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { documentId } = await req.json();

    if (!documentId) {
      return Response.json({ error: "Missing documentId." }, { status: 400 });
    }

    await supabase
      .from("documents")
      .update({ status: "processing" })
      .eq("id", documentId);

    const baseUrl = new URL(req.url).origin;

    const processRes = await fetch(`${baseUrl}/api/documents/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ documentId }),
    });

    const processData = await processRes.json();

    if (!processRes.ok) {
      await supabase
        .from("documents")
        .update({ status: "failed" })
        .eq("id", documentId);

      return Response.json(
        { error: processData.error || "Processing failed." },
        { status: 500 }
      );
    }

    await supabase
      .from("documents")
      .update({ status: "embedding" })
      .eq("id", documentId);

    const embedRes = await fetch(`${baseUrl}/api/documents/embed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ documentId }),
    });

    const embedData = await embedRes.json();

    if (!embedRes.ok) {
      await supabase
        .from("documents")
        .update({ status: "failed" })
        .eq("id", documentId);

      return Response.json(
        { error: embedData.error || "Embedding failed." },
        { status: 500 }
      );
    }

    await supabase
      .from("documents")
      .update({ status: "ready" })
      .eq("id", documentId);

    return Response.json({
      message: "Document reprocessed and embedded successfully.",
      chunks: processData.chunks,
      embedded: embedData.chunks,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Failed to reprocess document." },
      { status: 500 }
    );
  }
}