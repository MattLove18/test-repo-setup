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

A successful test stores an httpOnly session cookie and loads live opportunities. Drag or Advance on the drawing writes the stage back to Hub.

If Private Integrations is missing: Settings → Labs → enable it, or switch from agency view into the sub-account.

You can still set server env vars instead of the connect form (Vercel project settings, or `.env.local`):

```bash
GHL_API_KEY=pit-...
GHL_LOCATION_ID=...
GHL_PIPELINE_ID=          # optional; otherwise the app prefers a pipeline named like life / insurance / client / design
GHL_WEBHOOK_SECRET=       # optional shared secret for /api/webhooks/ghl
```

Optional webhook: in Hub, add a workflow that fires on opportunity created/updated/stage changed and POSTs to `https://<your-domain>/api/webhooks/ghl?secret=<GHL_WEBHOOK_SECRET>`.

If the token is missing or Hub errors, the drawing falls back to the sample households and shows the reason in the title strip.

## Local development

```bash
npm install
npm test
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy

This repo is a Next.js app. Vercel (already used for this project) will build `npm run build` automatically. Add the Hub env vars in the Vercel project, then redeploy.
