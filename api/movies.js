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

  for (const movie of data.results) {
    
  if (
  movie.release_date &&
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
