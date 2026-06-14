import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("documents")
      .select(`
        id,
        file_name,
        file_type,
        status,
        created_at,
        collection_id,
        collections (
          name
        ),
        document_chunks (
          id,
          embedding
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const documents = data.map((doc: any) => {
      const chunks = doc.document_chunks || [];

      const embeddedChunks = chunks.filter(
        (chunk: any) => chunk.embedding !== null
      );

      const chunkCount = chunks.length;
      const embeddedCount = embeddedChunks.length;

      const completion =
        chunkCount === 0 ? 0 : Math.round((embeddedCount / chunkCount) * 100);

      let health = "Needs processing";

      if (chunkCount > 0 && embeddedCount === 0) {
        health = "Needs embedding";
      }

      if (chunkCount > 0 && embeddedCount > 0 && embeddedCount < chunkCount) {
        health = "Partially embedded";
      }

      if (chunkCount > 0 && embeddedCount === chunkCount) {
        health = "Ready";
      }

      return {
        id: doc.id,
        file_name: doc.file_name,
        file_type: doc.file_type,
        status: doc.status,
        created_at: doc.created_at,
        collection_id: doc.collection_id,
        collection_name: doc.collections?.name || "Unassigned",
        chunk_count: chunkCount,
        embedded_count: embeddedCount,
        completion,
        health,
      };
    });

    return Response.json(documents);
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Failed to load documents." },
      { status: 500 }
    );
  }
}