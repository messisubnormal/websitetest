import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

export default async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      return response.status(405).json({
        error: "Method not allowed"
      });
    }

    const { username, email, password } = request.body || {};

    if (!username || !email || !password) {
      return response.status(400).json({
        error: "Username, email and password are required"
      });
    }

    const cleanUsername = String(username).trim();
    const cleanEmail = String(email).trim().toLowerCase();

    if (cleanUsername.length < 3) {
      return response.status(400).json({
        error: "Username must be at least 3 characters"
      });
    }

    if (password.length < 8) {
      return response.status(400).json({
        error: "Password must be at least 8 characters"
      });
    }

    const sql = neon(process.env.DATABASE_URL);

    const existingUser = await sql`
      SELECT id
      FROM users
      WHERE username = ${cleanUsername}
         OR email = ${cleanEmail}
      LIMIT 1
    `;

    if (existingUser.length > 0) {
      return response.status(409).json({
        error: "Username or email already exists"
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await sql`
      INSERT INTO users (
        username,
        email,
        password_hash
      )
      VALUES (
        ${cleanUsername},
        ${cleanEmail},
        ${passwordHash}
      )
      RETURNING id, username, email, created_at
    `;

    return response.status(201).json({
      success: true,
      user: result[0]
    });

  } catch (error) {
    console.error(error);

    return response.status(500).json({
      error: "Something went wrong"
    });
  }
}
