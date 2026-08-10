import { neon } from "@neondatabase/serverless";

export default async function handler(request, response) {
  try {
    const sql = neon(process.env.DATABASE_URL);

    // =========================
    // GET COMMENTS
    // =========================

    if (request.method === "GET") {
      const movieId = Number(request.query.movie_id);

      if (!Number.isInteger(movieId)) {
        return response.status(400).json({
          error: "Valid movie_id is required"
        });
      }

      const comments = await sql`
        SELECT
          id,
          movie_id,
          name,
          review,
          created_at
        FROM user_comments
        WHERE movie_id = ${movieId}
        ORDER BY created_at DESC
      `;

      return response.status(200).json({
        success: true,
        comments
      });
    }

    // =========================
    // POST COMMENT
    // =========================

    if (request.method === "POST") {
      const {
        movie_id,
        name,
        review
      } = request.body || {};

      const movieId = Number(movie_id);
      const cleanName = String(name || "").trim();
      const cleanReview = String(review || "").trim();

      if (!Number.isInteger(movieId)) {
        return response.status(400).json({
          error: "Valid movie_id is required"
        });
      }

      if (!cleanName) {
        return response.status(400).json({
          error: "Name is required"
        });
      }

      if (!cleanReview) {
        return response.status(400).json({
          error: "Review is required"
        });
      }

      if (cleanName.length > 50) {
        return response.status(400).json({
          error: "Name is too long"
        });
      }

      if (cleanReview.length > 2000) {
        return response.status(400).json({
          error: "Review is too long"
        });
      }

      const result = await sql`
        INSERT INTO user_comments (
          movie_id,
          name,
          review
        )
        VALUES (
          ${movieId},
          ${cleanName},
          ${cleanReview}
        )
        RETURNING
          id,
          movie_id,
          name,
          review,
          created_at
      `;

      return response.status(201).json({
        success: true,
        comment: result[0]
      });
    }

    return response.status(405).json({
      error: "Method not allowed"
    });

  } catch (error) {
    console.error(error);

    return response.status(500).json({
      error: "Something went wrong"
    });
  }
}
