import { createClient } from "@supabase/supabase-js";
import { createLocalEmbedding } from "@/lib/local-embeddings";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { documentId } = await req.json();

    if (!documentId) {
      return Response.json(
        { error: "Missing documentId." },
        { status: 400 }
      );
    }

    const { data: chunks, error: chunksError } = await supabase
      .from("document_chunks")
      .select("*")
      .eq("document_id", documentId)
      .order("chunk_index", { ascending: true });

    if (chunksError) throw chunksError;

    if (!chunks || chunks.length === 0) {
      return Response.json(
        { error: "No chunks found for this document." },
        { status: 400 }
      );
    }

    for (const chunk of chunks) {
      const embedding = await createLocalEmbedding(chunk.content);

      const { error: updateError } = await supabase
        .from("document_chunks")
        .update({ embedding })
        .eq("id", chunk.id);

      if (updateError) throw updateError;
    }

    await supabase
      .from("documents")
      .update({ status: "embedded" })
      .eq("id", documentId);

    return Response.json({
      message: "Embeddings created successfully.",
      chunks: chunks.length,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Failed to create embeddings." },
      { status: 500 }
    );
  }
}