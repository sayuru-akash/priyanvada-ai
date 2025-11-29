import dbService from "../../../lib/database";

export async function POST(request) {
  try {
    const submissionData = await request.json();

    // Validate required fields
    if (!submissionData.interestedInPaidPlan) {
      return Response.json(
        { error: "Interest status is required" },
        { status: 400 }
      );
    }

    // Get client IP address
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Prepare submission data
    const dataToStore = {
      ...submissionData,
      ipAddress,
      submittedAt: new Date().toISOString(),
    };

    // Store in database
    const result = await dbService.submitPaidPlanInterest(dataToStore);

    if (!result) {
      throw new Error("Failed to store submission");
    }

    console.log(
      `📊 [Paid Plan Interest] New submission from ${
        submissionData.userEmail || "anonymous user"
      }`
    );

    return Response.json({
      success: true,
      message: "Thank you for your feedback!",
      submissionId: result.id,
    });
  } catch (error) {
    console.error("Paid plan interest submission error:", error);
    return Response.json(
      { error: "Failed to process submission" },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit")) || 50;

    // Get submissions (admin functionality)
    const submissions = await dbService.getPaidPlanSubmissions(userId, limit);

    return Response.json({
      success: true,
      submissions,
      count: submissions.length,
    });
  } catch (error) {
    console.error("Paid plan interest fetch error:", error);
    return Response.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}
