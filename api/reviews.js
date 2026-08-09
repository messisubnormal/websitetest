import { neon } from "@neondatabase/serverless";

export default async function handler(request, response) {
  try {
    const movieId = request.query.id;

    if (!movieId) {
      return response.status(400).json({
        error: "Movie ID is required"
      });
    }

    const sql = neon(process.env.DATABASE_URL);

    const result = await sql`
      SELECT movie_id, rating, review
      FROM movie_reviews
      WHERE movie_id = ${movieId}
      LIMIT 1
    `;

    if (result.length === 0) {
      return response.status(404).json({
        error: "Review not found"
      });
    }

    return response.status(200).json(result[0]);

  } catch (error) {
    console.error(error);

    return response.status(500).json({
      error: "Something went wrong"
    });
  }
}
