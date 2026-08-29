import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type { EmailSender } from "./infrai_email.js";

export const creatorSignupSchema = z.object({
  email: z.string().email(),
  creatorName: z.string().trim().min(1).max(80),
  asset: z.object({
    title: z.string().trim().min(1).max(120),
    mediaType: z.enum(["audio", "video"]),
  }),
});

export type CreatorSignup = z.infer<typeof creatorSignupSchema>;

export type SignupAccepted = {
  signupId: string;
  verification: "pending";
  assetIngestion: "accepted";
  processingJob: "queued";
  creatorDelivery: "awaiting_email_verification";
  emailMessageId: string;
};

type WorkflowOptions = {
  sendEmail: EmailSender;
  publicBaseUrl: string;
  newId?: () => string;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export function createSignupWorkflow(options: WorkflowOptions) {
  return async function acceptCreatorSignup(input: unknown): Promise<SignupAccepted> {
    const signup = creatorSignupSchema.parse(input);
    const signupId = (options.newId ?? randomUUID)();
    const token = createHash("sha256")
      .update(`${signupId}:${signup.email}`)
      .digest("hex");
    const verificationUrl = new URL("/verify-email", options.publicBaseUrl);
    verificationUrl.searchParams.set("token", token);

    const receipt = await options.sendEmail(
      {
        to: signup.email,
        subject: `Verify your email to deliver ${signup.asset.title}`,
        html: `<p>Hi ${escapeHtml(signup.creatorName)},</p><p>Your ${signup.asset.mediaType} is queued for processing.</p><p><a href="${verificationUrl.toString()}">Verify email and unlock creator delivery</a></p>`,
      },
      `creator-signup:${signupId}`,
    );

    return {
      signupId,
      verification: "pending",
      assetIngestion: "accepted",
      processingJob: "queued",
      creatorDelivery: "awaiting_email_verification",
      emailMessageId: receipt.message_id,
    };
  };
}
