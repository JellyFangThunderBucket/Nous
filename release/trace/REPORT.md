# Nous 1.5 — Trace regression report

## Implementation and base

Follow the thread.

The feature branch starts at maintained main commit
`ef3639981fd9e49cc8c416002f43ec7b4b436f2c`, after merged cleanup PR #1.
The authoritative application is Nous_Source.js. The bookmarklet and preview
embed that implementation; tests/core.cjs verifies exact equality. The complete
1.4 baseline suite passed before source modification, and a verified stable
archive was retained outside the checkout for rollback.

Trace adds a small, selection-local allowlist of the scanner's existing source
values and formats “Discovered via …” through the existing footer textContent
setter. No scanner, observer, instrumentation, storage, permission, dependency,
network request, asynchronous work, or UI element is added. Unknown or missing
metadata falls back to the original message. Recognized values are fixed scanner
labels rather than arbitrary page text.

Image and metadata previews use the short explanation. Media keeps a playback
caveat, and embedded previews keep “If blocked, use Open.” Unsupported link schemes
keep their original guidance. Image/media errors replace Trace with the exact
existing failure message. Inspection progress/results/errors retain their
existing writers, and frame load events do not restore Trace. Existing closed
and previewToken guards reject callbacks from abandoned selections. Trace does
not identify the network initiator, creator, call stack, or request chain.

Duplicate URLs preserve the scanner's first discovery method within a category.
In a real browser, a responsive image may be retained as img.currentSrc before
the srcset pass; the rendered fixture verifies that behavior rather than
incorrectly labelling every responsive image “srcset.” Synthetic fixtures also
exercise entries actually retained from srcset.

## Verified tests

Runtime: Node.js 24.22.1, Chromium 156, Linux. No physical iPhone was available.

- Baseline: all eight ordinary 1.4 regression invocations passed; the original
  1.3 preservation and benchmark runs explicitly skipped without authentic 1.3
  assets. Skips were not counted as passes.
- Candidate: syntax, core, discovery, settings-touch, inspection-history,
  refinement (25 checks, zero failures), and entrypoints passed. The entrypoint
  interactions passed for source, bookmarklet, and preview, including export
  version 1.5, settings, copy/export, gestures, close and repeated launch.
- New Trace suite: 32 checks in each of source, bookmarklet, and preview modes
  (96 passing checks). Covers links, src/currentSrc/srcset, audio/video,
  scripts/styles, frames, metadata, Performance API entries, preloads, duplicates,
  safe omission, error priority, obsolete callbacks, unsupported schemes, and
  reopen. The scanner remains bounded at its existing 2,500 entries.
- Against stable 1.4: preservation, discovery, and trace-preservation pass.
  UI markup/styles, icons, category ordering, layout, gestures, brand files,
  scanner, complete inspection/history/filtering block, and cleanup are
  byte-identical. This protects live/HTML feedback, retained results after
  failure, five-entry history, repeat/rescan state, pagination/scroll, preloads,
  deduplication, and cancellation.
- Real Chromium: ordinary/blocked previews, live and repeated inspections,
  failed inspection retaining its error, Back, search, unsupported links,
  close/reopen, and the actual updated demo pass at 320/390 CSS-pixel widths.
  Twenty-two comparisons with 1.4 show identical inspector/Peek geometry and
  button counts, with no footer-height increase. No page JavaScript errors.
- Distribution source equality and embedded-script syntax pass. Preview HTML
  outside the two embedded payload strings is byte-identical to stable 1.4.
  Both brand files and the historical release/ artifacts are unchanged.
- The candidate package builds identically twice. Extracted checksums verify;
  rebuilding from the extracted package produces the same archive. Documentation
  relative links resolve and the README renders with GFM parsing.

The core test's old hard-coded “visualBrowserTest: blocked by environment” field
is historical fixture output, not an actual browser probe. The independently
executed trace-browser.cjs result above establishes current rendered coverage.

## Measured size and performance

Byte counts include the bookmarklet file's trailing newline; gzip uses fixed
metadata. Raw values and benchmark methods are saved in measurements.json.

| Artifact | Stable 1.4 bytes | Trace bytes | Difference |
| --- | ---: | ---: | ---: |
| Readable source | 65,699 | 66,324 | +625 |
| Bookmarklet | 62,036 | 62,623 | +587 |
| Preview HTML | 137,437 | 138,672 | +1,235 |
| Bookmarklet gzip | 17,814 | 17,968 | +154 |

Synthetic image Peek: 20 warmup batches, then 61 alternating batches of 1,000.
Median per preview: 0.003437 ms for 1.4, 0.003668 ms for Trace, an increase of
about 0.000231 ms (0.23 microseconds, 6.7%). This small measured formatting cost
excludes browser layout, network, rendering, and device behavior.

The existing scanner benchmark uses 20 warmups, 61 alternating warmed samples,
and 21 first-call samples per source. At 1,000 links, first-call medians were
2.707 → 3.195 ms and warmed medians 1.490 → 1.760 ms. At 12,000 links, first-call
medians were 25.023 → 20.993 ms and warmed medians 18.878 → 20.121 ms. Peak Set
sizes were unchanged (1,002 and 2,500). The scanner function is byte-identical;
these variable measurements do not demonstrate a scanner improvement or a
Trace-induced scanner regression. No meaningful regression was demonstrated by
the small added synthetic Peek cost, but no iPhone speed guarantee is made.

## Limitations and approvals

Physical iPhone Safari rendering, native touch, real bookmark installation,
Safari clipboard/download behavior, device speed/memory, and site-specific
CORS/CSP, authentication, redirects, and embedding restrictions remain
unverified. Original scanner and large-HTML-response limitations remain. No
YouTube workaround or website instrumentation was attempted. No new claim is
made about the historical 1.3 comparison results.

main and stable 1.4 history are unchanged. The final 1.5 release is not approved
for publication. The PR must not merge automatically. No Pages deployment,
license addition, repository visibility change, or settings change is included.
