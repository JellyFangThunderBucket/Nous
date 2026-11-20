#!/usr/bin/env python3
"""Nous Base Camp: private, offline-first archive for Nous Safari exports.

Python standard library only. Data is stored locally, never uploaded by this app.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
from pathlib import Path
import sqlite3
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlsplit

MAX_FILE_BYTES = 24 * 1024 * 1024
MAX_ENTRIES = 10000

def home() -> Path:
    override = os.environ.get("NOUS_BASECAMP_DIR")
    if override:
        return Path(override).expanduser()
    minis_memory = Path("/var/minis/memory")
    return minis_memory / "nous-basecamp" if minis_memory.is_dir() else Path.home() / ".nous-basecamp"

def database(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.executescript("""
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS scans (
        id TEXT PRIMARY KEY, page TEXT NOT NULL, captured_at TEXT NOT NULL,
        imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, count INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS resources (
        id TEXT PRIMARY KEY, page TEXT NOT NULL, type TEXT NOT NULL,
        value TEXT NOT NULL, label TEXT NOT NULL, source TEXT NOT NULL,
        first_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(page, type, value)
      );
      CREATE TABLE IF NOT EXISTS observations (
        scan_id TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
        resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
        metadata TEXT NOT NULL, PRIMARY KEY (scan_id,resource_id)
      );
      CREATE INDEX IF NOT EXISTS resources_type ON resources(type);
      CREATE INDEX IF NOT EXISTS resources_page ON resources(page);
      CREATE INDEX IF NOT EXISTS observations_resource ON observations(resource_id);
    """)
    return conn

def normalize(item: object) -> tuple[str, str, str, str, str] | None:
    if not isinstance(item, dict):
        return None
    typ, value = item.get("type"), item.get("value")
    if not isinstance(typ, str) or not isinstance(value, str):
        return None
    if not typ.strip() or not value.strip() or len(typ) > 100 or len(value) > 12000:
        return None
    label = item.get("label", "")
    source = item.get("source", "")
    return (typ.strip(), value.strip(), str(label)[:1000], str(source)[:1000],
            json.dumps(item, ensure_ascii=False, separators=(",", ":"))[:32000])

def import_file(conn: sqlite3.Connection, filename: Path) -> tuple[str, int, int]:
    if filename.stat().st_size > MAX_FILE_BYTES:
        raise ValueError("File too large for a single Nous export")
    raw = filename.read_bytes()
    payload = json.loads(raw)
    if not isinstance(payload, dict) or payload.get("app") != "Nous":
        raise ValueError("Not a Nous JSON export (expected app: Nous)")
    page, captured, entries = payload.get("page"), payload.get("capturedAt"), payload.get("entries")
    if not isinstance(page, str) or not page or len(page) > 12000:
        raise ValueError("Missing or invalid page address")
    if not isinstance(captured, str) or not captured or len(captured) > 100:
        raise ValueError("Missing or invalid capture time")
    if not isinstance(entries, list) or len(entries) > MAX_ENTRIES:
        raise ValueError("Missing or oversized entries list")
    # Snapshot hashing is deterministic: repeated imports do not duplicate a scan.
    scan_id = hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False,
                                        separators=(",", ":")).encode("utf-8")).hexdigest()
    if conn.execute("SELECT 1 FROM scans WHERE id=?", (scan_id,)).fetchone():
        return (scan_id[:12], 0, 0)
    new_resources = 0
    accepted = 0
    with conn:
        conn.execute("INSERT INTO scans(id,page,captured_at,count) VALUES(?,?,?,?)",
                     (scan_id, page, captured, len(entries)))
        for item in entries:
            normalized = normalize(item)
            if normalized is None:
                continue
            typ, value, label, source, metadata = normalized
            rid = hashlib.sha256((page + "\x1f" + typ + "\x1f" + value).encode()).hexdigest()
            exists = conn.execute("SELECT 1 FROM resources WHERE id=?", (rid,)).fetchone()
            if not exists:
                new_resources += 1
            conn.execute("""
              INSERT INTO resources(id,page,type,value,label,source)
              VALUES (?,?,?,?,?,?)
              ON CONFLICT(id) DO UPDATE SET last_seen=CURRENT_TIMESTAMP
            """, (rid, page, typ, value, label, source))
            conn.execute("""INSERT OR IGNORE INTO observations(scan_id,resource_id,metadata)
                            VALUES (?,?,?)""", (scan_id, rid, metadata))
            accepted += 1
    return (scan_id[:12], accepted, new_resources)

def stats(conn: sqlite3.Connection) -> dict:
    result = {name: conn.execute("SELECT COUNT(*) FROM " + name).fetchone()[0]
              for name in ("scans", "resources", "observations")}
    result["types"] = {row["type"]: row["n"] for row in
       conn.execute("SELECT type, COUNT(*) n FROM resources GROUP BY type ORDER BY n DESC")}
    return result

def search(conn: sqlite3.Connection, query: str = "", kind: str = "", limit: int = 100) -> list[sqlite3.Row]:
    clauses, args = [], []
    if query:
        clauses.append("(value LIKE ? OR label LIKE ? OR page LIKE ? OR source LIKE ?)")
        term = "%" + query.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        clauses[-1] = clauses[-1].replace("LIKE ?", "LIKE ? ESCAPE '\\'")
        args.extend([term] * 4)
    if kind:
        clauses.append("type = ?")
        args.append(kind)
    sql = "SELECT id,page,type,value,label,source,first_seen,last_seen FROM resources"
    if clauses:
        sql += " WHERE " + " AND ".join(clauses)
    sql += " ORDER BY last_seen DESC, type, label LIMIT ?"
    return conn.execute(sql, (*args, min(max(limit, 1), 1000))).fetchall()

def page_html(conn: sqlite3.Connection, q: str, kind: str) -> str:
    E = html.escape
    overview = stats(conn)
    matches = search(conn, q, kind, 250)
    types = [""] + list(overview["types"])
    filters = "".join('<option value="' + E(t, quote=True) + '"' +
                      (" selected" if t == kind else "") + ">" +
                      E(t or "All types") + "</option>" for t in types)
    cards = []
    for r in matches:
        val = E(r["value"])
        parsed = urlsplit(r["value"])
        if parsed.scheme in ("http", "https") and parsed.netloc:
            val = '<a href="' + E(r["value"], quote=True) + '" rel="noopener noreferrer" target="_blank">' + val + '</a>'
        cards.append('<article><span class="type">' + E(r["type"]) + '</span> ' +
                     '<strong>' + E(r["label"]) + '</strong><div class="value">' + val +
                     '</div><small>From ' + E(r["page"]) + ' · ' + E(r["source"]) + '</small></article>')
    body = "".join(cards) if cards else "<p>No threads match that search.</p>"
    return ("""<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport"
content="width=device-width,initial-scale=1"><title>Nous — Base Camp</title><style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#101714;color:#e4f3e9;font:14px/1.55 -apple-system,system-ui,sans-serif}
main{max-width:900px;margin:auto;padding:24px 16px 80px}h1{font-size:30px;letter-spacing:-1px;margin:8px 0 0}
mark{background:#a1e4c6;color:#153a2b;padding:2px 6px;border-radius:5px}header p{color:#a4b9aa;margin:0 0 24px}
.stats{display:flex;gap:8px;margin:22px 0;flex-wrap:wrap}.stats span{background:#1b2b22;padding:10px 14px;border:1px solid #304639;border-radius:10px}
form{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px}input,select,button{font:inherit;padding:10px 12px;border-radius:8px;border:1px solid #375443;background:#16231b;color:#e4f3e9}
input{flex:1;min-width:170px}button{background:#9ce6bc;color:#153323;font-weight:bold;border:0}article{padding:13px 4px;border-bottom:1px solid #2a3b30}
.type{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#a1e4c6}strong{font-size:14px}
.value{overflow-wrap:anywhere;margin:5px 0 2px;color:#c3d5c9}a{color:#9ce6bc}small{color:#859b8d}
</style><main><header><mark>νοῦς</mark><h1>Base Camp</h1><p>Follow the thread. Privately.</p></header>
<div class="stats"><span><b>""" + str(overview["scans"]) + """</b> snapshots</span><span><b>""" +
str(overview["resources"]) + """</b> unique resources</span><span><b>""" +
str(overview["observations"]) + """</b> observations</span></div>
<form method="get"><input name="q" placeholder="Search every thread" value='""" +
E(q, quote=True) + """'><select name="type">""" + filters +
"""</select><button type="submit">Find</button></form><section>""" +
body + """</section></main></html>""")

def serve(conn: sqlite3.Connection, port: int) -> None:
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            parsed = urlsplit(self.path)
            if parsed.path != "/":
                self.send_error(404)
                return
            args = parse_qs(parsed.query)
            page = page_html(conn, args.get("q", [""])[0][:300], args.get("type", [""])[0][:100]).encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(page)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Security-Policy",
                             "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'self'")
            self.end_headers()
            self.wfile.write(page)
    print(f"Base Camp listening on http://127.0.0.1:{port}/ (Minis-local only)")
    print("Press Ctrl-C to stop. iOS may suspend the server when Minis backgrounds.")
    HTTPServer(("127.0.0.1", port), Handler).serve_forever()

def main() -> None:
    os.umask(0o077)
    parser = argparse.ArgumentParser(description="Private Nous resource vault for Open Minis")
    parser.add_argument("--db", type=Path, default=home() / "nous.sqlite3")
    commands = parser.add_subparsers(dest="command", required=True)
    imp = commands.add_parser("import", help="Import one or more Nous JSON exports")
    imp.add_argument("files", type=Path, nargs="+")
    commands.add_parser("stats")
    find = commands.add_parser("search")
    find.add_argument("query", nargs="?", default="")
    find.add_argument("--type", default="")
    find.add_argument("--limit", type=int, default=50)
    web = commands.add_parser("serve")
    web.add_argument("--port", type=int, default=8765)
    conn = database(parser.parse_args().db)
    args = parser.parse_args()
    try:
        if args.command == "import":
            for file in args.files:
                try:
                    sid, accepted, added = import_file(conn, file)
                    print(f"{file}: snapshot {sid}, accepted {accepted}, new unique {added}")
                except (OSError, ValueError, json.JSONDecodeError) as ex:
                    print(f"{file}: ERROR: {ex}")
        elif args.command == "stats":
            print(json.dumps(stats(conn), indent=2, ensure_ascii=False))
        elif args.command == "search":
            for r in search(conn, args.query, args.type, args.limit):
                print(f'[{r["type"]}] {r["label"]}\n  {r["value"]}\n  page: {r["page"]}')
        elif args.command == "serve":
            serve(conn, args.port)
    finally:
        conn.close()

if __name__ == "__main__":
    main()
