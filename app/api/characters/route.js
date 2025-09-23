import dbService from "../../../lib/database";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const isPublic = searchParams.get("isPublic");

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

export async function POST(request) {
  try {
    const characterData = await request.json();
    const { creatorId } = characterData;

    if (!creatorId) {
      return Response.json(
        { error: "Creator ID is required" },
        { status: 400 }
      );
    }

    // Validate required fields
    const requiredFields = ["name", "description", "greeting"];
    for (const field of requiredFields) {
      if (!characterData[field]) {
        return Response.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    const character = await dbService.createCharacter(creatorId, characterData);

    return Response.json({
      success: true,
      character,
    });
  } catch (error) {
    console.error("Create Character API Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
