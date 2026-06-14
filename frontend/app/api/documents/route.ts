import { query } from "@/lib/postgres";

const LOCAL_USER_ID =
  process.env.ODIN_LOCAL_USER_ID ||
  "55e8e5f6-1c1f-4e5f-a931-60b54918f56f";

export async function GET() {
  try {
    const result = await query(
      `
      select
        d.id,
        d.file_name,
        d.file_type,
        d.status,
        d.created_at,
        d.collection_id,
        c.name as collection_name,
        count(dc.id)::int as chunk_count,
        count(dc.embedding)::int as embedded_count
      from documents d
      left join collections c
        on c.id = d.collection_id
      left join document_chunks dc
        on dc.document_id = d.id
      where d.user_id = $1
      group by
        d.id,
        d.file_name,
        d.file_type,
        d.status,
        d.created_at,
        d.collection_id,
        c.name
      order by d.created_at desc
      `,
      [LOCAL_USER_ID]
    );

    const documents = result.rows.map((doc: any) => {
      const chunkCount = Number(doc.chunk_count || 0);
      const embeddedCount = Number(doc.embedded_count || 0);

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
        collection_name: doc.collection_name || "Unassigned",
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