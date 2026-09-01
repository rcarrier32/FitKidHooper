# Parent Consent Email — Operations

**Status:** Deployed and used (Sep 2026 initial blast)  
**Function:** `supabase/functions/send-consent-email/`  
**Project:** FKH Supabase `jjwaspyuldkwasfyrqbw`

---

## What it does

Sends one approval email per athlete to a parent/guardian inbox. Each email contains a signing link:

```
https://rcarrier32.github.io/FitKidHooper/?consent={token}
```

The parent signs on their own device. Account consent is required; live video workouts are a separate optional checkbox. Declining video does not affect the account.

This is separate from `send-parent-email`, which only targets parents who **already** consented (re-engagement queue).

---

## Prerequisites

Edge function secrets on FKH Supabase:

| Secret | Purpose |
|---|---|
| `PUSH_SECRET` | Auth gate — required on every invoke |
| `RESEND_API_KEY` | Resend API (shared account with Legends YBA) |
| `FKH_BROADCAST_FROM` or `FKH_FROM_EMAIL` | From address |
| `FKH_BROADCAST_REPLY` | Optional reply-to |

Tokens must already exist in `parent_consent_requests` (minted per athlete via `create_consent_request()` RPC or equivalent admin SQL).

---

## Invoke

```bash
curl -X POST \
  "https://jjwaspyuldkwasfyrqbw.supabase.co/functions/v1/send-consent-email" \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "<PUSH_SECRET>",
    "recipients": [
      { "email": "parent@example.com", "athlete": "Alex", "token": "<64-hex-token>" }
    ]
  }'
```

**Dry run** (reports config presence, never sends):

```json
{ "secret": "<PUSH_SECRET>", "dry_run": true, "recipients": [...] }
```

Subject line: `A quick approval for {athlete}'s Fit Kid Hooper account`

---

## After sending — track signatures

**Pending vs signed** (Supabase SQL editor):

```sql
-- Overview
select status, count(*) from parent_consent_requests group by status;

-- Still waiting (not expired)
select pcr.token, pcr.created_at, pcr.expires_at, ap.display_name
from parent_consent_requests pcr
join athlete_profiles ap on ap.id = pcr.athlete_id
where pcr.status = 'pending' and pcr.expires_at > now()
order by pcr.created_at;

-- Signed (consent on file)
select pcr.signed_at, pcr.parent_email, ap.display_name
from parent_consent_requests pcr
join athlete_profiles ap on ap.id = pcr.athlete_id
where pcr.status = 'signed'
order by pcr.signed_at desc;
```

Successful signing creates/updates `parental_consent` with `method = 'parent_signed_link'`.

Tokens expire **30 days** after creation. Re-minting via `create_consent_request()` reuses an existing pending token so parents aren't mid-sign when a reminder goes out.

---

## Deliverability & bounces

Resend is **shared** between FKH and Legends YBA.

| Where to check | What you see |
|---|---|
| [Resend dashboard](https://resend.com/emails) | Delivery status for all sends |
| Legends Admin → Broadcasts → Deliverability | Bounces/suppressions if webhook wired to `legendsyba.com/api/webhooks/resend` |

FKH does **not** have its own deliverability admin UI. FKH consent events may appear in Legends deliverability when the shared webhook is active.

`send-consent-email` does **not** check suppression lists before sending — verify bounces manually before a re-send blast.

---

## Sep 2026 initial blast

- Sent via `send-consent-email` with manually assembled `recipients[]`.
- All messages **delivered** in Resend; no bounces required cleanup.
- **Next:** parents sign at `?consent={token}`; monitor `parent_consent_requests.status` and follow up non-responders before token expiry.

---

## In-app alternative (no bulk send)

Athletes can invite a parent from the app via `ParentConsentInvite` — mailto, SMS, or copy link. Same token/`create_consent_request()` flow; no Resend involved.
