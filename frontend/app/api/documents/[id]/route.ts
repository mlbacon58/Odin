import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: document, error: findError } = await supabase
      .from("documents")
      .select("id, file_path")
      .eq("id", id)
      .single();

    if (findError) throw findError;

    await supabase.from("document_chunks").delete().eq("document_id", id);

    const { error: storageError } = await supabase.storage
      .from("documents")
      .remove([document.file_path]);

    if (storageError) throw storageError;

    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    return Response.json({
      message: "Document deleted successfully.",
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Failed to delete document." },
      { status: 500 }
    );
  }
}