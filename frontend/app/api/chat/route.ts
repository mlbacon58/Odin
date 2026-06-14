import { createLocalEmbedding } from "@/lib/local-embeddings";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function searchRelevantChunks(
  message: string,
  userId: string,
  collectionId?: string | null,
  documentIds?: string[]
) {
  const queryEmbedding = await createLocalEmbedding(message);

  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: queryEmbedding,
    match_user_id: userId,
    match_collection_id: collectionId || null,
    match_document_ids:
      documentIds && documentIds.length > 0 ? documentIds : null,
    match_count: 5,
  });

  if (error) throw error;

  return data || [];
}

export async function POST(req: Request) {
  try {
    const {
      message,
      conversationId,
      userId,
      collectionId,
      documentIds,
    } = await req.json();

    let activeConversationId = conversationId;

    if (!activeConversationId) {
      const { data: conversation, error } = await supabase
        .from("conversations")
        .insert({
          title: message.substring(0, 60),
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      activeConversationId = conversation.id;
    }

    await supabase.from("messages").insert({
      conversation_id: activeConversationId,
      role: "user",
      content: message,
    });

    const chunks = await searchRelevantChunks(
      message,
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
You are an engineering assistant.

Use the document context below if it is relevant.
When you use document context, cite the source filename in your answer.
If the document context does not contain the answer, say so clearly.

DOCUMENT CONTEXT:
${context || "No relevant document context found."}

USER QUESTION:
${message}
`;

const ollamaRes = await fetch(
  `${process.env.LOCAL_LLM_URL || "http://localhost:11434"}/api/chat`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.LOCAL_LLM_MODEL || "llama3.1:8b",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      stream: false,
    }),
  }
);

if (!ollamaRes.ok) {
  const errorText = await ollamaRes.text();
  throw new Error(`Ollama error: ${errorText}`);
}

const ollamaData = await ollamaRes.json();
const reply =
  ollamaData.message?.content || "No local model response.";

await supabase.from("messages").insert({
  conversation_id: activeConversationId,
  role: "assistant",
  content: reply,
});

    return Response.json({
      reply,
      conversationId: activeConversationId,
      sources: chunks,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Failed to search documents or get response." },
      { status: 500 }
    );
  }
}