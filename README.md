# Client Pipeline · Cash Flow Architects

An architectural drawing of households in process of getting life insurance and becoming a client. Each bay is a stage. Each card shows the next work required to move the household forward. Drag a card, or advance it from the spec sheet, and the same stage writes back to Captivation Hub.

## What you see

The board is a building section, not a spreadsheet:

- **Site Survey → Stewardship** bays map onto your CRM pipeline stages
- Each household card shows the **next action** and how long they have sat in that bay
- A red revision cloud marks households behind the drawing schedule
- The spec sheet lists advisor, household, and carrier work to clear the current bay

Without Hub credentials the drawing runs on sample households so you can learn the board immediately.

## Two-way Captivation Hub sync

Captivation Hub is a white-label of GoHighLevel. This app talks to the same LeadConnector API your sub-account already uses.

**Hub → drawing**

- The board loads pipelines and opportunities on every refresh
- While Hub is connected, the drawing re-pulls every 45 seconds
- Point a Hub workflow webhook at `POST /api/webhooks/ghl` so stage changes in the CRM show up without waiting on the poll

**Drawing → Hub**

- Drag a household to another bay, or use **Advance** / **Move to bay**
- The app `PUT`s the opportunity to the matching `pipelineStageId`
- Marking **client** (final bay) or a status change writes opportunity status back as well
- Immediate Hub webhooks for those same writes are ignored for a few seconds so the two sides do not ping-pong

## Connect your location

Open **Connect Captivation Hub** on the drawing (`/connect`) and follow the sheet:

1. Log into Captivation Hub and open the **sub-account** that holds your life-insurance pipeline.
2. Copy the Location ID from the URL after `/location/` (or paste the whole URL).
3. Settings → Private Integrations → Create new Integration named **Cash Flow Blueprint**.
4. Enable Opportunities (view + edit) and Contacts (view). Copy the token immediately.
5. Paste token + Location ID and click **Test connection**.

A successful test stores an httpOnly session cookie (180 days) and loads live opportunities. Drag or Advance on the drawing writes the stage back to Hub immediately. While the drawing is open it re-pulls Hub every 20 seconds.

If Private Integrations is missing: Settings → Labs → enable it, or switch from agency view into the sub-account.

### Keep the connection

Paste the token only on `/connect`, never in chat or email.

- **This browser:** the session cookie keeps Hub linked for 180 days. Claim the Vercel deploy first so the URL does not expire.
- **Always on:** after claiming, add env vars in Vercel → Project → Settings → Environment Variables, then redeploy:

```bash
GHL_API_KEY=pit-...
GHL_LOCATION_ID=...
GHL_PIPELINE_ID=          # optional; otherwise the app prefers a pipeline named like life / insurance / client / design
GHL_WEBHOOK_SECRET=       # optional shared secret for /api/webhooks/ghl
```

- **Hub → drawing without waiting:** in Hub, Automation → Workflow → Webhook on opportunity created / updated / stage changed, POST to `https://<your-domain>/api/webhooks/ghl` (add `?secret=` if you set `GHL_WEBHOOK_SECRET`).
- **Drawing → Hub:** drag a household or click Advance. That `PUT`s the opportunity stage in Captivation Hub.

If the token is missing or Hub errors, the drawing falls back to the sample households and shows the reason in the title strip.

## Local development

```bash
npm install
npm test
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy

This repo is a Next.js app. Vercel builds `npm run build` automatically. Claim the deploy, add the Hub env vars in the Vercel project, then redeploy so every visitor sees the live pipeline without pasting a token.
