export async function POST(req: Request) {
  try {
    const { documentId } = await req.json();

    if (!documentId) {
      return Response.json({ error: "Missing documentId." }, { status: 400 });
    }

    const baseUrl = new URL(req.url).origin;

    const processRes = await fetch(`${baseUrl}/api/documents/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ documentId }),
    });

    const processData = await processRes.json();

    if (!processRes.ok) {
      return Response.json(
        {
          error: processData.error || "Processing failed.",
        },
        { status: 500 }
      );
    }

    const embedRes = await fetch(`${baseUrl}/api/documents/embed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ documentId }),
    });

    const embedData = await embedRes.json();

    if (!embedRes.ok) {
      return Response.json(
        {
          error: embedData.error || "Embedding failed.",
        },
        { status: 500 }
      );
    }

    return Response.json({
      message: "Document reprocessed and embedded successfully.",
      chunks: processData.chunks,
      embedded: embedData.chunks,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Failed to reprocess document." },
      { status: 500 }
    );
  }
}