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
    const { query, userId, collectionId, documentIds } = await req.json();

    if (!query) {
      return Response.json({ error: "Missing query." }, { status: 400 });
    }

    if (!userId) {
      return Response.json({ error: "Missing userId." }, { status: 400 });
    }

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    const { data, error } = await supabase.rpc("match_document_chunks", {
      query_embedding: queryEmbedding,
      match_user_id: userId,
      match_collection_id: collectionId || null,
      match_document_ids:
        documentIds && documentIds.length > 0 ? documentIds : null,
      match_count: 5,
    });

    if (error) throw error;

    return Response.json({
      results: data,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Failed to search documents." },
      { status: 500 }
    );
  }
}