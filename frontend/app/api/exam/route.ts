import { createLocalEmbedding } from "@/lib/local-embeddings";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function retrieveExamContext(
  topic: string,
  userId: string,
  collectionId?: string | null,
  documentIds?: string[]
) {
  const queryEmbedding = await createLocalEmbedding(topic);

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

async function generateWithLocalLlm(prompt: string) {
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

  return ollamaData.message?.content || "No local model response.";
}

export async function POST(req: Request) {
  try {
    const {
      topic,
      questionCount,
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

    const count = Number(questionCount || 10);

    const chunks = await retrieveExamContext(
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
You are a nuclear engineering training exam writer.

Create a ${count}-question exam.

Topic:
${topic}

Difficulty:
${difficulty || "intermediate"}

Use the document context below when relevant.
If the context is insufficient, say that in a short note before the exam.
Cite source filenames where appropriate.

DOCUMENT CONTEXT:
${context || "No relevant document context found."}

Required format:

# Exam

## Instructions
Brief learner instructions.

## Questions
1. ...
2. ...
3. ...

## Answer Key
1. Correct answer and brief explanation.
2. Correct answer and brief explanation.

## Sources Used
- filename
`;

    const exam = await generateWithLocalLlm(prompt);

    return Response.json({
      exam,
      sources: chunks,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Failed to generate exam." },
      { status: 500 }
    );
  }
}