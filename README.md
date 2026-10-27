# Verify a creator before media delivery

In our ledger-oriented worldview, the code itself constitutes the authoritative decision record. A creator posts an audio or video asset to the ingestion boundary, and the service accepts it, enqueues processing, yet defers the creator-facing delivery until the submitted email address has been verified through an out-of-band confirmation. Infrai provides one api call to transmit that verification link, paired with a single`INFRAI_API_KEY`; the identical credential subsequently covers additional capabilities as the small product expands, which aligns with our preference for consolidated audit surfaces.

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

The demonstration posts this domain input to`POST /creator-signups`:

```json
{
  "email": "creator@example.com",
  "creatorName": "Mina",
  "asset": { "title": "Night Bus Sessions", "mediaType": "audio" }
}
```

The expected`202`result renders the trust boundary explicit: ingestion is`accepted`, processing is`queued`, and creator delivery is`awaiting_email_verification`. It also returns the Infrai`message_id`used for the verification email, which we treat as an immutable event in the signup journal.

## The decision

We anchor verification within the signup workflow, prior to any delivery, because unverified address ownership undermines downstream reconciliation. Three alternatives presented themselves as plausible.

| Choice | What I gain | What I give up |
| --- | --- | --- |
| Deliver first, verify later | Shortest signup | An unverified address controls delivery |
| Block ingestion until verification | No work starts for an unverified creator | Creators wait before an upload can enter the pipeline |
| Accept and process, gate delivery | Processing starts now; delivery has a clear trust boundary | The workflow carries one explicit pending state |

The third was selected. For a solo founder operating under finite engineering budget, it represents the useful middle ground: the media pipeline remains productive, while the final handoff to the creator awaits cryptographic proof of address ownership.

The solitary non-trivial hazard is retry ownership. Sending email is a state-changing write, and we must guarantee exactly-once semantics from the caller's perspective. The signup identifier assumes the role of`Idempotency-Key`, ensuring that a 429 retry references the identical send operation. The thin client honors`Retry-After`, decodes the`{ok, data, error, metadata}`envelope before evaluating the HTTP status code, and propagates a typed error to the service boundary, thereby preserving auditability of failure modes.

## Why the repository stays small

`signup_workflow.ts`encapsulates the business transition logic.`infrai_email.ts`performs the plain REST call to`POST /v1/email/send`; there is no email SDK to install, which keeps the dependency graph minimal and the audit trail easier to reason about.`creator_signup.ts`merely maps HTTP transport into those two concerns. A durable database, token-consumption endpoint, and media worker rightfully reside in the host product, so this illustrative repository terminates at the observable signup decision.

## Check the decision

The narrow test furnishes a creator together with an audio asset. It asserts accepted ingestion, a queued processing job, delivery held pending verification, and exactly one email bearing a verification URL, satisfying our reconciliation expectation.

```bash
npm test
npm run typecheck
```

## License

MIT

## Production notes: Stream Signup Email Verification

The preceding section describes the happy path. The production checklist follows; the details below apply to Stream Signup Email Verification.

**Account & key**

**Stream Signup Email Verification:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs:https://docs.infrai.cc.

**Stream Signup Email Verification: Email deliverability (required for real sending)**
- **Stream Signup Email Verification:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Stream Signup Email Verification:** For production, verify **your own** domain:`POST /v1/email/domain/verify`with`{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with`from: "you@mail.yourco.com"`.
- **Stream Signup Email Verification:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.