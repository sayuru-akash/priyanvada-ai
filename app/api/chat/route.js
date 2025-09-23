import dbService from "../../../lib/database";
import aiService from "../../../lib/aiService";

export async function POST(request) {
  try {
    const { sessionId, message } = await request.json();

    if (!sessionId || !message) {
      return Response.json(
        { error: "Session ID and message are required" },
        { status: 400 }
      );
    }

    // Get chat session to verify it exists and get character info
    const session = await dbService.getChatSession(sessionId);
    if (!session) {
      return Response.json(
        { error: "Chat session not found" },
        { status: 404 }
      );
    }

    // Get character information
    const character = await dbService.getCharacterById(session.character_id);
    if (!character) {
      return Response.json({ error: "Character not found" }, { status: 404 });
    }

    // Add user message to database
    await dbService.addMessage(sessionId, "user", message);

    // Get recent conversation history
    const recentMessages = await dbService.getRecentMessages(sessionId, 10);

    // Get session memory/context for long conversations
    const sessionMemory = await dbService.getChatMemory(sessionId);
    const sessionContext = sessionMemory ? sessionMemory.summary : null;

    // Generate character response
    const aiResponse = await aiService.generateCharacterResponse(
      recentMessages,
      character,
      sessionContext
    );

    // Add character response to database
    const characterMessage = await dbService.addMessage(
      sessionId,
      "assistant",
      aiResponse.content,
      aiResponse.tokenCount,
      {
        model: aiResponse.model,
        character_id: character.id,
        isErrorFallback: aiResponse.isErrorFallback || false,
        originalError: aiResponse.originalError || null,
      }
    );

    // Check if we need to summarize (if conversation is getting long)
    const totalMessages = await dbService.getMessages(sessionId);
    if (totalMessages.length > 20 && totalMessages.length % 20 === 0) {
      try {
        const summary = await aiService.summarizeConversation(
          totalMessages.slice(-20)
        );
        await dbService.saveChatMemory(sessionId, summary, {
          messageCount: totalMessages.length,
          lastSummaryAt: new Date().toISOString(),
        });
      } catch (error) {
        console.warn("Failed to create conversation summary:", error);
      }
    }

    return Response.json({
      success: true,
      message: characterMessage,
      character: {
        id: character.id,
        name: character.name,
        avatar_url: character.avatar_url,
      },
      sessionId,
    });
  } catch (error) {
    console.error("Chat API Error:", error);
    return Response.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
