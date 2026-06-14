"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

type DocumentRow = {
  id: string;
  file_name: string;
  file_type: string | null;
  status: string;
  created_at: string;
  collection_id?: string | null;
  collection_name?: string;
  chunk_count: number;
  embedded_count: number;
  completion?: number;
  health?: string;
};

type Collection = {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
};

export default function DocumentsPage() {
  const supabase = createClient();

  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [newCollectionName, setNewCollectionName] = useState("");

  useEffect(() => {
    loadDocuments();
    loadCollections();
  }, []);

  async function getUserId() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user?.id || null;
  }

  async function loadDocuments() {
    const res = await fetch("/api/documents");
    const data = await res.json();

    if (Array.isArray(data)) {
      setDocuments(data);
    }
  }

  async function loadCollections() {
    const userId = await getUserId();

    if (!userId) return;

    const res = await fetch(`/api/collections?userId=${userId}`);
    const data = await res.json();

    if (Array.isArray(data)) {
      setCollections(data);
    }
  }

  async function createCollection() {
    const userId = await getUserId();

    if (!userId) {
      setStatus("You must be signed in to create a collection.");
      return;
    }

    if (!newCollectionName.trim()) {
      setStatus("Enter a collection name first.");
      return;
    }

    setStatus("Creating collection...");

    const res = await fetch("/api/collections", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: newCollectionName.trim(),
        userId,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus(data.error || "Failed to create collection.");
      return;
    }

    setNewCollectionName("");
    setSelectedCollectionId(data.id);
    setStatus(`Collection created: ${data.name}`);
    await loadCollections();
  }

  async function uploadFile() {
    if (!file) {
      setStatus("No file selected. Click Choose File first.");
      return;
    }

    setStatus("Checking sign-in...");

    const userId = await getUserId();

    if (!userId) {
      setStatus("You must be signed in before uploading.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId);
    formData.append("collectionId", selectedCollectionId);

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

    if (data.processingError) {
      setStatus(
        `Upload complete, but processing failed: ${data.processingError}`
      );
    } else {
      setStatus(
        `Upload complete and ready: ${data.document?.file_name || file.name}`
      );
    }

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

  async function deleteDocument(id: string) {
    const confirmed = window.confirm(
      "Delete this document, its chunks, embeddings, and stored file?"
    );

    if (!confirmed) return;

    setStatus("Deleting document...");

    const res = await fetch(`/api/documents/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus(data.error || "Delete failed.");
      return;
    }

    setStatus("Document deleted.");
    await loadDocuments();
  }

  function collectionName(id?: string | null) {
    if (!id) return "No collection";

    return (
      collections.find((collection) => collection.id === id)?.name ||
      "Unknown collection"
    );
  }

  async function reprocessDocument(id: string) {
    const confirmed = window.confirm(
      "Reprocess this document and recreate its embeddings?"
    );

    if (!confirmed) return;

    setStatus("Reprocessing and embedding document...");

    const res = await fetch("/api/documents/reprocess", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ documentId: id }),
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus(data.error || "Reprocess failed.");
      return;
    }

    setStatus(
      `Reprocess complete. Chunks: ${data.chunks}, Embedded: ${data.embedded}`
    );

    await loadDocuments();
  }

  function healthBadgeClass(health?: string) {
    if (health === "Ready") {
      return "bg-green-900 text-green-200 border-green-700";
    }

    if (health === "Partially embedded") {
      return "bg-yellow-900 text-yellow-200 border-yellow-700";
    }

    if (health === "Needs embedding") {
      return "bg-orange-900 text-orange-200 border-orange-700";
    }

    return "bg-red-900 text-red-200 border-red-700";
  }

  const totalDocuments = documents.length;
  const readyDocuments = documents.filter((doc) => doc.health === "Ready").length;
  const totalChunks = documents.reduce((sum, doc) => sum + doc.chunk_count, 0);
  const totalEmbedded = documents.reduce(
    (sum, doc) => sum + doc.embedded_count,
    0
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Documents</h1>

        <p className="text-slate-300 mb-6">
          Upload, organize, process, embed, and monitor documents for the Odin
          knowledge base.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            <div className="text-slate-500 text-sm">Documents</div>
            <div className="text-2xl font-bold">{totalDocuments}</div>
          </div>

          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            <div className="text-slate-500 text-sm">Ready</div>
            <div className="text-2xl font-bold">{readyDocuments}</div>
          </div>

          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            <div className="text-slate-500 text-sm">Chunks</div>
            <div className="text-2xl font-bold">{totalChunks}</div>
          </div>

          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            <div className="text-slate-500 text-sm">Embedded</div>
            <div className="text-2xl font-bold">{totalEmbedded}</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Collections</h2>

          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="New collection name"
              className="flex-1 bg-slate-800 border border-slate-600 rounded p-3 text-white"
            />

            <button
              type="button"
              onClick={createCollection}
              className="bg-purple-700 hover:bg-purple-600 px-5 py-3 rounded-lg"
            >
              Create Collection
            </button>
          </div>

          <label className="block mb-3 text-slate-300">
            Select collection for upload:
          </label>

          <select
            value={selectedCollectionId}
            onChange={(e) => setSelectedCollectionId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white"
          >
            <option value="">No collection</option>

            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Upload Document</h2>

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
            <div className="space-y-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="border border-slate-700 rounded-lg p-4 bg-slate-950"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <div className="font-semibold">{doc.file_name}</div>

                      <div className="text-sm text-slate-500 mt-1">
                        Type: {doc.file_type || "unknown"}
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full border text-sm ${healthBadgeClass(
                        doc.health
                      )}`}
                    >
                      {doc.health || "Unknown"}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded p-3">
                      <div className="text-slate-500">Collection</div>
                      <div className="text-slate-200">
                        {doc.collection_name || collectionName(doc.collection_id)}
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-700 rounded p-3">
                      <div className="text-slate-500">Chunk Health</div>
                      <div className="text-slate-200">
                        {doc.embedded_count} / {doc.chunk_count} embedded
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-700 rounded p-3">
                      <div className="text-slate-500">Completion</div>
                      <div className="text-slate-200">
                        {doc.completion ?? 0}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                    <span className="text-slate-400">
                      Status: {doc.status}
                    </span>

                    <span className="text-slate-500">
                      Created: {new Date(doc.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3 mt-4">
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

                    <button
                      onClick={() => reprocessDocument(doc.id)}
                      className="bg-yellow-700 hover:bg-yellow-600 px-4 py-2 rounded"
                    >
                      Reprocess
                    </button>

                    <button
                      onClick={() => deleteDocument(doc.id)}
                      className="bg-red-700 hover:bg-red-600 px-4 py-2 rounded"
                    >
                      Delete
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