#!/usr/bin/env python3
"""Build a new, offline twelve-drawing review package without changing its inputs.

The existing selection schema uses cases[].image/svg/drawio/before/card and
reference.file/url/crop. All artifact paths are relative to selection.json.
Third-party reference screenshots are omitted unless --private-references is
explicitly supplied. Repeat --skill-source to include specific skill folders.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import html
import json
import os
from pathlib import Path, PurePosixPath, PureWindowsPath
import re
import sys
from urllib.parse import quote, urlsplit
import xml.etree.ElementTree as ET
import zipfile

sys.dont_write_bytecode = True
from check import png_dimensions, svg_dimensions

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = ROOT / "assets/review/designer-review.html"
SOURCE_FIELDS = {"image", "svg", "png", "drawio", "before", "card", "file", "preview", "alternative", "checks", "checkFiles", "reports"}
TEXT_SUFFIXES = {".md", ".txt", ".py", ".mjs", ".js", ".json", ".yml", ".yaml", ".svg", ".drawio"}
SKILL_SUFFIXES = TEXT_SUFFIXES - {".drawio"} | {".png"}
FORBIDDEN_PARTS = {".git", ".env", ".aws", ".ssh", "node_modules", "__pycache__", "private", "secrets", "credentials"}
SECRET = re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,}|(?:AKIA|ASIA)[A-Z0-9]{16}|sk-(?:proj-)?[A-Za-z0-9_-]{20,})\b|-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----")
ASSIGNED_SECRET = re.compile(r"\b(?:api[_-]?key|access[_-]?token|secret(?:[_-]?key)?|password)\s*[=:]\s*[\"']([^\"'\r\n]{12,})[\"']", re.I)
ABSOLUTE_TOKEN = re.compile(r"(?<![A-Za-z0-9])(?:[A-Za-z]:[\\/]|\\\\)[^\s\"<>]+")
PLACEHOLDER = re.compile(r"example|sample|dummy|placeholder|changeme|redacted|your|replace|[<$\s]", re.I)


class ReviewError(ValueError):
    pass


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def no_links(path: Path) -> Path:
    """Reject symlinks and Windows junctions in every existing path component."""
    absolute = path.absolute()
    for component in [*reversed(absolute.parents), absolute]:
        try:
            info = component.lstat()
        except FileNotFoundError:
            continue
        if component.is_symlink() or getattr(info, "st_file_attributes", 0) & 0x400:
            raise ReviewError("不允许符号链接或目录联接: " + component.name)
    return absolute


def safe_member(base: Path, raw: str, *, required=True, directory=False) -> Path:
    if not isinstance(raw, str) or not raw.strip():
        raise ReviewError("图稿路径必须是非空相对路径")
    normalized = raw.replace("\\", "/")
    win = PureWindowsPath(raw)
    pieces = PurePosixPath(normalized).parts
    if win.drive or normalized.startswith("/") or ":" in normalized or any(p in {"..", "."} for p in pieces):
        raise ReviewError("图稿路径必须位于选择清单目录内: " + raw)
    if any(p.casefold() in FORBIDDEN_PARTS or p.startswith(".") for p in pieces):
        raise ReviewError("不收录隐藏文件或私密目录")
    base = no_links(base).resolve()
    result = no_links(base / normalized)
    if not result.resolve().is_relative_to(base):
        raise ReviewError("图稿路径越过选择清单目录")
    if required and (not result.is_dir() if directory else not result.is_file()):
        raise ReviewError("缺少实际图稿或报告: " + raw)
    return result


def validate_declared_paths(value, base: Path, field=""):
    """Validate all declared artifact paths, including references omitted later."""
    if isinstance(value, dict):
        for key, item in value.items():
            validate_declared_paths(item, base, key)
    elif isinstance(value, list):
        for item in value:
            validate_declared_paths(item, base, field)
    elif field in SOURCE_FIELDS and value is not None:
        safe_member(base, value, required=False)


def redact_local_paths(value):
    if isinstance(value, dict):
        redacted = {}
        for key, item in value.items():
            safe_key = redact_local_paths(key)
            if safe_key != key:
                # Preserve distinct path-keyed evidence entries without leaking
                # their local paths or collapsing them into one placeholder.
                safe_key = "[本机路径已省略:" + digest(key.encode("utf-8"))[:10] + "]"
            redacted[safe_key] = redact_local_paths(item)
        return redacted
    if isinstance(value, list):
        return [redact_local_paths(item) for item in value]
    if isinstance(value, str):
        if value.startswith(("https://", "http://")):
            return value
        if value.startswith(("/", "file://")) or PureWindowsPath(value).drive:
            return "[本机路径已省略]"
        return ABSOLUTE_TOKEN.sub("[本机路径已省略]", value)
    return value


def reject_secrets(text: str):
    if SECRET.search(text) or any(not PLACEHOLDER.search(match) for match in ASSIGNED_SECRET.findall(text)):
        raise ReviewError("源文件含疑似凭据，拒绝打包")


def source_url(raw):
    if not raw:
        return None
    if not isinstance(raw, str):
        raise ReviewError("参考来源须是网页地址")
    parts = urlsplit(raw)
    if parts.scheme not in {"https", "http"} or not parts.netloc or parts.username or parts.password:
        raise ReviewError("参考来源仅接受不含凭据的 http/https 网页地址")
    return raw


def encoded_path(path: str) -> str:
    return html.escape(quote(path, safe="/"), quote=True)


def esc(value) -> str:
    return html.escape(str(value), quote=True)


def read_copy(source: Path) -> bytes:
    no_links(source)
    if not source.is_file() or source.stat().st_size > 16 * 1024 * 1024:
        raise ReviewError("源文件必须是有限大小的普通文件: " + source.name)
    raw = source.read_bytes()
    suffix = source.suffix.lower()
    if suffix == ".png":
        png_dimensions(raw)
    elif suffix in TEXT_SUFFIXES or source.name in {"LICENSE", "NOTICE"}:
        text = raw.decode("utf-8-sig")
        reject_secrets(text)
        if suffix == ".json":
            return (json.dumps(redact_local_paths(json.loads(text)), ensure_ascii=False, indent=2) + "\n").encode("utf-8")
        if suffix == ".svg":
            svg_dimensions(text)
        elif suffix == ".drawio":
            if re.search(r"<!DOCTYPE|<!ENTITY", text, re.I):
                raise ReviewError("不接受带外部实体的 draw.io 文件")
            document = ET.fromstring(text)
            if document.tag != "mxfile" or re.search(r"data:image|shape=image|image=|file://", text, re.I):
                raise ReviewError("draw.io 文件须为原生图形，不能含内嵌图片或本机链接")
        if re.search(r"\b[A-Za-z]:[\\/]|file://|/(?:Users|home)/[^/\s]+/", text):
            raise ReviewError("非 JSON 源文件含本机绝对路径，拒绝打包: " + source.name)
    else:
        raise ReviewError("未获准的打包类型: " + source.name)
    return raw


def optional_artifact(base: Path, raw, inferred: Path | None = None):
    path = safe_member(base, raw, required=False) if raw else inferred
    if path is not None:
        no_links(path)
        if path.is_file():
            return path
    return None


def collect_skills(skill_sources):
    result = []
    used = set()
    for directory in skill_sources:
        directory = no_links(Path(directory))
        if not directory.is_dir() or not (directory / "SKILL.md").is_file():
            raise ReviewError("绘图规则必须来自明确的技能目录，并包含 SKILL.md")
        name = directory.name
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,64}", name) or name in used:
            raise ReviewError("技能目录名称必须唯一且可用于文件名")
        used.add(name)
        files = []
        for folder, directories, names in os.walk(directory, followlinks=False):
            for child in directories:
                no_links(Path(folder) / child)
            directories[:] = sorted(child for child in directories if not child.startswith(".") and child.casefold() not in FORBIDDEN_PARTS)
            for filename in sorted(names):
                source = Path(folder) / filename
                no_links(source)
                if filename.startswith(".") or filename.casefold() in FORBIDDEN_PARTS:
                    continue
                if source.suffix.lower() in SKILL_SUFFIXES or filename in {"LICENSE", "NOTICE"}:
                    files.append((source, source.relative_to(directory).as_posix(), read_copy(source)))
        result.append({"name": name, "files": files})
    return result


def figure(label, file, number, *, reference=None):
    if file is None:
        title = (reference or {}).get("title") or "原参考"
        url = (reference or {}).get("url")
        link = f'<a href="{esc(url)}" target="_blank" rel="noopener noreferrer">打开来源页面</a>' if url else "未提供来源页面"
        body = f'<div class="reference-note"><strong>{esc(title)}</strong><p>本包未收录第三方截图。</p><p>{link}</p></div>'
        controls = ""
    else:
        href = encoded_path(file)
        image = f'<img src="{href}" alt="{esc(number + " " + label)}" loading="eager">'
        crop = (reference or {}).get("crop")
        dimensions = (reference or {}).get("dimensions")
        if crop and dimensions:
            x, y, w, h = [crop[k] for k in ("x", "y", "w", "h")]
            iw, ih = dimensions
            if not all(isinstance(v, (int, float)) and v >= 0 for v in (x, y, w, h)) or w <= 0 or h <= 0 or x+w>iw or y+h>ih:
                raise ReviewError("原参考视口必须位于实际图片范围内")
            body = f'<div class="figure-image"><div class="crop" style="aspect-ratio:{w}/{h};--crop-ratio:{w/h:.8f}"><img src="{href}" alt="{esc(number + " " + label)}" style="width:{iw/w*100:.6f}%;left:{-x/w*100:.6f}%;top:{-y/h*100:.6f}%" loading="eager"></div></div>'
        else:
            body = f'<div class="figure-image">{image}</div>'
        controls = f'<div class="figure-tools"><button type="button" data-view="{href}" data-caption="{esc(number + " · " + label)}">放大查看</button><a href="{href}" target="_blank" rel="noopener" download>下载图片</a></div>'
    return f'<figure><figcaption>{esc(label)}</figcaption>{body}{controls}</figure>'


def render_page(items, skills, private_references, template):
    changed = sum(item["changed"] for item in items)
    summary = f'{changed} 张已有本轮改稿，{len(items)-changed} 张沿用此前版本。所有图稿仍待逐张评审，检查报告不能代替视觉判断。'
    notice = '<aside class="private-notice">内部审阅版 · 含第三方参考截图，请勿公开发布或转发。</aside>' if private_references else '<p class="package-note">默认包不含第三方截图；原参考保留来源链接。</p>'
    navigation = "".join(f'<a href="#case-{item["number"]}">{item["number"]}</a>' for item in items)
    sections = []
    for item in items:
        status = "本轮改稿 · 待评审" if item["changed"] else "本轮未改 · 沿用此前稿"
        downloads = "".join(f'<a href="{encoded_path(file["path"])}" download>{esc(file["label"])}</a>' for file in item["downloads"])
        reports = "".join(f'<li><a href="{encoded_path(report)}" target="_blank" rel="noopener">检查记录 {i+1}</a></li>' for i, report in enumerate(item["reports"])) or '<li>本稿未附独立检查报告；仍需实际看图。</li>'
        reference = item["reference"]
        source_link = f'<a href="{esc(reference["url"])}" target="_blank" rel="noopener noreferrer">原参考来源页面</a>' if reference.get("url") else "未提供来源页面"
        notes = item.get("notes") or "请评估结构是否易读、文字层级、留白和共享连线。"
        stage = item.get("stage") or "待评审"
        sections.append(f'<section class="case" id="case-{item["number"]}" data-case="{item["number"]}" data-changed="{str(item["changed"]).lower()}"><header class="case-head"><h2><span>{item["number"]}</span> {esc(item["title"])}</h2><p class="stage {"revised" if item["changed"] else "frozen"}">{status}</p></header><div class="comparison">{figure("原参考", reference.get("file"), item["number"], reference=reference)}{figure("此前稿", item["before"], item["number"])}{figure("当前稿", item["current"], item["number"])}</div><p class="review-notes">{esc(notes)}</p><details><summary>源文件、绘图规则与检查记录</summary><p class="record-stage">记录状态：{esc(stage)}。是否认可设计，仍由评审决定。</p><div class="downloads">{downloads}</div><p>{source_link}</p><p><a href="#rules">查看本包的绘图规则</a> · <a href="selection.json" target="_blank" rel="noopener">查看选图记录</a></p><ul>{reports}</ul></details></section>')
    rules = "".join(f'<li><a href="{encoded_path("skills/" + skill["name"] + "/SKILL.md")}" target="_blank" rel="noopener">{esc(skill["name"])} 规则说明</a> · 源码随包保留在对应目录。</li>' for skill in skills)
    replacements = {"__SUMMARY__": esc(summary), "__PRIVATE_NOTICE__": notice, "__NAVIGATION__": navigation, "__CASES__": "\n".join(sections), "__RULES__": rules}
    result = template
    for key, value in replacements.items():
        if key not in result:
            raise ReviewError("评审模板缺少占位符: " + key)
        result = result.replace(key, value)
    return result


def build(selection: Path, output: Path, *, private_references=False, skill_sources=None, template=TEMPLATE):
    selection = no_links(Path(selection))
    output = no_links(Path(output))
    archive = no_links(output.parent / (output.name + ".zip"))
    inventory = no_links(output.parent / (output.name + ".manifest.json"))
    if output.exists() or archive.exists() or inventory.exists():
        raise ReviewError("请选择全新的输出目录；已有目录、压缩包和清单均不覆盖")
    base = selection.parent.resolve()
    if output.resolve().is_relative_to(base) or base.is_relative_to(output.resolve()):
        raise ReviewError("输出目录不能与输入选择目录互相包含")
    payload = json.loads(selection.read_text(encoding="utf-8-sig"))
    reject_secrets(json.dumps(payload, ensure_ascii=False))
    cases = payload.get("cases") if isinstance(payload, dict) else None
    if not isinstance(cases, list) or len(cases) != 12:
        raise ReviewError("评审包必须选择恰好12张实际图稿")
    validate_declared_paths(payload, base)
    skills = collect_skills(skill_sources if skill_sources is not None else [ROOT / "skills/musedraw"])
    input_files, plans, items, warnings = [], [], [], []
    used = set()

    def plan(source, target, stage, case, role):
        data = read_copy(source)
        original = source.read_bytes()
        input_files.append((source, digest(original)))
        plans.append({"source": source, "target": target, "data": data, "stage": stage, "case": case, "role": role, "sourceSha256": digest(original)})
        return target

    for item in cases:
        raw_number = str(item.get("number", ""))
        if not raw_number.isdigit() or not 1 <= int(raw_number) <= 100:
            raise ReviewError("图稿编号须为1至100")
        number = f"{int(raw_number):03}"
        if number in used:
            raise ReviewError("选择清单含重复编号")
        used.add(number)
        image = safe_member(base, item.get("image"))
        before = safe_member(base, item.get("before"))
        if image.suffix.lower() != ".png" or before.suffix.lower() != ".png":
            raise ReviewError("当前稿和此前稿须使用实际 PNG 图像")
        current_bytes, before_bytes = image.read_bytes(), before.read_bytes()
        changed = digest(current_bytes) != digest(before_bytes)
        if "changedImage" in item and item["changedImage"] is not changed:
            warnings.append(number + " 的 changedImage 与实际图片字节不一致；页面按字节对照显示。")
        stage = str(item.get("stage") or ("本轮改稿待评审" if changed else "本轮未改"))
        prefix = "cases/" + number
        current = plan(image, prefix + "/current/diagram.png", stage, number, "current-image")
        previous = plan(before, prefix + "/before/diagram.png", "此前冻结稿", number, "before-image")
        downloads = []
        reports = []
        for phase, folder, explicit in (("current", image.parent, item), ("before", before.parent, {})):
            for suffix, label in (("svg", "SVG"), ("drawio", "draw.io")):
                source = optional_artifact(base, explicit.get(suffix), folder / ("diagram." + suffix))
                if source:
                    target = plan(source, prefix + "/" + phase + "/diagram." + suffix, stage if phase == "current" else "此前冻结稿", number, phase + "-source")
                    downloads.append({"path": target, "label": ("当前稿 " if phase == "current" else "此前稿 ") + label})
                elif suffix == "svg" and phase == "current":
                    raise ReviewError("当前稿必须附实际 SVG 源文件: " + number)
        report_sources = set()
        for source in image.parent.iterdir():
            no_links(source)
            if source.is_file() and source.suffix == ".json" and (source.name == "design.json" or re.search(r"check|review|changes|note|preservation", source.name, re.I)):
                report_sources.add(source)
        for raw in item.get("checkFiles", []):
            report_sources.add(safe_member(base, raw))
        for raw in (item.get("checks"), item.get("card")):
            if isinstance(raw, str):
                report_sources.add(safe_member(base, raw))
        for source in sorted(report_sources):
            if source.suffix.lower() != ".json":
                raise ReviewError("检查记录须为 JSON 文件")
            reports.append(plan(source, prefix + "/records/" + source.name, stage, number, "case-record"))
        reference = item.get("reference") or {}
        url = source_url(reference.get("url") or reference.get("sourceUrl"))
        ref = {"title": str(reference.get("title") or "原参考"), "url": url, "file": None}
        if private_references:
            ref_source = safe_member(base, reference.get("file"))
            if ref_source.suffix.lower() != ".png":
                raise ReviewError("内部原参考须为 PNG 证据图片")
            raw = ref_source.read_bytes()
            if reference.get("sha256") and reference["sha256"] != digest(raw):
                raise ReviewError("原参考哈希与选择记录不一致: " + number)
            ref["dimensions"] = list(png_dimensions(raw))
            ref["crop"] = reference.get("crop")
            ref["file"] = plan(ref_source, prefix + "/reference/original.png", "第三方参考，仅内部审阅", number, "private-reference-image")
        alternative = item.get("alternative")
        if alternative:
            source = safe_member(base, alternative)
            target = plan(source, prefix + "/alternative/" + source.name, "备选稿，待评审", number, "alternative-image")
            downloads.append({"path": target, "label": "查看备选稿"})
        items.append({"number": number, "title": str(item.get("title") or number), "stage": stage, "changed": changed, "current": current, "before": previous, "reference": ref, "downloads": downloads, "reports": reports, "notes": item.get("nextStep") or item.get("notes") or ""})

    for skill in skills:
        for source, relative, data in skill["files"]:
            input_files.append((source, digest(source.read_bytes())))
            plans.append({"source": source, "target": "skills/" + skill["name"] + "/" + relative, "data": data, "stage": "对应绘图规则源码", "case": None, "role": "skill-source", "sourceSha256": digest(source.read_bytes())})
    page = render_page(items, skills, private_references, no_links(Path(template)).read_text(encoding="utf-8"))
    selection_data = redact_local_paths(payload)
    for entry, packaged in zip(selection_data["cases"], items):
        entry["image"] = packaged["current"]
        entry["before"] = packaged["before"]
        for suffix in ("svg", "drawio"):
            entry[suffix] = next((file["path"] for file in packaged["downloads"]
                                  if file["path"].endswith("/current/diagram." + suffix)), None)
        entry["checkFiles"] = packaged["reports"]
        for old_field in ("card", "checks", "alternative"):
            entry.pop(old_field, None)
        entry["reference"] = {**entry.get("reference", {}), **packaged["reference"],
                              "screenshotIncluded": private_references}
        if not private_references:
            entry["reference"].pop("file", None)
    generated = {
        "index.html": (page.encode("utf-8"), "设计师评审入口", "review-page"),
        "selection.json": ((json.dumps(selection_data, ensure_ascii=False, indent=2) + "\n").encode("utf-8"), "选图记录，已脱敏", "selection-record"),
        "README.txt": (("从 index.html 开始，无需联网、登录或启动服务。\n点击每张图的“放大查看”，可切换原尺寸与适合窗口。\n“本轮未改”表示当前图片与此前图片字节一致。全部图稿仍需设计师评审。\n" + ("本包含第三方参考截图，仅内部审阅，请勿公开发布或转发。\n" if private_references else "本包未收录第三方截图，来源网页地址仍保留。\n") + "绘图规则与源码位于 skills/，每张图的源文件和检查记录位于 cases/。\n压缩包旁的 .manifest.json 记录所有包内文件（包括包内清单）的 SHA-256 与状态。\n自动检查与字节清单不代表审美认可，也不证明实际系统事实。\n").encode("utf-8"), "使用说明", "readme"),
    }
    output.mkdir(parents=True, exist_ok=False)
    files = []
    targets = set()

    def write(relative, data, stage, role, case=None, source_sha=None):
        if relative in targets:
            raise ReviewError("重复打包目标: " + relative)
        targets.add(relative)
        target = output / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        record = {"path": relative, "sha256": digest(data), "bytes": len(data), "stage": stage, "role": role, "case": case}
        if source_sha:
            record["sourceSha256"] = source_sha
            record["transformed"] = source_sha != record["sha256"]
        files.append(record)

    for item in plans:
        write(item["target"], item["data"], item["stage"], item["role"], item["case"], item["sourceSha256"])
    for relative, (data, stage, role) in generated.items():
        write(relative, data, stage, role)
    summary = {"caseCount": 12, "revisedImages": sum(item["changed"] for item in items), "unchangedImages": sum(not item["changed"] for item in items), "privateReferencesIncluded": private_references, "referenceImages": 12 if private_references else 0, "skills": [item["name"] for item in skills], "allCasesApproved": False, "browserVerified": False, "visualQualityCertified": False}
    source_changed = [source.name for source, expected in input_files if digest(source.read_bytes()) != expected]
    if source_changed:
        raise ReviewError("打包过程中输入文件发生变化: " + ", ".join(source_changed))
    inner = {"summary": summary, "cases": [{key: item[key] for key in ("number", "title", "stage", "changed")} for item in items], "files": sorted(files, key=lambda item: item["path"]), "selfHashLocation": "The sibling .manifest.json hashes every package file including this manifest; this inner inventory excludes its own self-referential hash.", "warnings": warnings, "inputFilesUnchanged": True}
    write("manifest.json", (json.dumps(inner, ensure_ascii=False, indent=2) + "\n").encode("utf-8"), "包内文件与状态清单", "inner-manifest")
    with zipfile.ZipFile(archive, "x", compression=zipfile.ZIP_DEFLATED) as bundle:
        for record in sorted(files, key=lambda item: item["path"]):
            bundle.write(output / record["path"], record["path"])
    inventory_data = {"package": output.name, "archive": archive.name, "archiveSha256": digest(archive.read_bytes()), "summary": summary, "files": sorted(files, key=lambda item: item["path"]), "inputFilesUnchanged": True, "warnings": warnings, "scope": "Byte integrity, declared stage and input confinement only; browser rendering and designer approval are separate evidence."}
    inventory.write_text(json.dumps(inventory_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {"output": output, "archive": archive, "inventory": inventory, "summary": summary}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--selection", type=Path, default=ROOT / "output/flagship-12-20261013/selection.json")
    parser.add_argument("--output", type=Path, default=ROOT / "output" / ("designer-review-" + datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")))
    parser.add_argument("--private-references", action="store_true", help="加入第三方原参考截图；包会明确标注仅内部审阅")
    parser.add_argument("--skill-source", type=Path, action="append", help="可重复指定明确的技能源码目录；默认仅仓库 skills/musedraw")
    args = parser.parse_args()
    try:
        result = build(args.selection, args.output, private_references=args.private_references, skill_sources=args.skill_source)
    except (ReviewError, OSError, ValueError, ET.ParseError) as error:
        parser.exit(1, "无法构建评审包: " + str(error) + "\n")
    print(json.dumps({"output": str(result["output"]), "archive": str(result["archive"]), "inventory": str(result["inventory"]), **result["summary"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
