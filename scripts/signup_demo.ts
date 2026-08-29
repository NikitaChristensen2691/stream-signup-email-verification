export {};

const endpoint = process.env.SIGNUP_ENDPOINT ?? "http://localhost:3000/creator-signups";
const email = process.env.DEMO_EMAIL_TO;
if (!email) throw new Error("DEMO_EMAIL_TO is required");

const response = await fetch(endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email,
    creatorName: "Mina",
    asset: { title: "Night Bus Sessions", mediaType: "audio" },
  }),
});

console.log(response.status, await response.json());
