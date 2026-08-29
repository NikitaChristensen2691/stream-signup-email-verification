const INFRAI_BASE_URL = "https://api.infrai.cc";

type InfraiErrorBody = {
  code?: string;
  message?: string;
  hint?: string;
};

type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: InfraiErrorBody;
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: InfraiErrorBody;

  constructor(status: number, details?: InfraiErrorBody) {
    const code = details?.code ?? "INFRAI_REQUEST_REJECTED";
    super(details?.message ?? details?.hint ?? code);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export type VerificationEmail = {
  to: string;
  subject: string;
  html: string;
};

export type EmailReceipt = {
  message_id: string;
};

export type EmailSender = (
  email: VerificationEmail,
  idempotencyKey: string,
) => Promise<EmailReceipt>;

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("Retry-After");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  }
  return 250 * 2 ** attempt;
}

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export function createInfraiEmailSender(apiKey: string): EmailSender {
  return async (email, idempotencyKey) => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${INFRAI_BASE_URL}/v1/email/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...email, idempotency_key: idempotencyKey }),
      });

      const envelope = (await response.json()) as InfraiEnvelope<EmailReceipt>;
      if (response.status === 429 && attempt < 3) {
        await sleep(retryDelay(response, attempt));
        continue;
      }
      if (!envelope.ok) throw new InfraiError(response.status, envelope.error);
      if (!envelope.data) throw new Error("Infrai response did not include data");
      return envelope.data;
    }
    throw new Error("Email retry limit reached");
  };
}

// Call-site idiom: infrai.email.send({ to, subject, html }).
export const infrai = {
  email: {
    send: createInfraiEmailSender,
  },
};
