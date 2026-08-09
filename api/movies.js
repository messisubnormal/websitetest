export default async function handler(request, response) {
  try {
    const movieId = request.query.id;

    let url;

    if (movieId) {
      url = `https://api.themoviedb.org/3/movie/${movieId}?language=en-US&append_to_response=credits`;

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
        `?language=en-US` +
        `&sort_by=popularity.desc` +
        `&primary_release_date.gte=${fromDate}` +
        `&primary_release_date.lte=${toDate}` +
        `&with_release_type=2|3` +
        `&page=1`;
      
     } else if (request.query.type === "now-playing") {

  url =
    "https://api.themoviedb.org/3/movie/now_playing?language=en-US&region=ES&page=1";

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
    `?language=en-US` +
    `&sort_by=popularity.desc` +
    `&primary_release_date.gte=${fromDate}` +
    `&primary_release_date.lte=${toDate}` +
    `&with_release_type=2|3` +
    `&page=1`;

} else {

      url =
        "https://api.themoviedb.org/3/movie/popular?language=en-US&page=1";
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

  const today = new Date();

  for (const movie of data.results) {

    // Extra protection: never show a trailer for an already released movie
    if (
      !movie.release_date ||
      new Date(movie.release_date + "T00:00:00") <= today
    ) {
      continue;
    }

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
          video.official === true &&
          video.key
        )
        .sort((a, b) =>
          new Date(b.published_at) - new Date(a.published_at)
        );

      if (trailers.length === 0) {
        continue;
      }

      const trailer = trailers[0];

      const publishedDate = new Date(trailer.published_at);

      const ageInDays =
        (today - publishedDate) / (1000 * 60 * 60 * 24);

      // Do not keep old trailers on the homepage
      if (ageInDays > 120) {
        continue;
      }

      // Freshness score:
      // brand-new trailer = 1
      // 120-day-old trailer = 0
      const freshnessScore =
        Math.max(0, 1 - ageInDays / 120);

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
        },

        freshnessScore
      });

    } catch (error) {

      console.error(
        `Trailer lookup failed for movie ${movie.id}`,
        error
      );

    }
  }

  // Find the highest popularity among the selected movies
  const maxPopularity = Math.max(
    ...trailerMovies.map(movie => movie.popularity),
    1
  );

  // Combine freshness + popularity
  trailerMovies.forEach(movie => {

    const popularityScore =
      movie.popularity / maxPopularity;

    movie.trailerScore =
      (movie.freshnessScore * 0.70) +
      (popularityScore * 0.30);

  });

  // Highest combined score first
  trailerMovies.sort((a, b) =>
    b.trailerScore - a.trailerScore
  );

  // Remove internal scoring properties before sending to the frontend
  trailerMovies.forEach(movie => {
    delete movie.freshnessScore;
    delete movie.trailerScore;
  });

  return response.status(200).json({
    results: trailerMovies.slice(0, 30)
  });
}
}
