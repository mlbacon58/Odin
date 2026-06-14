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
        name,
        user_id,
        created_at
      from collections
      where user_id = $1
      order by created_at desc
      `,
      [LOCAL_USER_ID]
    );

    return Response.json(result.rows);
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Failed to load collections." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { name } = await req.json();

    if (!name || !String(name).trim()) {
      return Response.json(
        { error: "Missing collection name." },
        { status: 400 }
      );
    }

    const result = await query(
      `
      insert into collections (name, user_id)
      values ($1, $2)
      returning id, name, user_id, created_at
      `,
      [String(name).trim(), LOCAL_USER_ID]
    );

    return Response.json(result.rows[0]);
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Failed to create collection." },
      { status: 500 }
    );
  }
}