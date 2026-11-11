NOUS 1.6 — PERSONALIZE
Follow the thread.

INSTALL OR UPDATE ON IPHONE
1. Open Nous_Bookmarklet.txt and copy all of its contents, including javascript:.
2. In Safari, create or edit a bookmark. Name it Nous and replace its URL with
   the copied code. Save it.
3. Visit a webpage and tap the saved Nous bookmark. To update an existing Nous
   bookmark, replace its URL with the 1.6 code; the older installed bookmark will
   not update itself. Running Nous a second time closes it.

TRACE — HOW NOUS FOUND IT
Peek's existing footer can show "Discovered via img.currentSrc" or another
retained discovery method. No extra action is needed. Trace reads existing
resource metadata; it adds no scans, requests, observers, or storage. Duplicate
URLs report the first method retained in that category. Missing or unrecognized
metadata is omitted. Preview warnings and inspection feedback take priority.
This describes discovery, not the original creator, network initiator, script
call stack, or complete request chain. See release/trace/REPORT.md for checks
and unverified device behavior.

PERSONALIZE
Settings > Customize controls lets you show or hide existing toolbar actions,
Peek copy/inspection controls, Sources, window tools and resource tabs. Every
option starts visible. Hiding a tab does not stop scanning; its entries remain
in All, search and matching exports. Settings, All and critical navigation stay
available. Reset settings restores the original visibility configuration.
Preferences save per website when storage is available; they are not shared
across unrelated domains. See docs/personalize/REPORT.md for tests and limits.

SOURCES
Sources, immediately to the right of Settings, shows the current webpage's live
HTML as read-only text, with scrolling and an upper-right copy button. Reopen
the tab to refresh its snapshot. It excludes Nous itself and needs no request.

RESTRICTED PREVIEWS
Working embedded pages keep their existing behavior. Sites such as GitHub can
forbid embedding. Peek can show a safe, read-only text preview for blocked links
on the same website when normal browser permissions allow reading their HTML.
It does not execute the fetched page. Cross-origin restrictions, redirects,
errors or oversized pages may still require Open. See docs/SOURCES_AND_PREVIEWS.md.

WHAT INSPECTION DOES
Nous opens over the page and lists browser-visible resources in the top panel.
Choose a category or search, then tap an entry to open its Peek preview.

For a webpage in Peek, Inspect this page makes its accessible resources the
active list above, while leaving the preview and underlying webpage in place.
The address and count above the list identify the active inspection. A completed
live scan or HTML-only scan reports its result in the existing status areas.
Back restores up to five earlier inspections, including their filters. Rescan
refreshes the active inspection. Repeating the same inspection keeps the current
search, category, and scroll position where possible.

The resource list and inspection history live in the current Nous session. They
are not uploaded or saved automatically. Copy list copies the filtered list;
Export JSON downloads the filtered results and active page address when the
browser permits it. The settings are saved in the current website's storage when
available. Clearing website storage can remove those settings.

LIVE AND HTML-ONLY RESULTS
When a preview's document is accessible, Nous reads its live DOM and available
performance entries. A page assembled by JavaScript can therefore appear in its
current state. When live access is unavailable, Nous may request the preview URL
using standard browser permissions and scan returned HTML. HTML-only results do
not include script-generated content or live network data. If the browser blocks
both methods, the request fails, or a redirected fallback destination cannot be
verified, the previous inspection stays in place. Open the page and run Nous on
it directly if permitted.

Network means the browser's available Performance API resource entries; it is
not a complete request log. The scanner caps its collection at 2,500 entries,
so entries later in scan order may be omitted. The list is initially paginated.
Rescan after a page changes. Nous does not continuously watch or crawl pages.

SETTINGS AND CONTROLS
Settings controls theme, accent, resource text size, row spacing, URL wrapping,
and panel sizes. Preferences are saved for the current website when storage is
available. Panel sizes can be remembered after dragging. Reset settings restores
the defaults. Both panels have drag strips and their title areas can also resize
panels. Buttons keep their normal actions. Minimize collapses the main panel;
tap it again to restore it. Maximize and Close retain their established behavior.

PREVIEW AND FILES
Nous_Preview.html is a self-contained interactive demonstration with sample
resources and a copy/install helper. Open it in a browser that runs its scripts;
some mobile file-preview apps do not. Nous_Source.js is the readable source.
Nous_Bookmarklet.txt and the demonstration are built from that same source.
Nous_Brand.svg and Nous_Brand.png are the unchanged brand assets. CHANGELOG.md,
AUDIT.md, TESTING.txt, and tests/ explain the changes and verification.

BROWSER LIMITS
Nous is a standalone bookmarklet with no external library, account, analytics,
or telemetry. Previewing a resource makes the requests needed to display it, and
HTML-only inspection may request the selected page. Browser security, CSP,
frame restrictions, content blockers, authentication, expiring URLs, and device
settings can prevent injection, preview, inspection, copying, or playback. Nous
does not bypass these restrictions. It does not traverse child frames or nested
shadow roots when scanning a document. Some responsive-image edge cases and very
large HTML-only responses remain limitations; see AUDIT.md and TESTING.txt.

Physical iPhone Safari verification was not available for this release. Test the
bookmarklet on the intended device and important sites before relying on it.
