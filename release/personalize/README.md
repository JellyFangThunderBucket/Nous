# Nous 1.6 — Personalize candidate

Your tools. Your workspace. Follow the thread.

## Build

From the repository root with Node.js 24 and Python 3.12:

```sh
python3 release/personalize/package.py /workspace/nous-1.6-rc.1
```

The script verifies the five candidate distribution/brand hashes, syntax,
source/bookmarklet/preview equality, all pure Node regression scripts and the
source/bookmarklet/preview entry-point checks. Historical comparisons and
benchmarks explicitly skip without their required retained baselines.

For the installed Playwright/Chromium checks and maintained 1.5 preservation:

```sh
python3 release/personalize/package.py /workspace/nous-1.6-rc.1 --browser --baseline /path/to/1.5/Nous_Source.js
```

The baseline directory must retain its accompanying brand and preview files.
Tests use local fixture servers. No application dependency, account or permission
is added. Physical iPhone Safari remains a prerequisite for a confident stable
mobile release claim.

Build twice into separate output directories and compare the archives. The
explicit file list excludes Git metadata, local credentials and generated
archives. Sorted entries, fixed timestamps/ownership/modes, and a timestamp-free
gzip header make identical inputs reproducible with the same Python/zlib
runtime. SHA256SUMS inside the archive checks every included file; the sidecar
checks the archive itself. Rebuilding from an extracted archive also works.
Outputs must stay outside the checkout.

The bookmarklet uses the existing line-trimming/space-joining transform of the
readable source, prefixed by javascript:. The preview embeds the exact readable
source and bookmarklet strings. tests/core.cjs checks both equalities. Neither
packaging nor validation regenerates application files.

## Version and rollback

Personalize starts at maintained main commit
`71ac52b55ff07253ce96517b7be8691df040ff7f`, following merged cleanup, Trace and
Sources PRs. That working application identifies as 1.5; no public stable GitHub
Release was present at inspection, only an unpublished older Trace draft. Thus
1.6 is the proposed next feature version, not a claim about a published 1.5 tag.

The working 1.5 tree was retained and tested before changes. Its Git history,
main branch and all historical release notes/manifests/scripts remain unchanged.
A rollback archive was created directly from that commit, with SHA-256
`f83856073f672f0e2686635338e6874eb2b8528d1f5c3991479bbee4683d39dd`.

For an immediate bookmarklet rollback, obtain Nous_Bookmarklet.txt at that exact
commit and replace the installed bookmark's URL. There is no need to rewrite
history. Existing website-local preferences remain compatible: 1.5 ignores the
new visibility field. If the feature is merged later and a repository rollback
is required, review a normal revert PR rather than force-pushing.

NOTES.md is proposed candidate release text. Keep the candidate unpublished until
explicit approval, and complete physical iPhone Safari testing before final
stable publication. Do not merge automatically, alter historical releases,
change repository settings or enable Pages as part of this preparation.
