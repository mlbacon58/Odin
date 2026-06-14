import { query } from "@/lib/postgres";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await query(
      `
      select
        id,
        role,
        content,
        created_at
      from messages
      where conversation_id = $1
      order by created_at asc
      `,
      [id]
    );

    return Response.json(result.rows);
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Failed to load messages." },
      { status: 500 }
    );
  }
}