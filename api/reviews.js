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
      SELECT movie_id, rating, review, review_es, review_zh
      FROM movie_reviews
      WHERE movie_id = ${movieId}
      LIMIT 1
    `;

    if (result.length === 0) {
      return response.status(404).json({
        error: "Review not found"
      });
    }

    const row = result[0];
    const lang = request.query.lang;

    const localizedReview =
      (lang === "es" && row.review_es) ||
      (lang === "zh" && row.review_zh) ||
      row.review;

    return response.status(200).json({
      movie_id: row.movie_id,
      rating: row.rating,
      review: localizedReview,
      review_en: row.review,
      review_es: row.review_es,
      review_zh: row.review_zh
    });

  } catch (error) {
    console.error(error);

    return response.status(500).json({
      error: "Something went wrong"
    });
  }
}
