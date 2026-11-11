# Nous 1.5 — Trace candidate

Follow the thread.

## Build and verify

From the repository root with Node.js 24 and Python 3.12:

```sh
python3 release/trace/package.py /workspace/nous-1.5-rc.1
```

The packager verifies the candidate's five application/brand hashes, source/bookmarklet/preview equality, syntax, the original regression suites, and Trace checks through all three entry points. Baseline-dependent comparisons and benchmarks explicitly skip inside packaging; run them separately with a retained stable source:

```sh
NOUS_BASELINE=/path/to/1.4/Nous_Source.js node tests/preservation.cjs
NOUS_BASELINE=/path/to/1.4/Nous_Source.js node tests/discovery.cjs
NOUS_BASELINE=/path/to/1.4/Nous_Source.js node tests/trace-preservation.cjs
NOUS_BASELINE=/path/to/1.4/Nous_Source.js node tests/benchmark.cjs
NOUS_BASELINE=/path/to/1.4/Nous_Source.js node tests/trace-benchmark.cjs
NOUS_BASELINE=/path/to/1.4/Nous_Source.js node tests/trace-browser.cjs
```

The final command is optional and requires Playwright and Chromium (already available in the validation environment). Set CHROMIUM_PATH if needed. It starts its own loopback fixture server and closes the browser afterward; no application dependencies are introduced. Without NOUS_BASELINE it still tests Trace but explicitly reports zero baseline geometry comparisons.

Build twice into separate directories and compare Nous-v1.5-rc.1.tar.gz. The explicit file list, fixed metadata, sorted entries, and timestamp-free gzip header make identical inputs reproducible with the same Python/zlib toolchain. SHA256SUMS inside the archive covers every included file; the sidecar covers the archive. Output stays outside the checkout.

The distribution files are deliberately updated for this feature: the bookmarklet is `javascript:` followed by the same existing line-trimming/space-joining transform of Nous_Source.js, plus a newline in the file. The preview's const code string is the exact readable source; its const text string is the bookmarklet without the file newline. No other preview content changes. tests/core.cjs checks these equalities and syntax.

## Stable rollback and approval

Stable Nous 1.4 remains at main's pre-feature commit ef3639981fd9e49cc8c416002f43ec7b4b436f2c and in its original Git history. The previous release/ scripts, manifests, notes, and maintenance report remain historical 1.4 files, unchanged. Use those scripts only from that stable revision. A verified 1.4 archive was retained separately during validation; no stable tag or historical release was changed.

The feature branch is feature/trace and the PR targets main, following merged cleanup PR #1. NOTES.md is proposed release text. A draft prerelease candidate may accompany the PR; it must not be published as the final 1.5 release without explicit approval. Do not merge the PR automatically, change repository settings, deploy Pages, add a license, or replace stable artifacts as part of preparation.

Physical iPhone Safari and real bookmark installation remain required device checks before a confident device-specific release claim. See REPORT.md for evidence and limitations.
