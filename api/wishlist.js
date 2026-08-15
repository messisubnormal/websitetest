import { neon } from "@neondatabase/serverless";

export default async function handler(request, response) {
  try {
    const userId = request.cookies?.user_id;

    if (!userId) {
      return response.status(401).json({
        error: "You must be logged in."
      });
    }

    const sql = neon(process.env.DATABASE_URL);

    // CHECK
    if (request.method === "GET") {
      const movieId = Number(request.query.movie_id);

      if (!movieId) {
        return response.status(400).json({
          error: "movie_id is required."
        });
      }

      const rows = await sql`
        SELECT id
        FROM user_wishlist
        WHERE user_id = ${userId}
          AND movie_id = ${movieId}
        LIMIT 1
      `;

      return response.status(200).json({
        saved: rows.length > 0
      });
    }

    // ADD
    if (request.method === "POST") {
      const { movie_id } = request.body || {};
      const movieId = Number(movie_id);

      if (!movieId) {
        return response.status(400).json({
          error: "movie_id is required."
        });
      }

      await sql`
        INSERT INTO user_wishlist (user_id, movie_id)
        VALUES (${userId}, ${movieId})
        ON CONFLICT (user_id, movie_id) DO NOTHING
      `;

      return response.status(200).json({
        success: true,
        saved: true
      });
    }

    // REMOVE
    if (request.method === "DELETE") {
      const movieId = Number(request.query.movie_id);

      if (!movieId) {
        return response.status(400).json({
          error: "movie_id is required."
        });
      }

      await sql`
        DELETE FROM user_wishlist
        WHERE user_id = ${userId}
          AND movie_id = ${movieId}
      `;

      return response.status(200).json({
        success: true,
        saved: false
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
