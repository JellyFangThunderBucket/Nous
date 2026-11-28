"""Build and verify the reproducible, unpacked-install Chrome extension ZIP."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
EXTENSION = ROOT / 'chrome-extension'
FILES = ['manifest.json', 'launcher.html', 'launcher.css', 'launcher.js', 'nous.js',
         'source.json', 'README.md'] + ['icons/' + str(size) + '.png' for size in [16, 32, 48, 128]]


def archive_bytes():
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name in sorted(FILES):
            info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, (EXTENSION / name).read_bytes(), compresslevel=9)
    return output.getvalue()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Verify the committed ZIP without rebuilding files')
    args = parser.parse_args()
    if not args.check:
        subprocess.run(['node', 'build.cjs'], cwd=ROOT, check=True)
    source = (ROOT / 'Nous_Source.js').read_bytes().decode('utf-8')
    runtime = (EXTENSION / 'nous.js').read_bytes().decode('utf-8')
    start = '/* NOUS_SOURCE_START */\n'
    end = '\n/* NOUS_SOURCE_END */'
    if start not in runtime or end not in runtime or runtime.split(start, 1)[1].rsplit(end, 1)[0] != source:
        raise SystemExit('Chrome engine is stale. Run node build.cjs.')
    metadata = json.loads((EXTENSION / 'source.json').read_text())
    if metadata.get('sha256') != hashlib.sha256(source.encode()).hexdigest():
        raise SystemExit('Chrome source metadata is stale.')
    payload = archive_bytes()
    archive = EXTENSION / 'Nous-Chrome.zip'
    checksum = hashlib.sha256(payload).hexdigest() + '  ' + archive.name + '\n'
    checksum_file = EXTENSION / (archive.name + '.sha256')
    if args.check:
        if not archive.is_file() or archive.read_bytes() != payload:
            raise SystemExit('Chrome ZIP is stale. Run python3 chrome-extension/package.py.')
        if not checksum_file.is_file() or checksum_file.read_text() != checksum:
            raise SystemExit('Chrome ZIP checksum is stale.')
    else:
        archive.write_bytes(payload)
        checksum_file.write_text(checksum)
    with zipfile.ZipFile(io.BytesIO(payload)) as opened:
        if opened.testzip() is not None:
            raise SystemExit('Chrome ZIP failed integrity validation.')
    print(('Verified ' if args.check else 'Built ') + str(archive) + ' (' + str(len(payload)) + ' bytes)')


if __name__ == '__main__':
    main()
