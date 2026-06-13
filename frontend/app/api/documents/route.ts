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

      return {
        id: doc.id,
        file_name: doc.file_name,
        file_type: doc.file_type,
        status: doc.status,
        created_at: doc.created_at,
        collection_id: doc.collection_id,
        chunk_count: chunks.length,
        embedded_count: embeddedChunks.length,
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