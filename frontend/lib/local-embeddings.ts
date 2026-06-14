export async function createLocalEmbedding(input: string) {
  const res = await fetch(
    `${process.env.LOCAL_EMBEDDING_URL || "http://localhost:11434"}/api/embeddings`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.LOCAL_EMBEDDING_MODEL || "nomic-embed-text",
        prompt: input,
      }),
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Local embedding error: ${errorText}`);
  }

  const data = await res.json();

  if (!data.embedding) {
    throw new Error("Local embedding response did not include an embedding.");
  }

  return data.embedding;
}