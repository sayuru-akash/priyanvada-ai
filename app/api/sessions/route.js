import dbService from "../../../lib/database";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const characterId = searchParams.get("characterId");

    if (!userId) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

    const sessions = await dbService.getChatSessions(userId, characterId);

    return Response.json({
      success: true,
      sessions,
    });
  } catch (error) {
    console.error("Sessions API Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { userId, characterId, title = "New Chat" } = await request.json();

    if (!userId || !characterId) {
      return Response.json(
        { error: "User ID and Character ID are required" },
        { status: 400 }
      );
    }

    // Verify character exists
    const character = await dbService.getCharacterById(characterId);
    if (!character) {
      return Response.json({ error: "Character not found" }, { status: 404 });
    }

    const session = await dbService.createChatSession(
      userId,
      characterId,
      title
    );

    // Add the character greeting as the first message
    await dbService.addMessage(
      session.id,
      "assistant",
      character.greeting,
      null,
      {
        character_id: character.id,
        is_greeting: true,
      }
    );

    return Response.json({
      success: true,
      session: {
        ...session,
        character_name: character.name,
        avatar_url: character.avatar_url,
      },
    });
  } catch (error) {
    console.error("Create Session API Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
