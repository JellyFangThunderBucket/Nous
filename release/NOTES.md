# Nous v1.4 — The Refinement Release

Follow the thread.

- Report completed live and HTML-only inspections and preserve prior results when inspection fails.
- Keep filters and scroll state during repeat inspections and rescans; retain the five-entry Back history.
- Recognize conventional preloads and bound scanner deduplication to the existing 2,500-entry cap.
- Provide clear installation documentation and runnable regression tests under `tests/`.

This repository cleanup preserves the existing 1.4 JavaScript, bookmarklet, preview, and brand assets byte for byte. See CHANGELOG.md for the original 1.4 implementation details.

Validation: eight runnable Node fixture invocations pass, including all three entry points; source, bookmarklet, and preview payloads match. Desktop Chromium smoke checks cover scan, filtering, settings, close, and relaunch. The preservation comparison and benchmark skip without separately retained 1.3 assets. Physical iPhone Safari, real bookmark installation, native touch, site restrictions, and device performance remain unverified. No license has been added pending owner approval.

The archive includes a SHA256SUMS manifest and an external archive checksum. See release/README.md to reproduce it. Publication requires maintainer approval after the maintenance PR is reviewed.
