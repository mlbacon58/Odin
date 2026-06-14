"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

type Source = {
  file_name: string;
  content: string;
  similarity: number;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
};

type Conversation = {
  id: string;
  title: string | null;
  created_at: string;
};

type Collection = {
  id: string;
  name: string;
};

type DocumentRow = {
  id: string;
  file_name: string;
  file_type: string | null;
  status: string;
  created_at: string;
  collection_id: string | null;
  chunk_count: number;
  embedded_count: number;
};

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [examTopic, setExamTopic] = useState("");
  const [questionCount, setQuestionCount] = useState("10");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [exam, setExam] = useState("");
  const [generatingExam, setGeneratingExam] = useState(false);

  useEffect(() => {
    loadConversations();
    loadCollections();
    loadDocuments();
  }, []);

  async function getUserId() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user?.id || null;
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
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

  async function loadDocuments() {
    const res = await fetch("/api/documents");
    const data = await res.json();

    if (Array.isArray(data)) {
      setDocuments(data);
    }
  }

  async function loadConversations() {
    const res = await fetch("/api/conversations");
    const data = await res.json();

    if (Array.isArray(data)) {
      setConversations(data);
    }
  }

  async function loadConversation(id: string) {
    const res = await fetch(`/api/messages/${id}`);
    const data = await res.json();

    if (Array.isArray(data)) {
      setMessages(
        data.map((m: any) => ({
          role: m.role,
          content: m.content,
        }))
      );

      setConversationId(id);
    }
  }

  function startNewChat() {
    setMessages([]);
    setConversationId(null);
    setMessage("");
  }

  function toggleDocument(id: string) {
    setSelectedDocumentIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((docId) => docId !== id);
      }

      return [...prev, id];
    });
  }

  function clearSelectedDocuments() {
    setSelectedDocumentIds([]);
  }

  function filteredDocuments() {
    if (!selectedCollectionId) {
      return documents;
    }

    return documents.filter(
      (doc) => doc.collection_id === selectedCollectionId
    );
  }

  async function generateExam() {
    if (!examTopic.trim()) return;

    const userId = await getUserId();

    setGeneratingExam(true);
    setExam("");

    const res = await fetch("/api/exam", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic: examTopic,
        questionCount,
        difficulty,
        userId,
        collectionId: selectedCollectionId || null,
        documentIds:
          selectedDocumentIds.length > 0 ? selectedDocumentIds : null,
      }),
    });

    const data = await res.json();

    setExam(data.exam || data.error || "No exam generated.");
    setGeneratingExam(false);
  }

  async function sendMessage() {
    if (!message.trim()) return;

    const userId = await getUserId();

    const userMessage: Message = {
      role: "user",
      content: message,
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: userMessage.content,
        conversationId,
        userId,
        collectionId: selectedCollectionId || null,
        documentIds:
          selectedDocumentIds.length > 0 ? selectedDocumentIds : null,
      }),
    });

    const data = await res.json();

    if (data.conversationId) {
      setConversationId(data.conversationId);
    }

    const assistantMessage: Message = {
      role: "assistant",
      content: data.reply || data.error || "No response received.",
      sources: data.sources || [],
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setLoading(false);

    await loadConversations();
  }

  const visibleDocuments = filteredDocuments();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex h-screen">
        <aside className="w-72 border-r border-slate-800 p-4 overflow-y-auto">
          <button
            onClick={startNewChat}
            className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg p-3 mb-4"
          >
            + New Chat
          </button>

          <button
            onClick={signOut}
            className="w-full bg-slate-700 hover:bg-slate-600 rounded-lg p-3 mb-4"
          >
            Sign Out
          </button>

          <div className="space-y-2">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                className={`w-full text-left p-3 rounded-lg hover:bg-slate-800 ${
                  conversationId === conv.id
                    ? "bg-slate-800"
                    : "bg-slate-900"
                }`}
              >
                <div className="truncate">{conv.title || "Untitled Chat"}</div>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">Nuclear AI Platform</h1>

            <p className="text-slate-400 mb-6">
              GPT-powered engineering assistant
            </p>

            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 mb-6">
              <label className="block text-sm text-slate-400 mb-2">
                Knowledge collection
              </label>

              <select
                value={selectedCollectionId}
                onChange={(e) => {
                  setSelectedCollectionId(e.target.value);
                  setSelectedDocumentIds([]);
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"
              >
                <option value="">All documents</option>

                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-slate-400">
                    Specific documents
                  </div>

                  <button
                    type="button"
                    onClick={clearSelectedDocuments}
                    className="text-xs text-blue-300 hover:text-blue-200"
                  >
                    Clear selection
                  </button>
                </div>

                {visibleDocuments.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No documents available for this selection.
                  </p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-700 rounded-lg p-3 bg-slate-950">
                    {visibleDocuments.map((doc) => (
                      <label
                        key={doc.id}
                        className="flex items-center gap-3 text-sm text-slate-300"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDocumentIds.includes(doc.id)}
                          onChange={() => toggleDocument(doc.id)}
                        />

                        <span className="truncate">
                          {doc.file_name} — {doc.status}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                <p className="text-xs text-slate-500 mt-2">
                  If no documents are checked, Odin searches the selected
                  collection or all documents.
                </p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 mb-6">
              <h2 className="text-xl font-bold mb-3">Exam Generator</h2>

              <input
                type="text"
                value={examTopic}
                onChange={(e) => setExamTopic(e.target.value)}
                placeholder="Exam topic, e.g. Reactor kinetics"
                className="w-full mb-3 p-3 rounded-lg bg-slate-800 border border-slate-700 text-white"
              />

              <div className="flex gap-3 mb-3">
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(e.target.value)}
                  className="w-32 p-3 rounded-lg bg-slate-800 border border-slate-700 text-white"
                />

                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="flex-1 p-3 rounded-lg bg-slate-800 border border-slate-700 text-white"
                >
                  <option value="introductory">Introductory</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="SRO-level">SRO-level</option>
                </select>
              </div>

              <button
                onClick={generateExam}
                disabled={generatingExam}
                className="px-5 py-3 rounded-lg bg-purple-700 hover:bg-purple-600 disabled:bg-slate-600"
              >
                {generatingExam ? "Generating..." : "Generate Exam"}
              </button>

              {exam && (
                <div className="mt-4 p-4 rounded-lg bg-slate-950 border border-slate-700 whitespace-pre-wrap">
                  {exam}
                </div>
              )}
            </div>

            <div className="space-y-4 mb-6">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    msg.role === "user"
                      ? "bg-blue-950 border-blue-700"
                      : "bg-slate-900 border-slate-700"
                  }`}
                >
                  <div className="text-sm text-slate-400 mb-1">
                    {msg.role === "user" ? "You" : "Assistant"}
                  </div>

                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {msg.role === "assistant" &&
                    msg.sources &&
                    msg.sources.length > 0 && (
                      <div className="mt-4 border-t border-slate-700 pt-3">
                        <div className="text-xs text-slate-400 mb-2">
                          Retrieved Sources
                        </div>

                        {msg.sources.map((source, idx) => (
                          <details
                            key={idx}
                            className="mb-2 bg-slate-950 border border-slate-700 rounded p-2"
                          >
                            <summary className="cursor-pointer text-sm text-blue-300">
                              {source.file_name} (
                              {Number(source.similarity).toFixed(2)})
                            </summary>

                            <div className="mt-2 text-sm text-slate-300 whitespace-pre-wrap">
                              {source.content}
                            </div>
                          </details>
                        ))}
                      </div>
                    )}
                </div>
              ))}

              {loading && (
                <div className="p-4 rounded-lg bg-slate-900 border border-slate-700">
                  Assistant is thinking...
                </div>
              )}
            </div>

            <textarea
              className="w-full h-32 p-4 rounded-lg bg-slate-900 border border-slate-700"
              placeholder="Ask an engineering question..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            <button
              onClick={sendMessage}
              disabled={loading}
              className="mt-4 px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600"
            >
              {loading ? "Thinking..." : "Send"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}