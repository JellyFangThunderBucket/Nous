# Nous 1.5 — Trace

**Follow the thread.**

Nous is a lightweight Safari resource-inspection bookmarklet. It opens over the current webpage and lists browser-visible resources in a searchable panel, with a second panel for previews. It runs locally without external libraries, accounts, analytics, or telemetry.

## Features

- Discover links, images, video, audio, scripts, styles, frames, metadata, and available Performance API resource entries.
- Search and filter resources, then open a Peek preview.
- Inspect an accessible preview page, rescan it, and return through up to five earlier inspections, including their filters.
- Copy the filtered list or export it as JSON.
- Adjust theme, accent, text size, row spacing, URL wrapping, and panel sizes.

## Install or update in Safari on iPhone

1. Open [Nous_Bookmarklet.txt](Nous_Bookmarklet.txt) and copy **all** its contents, including `javascript:`. Use GitHub's Raw view to copy the file contents.
2. In Safari, create or edit a bookmark. Name it **Nous** and replace its URL with the copied code. Save it.
3. Visit a webpage and tap the saved Nous bookmark. Running Nous a second time closes it.

To update an existing bookmark, replace its URL with the 1.5 code. Older installed bookmarks do not update automatically.

## Trace: how a resource was discovered

When you open Peek, its existing footer can show a short explanation such as **Discovered via img.currentSrc** or **Discovered via Performance API**. There is no extra control to operate.

Trace reads the discovery method already retained by the scanner. It adds no scanning, network requests, observers, or storage. If several methods find the same URL in a category, Trace reports the first retained method. Missing or unrecognized metadata is omitted. Preview warnings and inspection results or errors take priority.

This explains how Nous found an entry. It does **not** identify its original creator, a JavaScript call stack, the actual network initiator, or a complete request chain.

## Inspection and history

Choose a category or search, then tap an entry to open its Peek preview. For a webpage in Peek, **Inspect this page** makes its accessible resources the active list while leaving the preview and underlying page in place. The address and count identify the active inspection. Existing status areas report completed live or HTML-only scans.

**Back** restores up to five earlier inspections, including filters. **Rescan** refreshes the active inspection. Repeating an inspection keeps the current search, category, and scroll position where possible.

The resource list and inspection history remain in the current session; they are not uploaded or saved automatically. **Copy list** copies the filtered list. **Export JSON** downloads filtered results and the active page address when permitted. Settings are saved in the current website's storage when available; clearing that storage can remove them.

## Live and HTML-only results

When a preview document is accessible, Nous reads its live DOM and available performance entries, including the current state of JavaScript-generated pages. Otherwise, Nous may request the preview URL using standard browser permissions and scan returned HTML. HTML-only results exclude script-generated content and live network data.

If both methods are blocked, a request fails, or a redirected fallback destination cannot be verified, the previous inspection stays in place. Open the page and run Nous directly on it if permitted.

**Network** means available Performance API resource entries, not a complete request log. Collection is capped at 2,500 entries, so later entries may be omitted. The list is initially paginated. Rescan after a page changes; Nous does not continuously watch or crawl pages.

## Settings and controls

Settings controls appearance and panel sizes. Preferences are saved per website when storage is available. Panel sizes can be remembered after dragging; **Reset settings** restores defaults. Both panels have drag strips, and their title areas can resize them. Buttons keep their normal actions. **Minimize** collapses the main panel; tap again to restore it. **Maximize** and **Close** retain their usual behavior.

## Preview and files

[Nous_Preview.html](Nous_Preview.html) is a self-contained interactive demonstration with sample resources and a copy/install helper. Open it in a browser that runs scripts; some mobile file-preview apps do not.

[Nous_Source.js](Nous_Source.js) is the readable source. The bookmarklet and demonstration embed the same implementation. [Nous_Brand.svg](Nous_Brand.svg) and [Nous_Brand.png](Nous_Brand.png) are the brand assets. See [CHANGELOG.md](CHANGELOG.md), [AUDIT.md](AUDIT.md), [TESTING.txt](TESTING.txt), and [tests/](tests/) for changes and verification.

## Browser limitations

Previewing a resource makes the requests needed to display it; HTML-only inspection may request the selected page. Browser security, CSP, frame restrictions, content blockers, authentication, expiring URLs, and device settings may prevent injection, preview, inspection, copying, or playback. Nous does not bypass these restrictions.

Scanning does not traverse child frames or nested shadow roots. Some responsive-image edge cases remain, and very large HTML-only responses can consume substantial memory. See the audit and testing notes for details.

Physical iPhone Safari verification has not been performed. Test the bookmarklet on the intended device and important sites before relying on it. Synthetic tests and desktop Chromium do not certify Safari rendering, touch handling, clipboard/download permissions, or site-specific restrictions.

## Development

Node.js 24 is the validated runtime. No package install or build step is required. From the repository root:

```sh
node --check Nous_Source.js
node tests/core.cjs
node tests/discovery.cjs
node tests/settings-touch.cjs
node tests/inspection-history.cjs
node tests/refinement.cjs
node tests/entrypoints.cjs
node tests/trace.cjs
NOUS_ENTRY=bookmarklet node tests/entrypoints.cjs
NOUS_ENTRY=preview node tests/entrypoints.cjs
NOUS_ENTRY=bookmarklet node tests/trace.cjs
NOUS_ENTRY=preview node tests/trace.cjs
```

Optional comparisons require separately retained 1.3 files:

```sh
NOUS_BASELINE=/path/to/1.3/Nous_Source.js node tests/discovery.cjs
NOUS_BASELINE=/path/to/1.3/Nous_Source.js node tests/preservation.cjs
NOUS_BASELINE=/path/to/1.3/Nous_Source.js node tests/benchmark.cjs
```

For browser development, serve this directory with `python3 -m http.server` and open `Nous_Preview.html` through that server. The demo needs no backend. See [Trace release instructions](release/trace/README.md) for verified, reproducible packaging.

## Development philosophy

Keep Nous small, standalone, and understandable. Work within standard browser permissions, explain incomplete results, and preserve the page being inspected. Prefer focused maintenance and verified changes over unnecessary features or dependencies. The goal is a useful local tool with clearly documented limits.

See the [Trace regression report](release/trace/REPORT.md) for current test results, unchanged UI checks, measured costs, and remaining device limitations. The 1.4 audit and maintenance reports remain historical records.

## License

No license file is currently included. MIT is recommended, subject to approval by the rights holder. Public availability alone does not grant permission to reuse the software.
