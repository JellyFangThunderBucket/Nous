#!/usr/bin/env python3
"""Verify and reproducibly package the Nous 1.6 Personalize candidate."""
import argparse
import gzip
import hashlib
import io
import os
from pathlib import Path
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parents[2]
APPLICATION = ['Nous_Source.js', 'Nous_Bookmarklet.txt', 'Nous_Preview.html', 'Nous_Brand.svg', 'Nous_Brand.png']
TESTS = ['core', 'discovery', 'settings-touch', 'inspection-history', 'refinement', 'entrypoints',
         'trace', 'personalize', 'preservation', 'benchmark', 'trace-preservation',
         'trace-benchmark', 'sources-preservation', 'personalize-preservation', 'personalize-benchmark']
BROWSER_TESTS = ['trace-browser', 'sources-preview-browser', 'personalize-browser']
FILES = APPLICATION + ['README.md', 'README.txt', 'TESTING.txt', 'AUDIT.md', 'CHANGELOG.md',
    'MAINTENANCE.md', 'docs/SOURCES_AND_PREVIEWS.md', 'docs/personalize/REPORT.md',
    'release/README.md', 'release/NOTES.md', 'release/FILES.sha256', 'release/package.py',
    'release/trace/README.md', 'release/trace/NOTES.md', 'release/trace/REPORT.md',
    'release/trace/FILES.sha256', 'release/trace/measurements.json', 'release/trace/package.py',
    'release/personalize/README.md', 'release/personalize/NOTES.md',
    'release/personalize/FILES.sha256', 'release/personalize/measurements.json',
    'release/personalize/package.py'] + ['tests/' + t + '.cjs' for t in TESTS + BROWSER_TESTS] + [
    'docs/personalize/' + name + '.png' for name in ['personalize-light', 'personalize-dark',
    'personalize-settings-light', 'personalize-settings-dark', 'personalize-minimal-light', 'personalize-minimal-dark']]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', nargs='?', default=str(ROOT.parent / 'nous-1.6-rc.1'))
    parser.add_argument('--browser', action='store_true', help='Run installed Playwright/Chromium checks')
    parser.add_argument('--baseline', type=Path, help='Retained 1.5 source for current preservation/visual checks')
    args = parser.parse_args()
    output = Path(args.output).resolve()
    if output == ROOT or ROOT in output.parents:
        raise SystemExit('Choose an output directory outside the checkout.')
    for line in (ROOT / 'release/personalize/FILES.sha256').read_text().splitlines():
        expected, name = line.split(maxsplit=1)
        if hashlib.sha256((ROOT / name).read_bytes()).hexdigest() != expected:
            raise SystemExit('Candidate application file changed: ' + name)
    env = {k: v for k, v in os.environ.items() if not k.startswith('NOUS_')}
    def run(arguments, baseline=False, entry=None):
        child_env = dict(env)
        if baseline and args.baseline:
            child_env['NOUS_BASELINE'] = str(args.baseline.resolve())
        if entry:
            child_env['NOUS_ENTRY'] = entry
        subprocess.run(arguments, cwd=ROOT, env=child_env, check=True)
    run(['node', '--check', 'Nous_Source.js'])
    for test in TESTS:
        run(['node', 'tests/' + test + '.cjs'], baseline=test in ['discovery', 'personalize-preservation'])
    for entry in ['bookmarklet', 'preview']:
        for test in ['entrypoints', 'trace']:
            run(['node', 'tests/' + test + '.cjs'], entry=entry)
    if args.browser:
        for test in BROWSER_TESTS:
            run(['node', 'tests/' + test + '.cjs'], baseline=test in ['trace-browser', 'personalize-browser'])
    payloads = {name: (ROOT / name).read_bytes() for name in sorted(FILES)}
    payloads['SHA256SUMS'] = ''.join(hashlib.sha256(data).hexdigest() + '  ' + name + '\n'
                                   for name, data in payloads.items()).encode()
    output.mkdir(parents=True, exist_ok=True)
    archive = output / 'Nous-v1.6-rc.1.tar.gz'
    with archive.open('wb') as raw:
        with gzip.GzipFile(filename='', mode='wb', fileobj=raw, mtime=0, compresslevel=9) as compressed:
            with tarfile.open(fileobj=compressed, mode='w', format=tarfile.USTAR_FORMAT) as tar:
                for name, data in sorted(payloads.items()):
                    info = tarfile.TarInfo('Nous-1.6-rc.1/' + name)
                    info.size, info.mode, info.mtime = len(data), 0o644, 0
                    info.uid = info.gid = 0
                    info.uname = info.gname = ''
                    tar.addfile(info, io.BytesIO(data))
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    archive.with_name(archive.name + '.sha256').write_text(digest + '  ' + archive.name + '\n')
    print(digest + '  ' + str(archive))


if __name__ == '__main__':
    main()
