import { neon } from "@neondatabase/serverless";

export default async function handler(request, response) {
  try {
    const sql = neon(process.env.DATABASE_URL);

    // =========================
// GET
// =========================

if (request.method === "GET") {

  const cookies = request.headers.cookie || "";

  const userIdCookie = cookies
    .split(";")
    .map(cookie => cookie.trim())
    .find(cookie => cookie.startsWith("user_id="));

  let userId = null;

  if (userIdCookie) {
    const parsedUserId = Number(
      decodeURIComponent(userIdCookie.split("=")[1])
    );

    if (Number.isInteger(parsedUserId)) {
      userId = parsedUserId;
    }
  }

  // =========================
  // GET ALL RATINGS
  // =========================

  if (!request.query.movie_id) {

    if (userId === null) {
      return response.status(401).json({
        error: "You must be logged in"
      });
    }

    const ratings = await sql`
      SELECT movie_id, rating
      FROM user_ratings
      WHERE user_id = ${userId}
      ORDER BY movie_id DESC
    `;

    return response.status(200).json({
      success: true,
      ratings
    });
  }

  // =========================
  // GET ONE MOVIE RATING
  // =========================

  const movieId = Number(request.query.movie_id);

  if (!Number.isInteger(movieId)) {
    return response.status(400).json({
      error: "Valid movie_id is required"
    });
  }

  // Get overall user rating
  const averageResult = await sql`
    SELECT
      AVG(rating) AS average_rating,
      COUNT(*) AS rating_count
    FROM user_ratings
    WHERE movie_id = ${movieId}
  `;

  // Get this user's rating, if logged in
  let myRating = null;

  if (userId !== null) {
    const myRatingResult = await sql`
      SELECT rating
      FROM user_ratings
      WHERE movie_id = ${movieId}
        AND user_id = ${userId}
      LIMIT 1
    `;

    if (myRatingResult.length > 0) {
      myRating = Number(myRatingResult[0].rating);
    }
  }

  const average =
    averageResult[0].average_rating !== null
      ? Number(averageResult[0].average_rating)
      : null;

  const count =
    Number(averageResult[0].rating_count) || 0;

  return response.status(200).json({
    success: true,
    userRating: myRating,
    averageRating: average,
    ratingCount: count,
    loggedIn: userId !== null
  });
}

    // =========================
    // POST
    // =========================
    // Saves or updates the logged-in user's rating

    if (request.method === "POST") {
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

      const { movie_id, rating } = request.body || {};

      if (!movie_id || rating === undefined) {
        return response.status(400).json({
          error: "movie_id and rating are required"
        });
      }

      const movieId = Number(movie_id);
      const numericRating = Number(rating);

      if (!Number.isInteger(movieId)) {
        return response.status(400).json({
          error: "Invalid movie_id"
        });
      }

      if (
        !Number.isFinite(numericRating) ||
        numericRating < 0 ||
        numericRating > 10
      ) {
        return response.status(400).json({
          error: "Rating must be between 0 and 10"
        });
      }

      const result = await sql`
        INSERT INTO user_ratings (
          movie_id,
          user_id,
          rating
        )
        VALUES (
          ${movieId},
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
    }

    // =========================
    // DELETE
    // =========================
    // Removes the logged-in user's own rating

    if (request.method === "DELETE") {
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

      const movieId = Number(request.query.movie_id);

      if (!Number.isInteger(movieId)) {
        return response.status(400).json({
          error: "Valid movie_id is required"
        });
      }

      await sql`
        DELETE FROM user_ratings
        WHERE movie_id = ${movieId}
          AND user_id = ${userId}
      `;

      return response.status(200).json({
        success: true
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
