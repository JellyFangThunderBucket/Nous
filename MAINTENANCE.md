# Nous 1.4 repository cleanup

## Scope and file changes

- Move all eight `.cjs` scripts from the root to `tests/`, without changing their bytes. Their existing parent-directory paths now resolve correctly; TESTING.txt already documents the correct commands.
- Replace the placeholder README.md with Markdown installation instructions, features, inspection behavior, limitations, development commands, philosophy, and license status. Retain README.txt as the plain-text distribution guide.
- Clarify historical browser-test limitations in TESTING.txt and append current maintenance evidence. Historical measurements remain identified as historical.
- Add release/package.py, release/FILES.sha256, release/NOTES.md, and release/README.md for verified deterministic packaging, proposed release text, approval boundaries, Pages assessment, and license recommendation.
- Add this report. No application functionality, interface, asset, dependency, or test logic is changed.

## Verification

Baseline commit: `42fc8c91103e0c80b51d0764c599d50104f51a21`.

The SHA-256 manifest in release/FILES.sha256 preserves Nous_Source.js,
Nous_Bookmarklet.txt, Nous_Preview.html, Nous_Brand.svg, and Nous_Brand.png.
All five are byte-for-byte equal to the baseline. Each moved test is likewise
byte-for-byte equal to its root-level baseline counterpart.

The core suite verifies that the bookmarklet is exactly the existing whitespace-flattened readable source, and that both the preview's embedded source and embedded bookmarklet exactly match their distribution files. Source, bookmarklet, and demo script syntax pass. No distribution mismatch was found, and nothing was regenerated.

Node.js 24.22.1: six non-comparative scripts and the two additional entry-point modes pass (eight passing fixture invocations). The refinement script reports 25 checks and zero failures. All eight scripts were invoked: preservation and benchmark explicitly skip because the separately retained 1.3 package is absent. The history contains no 1.3 source to use as an authentic baseline. These skipped comparisons are not counted as passes.

Chromium 156 on Linux: the real demo passes initial resource collection, search filtering and reset, settings interaction, close, and relaunch without page JavaScript errors. README Markdown renders with GFM parsing, the expected heading, tagline, and code blocks; all repository-relative Markdown links resolve. GitHub's actual rendered page has not been checked through its API. Physical iPhone Safari, actual bookmark installation, native touch, cross-site security behavior, visual parity with 1.3, and device performance remain unverified.

Two independent package builds produce byte-identical archives. An extracted archive passes its SHA256SUMS manifest and its own package validation. Reproduction requires the same file inputs and Python/zlib toolchain; metadata and gzip timestamps are fixed. Release archives and checksums remain outside the source checkout.

## Hygiene findings

No committed credential files, private keys, obvious token patterns, dependency caches, generated archives, or unrelated project files were found. A heuristic secret-pattern scan covered both available commits; this is not proof that every possible secret format is absent. No history was rewritten.

Version identifiers consistently describe 1.4. References to 1.3 in the audit, changelog, and testing notes are intentional historical comparisons. Existing README.txt, AUDIT.md, CHANGELOG.md, and both brand formats are useful distribution/reference files and are retained. The previous root-level test placement and placeholder README are repaired. No unnecessary application artifacts were removed.

Repository-relative links resolve. The two GitHub audit references return HTTP 200. Requests to Apple, MDN, and WHATWG are blocked by the environment proxy, so their current availability could not be checked. No claim is made that all third-party destinations are reachable.

No license currently exists. MIT is recommended after ownership review and explicit approval; none was added. The preview can be hosted directly as a static HTML file on GitHub Pages, but no preview changes, Pages configuration, or deployment is included. See release/README.md.

## Remote operations and approvals

The maintenance branch targets main. PR merge, license addition, Pages deployment, tag push, and release publication require the approvals specified in the request. An annotated local v1.4 tag is prepared only after tests pass. No release is published.

Git HTTPS access works, but the environment proxy denies api.github.com. The configuration service also rejects the attempted network draft update with INVALID_ARGUMENT. Creating a PR and a GitHub draft Release requires GitHub API access; local preparation cannot substitute for those remote objects. The release notes and reproducible package remain available for that step once access is restored.
