# Sources and restricted previews

## What changes

Sources sits immediately to the right of Settings. It shows a read-only snapshot
of the current webpage's live HTML, with wrapping, scrolling, light syntax
coloring and a copy button in the upper-right corner. It is not an editor and
does not navigate links, execute the displayed code or upload its contents.
Opening it again refreshes the snapshot. It excludes Nous itself and reads serialization without cloning page elements
or constructing custom components. This is the
current DOM, including page changes made by scripts, rather than a claim to be
the original HTTP response. It does not traverse frames or closed shadow roots.
The full snapshot is displayed and copied; coloring is bounded to the first
200,000 characters to avoid creating excessive token nodes on large pages.

Opening Sources uses the existing inspector panel. Returning to resources keeps
the selected category, search, pagination and scroll position. Settings, Sources
and the resource view are mutually exclusive. Sources can be minimized, restored,
closed with Escape and reopened. Its copy action uses the existing clipboard
fallback. No preferences, observers, storage or network operations are added for
Sources.

The other interface change is limited to content and status text inside an
otherwise blank Peek. Existing typography, colors, controls, gestures and panel
geometry are retained outside the added Sources content and tab. Both brand
files, the resource scanner and the inspection/history implementation are
unchanged.

## Why GitHub was blank

A verified HTTPS response from GitHub includes `X-Frame-Options: deny`,
`frame-ancestors 'none'`, and a `frame-src` policy that does not allow normal
GitHub pages. The screenshot already shows the Peek panel; its embedded content
is being blocked. A bookmarklet cannot turn that into a full interactive GitHub
page while respecting those restrictions.

Working embeds retain their original behavior, including interactive controls.
On a detected blocked same-origin preview, Nous can instead fetch the selected
HTML using the browser's normal same-origin permissions and show inert text.
This is labelled **Read-only text preview**. It never attaches fetched markup,
scripts, forms, frames or images to the live page. It does not remove CSP or frame
headers, use a proxy, alter the website, or change its security settings.

The fallback is deliberately conservative:

- Only the selected same-origin HTTP(S) URL is eligible. A working frame is not
  fetched again. Cross-origin embeds remain intact, and blocked cross-origin
  content must use Open.
- Browser fetch/CSP restrictions still apply. Authentication uses the browser's
  existing same-origin session; no new credential is requested or stored.
- Redirects, HTTP failures, and non-HTML responses are rejected. HTML is limited
  to 2 MiB with a 12-second timeout. Readable text is limited to 100,000 characters
  with an explicit shortened-result message.
- Selection tokens, request cancellation, and footer ownership prevent obsolete
  requests or inspection feedback from being overwritten. Closing, minimizing,
  switching links or opening Sources cancels pending preview work.
- Inspect this page retains the existing live/HTML inspection behavior. The
  text fallback is not a live or interactive copy of the page. Open remains the
  way to use the full website.

## Validation

Baseline: main commit `9fc20f4` after the merged Trace PR. All ordinary baseline
Node regression invocations passed before modification. The historical 1.4 and
Trace candidate files under release/ are retained as historical artifacts; their
hash-locked packagers must be run at their original revisions, not against this
follow-up's modified application files.

Checks for this follow-up:

```sh
node --check Nous_Source.js
node tests/core.cjs
node tests/discovery.cjs
node tests/settings-touch.cjs
node tests/inspection-history.cjs
node tests/refinement.cjs
node tests/entrypoints.cjs
NOUS_ENTRY=bookmarklet node tests/entrypoints.cjs
NOUS_ENTRY=preview node tests/entrypoints.cjs
node tests/trace.cjs
NOUS_ENTRY=bookmarklet node tests/trace.cjs
NOUS_ENTRY=preview node tests/trace.cjs
node tests/trace-browser.cjs
node tests/sources-preview-browser.cjs
NOUS_BASELINE=/path/to/previous/Nous_Source.js node tests/sources-preservation.cjs
```

The browser scripts use Playwright and Chromium already provided by the test
environment; they are not application dependencies. The new rendered checks
cover Sources placement, exact HTML copy, read-only rendering, full large-page
content, state restoration, Settings switching, minimize/Escape/reopen, and
continued operation of an underlying page control. A custom-element constructor
counter verifies that opening Sources does not instantiate page components. They verify working iframe
interaction, X-Frame-Options denial, parent CSP frame denial, preserved cross-origin embeds,
blocked cross-origin guidance, HTML-only inspection
and Back after fallback, HTTP errors, size limits and stale request cancellation
at 320/390 CSS-pixel widths. Fetched scripts, images and frames do not run or load.

Static comparisons verify byte-identical existing CSS (apart from the new
Sources-only rules), scanner, inspection/history functions, layout, gestures,
brand assets and preview HTML outside the generated payloads. Source, bookmarklet
and embedded demo are checked for exact implementation equality.

Live GitHub headers were verified with normal TLS validation. A live Chromium
GitHub navigation encountered the environment proxy certificate trust error.
Adding a persistent browser trust certificate was rejected by automatic approval
review; certificate verification was not disabled. Controlled browser fixtures
exercise the relevant policies, but physical iPhone Safari and live GitHub
end-to-end behavior remain unverified unless separately reported. No release is
published or merged automatically by this task.
