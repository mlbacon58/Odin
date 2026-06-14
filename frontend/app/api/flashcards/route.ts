import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function retrieveFlashcardContext(
  topic: string,
  userId: string,
  collectionId?: string | null,
  documentIds?: string[]
) {
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: topic,
  });

  const queryEmbedding = embeddingResponse.data[0].embedding;

  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: queryEmbedding,
    match_user_id: userId,
    match_collection_id: collectionId || null,
    match_document_ids:
      documentIds && documentIds.length > 0 ? documentIds : null,
    match_count: 10,
  });

  if (error) throw error;

  return data || [];
}

export async function POST(req: Request) {
  try {
    const {
      topic,
      cardCount,
      difficulty,
      userId,
      collectionId,
      documentIds,
    } = await req.json();

    if (!topic) {
      return Response.json({ error: "Missing topic." }, { status: 400 });
    }

    if (!userId) {
      return Response.json({ error: "Missing userId." }, { status: 400 });
    }

    const count = Number(cardCount || 20);

    const chunks = await retrieveFlashcardContext(
      topic,
      userId,
      collectionId,
      documentIds
    );

    const context = chunks
      .map((chunk: any, index: number) => {
        return `Source ${index + 1} (${chunk.file_name}):\n${chunk.content}`;
      })
      .join("\n\n---\n\n");

    const prompt = `
You are a nuclear engineering training assistant.

Create ${count} study flashcards.

Topic:
${topic}

Difficulty:
${difficulty || "intermediate"}

Use the document context below when relevant.
If the context is insufficient, say that briefly before the flashcards.
Cite source filenames where helpful.

DOCUMENT CONTEXT:
${context || "No relevant document context found."}

Required format:

# Flashcards

1. Front: ...
   Back: ...

2. Front: ...
   Back: ...

# Sources Used
- filename
`;

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    return Response.json({
      flashcards: response.output_text,
      sources: chunks,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Failed to generate flashcards." },
      { status: 500 }
    );
  }
}