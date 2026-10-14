"""Render a semantic architecture brief with a named visual family.

This installed-Skill wrapper uses existing Node/Playwright and browser tools.
No case ID, coordinates, network call or dependency installation is required.
"""
import argparse
import os
from pathlib import Path
import shutil
import subprocess
import sys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('output', type=Path, help='New run directory')
    parser.add_argument('--style', default='墨蓝')
    parser.add_argument('--variant')
    parser.add_argument('--density')
    parser.add_argument('--playwright', default=os.environ.get('MUSEDRAW_PLAYWRIGHT'))
    parser.add_argument('--browser', default=os.environ.get('MUSEDRAW_BROWSER'))
    args = parser.parse_args()
    node = shutil.which('node')
    if not node:
        parser.error('An existing Node.js installation is required')
    module = args.playwright
    if not module:
        probe = subprocess.run([node, '-p', "require.resolve('playwright/package.json')"],
                               capture_output=True, text=True, timeout=15)
        if not probe.returncode:
            directory = Path(probe.stdout.strip()).parent
            module = next((str(directory / n) for n in ('index.mjs', 'index.js')
                           if (directory / n).is_file()), None)
    if not module or not Path(module).is_file():
        parser.error('Use an existing Playwright entry module via --playwright; nothing was installed')
    browser = args.browser
    if not browser:
        browser = next((shutil.which(n) for n in ('chromium', 'chromium-browser', 'google-chrome')
                        if shutil.which(n)), None)
        if not browser:
            candidates = [Path('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')]
            for variable in ('PROGRAMFILES', 'PROGRAMFILES(X86)', 'LOCALAPPDATA'):
                if os.environ.get(variable):
                    candidates.extend(Path(os.environ[variable]) / p for p in
                                      ('Google/Chrome/Application/chrome.exe',
                                       'Microsoft/Edge/Application/msedge.exe'))
            browser = next((str(p) for p in candidates if p.is_file()), None)
    command = [node, str(Path(__file__).with_suffix('.mjs')), str(args.input.resolve()),
               str(args.output.resolve()), '--style', args.style, '--playwright', str(module),
               '--python', sys.executable]
    for flag, value in (('--browser', browser), ('--variant', args.variant), ('--density', args.density)):
        if value:
            command.extend([flag, value])
    return subprocess.run(command, env={**os.environ, 'PYTHONUTF8': '1'}, check=False).returncode


if __name__ == '__main__':
    raise SystemExit(main())
