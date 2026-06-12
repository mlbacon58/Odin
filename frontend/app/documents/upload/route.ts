import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;

    if (!file) {
      return Response.json({ error: "No file uploaded." }, { status: 400 });
    }

    if (!userId) {
      return Response.json({ error: "Missing user ID." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const safeFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const filePath = `${userId}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: document, error: dbError } = await supabase
      .from("documents")
      .insert({
        user_id: userId,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        status: "uploaded",
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return Response.json({
      document,
      message: "File uploaded successfully.",
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Failed to upload document." },
      { status: 500 }
    );
  }
}