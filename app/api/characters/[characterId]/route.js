import dbService from "../../../../lib/database";

export async function GET(request, { params }) {
  try {
    const { characterId } = await params;

    if (!characterId) {
      return Response.json(
        { error: "Character ID is required" },
        { status: 400 }
      );
    }

    const character = await dbService.getCharacterById(characterId);

    if (!character) {
      return Response.json({ error: "Character not found" }, { status: 404 });
    }

    return Response.json({
      success: true,
      character,
    });
  } catch (error) {
    console.error("Character API Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}


