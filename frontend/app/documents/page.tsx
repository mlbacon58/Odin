"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

type DocumentRow = {
  id: string;
  file_name: string;
  file_type: string | null;
  status: string;
  created_at: string;
  chunk_count: number;
  embedded_count: number;
};

export default function DocumentsPage() {
  const supabase = createClient();

  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [documents, setDocuments] = useState<DocumentRow[]>([]);

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    const res = await fetch("/api/documents");
    const data = await res.json();

    if (Array.isArray(data)) {
      setDocuments(data);
    }
  }

  async function uploadFile() {
    if (!file) {
      setStatus("No file selected. Click Choose File first.");
      return;
    }

    setStatus("Checking sign-in...");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setStatus("You must be signed in before uploading.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", user.id);

    setStatus("Uploading file...");

    const res = await fetch("/api/documents/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus(data.error || "Upload failed.");
      return;
    }

    setStatus(`Upload complete: ${data.document?.file_name || file.name}`);
    setFile(null);
    await loadDocuments();
  }

  async function processDocument(id: string) {
    setStatus("Processing document...");

    const res = await fetch("/api/documents/process", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ documentId: id }),
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus(data.error || "Processing failed.");
      return;
    }

    setStatus(`Processing complete. Chunks: ${data.chunks}`);
    await loadDocuments();
  }

  async function embedDocument(id: string) {
    setStatus("Creating embeddings...");

    const res = await fetch("/api/documents/embed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ documentId: id }),
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus(data.error || "Embedding failed.");
      return;
    }

    setStatus(`Embeddings complete. Chunks: ${data.chunks}`);
    await loadDocuments();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Documents</h1>

        <p className="text-slate-300 mb-6">
          Upload, process, and embed documents for the Odin knowledge base.
        </p>

        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 mb-8">
          <label className="block mb-3 text-slate-300">
            Select a document from your computer:
          </label>

          <input
            type="file"
            className="block w-full mb-4 text-white bg-slate-800 border border-slate-600 rounded p-3"
            onChange={(e) => {
              const selectedFile = e.target.files?.[0] || null;
              setFile(selectedFile);

              if (selectedFile) {
                setStatus(`File selected: ${selectedFile.name}`);
              } else {
                setStatus("No file selected.");
              }
            }}
          />

          <button
            type="button"
            onClick={uploadFile}
            className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-lg"
          >
            Upload Document
          </button>

          {status && <p className="mt-4 text-slate-300">{status}</p>}
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Document Library</h2>

          {documents.length === 0 ? (
            <p className="text-slate-400">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="border border-slate-700 rounded-lg p-4 bg-slate-950"
                >
                  <div className="font-semibold">{doc.file_name}</div>

                  <div className="text-sm text-slate-400 mt-1">
                    Status: {doc.status} | Chunks: {doc.chunk_count} | Embedded:{" "}
                    {doc.embedded_count}
                  </div>

                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => processDocument(doc.id)}
                      className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded"
                    >
                      Process
                    </button>

                    <button
                      onClick={() => embedDocument(doc.id)}
                      className="bg-green-700 hover:bg-green-600 px-4 py-2 rounded"
                    >
                      Embed
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}