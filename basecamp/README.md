# NOUS — BASE CAMP

**Follow the thread. Now follow it further.**

Base Camp is an **opt-in companion** for the existing iPhone Safari Nous
bookmarklet. The original inspector, previews, filters, Sources and normal
JSON export stay intact. The new **Base Camp** button transfers a complete
resource snapshot to a private archive in Open Minis.

## What works in this first release

- A Base Camp button in Nous's existing action toolbar, default visible.
- A corresponding visibility switch in the existing **Settings** panel.
- Tapping it constructs a full Nous JSON snapshot including the page,
  capture time, all discovered resources and discovery metadata.
- If Web Share API **file sharing** is supported, Safari opens the system
  Share Sheet and **you choose where the file goes**.
- Otherwise Nous downloads the JSON. No silent HTTP POST, new servers or
  requests to external services.
- A Python standard-library importer in Open Minis stores snapshots and
  deduplicates resources in local SQLite, with retained observations.
- Search by URL, label, source page, or resource type.
- A read-only, lightweight local dashboard on 127.0.0.1, useful while
  Minis keeps the shell running.
- A reusable Open Minis agent skill.

**Privacy:** the public GitHub repo contains application source code only.
Do not commit captured JSON, SQLite databases, or reports containing private
URLs to it. Share Sheet destinations and cloud model providers have their
own privacy behavior; review what you select.

## 1. Install the development bookmarklet

This build is in branch `feature/base-camp-minis-v1`, not the main stable
bookmarklet. Use its generated `Nous_Bookmarklet.txt`:

https://github.com/JellyFangThunderBucket/Nous/blob/feature/base-camp-minis-v1/Nous_Bookmarklet.txt

Copy the file's complete single-line contents and paste them into the URL
field of a **separate Safari bookmark** named `Nous — Base Camp`. Keep your
original Nous bookmark unchanged. Bookmarklet URL must begin `javascript:`.

The HTML demo in `Nous_Preview.html` is regenerated too.

## 2. Install the local archive in Minis

In the Minis terminal, use this if `python3` and `curl` are installed:

```sh
mkdir -p /var/minis/memory/nous-basecamp
curl -fLsS "https://raw.githubusercontent.com/JellyFangThunderBucket/Nous/feature/base-camp-minis-v1/basecamp/minis/basecamp.py" \
  -o /var/minis/memory/nous-basecamp/basecamp.py
python3 /var/minis/memory/nous-basecamp/basecamp.py stats
```

Check command availability first: `command -v python3; command -v curl`.
Install missing Alpine packages through Minis if needed, after reviewing
the script. On Minis, `/var/minis/memory/` is shared across conversations
and persists rather than belonging to a single conversation's workspace.

In **Minis Settings → Skills**, import this skill URL:

https://github.com/JellyFangThunderBucket/Nous/blob/feature/base-camp-minis-v1/basecamp/minis/SKILL.md

Minis skill installation from a URL downloads only the skill file; the
Python installer step above is still required.

## 3. Capture and import

1. Browse a website in iPhone Safari and run your `Nous — Base Camp` bookmark.
2. Tap **Base Camp**. Choose Minis in the Share Sheet **if it supports receiving
   the JSON file**. Otherwise choose **Save to Files**.
3. In Minis, locate the shared file under `/var/minis/attachments/` if Minis
   received it. If saved to Files, use **Settings → Mount External Folders**
   and locate that folder through the Minis file access UI. The mount path
   varies: don't assume a path without checking.
4. Import the exact JSON file path with:

```sh
python3 /var/minis/memory/nous-basecamp/basecamp.py import /path/to/nous-basecamp.json
```

Already have exports from old Nous? Their `app: Nous`, `page`,
`capturedAt` and `entries` format is also supported. Note ordinary
**Export JSON** follows current filters; **Base Camp** shares the full scan.

## 4. Search and browse

```sh
python3 /var/minis/memory/nous-basecamp/basecamp.py stats
python3 /var/minis/memory/nous-basecamp/basecamp.py search 'youtube'
python3 /var/minis/memory/nous-basecamp/basecamp.py search '.m3u8' --type Video
python3 /var/minis/memory/nous-basecamp/basecamp.py serve --port 8765
```

Within Minis' browser and while the process remains running, try
`http://127.0.0.1:8765/`. This is a **loopback-only local service**, not
a public web server, and iOS may suspend it when Minis backgrounds.

The vault defaults to `/var/minis/memory/nous-basecamp/nous.sqlite3`.
To use a different private directory, set `NOUS_BASECAMP_DIR`.
The CLI supports `--db` before the subcommand.

## Boundaries and next milestones

This is a **file handoff**, not a live tunnel between Safari and Minis.
No software can guarantee Safari can reach an iOS app's background Linux
server under normal iOS suspension rules. We do **not** silently bypass
cross-origin policies, access authenticated data outside browser permissions,
or claim that resource timing entries are a complete network capture.

A future opt-in AWS endpoint, Tailscale bridge, Safari extension or native
Shortcuts action could improve handoff convenience after iPhone testing.
Remote connectivity must be authenticated and designed to prevent tokens,
private URLs or captured data from leaking.

### Validation still needed

- Run syntax and repository regressions after building with `node build.cjs`.
- Confirm that iPhone Safari accepts this long bookmark URL.
- Confirm iOS file sharing and Minis Share Sheet file attachment handling.
- Confirm Minis shell's package availability and Files mount path.

No captured personal data is included in the repository.
