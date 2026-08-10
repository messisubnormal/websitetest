import { neon } from "@neondatabase/serverless";

export default async function handler(request, response) {
  try {
    if (request.method !== "POST") {
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
        error: "You must be logged in"
      });
    }

    const userId = Number(
      decodeURIComponent(userIdCookie.split("=")[1])
    );

    if (!Number.isInteger(userId)) {
      return response.status(401).json({
        error: "Invalid user"
      });
    }

    const { movie_id, rating } = request.body;

    if (!movie_id || rating === undefined) {
      return response.status(400).json({
        error: "movie_id and rating are required"
      });
    }

    const numericRating = Number(rating);

    if (
      !Number.isFinite(numericRating) ||
      numericRating < 0 ||
      numericRating > 10
    ) {
      return response.status(400).json({
        error: "Rating must be between 0 and 10"
      });
    }

    const sql = neon(process.env.DATABASE_URL);

    const result = await sql`
      INSERT INTO user_ratings (
        movie_id,
        user_id,
        rating
      )
      VALUES (
        ${Number(movie_id)},
        ${userId},
        ${numericRating}
      )
      ON CONFLICT (movie_id, user_id)
      DO UPDATE SET
        rating = EXCLUDED.rating
      RETURNING movie_id, user_id, rating
    `;

    return response.status(200).json({
      success: true,
      rating: result[0]
    });

  } catch (error) {
    console.error(error);

    return response.status(500).json({
      error: "Something went wrong"
    });
  }
}
