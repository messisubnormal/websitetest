export default async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      return response.status(405).json({
        error: "Method not allowed"
      });
    }

    const { password } = request.body;

    if (!password || password !== process.env.ADMIN_SECRET) {
      return response.status(401).json({
        error: "Invalid password"
      });
    }

    response.setHeader(
      "Set-Cookie",
      "admin_authenticated=true; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400"
    );

    return response.status(200).json({
      success: true
    });

  } catch (error) {
    console.error(error);

    return response.status(500).json({
      error: "Something went wrong"
    });
  }
}
