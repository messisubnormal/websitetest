export default async function handler(request, response) {
  try {
    const movieId = request.query.id;

    /*
     * Map our own short language codes (en, es, zh)
     * to the language codes TMDB actually expects.
     * Defaults to English if missing or unrecognized.
     */
    const tmdbLanguageMap = {
      en: "en-US",
      es: "es-ES",
      zh: "zh-CN"
    };

    const tmdbLanguage =
      tmdbLanguageMap[request.query.lang] || "en-US";

        if (request.query.type === "news") {

      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(process.env.DATABASE_URL);

      if (request.method === "GET") {

                if (request.query.id) {

          const cookies = request.headers.cookie || "";

          const isAuthenticated = cookies
            .split(";")
            .map(cookie => cookie.trim())
            .includes("admin_authenticated=true");

          if (!isAuthenticated) {
            return response.status(401).json({
              error: "Unauthorized"
            });
          }

          const result = await sql`
            SELECT *
            FROM news_articles
            WHERE id = ${Number(request.query.id)}
            LIMIT 1
          `;

          if (result.length === 0) {
            return response.status(404).json({
              error: "Article not found"
            });
          }

          return response.status(200).json(result[0]);
        }

        if (request.query.slug) {

          const result = await sql`
            SELECT *
            FROM news_articles
            WHERE slug = ${request.query.slug}
              AND published = true
            LIMIT 1
          `;

          if (result.length === 0) {
            return response.status(404).json({
              error: "Article not found"
            });
          }

          const article = result[0];
          const lang = request.query.lang;

          const localized = {
            ...article,
            title:
              (lang === "es" && article.title_es) ||
              (lang === "zh" && article.title_zh) ||
              article.title,
            excerpt:
              (lang === "es" && article.excerpt_es) ||
              (lang === "zh" && article.excerpt_zh) ||
              article.excerpt,
            content:
              (lang === "es" && article.content_es) ||
              (lang === "zh" && article.content_zh) ||
              article.content
          };

          return response.status(200).json(localized);
        }

        const lang = request.query.lang;

        const result = await sql`
          SELECT
            id, slug, author, image_url, published, published_at,
            title, excerpt,
            title_es, excerpt_es,
            title_zh, excerpt_zh
          FROM news_articles
          WHERE published = true
          ORDER BY published_at DESC
        `;

        const localizedResults = result.map(article => ({
          id: article.id,
          slug: article.slug,
          author: article.author,
          image_url: article.image_url,
          published: article.published,
          published_at: article.published_at,
          title:
            (lang === "es" && article.title_es) ||
            (lang === "zh" && article.title_zh) ||
            article.title,
          excerpt:
            (lang === "es" && article.excerpt_es) ||
            (lang === "zh" && article.excerpt_zh) ||
            article.excerpt
        }));

        return response.status(200).json({
          results: localizedResults
        });
      }

      if (request.method === "POST") {

        const cookies = request.headers.cookie || "";

        const isAuthenticated = cookies
          .split(";")
          .map(cookie => cookie.trim())
          .includes("admin_authenticated=true");

        if (!isAuthenticated) {
          return response.status(401).json({
            error: "Unauthorized"
          });
        }

        const {
          id,
          title,
          slug,
          excerpt,
          content,
          author,
          image_url,
          published,
          title_es,
          excerpt_es,
          content_es,
          title_zh,
          excerpt_zh,
          content_zh
        } = request.body;

        if (!title || !slug || !content) {
          return response.status(400).json({
            error: "title, slug and content are required"
          });
        }

        const cleanTitle = title;
        const cleanSlug = slug;
        const cleanExcerpt = excerpt || "";
        const cleanContent = content;
        const cleanAuthor = author || "Admin";
        const cleanImageUrl = image_url || "";
        const isPublished = published === true;

        const cleanTitleEs = title_es || null;
        const cleanExcerptEs = excerpt_es || null;
        const cleanContentEs = content_es || null;

        const cleanTitleZh = title_zh || null;
        const cleanExcerptZh = excerpt_zh || null;
        const cleanContentZh = content_zh || null;

        let result;

        if (id) {

          result = await sql`
            UPDATE news_articles
            SET
              title = ${cleanTitle},
              slug = ${cleanSlug},
              excerpt = ${cleanExcerpt},
              content = ${cleanContent},
              author = ${cleanAuthor},
              image_url = ${cleanImageUrl},
              published = ${isPublished},
              title_es = ${cleanTitleEs},
              excerpt_es = ${cleanExcerptEs},
              content_es = ${cleanContentEs},
              title_zh = ${cleanTitleZh},
              excerpt_zh = ${cleanExcerptZh},
              content_zh = ${cleanContentZh},
              published_at = CASE
                WHEN ${isPublished} = true AND published_at IS NULL THEN NOW()
                WHEN ${isPublished} = false THEN NULL
                ELSE published_at
              END,
              updated_at = NOW()
            WHERE id = ${Number(id)}
            RETURNING *
          `;

          if (result.length === 0) {
            return response.status(404).json({
              error: "Article not found"
            });
          }

        } else {

          result = await sql`
            INSERT INTO news_articles (
              title, slug, excerpt, content, author, image_url, published, published_at,
              title_es, excerpt_es, content_es,
              title_zh, excerpt_zh, content_zh
            )
            VALUES (
              ${cleanTitle}, ${cleanSlug}, ${cleanExcerpt}, ${cleanContent},
              ${cleanAuthor}, ${cleanImageUrl}, ${isPublished},
              ${isPublished ? new Date() : null},
              ${cleanTitleEs}, ${cleanExcerptEs}, ${cleanContentEs},
              ${cleanTitleZh}, ${cleanExcerptZh}, ${cleanContentZh}
            )
            RETURNING *
          `;
        }

        return response.status(200).json(result[0]);
      }

      return response.status(405).json({
        error: "Method not allowed"
      });
    }

    let url;

    if (movieId) {
  url = `https://api.themoviedb.org/3/movie/${movieId}?language=${tmdbLanguage}&append_to_response=credits`;

} else if (request.query.query) {

  const searchQuery =
    encodeURIComponent(request.query.query);

  url =
    `https://api.themoviedb.org/3/search/movie` +
    `?language=${tmdbLanguage}` +
    `&query=${searchQuery}` +
    `&page=1` +
    `&include_adult=false`;

} else if (request.query.type === "top-rated") {

  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL);

  /*
   * 1. Get a large pool of TMDB top-rated movies.
   */
  const topRatedMovies = [];

  for (let page = 1; page <= 10; page++) {

    const pageUrl =
      "https://api.themoviedb.org/3/movie/top_rated" +
      `?language=${tmdbLanguage}&page=${page}`;

    const pageResponse = await fetch(pageUrl, {
      headers: {
        Authorization:
          `Bearer ${process.env.TMDB_API_TOKEN}`,
        accept: "application/json"
      }
    });

    if (!pageResponse.ok) {
      throw new Error(
        `Top rated request failed on page ${page}`
      );
    }

    const pageData = await pageResponse.json();

    topRatedMovies.push(
      ...(pageData.results || [])
    );
  }

  /*
   * 2. Get EVERY movie that has a Website Rating.
   */
  const websiteRatings = await sql`
    SELECT movie_id, rating
    FROM movie_reviews
    WHERE rating IS NOT NULL
  `;

  /*
   * 3. Create a map of Website Ratings.
   */
  const websiteRatingMap = new Map(
    websiteRatings.map(row => [
      Number(row.movie_id),
      Number(row.rating)
    ])
  );

  /*
   * 4. Add Website-rated movies that are NOT
   *    already in the TMDB top-rated results.
   */
  const existingMovieIds = new Set(
    topRatedMovies.map(movie => Number(movie.id))
  );

  for (const row of websiteRatings) {

    const movieId = Number(row.movie_id);

    if (existingMovieIds.has(movieId)) {
      continue;
    }

    try {

      const movieResponse = await fetch(
        `https://api.themoviedb.org/3/movie/${movieId}?language=${tmdbLanguage}`,
        {
          headers: {
            Authorization:
              `Bearer ${process.env.TMDB_API_TOKEN}`,
            accept: "application/json"
          }
        }
      );

      if (!movieResponse.ok) {
        continue;
      }

      const movie = await movieResponse.json();

      topRatedMovies.push(movie);

      existingMovieIds.add(movieId);

    } catch (error) {

      console.error(
        `Could not load website-rated movie ${movieId}`,
        error
      );

    }
  }

  /*
   * 5. Website Rating overrides TMDB rating.
   *    Movies without a Website Rating keep
   *    their normal TMDB rating.
   */
  const rankedMovies = topRatedMovies
    .map(movie => {

      const websiteRating =
        websiteRatingMap.get(Number(movie.id));

      const effectiveRating =
        websiteRating !== undefined
          ? websiteRating
          : Number(movie.vote_average) || 0;

      return {
        ...movie,

        vote_average: effectiveRating,

        website_rating:
          websiteRating !== undefined
            ? websiteRating
            : null
      };

    })
    .filter(movie => movie.vote_average > 0)

    /*
     * 6. Sort using the effective rating.
     */
    .sort((a, b) => {

      if (b.vote_average !== a.vote_average) {
        return b.vote_average - a.vote_average;
      }

      return (b.vote_count || 0) - (a.vote_count || 0);

    });

  /*
   * 7. Return the top 200.
   */
  return response.status(200).json({
    results: rankedMovies.slice(0, 200)
  });


} else if (request.query.type === "streaming") {

  const provider = request.query.provider;

  const region =
    (request.query.region || "ES").toUpperCase();

  const providers = {
    netflix: {
      id: 8,
      name: "Netflix"
    },

    prime: {
      ids: [9, 119],
      name: "Amazon Prime Video"
    },

    disney: {
      id: 337,
      name: "Disney Plus"
    },

    apple: {
      id: 350,
      name: "Apple TV Plus"
    }
  };

  const selectedProvider =
    providers[provider];

  if (!selectedProvider) {
    return response.status(400).json({
      error: "Invalid streaming provider"
    });
  }

  const streamingMovies = [];

  for (let page = 1; page <= 10; page++) {

    const providerIds =
      Array.isArray(selectedProvider.ids)
        ? selectedProvider.ids.join("|")
        : selectedProvider.id;

    const pageUrl =
      "https://api.themoviedb.org/3/discover/movie" +
      `?language=${tmdbLanguage}` +
      `&watch_region=${region}` +
      `&with_watch_providers=${providerIds}` +
      `&with_watch_monetization_types=flatrate` +
      `&sort_by=vote_average.desc` +
      `&vote_count.gte=100` +
      `&page=${page}`;

    const pageResponse =
      await fetch(pageUrl, {
        headers: {
          Authorization:
            `Bearer ${process.env.TMDB_API_TOKEN}`,
          accept: "application/json"
        }
      });

    if (!pageResponse.ok) {
      throw new Error(
        `Streaming request failed on page ${page}`
      );
    }

    const pageData =
      await pageResponse.json();

    streamingMovies.push(
      ...(pageData.results || [])
    );

    if (
      !pageData.total_pages ||
      page >= pageData.total_pages
    ) {
      break;
    }
  }

  const { neon } =
    await import("@neondatabase/serverless");

  const sql =
    neon(process.env.DATABASE_URL);

  const websiteRatings =
    await sql`
      SELECT movie_id, rating
      FROM movie_reviews
      WHERE rating IS NOT NULL
    `;

  const websiteRatingMap =
    new Map(
      websiteRatings.map(row => [
        Number(row.movie_id),
        Number(row.rating)
      ])
    );

  const rankedMovies =
    streamingMovies

      .map(movie => {

        const websiteRating =
          websiteRatingMap.get(
            Number(movie.id)
          );

        const effectiveRating =
          websiteRating !== undefined
            ? websiteRating
            : Number(movie.vote_average) || 0;

        return {
          ...movie,

          vote_average:
            effectiveRating,

          website_rating:
            websiteRating !== undefined
              ? websiteRating
              : null
        };

      })

      .filter(
        movie => movie.vote_average > 0
      )

      .sort((a, b) => {

        if (
          b.vote_average !==
          a.vote_average
        ) {
          return (
            b.vote_average -
            a.vote_average
          );
        }

        return (
          (b.vote_count || 0) -
          (a.vote_count || 0)
        );

      });

  return response.status(200).json({
    provider: selectedProvider.name,
    region: region,
    results:
      rankedMovies.slice(0, 200)
  });
      
} else if (request.query.type === "upcoming") {

      const today = new Date();
      const sixMonths = new Date();
      sixMonths.setMonth(sixMonths.getMonth() + 6);

      const formatDate = (date) => {
        return date.toISOString().split("T")[0];
      };

      const fromDate = formatDate(today);
      const toDate = formatDate(sixMonths);

      url =
        `https://api.themoviedb.org/3/discover/movie` +
        `?language=${tmdbLanguage}` +
        `&sort_by=popularity.desc` +
        `&primary_release_date.gte=${fromDate}` +
        `&primary_release_date.lte=${toDate}` +
        `&with_release_type=2|3` +
        `&page=1`;
      
     } else if (request.query.type === "now-playing") {

  url =
    `https://api.themoviedb.org/3/movie/now_playing?language=${tmdbLanguage}&region=ES&page=1`;

} else if (request.query.type === "trailers") {

  const today = new Date();
  const sixMonths = new Date();
  sixMonths.setMonth(sixMonths.getMonth() + 6);

  const formatDate = (date) => {
    return date.toISOString().split("T")[0];
  };

  const fromDate = formatDate(today);
  const toDate = formatDate(sixMonths);

  url =
    `https://api.themoviedb.org/3/discover/movie` +
    `?language=${tmdbLanguage}` +
    `&sort_by=popularity.desc` +
    `&primary_release_date.gte=${fromDate}` +
    `&primary_release_date.lte=${toDate}` +
    `&with_release_type=2|3` +
    `&page=1`;

} else {

      url =
        `https://api.themoviedb.org/3/movie/popular?language=${tmdbLanguage}&page=1`;
    }

    const tmdbResponse = await fetch(url, {
  headers: {
    Authorization: `Bearer ${process.env.TMDB_API_TOKEN}`,
    accept: "application/json"
  }
});

if (!tmdbResponse.ok) {
  return response.status(tmdbResponse.status).json({
    error: "TMDB request failed"
  });
}

const data = await tmdbResponse.json();


// TRAILERS

if (request.query.type === "trailers") {

  const trailerMovies = [];

  for (const movie of data.results) {
    
    try {

      const videosResponse = await fetch(
        `https://api.themoviedb.org/3/movie/${movie.id}/videos?language=en-US`,
        {
          headers: {
            Authorization: `Bearer ${process.env.TMDB_API_TOKEN}`,
            accept: "application/json"
          }
        }
      );

      if (!videosResponse.ok) {
        continue;
      }

      const videosData = await videosResponse.json();

      const trailers = videosData.results
        .filter(video =>
          video.site === "YouTube" &&
          video.type === "Trailer" &&
          video.official === true
        )
        .sort((a, b) =>
          new Date(b.published_at) - new Date(a.published_at)
        );

      if (trailers.length === 0) {
        continue;
      }

      const trailer = trailers[0];
      

      trailerMovies.push({
        id: movie.id,
        title: movie.title,
        poster_path: movie.poster_path,
        backdrop_path: movie.backdrop_path,
        release_date: movie.release_date,
        popularity: movie.popularity,
        trailer: {
          key: trailer.key,
          name: trailer.name,
          published_at: trailer.published_at
        }
      });

    } catch (error) {
      console.error(
        `Trailer lookup failed for movie ${movie.id}`,
        error
      );
    }
  }

  trailerMovies.sort((a, b) =>
    new Date(b.trailer.published_at) -
    new Date(a.trailer.published_at)
  );

  return response.status(200).json({
    results: trailerMovies.slice(0, 30)
  });
}


return response.status(200).json(data);

  } catch (error) {
    console.error(error);

    return response.status(500).json({
      error: "Something went wrong"
    });
  }
}
