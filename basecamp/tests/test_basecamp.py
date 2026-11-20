"""Deterministic smoke tests for the offline Nous Base Camp importer."""
from __future__ import annotations
import json
import tempfile
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "minis"))
from basecamp import database, import_file, search, stats, page_html

class BaseCampTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.conn = database(self.root / "private" / "nous.sqlite3")

    def tearDown(self):
        self.conn.close()
        self.temp.cleanup()

    def snapshot(self, captured="2026-11-20T00:00:00Z"):
        data = {
            "app": "Nous",
            "version": "1.6",
            "page": "https://example.org/a?x=1",
            "capturedAt": captured,
            "entries": [
                {"type": "Video", "label": "Clip", "value": "https://cdn.example.org/movie.m3u8", "source": "DOM"},
                {"type": "Styles", "label": "<svg onload=alert(1)>", "value": "https://cdn.example.org/font.woff2", "source": "CSS"}
            ]
        }
        path = self.root / "capture.json"
        path.write_text(json.dumps(data), encoding="utf8")
        return path

    def test_import_and_idempotency(self):
        path = self.snapshot()
        first = import_file(self.conn, path)
        second = import_file(self.conn, path)
        self.assertEqual(first[1:], (2, 2))
        self.assertEqual(second[1:], (0, 0))
        self.assertEqual(stats(self.conn)["scans"], 1)
        self.assertEqual(stats(self.conn)["resources"], 2)

    def test_repeated_resource_new_snapshot(self):
        self.snapshot()
        import_file(self.conn, self.root / "capture.json")
        self.snapshot(captured="2026-11-21T00:00:00Z")
        import_file(self.conn, self.root / "capture.json")
        self.assertEqual(stats(self.conn)["scans"], 2)
        self.assertEqual(stats(self.conn)["resources"], 2)
        self.assertEqual(stats(self.conn)["observations"], 4)

    def test_search_and_html_escaping(self):
        import_file(self.conn, self.snapshot())
        self.assertEqual(len(search(self.conn, "m3u8", "Video")), 1)
        self.assertEqual(len(search(self.conn, "woff2", "Styles")), 1)
        self.assertEqual(len(search(self.conn, "nonexistent")), 0)
        output = page_html(self.conn, "", "")
        self.assertIn("&lt;svg onload=alert(1)&gt;", output)
        self.assertNotIn("<svg onload=alert(1)>", output)

    def test_reject_bad_exports(self):
        path = self.root / "invalid.json"
        path.write_text('{"app":"Not Nous","entries":[]}', encoding="utf8")
        with self.assertRaises(ValueError):
            import_file(self.conn, path)
        self.assertEqual(stats(self.conn)["scans"], 0)

    def test_malformed_url_does_not_crash_dashboard(self):
        path = self.snapshot()
        doc = json.loads(path.read_text())
        doc["entries"] = [{"type":"Metadata","label":"Example","value":"http://[invalid","source":"meta"}]
        path.write_text(json.dumps(doc))
        import_file(self.conn, path)
        self.assertIn("http://[invalid", page_html(self.conn, "", ""))

if __name__ == "__main__":
    unittest.main()
