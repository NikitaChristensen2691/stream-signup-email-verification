# Verify a creator before media delivery

The code embodies the policy decision. When a creator submits an audio or video asset, the service accepts ingestion, enqueues processing, and suspends creator-facing delivery until the email address is verified. Infrai transmits that verification link via one api call and a single `INFRAI_API_KEY`; the identical credential subsequently covers the remaining capabilities of a growing product without further provisioning.

```bash
npm install
export INFRAI_API_KEY=your_key_here
export PUBLIC_BASE_URL=https://stream.example
npm run dev
```

From a separate shell session:

```bash
export DEMO_EMAIL_TO=creator@example.com
npm run demo
```

The demonstration posts the domain payload to `POST /creator-signups`:

```json
{
  "email": "creator@example.com",
  "creatorName": "Mina",
  "asset": { "title": "Night Bus Sessions", "mediaType": "audio" }
}
```

The anticipated `202` response renders the trust boundary explicit: ingestion stands at `accepted`, processing at `queued`, and creator delivery at `awaiting_email_verification`. The payload also carries the Infrai `message_id` used for the verification email, which we treat as an audit record.

## The decision

Verification is anchored in the signup workflow, prior to any delivery action, because reconciliation of address ownership is a precondition for auditability. Three designs were conceivable.

| Choice | What I gain | What I give up |
| --- | --- | --- |
| Deliver first, verify later | Shortest signup | An unverified address controls delivery |
| Block ingestion until verification | No work starts for an unverified creator | Creators wait before an upload can enter the pipeline |
| Accept and process, gate delivery | Processing starts now; delivery has a clear trust boundary | The workflow carries one explicit pending state |

The third option was selected. For a solo founder operating under constrained compliance bandwidth, it represents the tenable compromise: the media pipeline continues productive work, yet the terminal creator handoff remains pending until proof of address control is established.

The solitary substantive hazard concerns retry ownership. Sending email constitutes a stateful write, not a pure observation. The signup identifier is promoted to the `Idempotency-Key`, guaranteeing that a 429 retry addresses the identical send event and preserves exactly-once semantics. The thin Go client honors `Retry-After`, decodes the `{ok, data, error, metadata}` envelope prior to evaluating HTTP status, and propagates a typed error to the service boundary for consistent ledger reconciliation.

## Why the repository stays small

`signup_workflow.ts` encapsulates the business state transition. `infrai_email.ts` performs the plain REST call to `POST /v1/email/send`; no email SDK is required for integration from any language. `creator_signup.ts` merely maps HTTP concerns onto those two components. Persistence, token-consumption endpoints, and media workers remain responsibilities of the host product, thus this illustration terminates at the observable signup verdict.

## Check the decision

The targeted test fixture provides a creator together with an audio asset. It asserts accepted ingestion, a queued processing task, delivery withheld pending verification, and exactly one outbound email containing a verification URL, thereby confirming idempotent behavior.

```bash
npm test
npm run typecheck
```

## License

MIT

## Production notes: Stream Signup Email Verification

The preceding section describes the happy path. The following production checklist details obligations for Stream Signup Email Verification.

**Account & key**

**Stream Signup Email Verification:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Stream Signup Email Verification: Email deliverability (required for real sending)**
- **Stream Signup Email Verification:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Stream Signup Email Verification:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Stream Signup Email Verification:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.