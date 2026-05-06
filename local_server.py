#!/usr/bin/env python3
"""Local-only server for loading LeRobot datasets by absolute path.

The GitHub Pages version cannot read `/home/...` paths or follow symlinked
dataset collections because browsers only expose files explicitly selected by
the user. Run this helper locally when a collection folder contains symlinks:

    python3 local_server.py --port 8000

Then open http://127.0.0.1:8000 and enter the local dataset path in the UI.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import os
import re
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse


APP_DIR = Path(__file__).resolve().parent
FILE_REGISTRY: dict[str, Path] = {}


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve the annotation web app with local dataset path APIs.")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind. Defaults to 127.0.0.1.")
    parser.add_argument("--port", default=8000, type=int, help="Port to bind. Defaults to 8000.")
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"Serving annotation web app at http://{args.host}:{args.port}")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        server.server_close()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(APP_DIR), **kwargs)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/datasets":
            self.handle_datasets(parsed)
            return
        if parsed.path.startswith("/api/file/"):
            self.handle_file(parsed, headers_only=False)
            return
        super().do_GET()

    def do_HEAD(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/file/"):
            self.handle_file(parsed, headers_only=True)
            return
        super().do_HEAD()

    def handle_datasets(self, parsed) -> None:
        params = parse_qs(parsed.query)
        root_value = params.get("root", [""])[0].strip()
        if not root_value:
            self.send_json({"error": "root query parameter is required"}, HTTPStatus.BAD_REQUEST)
            return

        root = Path(root_value).expanduser()
        if not root.exists() or not root.is_dir():
            self.send_json({"error": f"Dataset root does not exist or is not a directory: {root}"}, HTTPStatus.NOT_FOUND)
            return

        try:
            items = scan_dataset_items(root)
        except Exception as exc:  # Keep API errors readable in the UI.
            self.send_json({"error": str(exc)}, HTTPStatus.INTERNAL_SERVER_ERROR)
            return

        self.send_json({"root": str(root), "count": len(items), "items": items})

    def handle_file(self, parsed, headers_only: bool) -> None:
        file_id = unquote(parsed.path.rsplit("/", 1)[-1])
        path = FILE_REGISTRY.get(file_id)
        if path is None or not path.is_file():
            self.send_error(HTTPStatus.NOT_FOUND, "Registered file not found")
            return

        try:
            self.send_registered_file(path, headers_only=headers_only)
        except BrokenPipeError:
            return

    def send_json(self, body: dict, status: int = HTTPStatus.OK) -> None:
        encoded = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def send_registered_file(self, path: Path, headers_only: bool) -> None:
        total = path.stat().st_size
        start, end = range_for_request(self.headers.get("Range"), total)
        status = HTTPStatus.PARTIAL_CONTENT if self.headers.get("Range") else HTTPStatus.OK
        content_length = end - start + 1

        self.send_response(status)
        self.send_header("Content-Type", mimetypes.guess_type(path.name)[0] or "application/octet-stream")
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(content_length))
        if status == HTTPStatus.PARTIAL_CONTENT:
            self.send_header("Content-Range", f"bytes {start}-{end}/{total}")
        self.end_headers()

        if headers_only:
            return

        with path.open("rb") as file:
            file.seek(start)
            remaining = content_length
            while remaining > 0:
                chunk = file.read(min(1024 * 1024, remaining))
                if not chunk:
                    break
                self.wfile.write(chunk)
                remaining -= len(chunk)


def scan_dataset_items(selected_root: Path) -> list[dict]:
    roots = find_dataset_roots(selected_root)
    items: list[dict] = []
    for dataset_root in roots:
        info = read_json(dataset_root / "meta" / "info.json", {})
        tasks = read_jsonl(dataset_root / "meta" / "tasks.jsonl")
        fps = dataset_fps(info)
        task_description = default_task_description(tasks)
        phase_cache_by_episode = phase_cache_map(dataset_root)

        for video_path in sorted((dataset_root / "videos").rglob("*.mp4")):
            episode_id = video_path.stem
            if not re.match(r"^episode_\d+$", episode_id, re.IGNORECASE):
                continue

            camera_path = video_path.parent.relative_to(dataset_root / "videos").as_posix()
            episode_task = task_description
            episode_fps = fps
            num_steps = None
            primary_camera = None
            cache = read_json(phase_cache_by_episode.get(episode_id), {})
            if isinstance(cache, dict):
                cache_task = str(cache.get("task_description") or cache.get("task_name") or "").strip()
                if cache_task:
                    episode_task = cache_task
                cache_fps = parse_positive_float(cache.get("fps"))
                if cache_fps:
                    episode_fps = cache_fps
                if cache.get("num_steps"):
                    try:
                        num_steps = int(cache["num_steps"])
                    except (TypeError, ValueError):
                        num_steps = None
                if cache.get("primary_camera"):
                    primary_camera = str(cache["primary_camera"])

            dataset_root_name = dataset_id_for(dataset_root)
            dataset_root_key = relative_to_or_name(dataset_root, selected_root)
            video_relative_path = relative_to_or_name(video_path, selected_root)
            camera = camera_name(camera_path)
            items.append(
                {
                    "key": f"{dataset_root_key}|{episode_id}|{camera}",
                    "dataset_root": dataset_root_key,
                    "dataset_id": dataset_root_name,
                    "episode_id": episode_id,
                    "camera": camera,
                    "camera_path": camera_path,
                    "video_url": f"/api/file/{register_file(video_path)}",
                    "video_relative_path": video_relative_path,
                    "fps": episode_fps,
                    "task_description": episode_task,
                    "num_steps": num_steps,
                    "primary_camera": primary_camera,
                }
            )

    return sorted(items, key=lambda item: item["key"])


def find_dataset_roots(selected_root: Path) -> list[Path]:
    roots: list[Path] = []
    visited: set[str] = set()

    for current, dirs, _files in os.walk(selected_root, followlinks=True):
        current_path = Path(current)
        real_path = str(current_path.resolve(strict=False))
        if real_path in visited:
            dirs[:] = []
            continue
        visited.add(real_path)

        if (current_path / "meta" / "info.json").is_file() and (current_path / "videos").is_dir():
            roots.append(current_path)
            dirs[:] = []

    return sorted(roots, key=lambda path: path.as_posix())


def dataset_id_for(dataset_root: Path) -> str:
    if dataset_root.is_symlink():
        return dataset_root.resolve().name
    name = dataset_root.name
    match = re.match(r"^\d+_score\d+_(.+)$", name)
    if match:
        return match.group(1)
    return name or "local_dataset"


def relative_to_or_name(path: Path, root: Path) -> str:
    try:
        return path.relative_to(root).as_posix()
    except ValueError:
        return path.as_posix()


def phase_cache_map(dataset_root: Path) -> dict[str, Path]:
    out: dict[str, Path] = {}
    for phase_root in [".phase1_v41_local", ".phase1_v40_local", ".phase1_local"]:
        root = dataset_root / phase_root
        if not root.is_dir():
            continue
        for path in sorted(root.rglob("*.json")):
            match = re.search(r"(episode_\d+)\.phase1(?:_v\d+)?(?:\.[^.]+)?\.json$", path.name)
            if match and match.group(1) not in out:
                out[match.group(1)] = path
    return out


def read_json(path: Path | None, fallback):
    if not path:
        return fallback
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return fallback


def read_jsonl(path: Path) -> list[dict]:
    try:
        return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    except Exception:
        return []


def dataset_fps(info: dict) -> float:
    direct = parse_positive_float(info.get("fps") if isinstance(info, dict) else None)
    if direct:
        return direct
    features = info.get("features", {}) if isinstance(info, dict) else {}
    if isinstance(features, dict):
        for spec in features.values():
            video_info = spec.get("video_info", {}) if isinstance(spec, dict) else {}
            value = parse_positive_float(video_info.get("video.fps"))
            if value:
                return value
    return 30


def default_task_description(tasks: list[dict]) -> str:
    valid = next((item for item in tasks if item.get("task") and str(item["task"]).strip().lower() != "valid"), None)
    first = valid or next((item for item in tasks if item.get("task")), None)
    return str(first["task"]).strip() if first else ""


def camera_name(camera_path: str) -> str:
    last = Path(camera_path).name or "camera"
    return re.sub(r"^observation\.images?\.", "", last)


def parse_positive_float(value) -> float | None:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    return parsed if parsed > 0 else None


def register_file(path: Path) -> str:
    resolved = path.resolve()
    file_id = hashlib.sha1(str(resolved).encode("utf-8")).hexdigest()
    FILE_REGISTRY[file_id] = resolved
    return file_id


def range_for_request(range_header: str | None, total: int) -> tuple[int, int]:
    if not range_header:
        return 0, total - 1

    match = re.match(r"bytes=(\d*)-(\d*)$", range_header.strip())
    if not match:
        return 0, total - 1

    start_text, end_text = match.groups()
    if start_text:
        start = int(start_text)
        end = int(end_text) if end_text else total - 1
    else:
        suffix = int(end_text) if end_text else total
        start = max(total - suffix, 0)
        end = total - 1

    start = min(max(start, 0), total - 1)
    end = min(max(end, start), total - 1)
    return start, end


if __name__ == "__main__":
    main()
