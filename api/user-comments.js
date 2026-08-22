import { neon } from "@neondatabase/serverless";

export default async function handler(request, response) {
  try {
    const sql = neon(process.env.DATABASE_URL);

    // =========================
    // GET COMMENTS
    // =========================

    if (request.method === "GET") {

      // ---- NEWS ARTICLE COMMENTS ----

      if (request.query.article_id) {

        const articleId = Number(request.query.article_id);

        if (!Number.isInteger(articleId)) {
          return response.status(400).json({
            error: "Valid article_id is required"
          });
        }

        const comments = await sql`
          SELECT
            id,
            article_id,
            parent_id,
            author_name,
            content,
            created_at
          FROM news_comments
          WHERE article_id = ${articleId}
          ORDER BY created_at ASC
        `;

        return response.status(200).json({
          success: true,
          comments
        });
      }

      // ---- MOVIE COMMENTS (unchanged) ----

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

      const body = request.body || {};

      // ---- NEWS ARTICLE COMMENTS ----

      if (body.article_id) {

        const articleId = Number(body.article_id);
        const cleanName = String(body.name || "").trim();
        const cleanContent = String(body.content || "").trim();

        const parentId =
          body.parent_id === undefined ||
          body.parent_id === null ||
          body.parent_id === ""
            ? null
            : Number(body.parent_id);

        if (!Number.isInteger(articleId)) {
          return response.status(400).json({
            error: "Valid article_id is required"
          });
        }

        if (!cleanName) {
          return response.status(400).json({
            error: "Name is required"
          });
        }

        if (!cleanContent) {
          return response.status(400).json({
            error: "Comment is required"
          });
        }

        if (cleanName.length > 50) {
          return response.status(400).json({
            error: "Name is too long"
          });
        }

        if (cleanContent.length > 2000) {
          return response.status(400).json({
            error: "Comment is too long"
          });
        }

        if (parentId !== null) {

          if (!Number.isInteger(parentId)) {
            return response.status(400).json({
              error: "Invalid parent_id"
            });
          }

          const parent = await sql`
            SELECT id
            FROM news_comments
            WHERE id = ${parentId}
              AND article_id = ${articleId}
            LIMIT 1
          `;

          if (parent.length === 0) {
            return response.status(400).json({
              error: "Parent comment not found"
            });
          }
        }

        const result = await sql`
          INSERT INTO news_comments (
            article_id,
            parent_id,
            author_name,
            content
          )
          VALUES (
            ${articleId},
            ${parentId},
            ${cleanName},
            ${cleanContent}
          )
          RETURNING
            id,
            article_id,
            parent_id,
            author_name,
            content,
            created_at
        `;

        return response.status(201).json({
          success: true,
          comment: result[0]
        });
      }

      // ---- MOVIE COMMENTS (unchanged) ----

      const {
        movie_id,
        name,
        review
      } = body;

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
