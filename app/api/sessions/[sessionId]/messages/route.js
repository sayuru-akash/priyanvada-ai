import dbService from "../../../../../lib/database.js";

export async function GET(request, { params }) {
  try {
    const { sessionId } = params;

    if (!sessionId) {
      return Response.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Get all messages for the session
    const messages = await dbService.getMessages(sessionId);

    // Format messages for frontend consumption
    const formattedMessages = messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
      token_count: message.token_count,
      images: message.images, // This now contains full Cloudinary data
      metadata: message.metadata,
      has_images: message.has_images,
    }));

    return Response.json({
      success: true,
      messages: formattedMessages,
      sessionId,
    });
  } catch (error) {
    console.error("Messages API Error:", error);
    return Response.json(
      { error: "Failed to retrieve messages", details: error.message },
      { status: 500 }
    );
  }
}
