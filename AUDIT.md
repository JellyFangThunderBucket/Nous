# Nous 1.4 maintenance audit

Baseline: the unchanged Nous 1.3 package and source. The release retains the
standalone bookmarklet and the 1.3 UI. The table records the full source review,
its limits and the reason for each change or non-change.

| Area | Finding and decision |
| --- | --- |
| Discovery and categories | Existing selectors collect links, forms, media, scripts, styles, frames, metadata and browser performance entries. Retained their order, category names and per-type deduplication. Conventional preloads now also appear in their relevant existing type after the original scan entries, with no new request. A preload may remain in Links as in 1.3 as well as appear in its resource category. |
| URL resolution and duplicates | `new URL(value, base)` preserves different queries, fragments and encoded identities. A document's base URI, or an HTML fallback's applicable base element, is used. Dedupe is by type plus resolved value, with metadata treated as text. The key set is bounded by the existing 2,500-record limit; record order and accepted records remain unchanged up to that limit. An omitted post-limit candidate may be encountered repeatedly, but the UI shows a limit indication rather than an omitted-count total. |
| Links, images, media, scripts, styles | Original selectors and responsive-image parser retained; image preload `href` and `imagesrcset` and other conventional preload `as` types are added only after original entries. Tested common width/density descriptors, `currentSrc`, picture sources, encoded commas, data URLs and duplicates. The original parser is not a complete WHATWG malformed-descriptor validator; unusual malformed srcset may still be listed. Inline CSS parsing is deliberately limited. |
| Frames, metadata and Network | Frame URLs are listed but child documents and nested shadow roots are not traversed. Existing metadata and title/address entries remain. Network contains only entries exposed by the Performance API, not a complete traffic log. HTML-only fallback has no live performance entries. No fetch/XHR interception was added. |
| Search, filtering, pagination | Existing category, search matching, cap and incremental rendering are retained. Repeating the current inspection and rescanning preserve the search, selected category, pagination and scroll where possible; the browser may clamp scroll if a refreshed list shrinks. A new page retains the existing reset behavior. |
| Peek and Open | Existing media and page preview paths and opening behavior are unchanged. A site may refuse embedding; Open remains available subject to the browser. The original iframe sandbox, `allow-scripts allow-forms allow-same-origin`, is unchanged for compatibility. A same-origin document allowed both scripts and same-origin privileges may have substantially reduced sandbox isolation; it is not a security boundary equivalent to isolating an untrusted origin. |
| Inspect a Peek page | An accessible live DOM is scanned directly. Otherwise standard fetch may provide HTML if browser permissions permit. Completed status identifies the mode and count. A fallback that reports a redirect or a different response URL is rejected because Nous cannot verify that it represents the embedded document. Failure leaves the active inspection unchanged. The HTML fallback parses the whole response and has no hard byte cap; very large pages may use substantial memory. A new arbitrary cutoff was avoided because it would reject pages that 1.3 could inspect. |
| Rescan and history | Active-page rescans retain the view and report completion or failure; the matching Peek status is updated. The existing Back stack remains limited to five and restores the prior category, search, pagination and scroll. A timeout clears its controls, aborts the request, and prevents late results from applying. |
| Copy, export, preferences, cleanup | Existing clipboard fallback, filtered JSON export, per-site preferences, event cleanup, media release, object URL revocation and shadow-root isolation are retained. Export version is 1.4. Storage may be blocked. A currently inspected live iframe can remain hidden until it is replaced or Nous closes, supporting live rescans. |
| Mobile viewport and touch | Existing visual-viewport geometry, 32-pixel drag strips, pointer/touch fallbacks, minimization, maximization and gestures are untouched. The inherited geometry treats viewport heights below 240 CSS pixels as 240; extremely short viewports therefore need device verification. Native iOS events and rendering have not been tested on a physical iPhone. |

## References and decisions

- [Link Gopher extraction](https://github.com/az0/linkgopher/blob/master/content-script.js)
  emphasizes useful link extraction. Nous retains its own existing deduplication;
  recursive shadow-root walking and URL decoding were not imported because they
  change cost or resource identity.
- [Eruda's mobile initialization and cleanup](https://github.com/liriliri/eruda/blob/master/src/eruda.js)
  reinforces the value of isolated UI and lifecycle cleanup. No Eruda code or
  developer-tool modules were imported.
- [Safari Web Inspector](https://developer.apple.com/documentation/safari-developer-tools/web-inspector)
  distinguishes document/resources and network tooling; Nous does not present
  its Performance entries as complete traffic.
- [HTML responsive-image parsing](https://html.spec.whatwg.org/multipage/images.html#parsing-a-srcset-attribute),
  [MDN image preload attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link#imagesrcset),
  [iframe access and sandbox restrictions](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe),
  and [PerformanceResourceTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming)
  informed the tests and limitations above.

No code from these projects was copied. See TESTING.txt for measured results,
failed environment checks and unverified device behavior.
