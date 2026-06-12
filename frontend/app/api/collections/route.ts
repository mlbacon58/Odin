import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return Response.json({ error: "Missing userId." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("collections")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return Response.json(data);
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
    const { name, userId } = await req.json();

    if (!name || !userId) {
      return Response.json(
        { error: "Missing name or userId." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("collections")
      .insert({
        name,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;

    return Response.json(data);
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Failed to create collection." },
      { status: 500 }
    );
  }
}