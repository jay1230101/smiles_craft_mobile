# Smiles Craft — Legal / Privacy Policy

This folder contains the privacy policy for the Smiles Craft mobile app, ready to publish and link
from the Google Play listing.

| File | What it is |
|---|---|
| `privacy-policy.html` | Self-contained web page (no external files). **Host this and use its URL in Play Store.** |
| `privacy-policy.md` | The same text in Markdown, for records or pasting into a website/CMS. |
| `README.md` | This file — how to fill in, publish, and complete the Play Console forms. |

The `.html` file is fully standalone: all styling is inline, it works offline, and it renders in both
light and dark mode. Drop it on any static host as-is.

---

## Step 1 — Fill in the placeholders

Open `privacy-policy.html` (and `privacy-policy.md` if you want to keep them in sync) and replace
every token below. Each appears in a few places — search for the token and replace all occurrences.

| Token | Replace with | Example |
|---|---|---|
| `[COMPANY_NAME]` | Legal name of the business publishing the app | Smiles Craft LLC |
| `[EFFECTIVE_DATE]` | The date you publish the policy | 15 July 2026 |
| `[CONTACT_EMAIL]` | A monitored privacy/support email | privacy@smilescraft.com |
| `[POSTAL_ADDRESS]` | Registered business address | 123 Example St, City, Country |
| `[GOVERNING_JURISDICTION]` | Country/region whose law governs the data | Lebanon |
| `[DELETION_URL]` | Web page or form for account-deletion requests | https://www.smilescraft.com/delete-account |
| `[WEBSITE]` | Public website (already defaults to smilescraft.com) | https://www.smilescraft.com |

Tip: to find anything you missed, search the files for a `[` bracket.

## Step 2 — Publish the page (pick one)

The policy must live at a **public, stable HTTPS URL**. Any of these work:

- **Your own website** — upload `privacy-policy.html` to `https://www.smilescraft.com/privacy` (or
  paste `privacy-policy.md` into your CMS).
- **GitHub Pages** — put the file in a repo, enable Pages, and it is served at
  `https://<user>.github.io/<repo>/privacy-policy.html`.
- **Netlify / Vercel / Cloudflare Pages** — drag-and-drop deploy of this folder; free tier is fine.

Confirm the final URL opens in a normal browser without logging in.

## Step 3 — Add the URL to Google Play

In **Play Console → your app → Policy → App content → Privacy policy**, paste the published URL and
save. The same URL can also go on the store listing.

## Step 4 — Complete the Play "Data safety" form

Play Console asks a separate **Data safety** questionnaire. The mapping below matches this app so the
two stay consistent. Adjust if your backend configuration differs.

**Does your app collect or share user data?** — Yes (collect). No data is sold or used for ads.

**Data types collected** (all: collected, encrypted in transit, tied to the clinic account):

| Play category → type | Collected? | Why (purpose) |
|---|---|---|
| Personal info → Name | Yes | App functionality, account management |
| Personal info → Email address | Yes | Account management, sign-in |
| Personal info → Phone number | Yes | App functionality (patient records, reminders) |
| Personal info → Other info (date of birth, gender) | Yes | App functionality |
| Health & fitness → Health info | Yes | App functionality (clinical records, treatment notes, allergies) |
| Financial info → Purchase/billing history | Yes | App functionality (invoices, payments, balances) |
| App activity → Other actions | Yes | App functionality (appointments, real-time updates) |
| App info & performance → Crash logs / Diagnostics | Yes | Analytics, security, reliability |
| Device or other IDs → Device/push identifier | Yes | Delivering notifications |

**Data sharing:** Only with service providers (hosting, notification delivery, appointment-reminder
messaging) acting on your instructions. **Not** shared for advertising and **not** sold.

**Security practices:** Data is encrypted in transit. Users can request account/data deletion (point
this at your `[DELETION_URL]`).

## Notes

- This document is a template to fit the app's actual behaviour. Have it reviewed against the laws
  that apply to your clinic and patients (e.g. GDPR, local health-data rules) before publishing — it
  is not legal advice.
- Google requires a way for users to request account deletion. Publish a simple page or form at
  `[DELETION_URL]` (it can just describe emailing `[CONTACT_EMAIL]`), and reference that same URL in
  Play Console.
- If the app later adds features that collect new data (e.g. card payments, third-party analytics),
  update both this policy and the Data safety form.
