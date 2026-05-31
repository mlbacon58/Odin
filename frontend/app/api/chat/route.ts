import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { message, conversationId } = await req.json();

    let activeConversationId = conversationId;

    if (!activeConversationId) {
      const { data: conversation, error } = await supabase
        .from("conversations")
        .insert({
          title: message.substring(0, 60),
        })
        .select()
        .single();

      if (error) throw error;

      activeConversationId = conversation.id;
    }

    await supabase.from("messages").insert({
      conversation_id: activeConversationId,
      role: "user",
      content: message,
    });

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: message,
    });

    const reply = response.output_text;

    await supabase.from("messages").insert({
      conversation_id: activeConversationId,
      role: "assistant",
      content: reply,
    });

    return Response.json({
      reply,
      conversationId: activeConversationId,
    });

  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Failed to save or get response." },
      { status: 500 }
    );
  }
}