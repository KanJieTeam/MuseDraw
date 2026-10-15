// Offline capability discovery: never install packages or download a browser
// while a user is waiting for a drawing.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export function resolveBrowser(pw, { browser, env = process.env, platform = process.platform } = {}) {
  const explicit = browser || env.MUSEDRAW_BROWSER;
  if (explicit) {
    if (!fs.existsSync(explicit)) throw new Error('Configured browser does not exist; fix --browser or MUSEDRAW_BROWSER');
    return { executablePath: path.resolve(explicit), source: 'configured' };
  }
  const bundled = pw.chromium.executablePath();
  if (fs.existsSync(bundled)) return { executablePath: bundled, source: 'playwright' };
  const candidates = platform === 'win32' ? [
    env.PROGRAMFILES && path.join(env.PROGRAMFILES, 'Google/Chrome/Application/chrome.exe'),
    env['PROGRAMFILES(X86)'] && path.join(env['PROGRAMFILES(X86)'], 'Microsoft/Edge/Application/msedge.exe'),
    env.PROGRAMFILES && path.join(env.PROGRAMFILES, 'Microsoft/Edge/Application/msedge.exe'),
    env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
  ] : platform === 'darwin' ? [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ] : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  const system = candidates.filter(Boolean).find((file) => fs.existsSync(file));
  if (system) return { executablePath: system, source: 'system' };
  throw new Error('No Chromium browser found. Reuse Chrome/Edge with --browser, or prepare Chromium once with Playwright before rendering.');
}

export function systemFontStacks(platform = process.platform) {
  if (platform === 'win32') return { serif: 'Georgia, SimSun, serif', sans: 'Segoe UI, Microsoft YaHei, sans-serif', mono: 'Consolas, Microsoft YaHei, monospace' };
  if (platform === 'darwin') return { serif: 'Georgia, Songti SC, serif', sans: 'Helvetica Neue, PingFang SC, sans-serif', mono: 'Menlo, PingFang SC, monospace' };
  return { serif: 'DejaVu Serif, Noto Serif CJK SC, serif', sans: 'DejaVu Sans, Noto Sans CJK SC, WenQuanYi Zen Hei, sans-serif', mono: 'DejaVu Sans Mono, Noto Sans CJK SC, monospace' };
}

export function withSystemFonts(svg, platform = process.platform) {
  const stacks = systemFontStacks(platform);
  return svg.replace(/font-family="([^"]*)"/g, (_, family) => {
    const kind = /monospace/i.test(family) ? 'mono' : /(?:^|[,\s])sans-serif/i.test(family) ? 'sans' : 'serif';
    return `font-family="${stacks[kind]}"`;
  });
}

// Cache invalidation includes browser updates and font installations. Local
// paths remain inside the hash, not in published diagram metadata.
export function fileStamp(file) {
  const s = fs.statSync(file);
  return [file, s.size, s.mtimeMs];
}

export function fontEnvironmentStamp({ platform = process.platform, env = process.env, home = os.homedir() } = {}) {
  const roots = platform === 'win32' ? [env.WINDIR && path.join(env.WINDIR, 'Fonts'), env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'Microsoft/Windows/Fonts')]
    : platform === 'darwin' ? ['/System/Library/Fonts', '/Library/Fonts', path.join(home, 'Library/Fonts')]
      : ['/usr/share/fonts', '/usr/local/share/fonts', path.join(home, '.local/share/fonts'), path.join(home, '.fonts')];
  const stamps = [];
  function walk(dir) {
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(file);
        else if (entry.isFile()) stamps.push(fileStamp(file));
      }
    } catch { /* inaccessible or missing optional font directory */ }
  }
  roots.filter(Boolean).forEach(walk);
  return stamps;
}
