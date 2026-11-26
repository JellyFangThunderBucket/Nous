# Desktop package notes

`Nous-Chrome.zip` is a self-contained Manifest V3 extension, desktop version
1.0.0, using the exact Nous 1.6 + Reveal engine from PR #7 (`bc72a76`). That PR is
still open; this desktop package includes its latest code rather than waiting
for a merge or downloading it at runtime. The standalone source, bookmarklet
and preview remain byte-identical to that build.

## Build and contents

```sh
python3 chrome-extension/package.py
python3 chrome-extension/package.py --check
node tests/chrome-extension.cjs
node tests/chrome-extension-browser.cjs
node tests/chrome-extension-install.cjs
```

`node build.cjs` regenerates the bookmarklet, embedded preview and Chrome engine.
`package.py` then packages the fixed allowlist of extension files into a ZIP with
sorted paths, fixed timestamps and fixed permissions. The ZIP contains
`manifest.json` at its root and can be extracted directly for Load unpacked.
Two builds produced identical 42,016-byte archives (118,759 bytes extracted);
ZIP integrity and the adjacent SHA-256 checksum pass. Reproducibility assumes
identical inputs and a compatible Python/zlib toolchain.

`nous.js` wraps the complete, unchanged `Nous_Source.js` in a small launcher
boundary that returns success or a concrete initialization error to the popup.
`source.json` records the source SHA-256. Both exact source equality and its hash
are checked, including when verifying a previously built ZIP.

## Permissions and behavior

Only `activeTab` and `scripting` are requested. Nothing is injected at install,
startup or navigation; no background worker, host permissions, automatic
content scripts, external libraries or remote code are added. Clicking the
extension temporarily grants access to that tab. The launcher injects the local
bundle into the main frame's MAIN world to retain the bookmarklet's page context,
accessible frames and site-local settings. It then closes itself after the
inspector confirms opening or closing. Clicking again toggles the same instance;
the bookmarklet and extension recognize each other's inspector.

Chrome internal pages, the Web Store, file URLs and some built-in viewers are
unavailable. Unsupported URLs and injection failures remain visible in the
launcher with Retry and plain-text error details. Browser security and page
restrictions remain in force; no policy or response header is modified.

## Verification performed

- Manifest version, narrow permission set, required assets and PNG dimensions.
- Complete embedded source equality, SHA-256 provenance and JavaScript syntax.
- Mocked Chrome API contract tests for active-tab lookup, main-frame injection,
  launch/close acknowledgement, protected URLs, errors and retry behavior.
- Controlled Chromium fixtures at 1440x900 for the generated desktop engine:
  exact signed Video URL Copy, manifests, font-file URL Copy, shared/hidden Reveal,
  Sources/HTML Copy, Peek/live inspection/Back, JSON export, persistent settings,
  launch/close and bookmarklet interoperability, initialization failure reporting,
  no automatic asset requests and an untouched second fixture tab.
- Launcher layout and protected-page/error/retry behavior in browser fixtures
  with mocked Chrome APIs. These are not claims of a real extension installation.
- Existing core, discovery, media/fonts, settings/touch, inspection history,
  refinement, Trace, Personalize, Reveal and all three entry-point suites pass.

## Installation check still required

The actual ZIP was extracted and a real load attempted through Chromium's
extension debugging API. The managed browser returned:

> Loading of unpacked extensions is disabled by the administrator.

`tests/chrome-extension-install.cjs` therefore reports **SKIP**, not a pass. No
policy override was attempted. On a desktop Chrome profile that permits unpacked
extensions, load the extracted folder, pin Nous, and verify toolbar open/close,
Video/Styles Copy and Reveal on a normal webpage. The fixture and unit checks do
not verify the real activeTab grant, popup lifecycle or keyboard shortcut on
Windows/macOS; those remain desktop checks.
