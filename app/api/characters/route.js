import dbService from "../../../lib/database";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const isPublic = searchParams.get("isPublic");
    const currentUserId = searchParams.get("currentUserId"); // For getting user-specific chat counts

    // If currentUserId is provided, get characters with user chat counts in a single query
    if (currentUserId) {
      const characters = await dbService.getCharactersWithUserChatCounts(
        currentUserId,
        userId,
        isPublic === "true" ? true : isPublic === "false" ? false : null
      );

      return Response.json({
        success: true,
        characters,
      });
    }

    // Otherwise, get characters without chat counts
    const characters = await dbService.getCharacters(
      userId,
      isPublic === "true" ? true : isPublic === "false" ? false : null
    );

    return Response.json({
      success: true,
      characters,
    });
  } catch (error) {
    console.error("Characters API Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
