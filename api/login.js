import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

export default async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      return response.status(405).json({
        error: "Method not allowed"
      });
    }

    const { email, password } = request.body || {};

    if (!email || !password) {
      return response.status(400).json({
        error: "Email and password are required"
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const sql = neon(process.env.DATABASE_URL);

    const users = await sql`
      SELECT id, username, email, password_hash
      FROM users
      WHERE email = ${cleanEmail}
      LIMIT 1
    `;

    if (users.length === 0) {
      return response.status(401).json({
        error: "Invalid email or password"
      });
    }

    const user = users[0];

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return response.status(401).json({
        error: "Invalid email or password"
      });
    }

    response.setHeader(
      "Set-Cookie",
      `user_id=${encodeURIComponent(user.id)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=7776000`
    );

    return response.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error(error);

    return response.status(500).json({
      error: "Something went wrong"
    });
  }
}
