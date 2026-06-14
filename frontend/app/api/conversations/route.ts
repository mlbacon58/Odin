import { query } from "@/lib/postgres";

const LOCAL_USER_ID =
  process.env.ODIN_LOCAL_USER_ID ||
  "55e8e5f6-1c1f-4e5f-a931-60b54918f56f";

export async function GET() {
  try {
    const result = await query(
      `
      select
        id,
        title,
        created_at
      from conversations
      where user_id = $1
      order by created_at desc
      `,
      [LOCAL_USER_ID]
    );

    return Response.json(result.rows);
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Failed to load conversations." },
      { status: 500 }
    );
  }
}