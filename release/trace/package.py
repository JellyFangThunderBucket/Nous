#!/usr/bin/env python3
"""Verify and package Nous 1.5 Trace candidate without changing its application artifacts."""
import gzip
import hashlib
import io
from pathlib import Path
import subprocess
import sys
import tarfile

ROOT = Path(__file__).resolve().parents[2]
APPLICATION = ['Nous_Source.js', 'Nous_Bookmarklet.txt', 'Nous_Preview.html',
               'Nous_Brand.svg', 'Nous_Brand.png']
TESTS = ['core', 'discovery', 'settings-touch', 'inspection-history',
         'refinement', 'entrypoints', 'preservation', 'benchmark', 'trace',
         'trace-preservation', 'trace-benchmark']
FILES = APPLICATION + ['README.md', 'README.txt', 'TESTING.txt', 'AUDIT.md',
    'CHANGELOG.md', 'MAINTENANCE.md', 'release/README.md', 'release/NOTES.md',
    'release/FILES.sha256', 'release/package.py',
    'release/trace/FILES.sha256', 'release/trace/package.py',
    'release/trace/README.md', 'release/trace/NOTES.md', 'release/trace/REPORT.md',
    'release/trace/measurements.json', 'tests/trace-browser.cjs'] + ['tests/' + t + '.cjs' for t in TESTS]


def main():
    for line in (ROOT / 'release/trace/FILES.sha256').read_text().splitlines():
        expected, name = line.split(maxsplit=1)
        actual = hashlib.sha256((ROOT / name).read_bytes()).hexdigest()
        if actual != expected:
            raise SystemExit('Protected application file changed: ' + name)
    import os
    test_env = {k: v for k, v in os.environ.items() if not k.startswith('NOUS_')}
    subprocess.run(['node', '--check', 'Nous_Source.js'], cwd=ROOT, env=test_env, check=True)
    # core also verifies exact source/bookmarklet/embedded-preview consistency.
    for test in TESTS:
        subprocess.run(['node', 'tests/' + test + '.cjs'], cwd=ROOT, env=test_env, check=True)
    for entry in ['bookmarklet', 'preview']:
        subprocess.run(['node', 'tests/entrypoints.cjs'], cwd=ROOT,
                       env={**test_env, 'NOUS_ENTRY': entry}, check=True)
        subprocess.run(['node', 'tests/trace.cjs'], cwd=ROOT,
                       env={**test_env, 'NOUS_ENTRY': entry}, check=True)
    output = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT.parent / 'nous-1.5-rc.1'
    if output == ROOT or ROOT in output.parents:
        raise SystemExit('Choose an output directory outside the checkout.')
    output.mkdir(parents=True, exist_ok=True)
    payloads = {name: (ROOT / name).read_bytes() for name in sorted(FILES)}
    payloads['SHA256SUMS'] = ''.join(
        hashlib.sha256(data).hexdigest() + '  ' + name + '\n'
        for name, data in payloads.items()).encode()
    archive = output / 'Nous-v1.5-rc.1.tar.gz'
    with archive.open('wb') as raw:
        with gzip.GzipFile(filename='', mode='wb', fileobj=raw, mtime=0, compresslevel=9) as compressed:
            with tarfile.open(fileobj=compressed, mode='w', format=tarfile.USTAR_FORMAT) as tar:
                for name, data in sorted(payloads.items()):
                    info = tarfile.TarInfo('Nous-1.5-rc.1/' + name)
                    info.size, info.mode, info.mtime = len(data), 0o644, 0
                    info.uid = info.gid = 0
                    info.uname = info.gname = ''
                    tar.addfile(info, io.BytesIO(data))
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    archive.with_name(archive.name + '.sha256').write_text(digest + '  ' + archive.name + '\n')
    print(digest + '  ' + str(archive))


if __name__ == '__main__':
    main()
