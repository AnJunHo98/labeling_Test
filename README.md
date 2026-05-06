# labeling_Test

GitHub Pages로 공유하는 temporal frame annotation 웹앱입니다.
비디오의 start/end frame 구간을 선택하고 repo v41 기준 팔/interaction primitive/target type/articulation/relation-state 라벨을 체크한 뒤 JSON/CSV로 저장합니다.

## 공유 URL

```text
https://anjunho98.github.io/labeling_Test/
```

## Dataset 폴더 선택 방식

외부 annotator가 dataset 폴더를 자기 PC에 가지고 있으면, GitHub Pages 사이트에서 `Dataset 폴더 선택`으로 폴더를 직접 선택할 수 있습니다.
브라우저는 사용자가 선택한 폴더 안의 파일에만 임시 접근합니다.

지원하는 구조:

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

자동 인식하는 정보:

- `meta/info.json`: FPS, video feature 정보
- `meta/tasks.jsonl`: task description 후보
- `videos/**/episode_*.mp4`: episode/camera별 비디오
- 선택적으로 `.phase1_v41_local/**/episode_*.phase1_v41.json`: task/FPS 보강

주의: 경로 문자열(`/home/...`)만 입력해서 자동 접근하는 것은 브라우저 보안상 불가능합니다. 반드시 사용자가 폴더 선택 창에서 직접 선택해야 합니다.

### Symlink 후보 폴더를 한 번에 여는 로컬 모드

`human_label_anomaly_candidates_20260506/tuning/`처럼 dataset 폴더들을 symlink로 모아 둔 경우, 브라우저의 일반 `Dataset 폴더 선택`은 symlink 내부 파일을 넘겨주지 않을 수 있습니다.
이때는 로컬 서버를 실행하면 `/home/.../tuning` 경로를 직접 스캔해서 symlink 대상 dataset들을 한 번에 불러올 수 있습니다.

```bash
cd /home/dam/jh_ws/constraint_estimation/annotation_web
python3 local_server.py --port 8000
```

브라우저에서 `http://127.0.0.1:8000`을 열고 `로컬 dataset 경로`에 아래처럼 입력한 뒤 `경로 불러오기`를 누릅니다.

```text
/home/dam/jh_ws/dataset/dataset/human_label_anomaly_candidates_20260506/tuning
```

이 로컬 모드는 동영상 파일을 앱으로 복사/업로드하지 않고, 실행 중인 `local_server.py`가 필요한 파일만 로컬에서 제공합니다.

## 라벨링 흐름

1. 페이지에 접속합니다.
2. `Dataset 폴더 선택`으로 LeRobot dataset 폴더 또는 여러 dataset을 담은 상위 폴더를 선택합니다.
3. `Dataset / Episode`와 `Camera`를 고르고 `선택 영상 로드`를 누릅니다.
4. 프레임을 보며 `[`로 start frame, `]`로 end frame을 지정합니다.
5. 팔, 행동 primitive, 대상 종류, 물체/관절 운동, relation-state를 선택합니다.
6. `구간 추가`를 누릅니다.
7. 한 영상이 끝나면 `현재 annotation 누적`을 누릅니다.
8. 다른 episode/camera/folder를 라벨링한 뒤 다시 누적합니다.
9. 마지막에 `Bundle JSON 다운로드` 또는 `Bundle CSV 다운로드`로 누적 결과를 한 번에 저장합니다.

개별 영상만 저장하려면 기존처럼 `JSON 다운로드` 또는 `CSV 다운로드`를 누르면 됩니다.

## Bundle JSON 구조

여러 결과를 누적하면 하나의 bundle 파일에 각 annotation JSON이 배열로 들어갑니다.

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

## 라벨 기준

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

## 단축키

- `[` : 현재 frame을 start frame으로 지정
- `]` : 현재 frame을 end frame으로 지정
- `←` / `→` : 1 frame 이동
- `Shift` + `←` / `→` : 10 frame 이동
- `Enter` : 현재 입력 구간 저장
- `Space` : 재생/일시정지

## GitHub Pages 설정

가장 단순한 설정은 다음입니다.

```text
Settings → Pages → Build and deployment → Source: Deploy from a branch
Branch: main
Folder: /root
Save
```

GitHub Actions를 쓰려면 `Source: GitHub Actions`로 설정하고 포함된 workflow를 실행하세요.

## 주의

- 이 웹앱은 서버 DB에 자동 저장하지 않습니다. annotator가 JSON/CSV 파일을 다운로드해서 제출해야 합니다.
- Bundle은 브라우저 localStorage에 임시 저장됩니다. 브라우저 캐시/사이트 데이터를 지우면 사라질 수 있으므로 작업 중간에도 다운로드를 권장합니다.
- 비디오 파일은 repo에 직접 올리지 않는 것을 권장합니다. 각 annotator가 로컬 dataset 폴더를 선택하거나 별도 스토리지 URL을 사용하세요.
