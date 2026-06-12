import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { documentId } = await req.json();

    const { data: chunks, error } = await supabase
      .from("document_chunks")
      .select("id, content")
      .eq("document_id", documentId)
      .is("embedding", null)
      .order("chunk_index");

    if (error) throw error;

    if (!chunks || chunks.length === 0) {
      return Response.json({ message: "No chunks need embeddings." });
    }

    for (const chunk of chunks) {
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk.content,
      });

      const embedding = embeddingResponse.data[0].embedding;

      const { error: updateError } = await supabase
        .from("document_chunks")
        .update({ embedding })
        .eq("id", chunk.id);

      if (updateError) throw updateError;
    }

    return Response.json({
      message: "Embeddings created.",
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