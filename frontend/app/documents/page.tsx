"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

export default function DocumentsPage() {
  const supabase = createClient();

  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");

  async function uploadFile() {
    if (!file) {
      setStatus("Choose a file first.");
      return;
    }

    setStatus("Checking user...");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setStatus("You must be signed in before uploading.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", user.id);

    setStatus("Uploading...");

    const res = await fetch("/api/documents/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus(data.error || "Upload failed.");
      return;
    }

    setStatus("Upload complete.");
    setFile(null);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Documents</h1>

        <p className="text-slate-300 mb-6">
          Upload procedures, manuals, technical specifications, or training documents.
        </p>

        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
          <input
            type="file"
            className="mb-4"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          <button
            onClick={uploadFile}
            className="block bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-lg"
          >
            Upload Document
          </button>

          {status && <p className="mt-4 text-slate-300">{status}</p>}
        </div>
      </div>
    </main>
  );
}