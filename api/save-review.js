import { neon } from "@neondatabase/serverless";

export default async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      return response.status(405).json({
        error: "Method not allowed"
      });
    }

    const adminSecret = request.headers["x-admin-secret"];

    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
      return response.status(401).json({
        error: "Unauthorized"
      });
    }

    const { movie_id, rating, review } = request.body;

    if (!movie_id || rating === undefined) {
      return response.status(400).json({
        error: "movie_id and rating are required"
      });
    }

    const sql = neon(process.env.DATABASE_URL);

    const result = await sql`
      INSERT INTO movie_reviews (
        movie_id,
        rating,
        review
      )
      VALUES (
        ${movie_id},
        ${rating},
        ${review || ""}
      )
      ON CONFLICT (movie_id)
      DO UPDATE SET
        rating = EXCLUDED.rating,
        review = EXCLUDED.review
      RETURNING movie_id, rating, review
    `;

    return response.status(200).json(result[0]);

  } catch (error) {
    console.error(error);

    return response.status(500).json({
      error: "Something went wrong"
    });
  }
}
