import dbService from "../../../../lib/database";

export async function GET(request, { params }) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return Response.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const messages = await dbService.getMessages(sessionId);

    return Response.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("Messages API Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return Response.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    await dbService.deleteChat(sessionId);

    return Response.json({
      success: true,
      message: "Chat session deleted successfully",
    });
  } catch (error) {
    console.error("Delete Session API Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
