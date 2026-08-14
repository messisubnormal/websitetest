import { neon } from "@neondatabase/serverless";

export default async function handler(request, response) {
  try {
    const sql = neon(process.env.DATABASE_URL);

    // Get logged-in user from the cookie
    const userId = request.cookies?.user_id;

    if (!userId) {
      return response.status(401).json({
        loggedIn: false,
        error: "You must be logged in."
      });
    }

    const numericUserId = Number(userId);

    if (!Number.isInteger(numericUserId)) {
      return response.status(401).json({
        loggedIn: false,
        error: "Invalid user."
      });
    }

    // =========================
    // GET
    // Check whether a movie is
    // in the user's wishlist
    // =========================

    if (request.method === "GET") {
      const movieId = Number(request.query.movie_id);

      if (!Number.isInteger(movieId)) {
        return response.status(400).json({
          error: "Valid movie_id is required."
        });
      }

      const result = await sql`
        SELECT id
        FROM user_wishlist
        WHERE user_id = ${numericUserId}
          AND movie_id = ${movieId}
        LIMIT 1
      `;

      return response.status(200).json({
        success: true,
        inWishlist: result.length > 0
      });
    }

    // =========================
    // POST
    // Add movie to wishlist
    // =========================

    if (request.method === "POST") {
      const movieId = Number(request.body?.movie_id);

      if (!Number.isInteger(movieId)) {
        return response.status(400).json({
          error: "Valid movie_id is required."
        });
      }

      await sql`
        INSERT INTO user_wishlist (
          user_id,
          movie_id
        )
        VALUES (
          ${numericUserId},
          ${movieId}
        )
        ON CONFLICT (user_id, movie_id)
        DO NOTHING
      `;

      return response.status(200).json({
        success: true,
        inWishlist: true
      });
    }

    // =========================
    // DELETE
    // Remove movie from wishlist
    // =========================

    if (request.method === "DELETE") {
      const movieId = Number(request.query.movie_id);

      if (!Number.isInteger(movieId)) {
        return response.status(400).json({
          error: "Valid movie_id is required."
        });
      }

      await sql`
        DELETE FROM user_wishlist
        WHERE user_id = ${numericUserId}
          AND movie_id = ${movieId}
      `;

      return response.status(200).json({
        success: true,
        inWishlist: false
      });
    }

    return response.status(405).json({
      error: "Method not allowed."
    });

  } catch (error) {
    console.error("Wishlist error:", error);

    return response.status(500).json({
      error: "Something went wrong."
    });
  }
}
