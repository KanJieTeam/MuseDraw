#!/usr/bin/env python3
"""Assemble an offline graph-workflow review from actual, already-rendered runs.

No model calls or package installations. Raw invocation/transport/request files
are deliberately never read or bundled. Proof exports use explicit field lists.
"""
from __future__ import annotations

import argparse
import hashlib
import html
from html.parser import HTMLParser
import json
from pathlib import Path, PurePosixPath, PureWindowsPath
import re
import shutil
import struct
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DEFAULT = "musedraw-graph-workflow-review-20261014"
SOURCES = ("deepseek-graph-tools-20261014-reviewed", "deepseek-graph-holdout-20261014-reviewed")
LABELS = {"archive-sketch": "项目资料归档", "device-planes": "设备数据平台",
          "appointment-holdout": "医院预约系统", "publishing-holdout": "内容发布系统"}
SUMMARY_FIELDS = ("date", "provider", "model", "plannedRounds", "completedRounds",
                  "passedRounds", "firstAttemptPassed", "measuredCalls")
CHECK_FIELDS = ("passed", "textCount", "containerBoundsChecked", "uniqueIds", "vectorOnly",
                "inputPolicy", "composition", "style", "nodeCount", "edgeCount",
                "contentSha256", "svgSha256", "deterministicSource", "visualAcceptance")
TEXT_SUFFIXES = {".md", ".py", ".mjs", ".json", ".yaml", ".yml", ".svg", ".txt"}
OMITTED = {"references/cases", "references/gallery-index.json"}
PRIVATE_PATH = re.compile(r"(?<![\w])(?:[A-Za-z]:[\\/]|file://|/(?:Users|home|root|mnt)/)[^\s\"'<>]+")
SECRET = re.compile(r"\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,}|(?:AKIA|ASIA)[A-Z0-9]{16})\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def json_bytes(value) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def member(base: Path, value: str) -> Path:
    raw = value.replace("\\", "/")
    parts = PurePosixPath(raw).parts
    if PureWindowsPath(value).drive or raw.startswith("/") or ":" in raw or ".." in parts:
        raise ValueError("Only contained relative artifact paths are accepted")
    target = base / raw
    if not target.resolve().is_relative_to(base.resolve()):
        raise ValueError("Artifact path escapes its evidence folder")
    for item in [target, *target.parents]:
        if item.is_symlink() or (item.exists() and getattr(item.lstat(), "st_file_attributes", 0) & 0x400):
            raise ValueError("Symlink/junction inputs are not supported")
    return target


def safe_text(data: bytes, name: str):
    text = data.decode("utf-8-sig")
    if PRIVATE_PATH.search(text) or SECRET.search(text):
        raise ValueError("Private path or credential-like material in " + name)


def selected(value, fields):
    return {key: value[key] for key in fields if key in value}


def document_export(raw):
    scene = raw["scene"]
    return {"scene": {
        "title": scene["title"],
        "groups": [selected(g, ("id", "label", "role")) for g in scene.get("groups", [])],
        "nodes": [selected(n, ("id", "label", "kind", "parent", "focus")) for n in scene["nodes"]],
        "edges": [selected(e, ("id", "from", "to", "label", "direction")) for e in scene["edges"]]},
        "presentation": selected(raw["presentation"], ("style", "composition"))}


def checks_export(raw):
    result = selected(raw, CHECK_FIELDS)
    # Do not copy arbitrary diagnostic strings/paths or local invocation details.
    result["diagnosticCounts"] = {key: len(raw.get(key, [])) for key in
                                  ("outside", "collisions", "overflow", "edgeTextCrossings", "warnings")}
    result["scopeLimits"] = ["Professional aesthetic acceptance pending", "Other models untested",
                             "No universal topology or cross-platform font guarantee"]
    return result


def operation_export(raw):
    result = []
    fields = {"rename_node": ("op", "id", "label"), "remove_node": ("op", "id"),
              "remove_edge": ("op", "id"), "add_node": ("op", "node"), "add_edge": ("op", "edge")}
    for item in raw["operations"]:
        op = item["op"]
        if op not in fields:
            raise ValueError("Unsupported recorded operation")
        clean = selected(item, fields[op])
        if "node" in clean:
            clean["node"] = selected(clean["node"], ("id", "label", "kind", "parent", "focus"))
        if "edge" in clean:
            clean["edge"] = selected(clean["edge"], ("id", "from", "to", "label", "direction"))
        result.append(clean)
    return {"operations": result}


def verify_svg(data):
    safe_text(data, "diagram.svg")
    text = data.decode("utf-8-sig")
    if re.search(r"<!DOCTYPE|<!ENTITY|<(?:script|image|foreignObject)\b|\bon\w+\s*=|\b(?:href|src)\s*=", text, re.I):
        raise ValueError("Review SVG must contain only static native geometry")
    if ET.fromstring(text).tag != "{http://www.w3.org/2000/svg}svg":
        raise ValueError("Expected native SVG")


def png_size(data):
    if data[:8] != b"\x89PNG\r\n\x1a\n" or data[12:16] != b"IHDR":
        raise ValueError("Missing genuine PNG")
    return struct.unpack(">II", data[16:24])


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = []

    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key in {"href", "src"} and value and not value.startswith("#"):
                self.paths.append(value)


def verify(destination):
    manifest = read_json(destination / "manifest.json")
    for item in manifest["files"]:
        path = member(destination, item["path"])
        data = path.read_bytes()
        if sha(data) != item["sha256"] or len(data) != item["bytes"]:
            raise ValueError("Manifest mismatch: " + item["path"])
    parser = Links()
    parser.feed((destination / "index.html").read_text(encoding="utf-8"))
    for value in parser.paths:
        if ":" in value or not member(destination, value.split("#")[0]).is_file():
            raise ValueError("Broken or external review link: " + value)
    proof = read_json(destination / "proof/summary.json")
    states = [state for run in proof["runs"] for case in run["cases"] for state in case["states"]]
    if len(states) != 10 or not all(state["passed"] and state["rendered"] for state in states):
        raise ValueError("Expected exactly 8 conversation + 2 new-topic passing states")
    for state in states:
        base = destination / state["directory"]
        doc = read_json(base / "document.json")
        checks = read_json(base / "checks.json")
        png_size((base / "diagram.png").read_bytes())
        verify_svg((base / "diagram.svg").read_bytes())
        if len(doc["scene"]["nodes"]) != checks["nodeCount"] or len(doc["scene"]["edges"]) != checks["edgeCount"]:
            raise ValueError("Evidence counts disagree")
    return {"passed": True, "states": len(states), "manifestFiles": len(manifest["files"]),
            "checkedPageLinks": len(parser.paths), "claims": "Artifact integrity and local links only"}


def page(proof):
    e = lambda value: html.escape(str(value), quote=True)
    sections = []
    for run in proof["runs"]:
        for case in run["cases"]:
            cards = []
            for state in case["states"]:
                path = state["directory"]
                label = "初始生成" if state["round"] == 0 else f"对话修订 {state['round']}"
                cards.append(f'''<article class="card"><div class="cardtop"><span>{e(label)}</span><small>{state['nodeCount']} 组件 · {state['edgeCount']} 关系</small></div>
<a class="art" href="{path}/diagram.png"><img loading="lazy" src="{path}/preview-1200.png" alt="{e(case['label'])} · {e(label)}"></a>
<p class="prompt">{e(state['prompt'])}</p><div class="files"><a href="{path}/diagram.svg">SVG</a><a href="{path}/diagram.png">完整 PNG</a><a href="{path}/document.json">语义文档</a><a href="{path}/proof.json">技术检查</a>{f'<a href="{path}/edits.json">编辑操作</a>' if state['round'] else ''}</div></article>''')
            badge = "新主题初次生成" if run["kind"] == "holdout" else "初始生成与连续编辑"
            sections.append(f'''<section id="{case['id']}"><div class="sectiontitle"><div><p class="eyebrow">{badge}</p><h2>{e(case['label'])}</h2></div><span class="chip">{e(case['style'])} · {e(case['composition'])}</span></div><div class="grid">{''.join(cards)}</div></section>''')
    return '''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>MuseDraw · 可复用语义图工作流</title><style>
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#f6f5f1;color:#182b25;font:16px/1.65 system-ui,'Microsoft YaHei',sans-serif}a{color:inherit;text-decoration:none}a:hover{text-decoration:underline}main{max-width:1440px;margin:auto;padding:44px 5vw 80px}.brand{font-size:18px;letter-spacing:2px;font-weight:650}.mast{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid #d9ddd3;padding-bottom:22px}.mast small{color:#6a7369}.hero{padding:64px 0 42px;max-width:930px}.eyebrow{font-size:12px;letter-spacing:2px;color:#607368;margin:0 0 10px}h1{font-size:clamp(36px,5vw,64px);letter-spacing:-2px;line-height:1.15;font-weight:620;margin:14px 0 24px}h2{font-size:25px;font-weight:600;margin:0}.hero p{max-width:780px;color:#516055}.metrics{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid #d9ddd3;border-bottom:1px solid #d9ddd3;padding:22px 0;gap:20px}.metrics strong{display:block;font-size:30px;font-weight:550}.metrics span{font-size:13px;color:#607368}.note{background:#eaf0e7;padding:18px 22px;margin:28px 0;font-size:14px}.nav{display:flex;flex-wrap:wrap;gap:20px;padding:10px 0 24px;color:#48674e;font-size:14px}section{padding:38px 0;border-top:1px solid #d9ddd3}.sectiontitle{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:22px}.chip{font-size:12px;padding:8px 13px;border:1px solid #cbd7c8;border-radius:30px;white-space:nowrap}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}.card{border:1px solid #d9ddd3;background:#fff;overflow:hidden;border-radius:10px}.cardtop{display:flex;justify-content:space-between;padding:18px 22px;border-bottom:1px solid #ecede8;font-size:14px}.cardtop small{color:#768173}.art{display:flex;align-items:center;justify-content:center;min-height:290px;height:340px;padding:22px;background:#fff}.art img{display:block;max-width:100%;max-height:100%;object-fit:contain}.prompt{font-size:13px;line-height:1.75;color:#5d6e60;padding:0 22px;margin:12px 0 16px;min-height:70px}.files{display:flex;flex-wrap:wrap;gap:16px;border-top:1px solid #ecede8;padding:14px 22px;font-size:12px;color:#176849}.tech{display:grid;grid-template-columns:1fr 1fr;gap:32px;font-size:14px;color:#516055}.tech h3{font-size:18px;color:#182b25;font-weight:550}footer{border-top:1px solid #d9ddd3;padding-top:26px;font-size:12px;color:#718070}code{font-size:12px;overflow-wrap:anywhere}@media(max-width:800px){main{padding:28px 20px}.hero{padding:40px 0 28px}.metrics{grid-template-columns:repeat(2,1fr)}.grid,.tech{grid-template-columns:1fr}.sectiontitle{align-items:flex-start;flex-direction:column}.art{height:300px}.prompt{min-height:0}.mast{align-items:center}}
</style></head><body><main><div class="mast"><a class="brand" href="#">MUSE DRAW</a><small>GRAPH WORKFLOW / 14 OCT 2026</small></div>
<div class="hero"><p class="eyebrow">面向设计审阅与技术复核的离线交付</p><h1>从一句需求，<br>到可持续编辑的架构图。</h1><p>自然语言描述组件与关系，模型生成语义文档或小型编辑操作；共享渲染器负责构图、字体测量、端口与路径。以下图片来自实际 DeepSeek 工具调用结果，可直接打开并逐项核查。</p></div>
<div class="metrics"><div><strong>8 / 8</strong><span>两组初始生成与连续编辑状态</span></div><div><strong>2 / 2</strong><span>两个新主题的初次生成</span></div><div><strong>2</strong><span>共享构图策略：flow / planes</span></div><div><strong>2</strong><span>数据样式：手绘线稿 / 终端色域</span></div></div>
<div class="note">技术检查通过代表已测样本的内容及渲染约束满足。专业审美验收仍待设计师评审；目前仅实测 deepseek-flash，不承诺任意模型、任意图拓扑或跨平台像素一致。</div>
<nav class="nav"><a href="#archive-sketch">资料归档</a><a href="#device-planes">设备平台</a><a href="#appointment-holdout">医院预约</a><a href="#publishing-holdout">内容发布</a><a href="#technical">技术交付</a></nav>
''' + ''.join(sections) + '''<section id="technical"><div class="sectiontitle"><h2>拿走图片，也拿走工作流。</h2></div><div class="tech"><div><h3>同一套代码处理不同业务</h3><p>flow 按有向图层级排列并保留环路；planes 按实际提供的平面与域组织组件。两种构图共享语义 ID、文本测量和关系路由。两套样式在 graph-styles.json 中配置，没有每个案例单独编写绘图程序。</p><p><a href="README.md">阅读安装、重放与编辑说明 →</a><br><a href="skills/musedraw/references/graph-workflow.md">语义图格式和操作说明 →</a><br><a href="skills/musedraw/SKILL.md">安装 Skill 入口 →</a></p></div><div><h3>证据、版本与边界</h3><p>包内保存实际模型结果的语义文档、SVG、完整 PNG、预览图与白名单技术摘要；原始请求、本机调用路径与传输日志不收录。文件清单记录交付内容哈希，当前代码哈希与历史运行证据分别列出；未据此宣称旧样本由最新代码精确重放。</p><p><a href="proof/summary.json">已测结果摘要 →</a><br><a href="proof/source-hashes.json">当前关键源码 SHA-256 →</a><br><a href="manifest.json">完整交付清单与哈希 →</a></p></div></div></section><footer>原创生成的通用参考架构 · 包含可复用图工作流 · 不构成真实业务系统事实、普适生成保证或设计师批准。</footer></main></body></html>'''


README = """# MuseDraw 可复用语义图工作流审阅包

直接打开 index.html 审阅实际图片。每个状态都可下载完整 PNG、原生 SVG、语义 document.json 与白名单技术证据。图片为原创通用参考架构，不能用作真实系统事实。

## 工作流与运行环境

将 skills/musedraw 整体放入支持 Agent Skill 的宿主技能目录并加载 SKILL.md。自然语言由支持工具调用的模型转成组件、分组、明确关系和少量编辑操作。用户无需写 JavaScript、指定坐标或提供完整技术清单。

两种共享构图策略 flow 和 planes 支持不同主题：flow 按图层级排列并保留环路；planes 按用户提供的平面分组。手绘线稿与终端色域是 graph-styles.json 中的两套数据样式。字体测量、端口、避障路由、导出、验证由共享代码实现；没有每个案例单独编写绘图代码。

已有 Node.js 22+、Playwright、Chromium 兼容浏览器及中文字体才能重新生成 PNG。包不含 node_modules、浏览器、字体或任何自动安装步骤。下列 MODULE 和 BROWSER 是接收者已有工具的位置占位符，并非交付者的本机路径。运行时请提供实际位置：

```sh
node skills/musedraw/scripts/render_graph.mjs examples/archive-sketch/round-0/document.json replay-output --playwright MODULE --browser BROWSER
node skills/musedraw/scripts/render_graph.mjs examples/archive-sketch/round-0/document.json edited-output --operations examples/archive-sketch/round-1/edits.json --playwright MODULE --browser BROWSER
```

每次使用新的输出目录。简单修订使用 rename_node/add_node/remove_node/add_edge/remove_edge，保留无关内容和样式；不要重新生成完整文档。只添加用户明确提供的关系。

## 包内资料

- examples：8 个已测对话状态和 2 个新主题初次生成，附短用户提示、语义内容和实际图像。
- skills/musedraw：installed Skill 当前源码与运行所需参考；可选的批量图库 references/cases 与 gallery-index.json 明确省略。Skill 原始文档保留提及可选图库的链接，离线图路线不依赖它们；此包不提供图库查询功能。
- proof/summary.json：按字段白名单导出的已测计数、语义检查、渲染检查与 token 使用量，未收录原始请求、response、调用/传输路径或本机依赖。
- proof/source-hashes.json：打包时当前关键源码哈希，区别于历史运行结果中的图像与内容哈希。
- manifest.json：全部交付文件的字节数与 SHA-256；manifest 自身不列入其递归哈希。

## 证据界限

deepseek-flash 实际工具调用：8/8 对话状态与 2/2 新主题状态均首次通过已测内容和渲染检查。此计数来自已经存在的实际运行，构建本包不调用付费模型。

专业审美验收仍待设计师确认，其他模型未测试。上述成功不能推广为所有模型、所有拓扑、所有语言与字体都保证成功。最多 80 节点、12 个平面分组、160 条关系；复杂或不支持的拓扑可能拒绝渲染。具体限制以 graph-workflow.md 为准。

原始模型图片保持不变；当前源码可能在原运行后增加修正，当前源码哈希不是历史运行时的版本证明。可在自己的环境按上述命令重放；相同字体和代码条件下可检查源几何，跨平台像素可能不同。技术检查不是安全认证、架构事实确认或审美批准。

运行 python scripts/build_graph_delivery.py --verify-only --output 此包目录 可复核文件哈希、图像结构与页面本地链接。该 builder 位于完整仓库中，不是模型推理所需依赖。
"""


def build(destination, make_zip=True):
    destination = destination.resolve()
    output_root = (ROOT / "output").resolve()
    if destination == output_root or not destination.is_relative_to(output_root):
        raise ValueError("Delivery must be a named child of repository output")
    if destination.exists():
        raise ValueError("Use a fresh directory; previous evidence is never overwritten")
    destination.mkdir(parents=True, exist_ok=True)
    records = []

    def write(relative, data, source=None):
        target = member(destination, relative)
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.suffix in TEXT_SUFFIXES or target.name in {"LICENSE", "NOTICE"}:
            safe_text(data, relative)
        target.write_bytes(data)
        record = {"path": relative, "bytes": len(data), "sha256": sha(data)}
        if source is not None:
            record["source"] = source.relative_to(ROOT).as_posix()
            record["sourceSha256"] = sha(source.read_bytes())
        records.append(record)

    proof = {"version": 1, "visualAcceptance": "pending", "otherModelsTested": False,
             "evidencePolicy": "Whitelisted fields; no invocation/transport/request files", "runs": []}
    for source_name in SOURCES:
        source_base = ROOT / "output" / source_name
        original = read_json(source_base / "summary.json")
        run = selected(original, SUMMARY_FIELDS)
        frozen = read_json(source_base / "frozen-plan.json")
        run["sourceHashes"] = [selected(item, ("path", "sha256")) for item in frozen["sources"]]
        for item in run["sourceHashes"]:
            if sha(member(ROOT, item["path"]).read_bytes()) != item["sha256"]:
                raise ValueError("Tested source no longer matches: " + item["path"])
        run["sourceHashesMatchPackageBuild"] = True
        run["kind"] = "holdout" if "holdout" in source_name else "conversation"
        run["usage"] = selected(original.get("usage", {}), ("prompt_tokens", "completion_tokens", "total_tokens"))
        run["cases"] = []
        for case in original["results"]:
            clean_case = {"id": case["id"], "label": LABELS[case["id"]], "style": case["style"], "states": []}
            for round_ in case["rounds"]:
                attempts = [a for a in round_["attempts"] if a.get("passed") and a.get("rendered")]
                if not attempts:
                    raise ValueError("Missing successful rendered model state")
                attempt = attempts[0]
                attempt_dir = member(source_base, attempt["directory"])
                render = attempt_dir / "render"
                relative = f"examples/{case['id']}/round-{round_['round']}"
                document = document_export(read_json(render / "document.json"))
                checks = checks_export(read_json(render / "checks.json"))
                clean_case["composition"] = document["presentation"]["composition"]
                state = {"round": round_["round"], "prompt": round_["prompt"], "directory": relative,
                         "passed": attempt["passed"], "rendered": attempt["rendered"],
                         "nodeCount": len(document["scene"]["nodes"]), "edgeCount": len(document["scene"]["edges"]),
                         "toolName": attempt["toolName"], "checks": checks,
                         "contentChecks": selected(attempt.get("contentChecks", {}), ("passed", "nodeCount", "edgeCount")),
                         "usage": selected(attempt.get("usage", {}), ("prompt_tokens", "completion_tokens", "total_tokens"))}
                for name, value in (("document.json", document), ("content.json", document["scene"]),
                                    ("presentation.json", document["presentation"]), ("checks.json", checks)):
                    write(relative + "/" + name, json_bytes(value), render / name)
                for name in ("diagram.svg", "diagram.png", "preview-1200.png"):
                    data = (render / name).read_bytes()
                    verify_svg(data) if name.endswith(".svg") else png_size(data)
                    write(relative + "/" + name, data, render / name)
                if round_["round"]:
                    response = read_json(attempt_dir / "response.json")
                    calls = response["choices"][0]["message"]["tool_calls"]
                    if len(calls) != 1 or calls[0]["function"]["name"] != "edit_graph":
                        raise ValueError("Expected a recorded semantic edit tool call")
                    edits = operation_export(json.loads(calls[0]["function"]["arguments"]))
                    write(relative + "/edits.json", json_bytes(edits))
                write(relative + "/prompt.txt", (round_["prompt"] + "\n").encode("utf-8"))
                write(relative + "/proof.json", json_bytes(state))
                clean_case["states"].append(state)
            run["cases"].append(clean_case)
        proof["runs"].append(run)

    skill = ROOT / "skills/musedraw"
    for source in sorted(skill.rglob("*")):
        if not source.is_file():
            continue
        relative = source.relative_to(skill).as_posix()
        if any(relative == item or relative.startswith(item + "/") for item in OMITTED):
            continue
        if any(p.startswith(".") or p in {"node_modules", "__pycache__", "fonts"} for p in source.relative_to(skill).parts):
            continue
        if source.suffix not in TEXT_SUFFIXES | {".png"} and source.name not in {"LICENSE", "NOTICE"}:
            continue
        member(skill, relative)
        write("skills/musedraw/" + relative, source.read_bytes(), source)
    essential = ["skills/musedraw/SKILL.md", "skills/musedraw/references/graph-workflow.md",
                 "skills/musedraw/references/graph-styles.json", "skills/musedraw/scripts/render_graph.mjs",
                 "skills/musedraw/scripts/preview.mjs", "skills/musedraw/scripts/route_edges.mjs",
                 "scripts/build_graph_delivery.py"]
    hashes = {"scope": "Current files at package build time, not historical invocation provenance",
              "files": [{"path": value, "sha256": sha((ROOT / value).read_bytes())} for value in essential]}
    write("proof/source-hashes.json", json_bytes(hashes))
    write("proof/summary.json", json_bytes(proof))
    write("README.md", README.encode("utf-8"))
    write("index.html", page(proof).encode("utf-8"))
    write("LICENSE", (ROOT / "LICENSE").read_bytes(), ROOT / "LICENSE")
    write("NOTICE", (ROOT / "NOTICE").read_bytes(), ROOT / "NOTICE")
    manifest = {"version": 1, "files": sorted(records, key=lambda item: item["path"]),
                "excluded": sorted(OMITTED) + ["raw invocations, requests, responses and transport logs",
                                               "node_modules, browsers, fonts and credentials"],
                "optionalSkillLinks": "Links to omitted gallery resources in unmodified Skill docs are unavailable",
                "evidenceCodeRelationship": "Current source hashes and historical output hashes are separate"}
    (destination / "manifest.json").write_bytes(json_bytes(manifest))
    result = verify(destination)
    if make_zip:
        archive = destination.with_suffix(".zip")
        with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as output:
            for relative in [item["path"] for item in manifest["files"]] + ["manifest.json"]:
                output.write(destination / relative, destination.name + "/" + relative)
        with zipfile.ZipFile(archive) as bundle:
            if bundle.testzip() is not None or len(bundle.namelist()) != len(manifest["files"]) + 1:
                raise ValueError("Archive integrity failed")
        result["zipBytes"] = archive.stat().st_size
        result["zipSha256"] = sha(archive.read_bytes())
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "output" / DEFAULT)
    parser.add_argument("--no-zip", action="store_true", help="Stage files without final archive")
    parser.add_argument("--verify-only", action="store_true")
    args = parser.parse_args()
    result = verify(args.output.resolve()) if args.verify_only else build(args.output, not args.no_zip)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
