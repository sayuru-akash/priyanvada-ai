import dbService from "../../../lib/database";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const isPublic = searchParams.get("isPublic");

    // Simple, fast character fetch - no counts, no extras
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
