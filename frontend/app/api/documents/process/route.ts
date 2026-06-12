import { createClient } from "@supabase/supabase-js"; 
import mammoth from "mammoth"; 
import { PDFParse } from "pdf-parse"; 

const supabase = createClient( 
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
); 

function chunkText(text: string, chunkSize = 1200) { 
  const chunks: string[] = [];
 
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }

  return chunks; 
} 

export async function POST(req: Request) {
  try { 
    const { documentId } = await req.json();

    if (!documentId) {
      return Response.json(
        { error: "Missing documentId." },
        { status: 400 }
  ); 
} 

const { data: document, error: docError } = await supabase
  .from("documents")
  .select("*")
  .eq("id", documentId)
  .single();

 if (docError) throw docError;

 const { data: fileData, error: downloadError } = await supabase.storage
   .from("documents")
   .download(document.file_path);

 if (downloadError) throw downloadError;

 const arrayBuffer = await fileData.arrayBuffer();
 const buffer = Buffer.from(arrayBuffer);

 let text = ""; 

 if (
   document.file_name.toLowerCase().endsWith(".txt") ||
   document.file_name.toLowerCase().endsWith(".md")
 ) {
   text = buffer.toString("utf-8");
 } else if (
   document.file_name.toLowerCase().endsWith(".docx")
 ) {
   const result = await mammoth.extractRawText({
    buffer,
   });
   text = result.value;
 } else if (
   document.file_name.toLowerCase().endsWith(".pdf")
 ) {
   const parser = new PDFParse({
     data: buffer,
   });

 const result = await parser.getText();

 text = result.text;

 await parser.destroy();
} else {
  return Response.json(
    {
     error:
       "Supported file types are .txt, .md, .docx, and .pdf",
    },
    { status: 400 }
  ); 
} 

const chunks = chunkText(text).filter(
  (chunk) => chunk.trim().length > 0
 ); 

if (chunks.length === 0) {
   return Response.json(
     { error: "No text could be extracted." },
     { status: 400 }
 ); 
} 

await supabase
 .from("document_chunks")
 .delete()
 .eq("document_id", document.id); 

const rows = chunks.map((chunk, index) => ({
  document_id: document.id,
  user_id: document.user_id,
  chunk_index: index,
  content: chunk,
}));

const { error: insertError } = await supabase
  .from("document_chunks")
  .insert(rows); 

if (insertError) throw insertError;

await supabase
  .from("documents")
  .update({ status: "processed" })
  .eq("id", document.id); 

return Response.json({
  message: "Document processed successfully.",
  chunks: rows.length,
}); 
} catch (error) {
  console.error(error);

  return Response.json(
    { error: "Failed to process document." },
    { status: 500 }
 );
} 
}