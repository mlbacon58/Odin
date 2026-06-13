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

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConversations();
    loadCollections();
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
                  conversationId === conv.id ? "bg-slate-800" : "bg-slate-900"
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
                onChange={(e) => setSelectedCollectionId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"
              >
                <option value="">All documents</option>

                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>
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