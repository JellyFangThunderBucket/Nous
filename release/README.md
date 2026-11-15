# Release preparation

From the repository root, run:

```sh
python3 release/package.py /workspace/nous-release
```

Python 3.12 and Node.js 24 are the validated tools. The script checks the five protected application/brand hashes, runs every included test script (two explicitly skip without a 1.3 baseline), and exercises bookmarklet and preview entry points. Any failed check stops packaging. No dependency installation, minification, or regeneration occurs.

The explicit file list excludes Git metadata, local credentials, caches, and generated archives. The archive has sorted entries, fixed timestamps, ownership, and permissions, and a gzip header without a filename or timestamp. Identical inputs with the same Python/zlib toolchain produce identical bytes. Build twice into separate directories and compare the archives. SHA256SUMS inside the archive verifies each included file; the `.sha256` sidecar verifies the archive. The output directory must be outside the checkout.

## Approval and publication

`release/NOTES.md` contains the proposed GitHub Release text. The prepared local annotated tag is `v1.4`; it points to the reviewed maintenance commit, not a new application version. It must not be pushed or published before approval. If review changes the commit, prepare the tag again locally only after checking that no remote v1.4 tag exists. Never overwrite a published tag.

After the PR is approved and merged, verify that the final main commit matches the reviewed release contents and repeat the checks. Publication approval is separate from PR review. Only after explicit publication approval, push the approved tag and create/publish the GitHub Release with `Nous-v1.4.tar.gz` and its checksum, using `release/NOTES.md`. If a draft Release exists, reconcile its target with the final approved commit before publishing. Do not automatically merge the PR.

## GitHub Pages assessment

The existing Nous_Preview.html can be served directly as a static page: its code, styles, and sample content are embedded, with no server or build required. A Pages deployment could serve `/Nous_Preview.html`; the repository has no index.html redirect. Relative assets must remain together if hosting other repository files. Site CSP, browser permissions, and HTTPS behavior still apply, and Pages does not validate real Safari bookmark installation. No Pages configuration, preview changes, or deployment is included; hosting requires approval.

## License recommendation

MIT suits a small standalone bookmarklet: broad reuse with attribution and a warranty disclaimer. Confirm ownership and any third-party obligations before adding it. No license file or package license declaration has been introduced; approval is required.
