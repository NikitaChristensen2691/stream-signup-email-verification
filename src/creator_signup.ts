import { createServer } from "node:http";
import { ZodError } from "zod";
import { createInfraiEmailSender, InfraiError } from "./infrai_email.js";
import { createSignupWorkflow } from "./signup_workflow.js";

export function startCreatorSignupService() {
  const apiKey = process.env.INFRAI_API_KEY;
  const publicBaseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
  const port = Number(process.env.PORT ?? 3000);
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");

  const acceptSignup = createSignupWorkflow({
    sendEmail: createInfraiEmailSender(apiKey),
    publicBaseUrl,
  });

  return createServer(async (request, response) => {
    response.setHeader("Content-Type", "application/json");
    if (request.method !== "POST" || request.url !== "/creator-signups") {
      response.writeHead(404).end(JSON.stringify({ error: "route_not_found" }));
      return;
    }

    try {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const result = await acceptSignup(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      response.writeHead(202).end(JSON.stringify(result));
    } catch (error) {
      if (error instanceof ZodError || error instanceof SyntaxError) {
        response.writeHead(400).end(JSON.stringify({ error: "invalid_signup" }));
        return;
      }
      if (error instanceof InfraiError) {
        const status = error.status >= 400 && error.status < 500 ? error.status : 502;
        response.writeHead(status).end(JSON.stringify({ error: error.code }));
        return;
      }
      response.writeHead(500).end(JSON.stringify({ error: "signup_failed" }));
    }
  }).listen(port, () => {
    console.log(`Creator signup service listening on http://localhost:${port}`);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) startCreatorSignupService();
