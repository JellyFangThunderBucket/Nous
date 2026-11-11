# Nous 1.5 — Trace (release candidate)

Discover it. Understand where it came from.

Follow the thread.

Peek now explains a resource's retained discovery method in its existing footer: for example, “Discovered via img.currentSrc.” No new controls, panels, styling, scanning, requests, storage, or permissions are introduced. Warnings, inspection feedback, and errors retain priority; missing or unrecognized metadata is omitted.

Trace describes how Nous found the resource. It does not establish its original creator, network initiator, script call stack, or complete request chain. Duplicate URLs retain their existing first discovery method within each category.

The readable source, installable bookmarklet, and preview payloads match. The original regression suite and 96 targeted Trace checks across all three entry points pass. Chromium fixture checks at 320/390 CSS pixels verify normal/blocked inspection, repeats, Back, close/reopen, and 22 baseline geometry comparisons. The scanner, inspection behavior, UI template, styles, gestures, and brand assets are unchanged against 1.4. See REPORT.md for size and synthetic benchmark results.

Physical iPhone Safari, real bookmark installation, native touch, arbitrary-site CORS/CSP behavior, and device performance remain unverified. No YouTube workaround or compatibility claim is included. This candidate has not been approved as the final release. Stable 1.4 remains available from its original commit and rollback archive.
