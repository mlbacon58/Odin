"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

export default function DocumentsPage() {
  const supabase = createClient();

  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");

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

    setStatus("Upload complete.");
    setFile(null);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Documents</h1>

        <p className="text-slate-300 mb-6">
          Upload a document to begin building the knowledge base.
        </p>

        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
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
      </div>
    </main>
  );
}