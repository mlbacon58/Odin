import { createLocalEmbedding } from "@/lib/local-embeddings";
import { query } from "@/lib/postgres";

const LOCAL_USER_ID =
  process.env.ODIN_LOCAL_USER_ID ||
  "55e8e5f6-1c1f-4e5f-a931-60b54918f56f";

async function searchRelevantChunks(
  message: string,
  userId: string,
  collectionId?: string | null,
  documentIds?: string[]
) {
  const queryEmbedding = await createLocalEmbedding(message);

  const result = await query(
    `
    select *
    from match_document_chunks(
      $1::vector,
      $2::uuid,
      $3::uuid,
      $4::uuid[],
      $5::int
    )
    `,
    [
      `[${queryEmbedding.join(",")}]`,
      userId,
      collectionId || null,
      documentIds && documentIds.length > 0 ? documentIds : null,
      5,
    ]
  );

  return result.rows || [];
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
      message,
      conversationId,
      userId,
      collectionId,
      documentIds,
    } = await req.json();

    if (!message || !String(message).trim()) {
      return Response.json({ error: "Missing message." }, { status: 400 });
    }

    const activeUserId = userId || LOCAL_USER_ID;

    let activeConversationId = conversationId;

    if (!activeConversationId) {
      const conversationResult = await query(
        `
        insert into conversations (title, user_id)
        values ($1, $2)
        returning id
        `,
        [String(message).substring(0, 60), activeUserId]
      );

      activeConversationId = conversationResult.rows[0].id;
    }

    await query(
      `
      insert into messages (conversation_id, role, content)
      values ($1, $2, $3)
      `,
      [activeConversationId, "user", message]
    );

    const chunks = await searchRelevantChunks(
      message,
      activeUserId,
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

Use only the document context below when answering document-specific questions.
When you use document context, cite the source filename in your answer.
If the document context does not contain the answer, say so clearly.

DOCUMENT CONTEXT:
${context || "No relevant document context found."}

USER QUESTION:
${message}
`;

    const reply = await generateWithLocalLlm(prompt);

    await query(
      `
      insert into messages (conversation_id, role, content)
      values ($1, $2, $3)
      `,
      [activeConversationId, "assistant", reply]
    );

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