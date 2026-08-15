export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({
      error: "Method not allowed"
    });
  }

  response.setHeader(
    "Set-Cookie",
    "user_id=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
  );

  return response.status(200).json({
    success: true
  });
}
