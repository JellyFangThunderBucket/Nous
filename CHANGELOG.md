# Nous 1.5 — Trace (release candidate)

- Show retained discovery metadata in Peek's existing footer, with no new controls, markup, styling, scanner, storage, or requests.
- Keep image/media failures, embed warnings, unsupported-link guidance, and inspection feedback in priority. Ignore stale preview callbacks using the existing selection token.
- Omit unknown discovery metadata. Duplicate resources retain their existing first discovery method; no request-initiator claims are made.
- Refresh the bookmarklet and preview payloads from the updated readable source; exports identify version 1.5. Brand assets and the existing UI remain unchanged.

See [Trace regression report](release/trace/REPORT.md) for validation and limitations. Physical iPhone Safari remains unverified. This candidate is not the approved final release.

# Nous 1.4 — The Refinement Release

- Report a completed live or HTML-only inspection and its resource count in the
  existing status locations. HTML-only results explicitly note that live network
  data is unavailable. Rescan messages now also update the matching Peek status,
  including failures, so an old success message is not left behind. A scan that
  finds only the page title and address says that it found only page details.
- Keep the prior inspection and identify timeouts, blocked scans, and unverified
  redirects as failures. A 12-second inspection timeout releases its controls;
  cancelled or stale work cannot replace a later inspection.
- Retain search, category, pagination and scroll when inspecting the same URL
  again or rescanning. New pages still use the existing five-entry Back history.
- Show the active address with its port, query and fragment where applicable;
  preserve the requested fragment in a successful non-redirected HTML fallback.
- Recognize conventional `rel=preload` resource types and responsive image
  preload candidates in the existing categories, after 1.3's original resources
  and only while the existing 2,500-entry cap has room. Existing per-category
  deduplication and the original ordering before these additions are unchanged.
- Bound the scanner's deduplication set to the existing 2,500 accepted entries
  instead of retaining keys for every additional discarded candidate.
- Update the version in JSON exports and the demonstration's release label.
  Refresh the documentation and add the included regression checks.

The interface markup, styling, icons, panel geometry, touch implementation,
settings, categories and brand assets remain unchanged. Browser and device
verification limits are recorded in TESTING.txt. No external code was added.
