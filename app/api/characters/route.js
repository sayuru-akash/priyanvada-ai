import dbService from "../../../lib/database";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const isPublic = searchParams.get("isPublic");
    const currentUserId = searchParams.get("currentUserId"); // For getting user-specific chat counts

    const characters = await dbService.getCharacters(
      userId,
      isPublic === "true" ? true : isPublic === "false" ? false : null
    );

    // If currentUserId is provided, get user-specific chat counts
    if (currentUserId && characters.length > 0) {
      const charactersWithUserChatCount = await Promise.all(
        characters.map(async (character) => {
          const userChatCount = await dbService.getUserChatCountForCharacter(currentUserId, character.id);
          return {
            ...character,
            user_chat_count: userChatCount
          };
        })
      );

      return Response.json({
        success: true,
        characters: charactersWithUserChatCount,
      });
    }

    return Response.json({
      success: true,
      characters,
    });
  } catch (error) {
    console.error("Characters API Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}


