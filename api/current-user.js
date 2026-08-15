import { neon } from "@neondatabase/serverless";

export default async function handler(request, response) {

export default async function handler(request, response) {
  try {

    // =========================
    // LOG OUT
    // =========================

    if (request.method === "POST") {

      response.setHeader(
        "Set-Cookie",
        "user_id=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
      );

      return response.status(200).json({
        success: true
      });
    }


    // =========================
    // CHECK CURRENT USER
    // =========================

    if (request.method !== "GET") {
      return response.status(405).json({
        error: "Method not allowed"
      });
    }

    const cookies = request.headers.cookie || "";

    const userIdCookie = cookies
      .split(";")
      .map(cookie => cookie.trim())
      .find(cookie => cookie.startsWith("user_id="));

    if (!userIdCookie) {
      return response.status(401).json({
        loggedIn: false
      });
    }

    const userId = Number(
      decodeURIComponent(
        userIdCookie.split("=")[1]
      )
    );

    if (!Number.isInteger(userId)) {
      return response.status(401).json({
        loggedIn: false
      });
    }

    const sql = neon(process.env.DATABASE_URL);

    const users = await sql`
      SELECT id, username, email
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `;

    if (users.length === 0) {
      return response.status(401).json({
        loggedIn: false
      });
    }

    return response.status(200).json({
      loggedIn: true,
      user: users[0]
    });

  } catch (error) {

    console.error("Current user error:", error);

    return response.status(500).json({
      error: "Something went wrong"
    });
  }
}
