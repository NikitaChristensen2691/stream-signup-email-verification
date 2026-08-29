import assert from "node:assert/strict";
import test from "node:test";
import { createSignupWorkflow } from "../src/signup_workflow.js";

test("queues media but holds creator delivery until email verification", async () => {
  const sent: Array<{ email: unknown; key: string }> = [];
  const acceptSignup = createSignupWorkflow({
    publicBaseUrl: "https://stream.example",
    newId: () => "signup-42",
    sendEmail: async (email, key) => {
      sent.push({ email, key });
      return { message_id: "msg-42" };
    },
  });

  const result = await acceptSignup({
    email: "creator@example.com",
    creatorName: "Mina",
    asset: { title: "Night Bus Sessions", mediaType: "audio" },
  });

  assert.deepEqual(result, {
    signupId: "signup-42",
    verification: "pending",
    assetIngestion: "accepted",
    processingJob: "queued",
    creatorDelivery: "awaiting_email_verification",
    emailMessageId: "msg-42",
  });
  assert.equal(sent[0]?.key, "creator-signup:signup-42");
  assert.match(String((sent[0]?.email as { html: string }).html), /verify-email\?token=/);
});
