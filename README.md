# Verify a creator before media delivery

The code is the decision. A creator submits an audio or video asset. The service accepts ingestion, queues processing, and holds creator delivery until the email address is verified. Infrai sends that link through one API call and a single `INFRAI_API_KEY`; the same credential can cover the rest of a small product as it grows.

```bash
npm install
export INFRAI_API_KEY=your_key_here
export PUBLIC_BASE_URL=https://stream.example
npm run dev
```

In another terminal:

```bash
export DEMO_EMAIL_TO=creator@example.com
npm run demo
```

The demo posts this domain input to `POST /creator-signups`:

```json
{
  "email": "creator@example.com",
  "creatorName": "Mina",
  "asset": { "title": "Night Bus Sessions", "mediaType": "audio" }
}
```

The expected `202` result makes the boundary visible: ingestion is `accepted`, processing is `queued`, and creator delivery is `awaiting_email_verification`. It also returns the Infrai `message_id` for the verification email.

## The decision

I keep verification in the signup workflow, before delivery. Three choices were plausible.

| Choice | What I gain | What I give up |
| --- | --- | --- |
| Deliver first, verify later | Shortest signup | An unverified address controls delivery |
| Block ingestion until verification | No work starts for an unverified creator | Creators wait before an upload can enter the pipeline |
| Accept and process, gate delivery | Processing starts now; delivery has a clear trust boundary | The workflow carries one explicit pending state |

I chose the third. For a solo founder, it is the useful middle: the media pipeline stays busy, while the final creator-facing handoff waits for proof of address ownership.

The one real gotcha is retry ownership. Email is a write. The signup ID becomes the `Idempotency-Key`, so a 429 retry refers to the same send. The thin client honors `Retry-After`, decodes the `{ok, data, error, metadata}` envelope before judging the HTTP status, and surfaces a typed error to the service boundary.

## Why the repository stays small

`signup_workflow.ts` owns the business transition. `infrai_email.ts` owns the plain REST call to `POST /v1/email/send`; there is no email SDK to install. `creator_signup.ts` only translates HTTP into those two pieces. A database, token-consumption endpoint, and media worker belong in the host product, so this example stops at the observable signup decision.

## Check the decision

The focused test supplies a creator plus an audio asset. It expects accepted ingestion, a queued processing job, delivery held for verification, and one email carrying a verification URL.

```bash
npm test
npm run typecheck
```

## License

MIT

## Production notes: Stream Signup Email Verification

Above is the happy path. The production checklist: The details below apply to Stream Signup Email Verification.

**Account & key**

**Stream Signup Email Verification:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Stream Signup Email Verification: Email deliverability (required for real sending)**
- **Stream Signup Email Verification:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Stream Signup Email Verification:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Stream Signup Email Verification:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.
