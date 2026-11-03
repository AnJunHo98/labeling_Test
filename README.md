# labeling_Test

**English** | [한국어](README.ko.md)

Browser-based temporal frame annotation app for LeRobot video datasets, served on GitHub Pages with JSON/CSV export.

## Overview

A static web app (Temporal Frame Labeler) shared through GitHub Pages. You pick start/end frame ranges in a video, check labels for arm, interaction primitive, target type, articulation and relation state (based on the v41 label set), and save the result as JSON or CSV. The UI text is in Korean; the button names below are quoted as they appear in the app.

## Shared URL

```text
https://anjunho98.github.io/labeling_Test/
```

## Repository layout

| Path | Description |
| --- | --- |
| `index.html`, `app.js`, `styles.css` | The annotation web app (static, no build step) |
| `local_server.py` | Optional local server for loading datasets by absolute path, including symlinked collections |
| `.github/workflows/deploy-pages.yml` | GitHub Actions workflow that deploys the static site to GitHub Pages |
| `.nojekyll` | Disables Jekyll processing on GitHub Pages |

## Loading data

### Selecting a dataset folder

If an external annotator has the dataset folder on their own PC, they can select it directly on the GitHub Pages site with `Dataset 폴더 선택` (select dataset folder). The browser only gets temporary access to files inside the folder the user selected.

Supported layout:

```text
bimanual_panda_hand.BoxCleanup/
├── meta/
│   ├── info.json
│   └── tasks.jsonl
└── videos/
    └── chunk-000/
        ├── observation.images.ego_view/episode_000000.mp4
        ├── observation.images.left_wrist_view/episode_000000.mp4
        └── observation.images.right_wrist_view/episode_000000.mp4
```

Detected automatically:

- `meta/info.json`: FPS and video feature info
- `meta/tasks.jsonl`: task description candidates
- `videos/**/episode_*.mp4`: videos per episode and camera
- optionally `.phase1_v41_local/**/episode_*.phase1_v41.json`: extra task/FPS info

Note: typing a path string (e.g. `/home/...`) cannot give the page access to files, because of browser security. The user must pick the folder in the folder-selection dialog.

A single video can also be loaded with `로컬 비디오 파일` (local video file) or by URL with `URL 로드` (load URL).

### Local mode for symlinked candidate folders

When dataset folders are gathered with symlinks (for example a `human_label_anomaly_candidates_20260506/tuning/` folder), the browser's regular `Dataset 폴더 선택` may not pass along the files behind the symlinks. In that case, run the local server, which scans the given absolute path directly and loads all symlinked datasets at once:

```bash
cd /path/to/labeling_Test
python3 local_server.py --port 8000
```

Open `http://127.0.0.1:8000` in the browser, enter the folder in `로컬 dataset 경로` (local dataset path), for example:

```text
/path/to/human_label_anomaly_candidates_20260506/tuning
```

and press `경로 불러오기` (load path).

This local mode does not copy or upload the videos into the app; the running `local_server.py` serves only the files that are needed, locally. The server binds to `127.0.0.1` by default (`--host` and `--port` can be changed).

## Labeling workflow

1. Open the page.
2. Use `Dataset 폴더 선택` to select a LeRobot dataset folder, or a parent folder that contains several datasets.
3. Choose `Dataset / Episode` and `Camera`, then press `선택 영상 로드` (load selected video).
4. While viewing frames, press `[` to set the start frame and `]` to set the end frame.
5. Select the arm, action primitive, target type, object/joint motion (articulation) and relation state.
6. Press `구간 추가` (add segment).
7. When one video is done, press `현재 annotation 누적` (add current annotation to bundle).
8. Label other episodes/cameras/folders and add them to the bundle as well.
9. Finally, save all accumulated results at once with `Bundle JSON 다운로드` or `Bundle CSV 다운로드` (download bundle JSON/CSV).

To save a single video only, use `JSON 다운로드` or `CSV 다운로드` as before. A previously saved annotation JSON can be loaded back with `JSON 불러오기` (import JSON).

## Bundle JSON format

When several results are accumulated, each annotation JSON is stored as an array element in a single bundle file.

```json
{
  "schema_version": "temporal_segment_annotation_bundle_v1",
  "count": 2,
  "annotations": [
    {
      "schema_version": "temporal_segment_annotation_v41_labels_v2",
      "dataset_id": "bimanual_panda_hand.BoxCleanup",
      "episode_id": "episode_000000",
      "camera": "ego_view",
      "task_description": "move the box lid onto the box",
      "video": {
        "relative_path": "bimanual_panda_hand.BoxCleanup/videos/chunk-000/observation.images.ego_view/episode_000000.mp4",
        "fps": 20
      },
      "segments": []
    }
  ]
}
```

## Label set

Arm / actor:

```text
left_arm, right_arm, both_arms, unknown_actor
```

Primitive:

```text
approach, hold, transport, align, insert, place, open, close, adjust, withdraw
```

Target type:

```text
free_object, articulated_part, control_interface, environment, ambiguous, none
```

Articulation:

```text
free, revolute, prismatic, screw
```

Relation state:

```text
approach_target, pregrasp_contact, object_hold, object_transport, object_release,
align_to_control, control_contact, active_control_motion, environment_contact, idle
```

## Keyboard shortcuts

- `[` : set the current frame as the start frame
- `]` : set the current frame as the end frame
- `←` / `→` : move 1 frame
- `Shift` + `←` / `→` : move 10 frames
- `Enter` : save the current segment
- `Space` : play/pause

## GitHub Pages setup

The simplest setup:

```text
Settings → Pages → Build and deployment → Source: Deploy from a branch
Branch: main
Folder: /root
Save
```

To use GitHub Actions instead, set `Source: GitHub Actions` and run the included workflow (`.github/workflows/deploy-pages.yml`, which also runs on every push to `main`).

## Notes

- The app does not save anything to a server database. Annotators must download the JSON/CSV files and submit them.
- The bundle is kept temporarily in the browser's localStorage. Clearing the browser cache/site data can remove it, so download intermediate results while working.
- Committing video files to the repo is not recommended (`.gitignore` excludes common video formats). Each annotator should select a local dataset folder or use a separate storage URL.

## Status

Static MVP; last updated in May 2026.

## License

Released under the MIT License. See [LICENSE](LICENSE).
