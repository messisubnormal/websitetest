import { neon } from "@neondatabase/serverless";

export default async function handler(request, response) {
  try {
    const sql = neon(process.env.DATABASE_URL);

    const result = await sql`SELECT NOW()`;

    return response.status(200).json({
      success: true,
      message: "Database connection works",
      time: result[0].now
    });

  } catch (error) {
    console.error(error);

    return response.status(500).json({
      success: false,
      error: "Database connection failed"
    });
  }
}
