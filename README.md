<<<<<<< HEAD
# Temporal Frame Labeler MVP

비디오의 frame 구간을 선택하고 repo v41 기준 팔/interaction primitive/target type/articulation/relation-state 라벨을 체크해서 JSON/CSV로 내보내는 정적 웹앱입니다.
서버 저장 없이 브라우저 안에서 동작하므로 GitHub Pages, Netlify, Vercel 같은 정적 호스팅에 올릴 수 있습니다.

## 실행

프로젝트 루트에서:

```bash
cd annotation_web
python3 -m http.server 8000
```

브라우저에서 <http://localhost:8000> 접속 후 로컬 비디오 파일을 선택하거나 비디오 URL을 입력합니다.
`index.html`을 직접 열어도 로컬 파일 라벨링은 가능하지만, 배포 환경과 비슷하게 보려면 위처럼 HTTP 서버로 여는 것을 권장합니다.

## 라벨링 흐름

1. 비디오 파일 또는 URL을 불러옵니다.
2. FPS를 확인합니다. 자동 frame 계산은 `currentTime * FPS` 기반입니다.
3. 프레임을 보며 `[`로 start frame, `]`로 end frame을 지정합니다.
4. 팔, 행동 primitive, 대상 종류, 물체/관절 운동, relation-state 체크박스를 선택합니다.
5. `구간 추가`를 누릅니다.
6. 필요한 만큼 반복한 뒤 `JSON 다운로드` 또는 `CSV 다운로드`로 결과를 저장합니다.
=======
# labeling_Test

GitHub Pages로 공유하는 temporal frame annotation 웹앱입니다.
비디오의 start/end frame 구간을 선택하고 팔/행동/물체 라벨을 체크한 뒤 JSON/CSV로 저장합니다.

## 공유 URL

GitHub Pages 배포 후 아래 주소로 접속합니다.

```text
https://anjunho98.github.io/labeling_Test/
```

처음 한 번은 GitHub repository 설정에서 Pages source가 GitHub Actions로 되어 있는지 확인하세요.

```text
Settings → Pages → Build and deployment → Source: GitHub Actions
```

## 사용법

1. 페이지에 접속합니다.
2. 로컬 비디오 파일을 선택하거나, CORS가 허용된 비디오 URL을 입력합니다.
3. FPS를 확인합니다.
4. `[`로 start frame, `]`로 end frame을 지정합니다.
5. 팔/행동/물체 라벨을 체크합니다.
6. `구간 추가`를 누릅니다.
7. 완료 후 `JSON 다운로드` 또는 `CSV 다운로드`를 눌러 결과를 제출합니다.
>>>>>>> f69731155d503daac49a8ae25ba76d162b6f8d38

## 단축키

- `[` : 현재 frame을 start frame으로 지정
- `]` : 현재 frame을 end frame으로 지정
- `←` / `→` : 1 frame 이동
- `Shift` + `←` / `→` : 10 frame 이동
- `Enter` : 현재 입력 구간 저장
- `Space` : 재생/일시정지

<<<<<<< HEAD
## JSON 출력 예시

```json
{
  "schema_version": "temporal_segment_annotation_v41_labels_v2",
  "annotator_id": "user01",
  "video": {
    "id": "episode_000001",
    "fps": 30,
    "total_frames": 900
  },
  "segments": [
    {
      "start_frame": 0,
      "end_frame": 120,
      "actor": ["left_arm"],
      "action": ["approach"],
      "interaction_primitive": ["approach"],
      "target_type": ["free_object"],
      "articulation_type": ["free"],
      "object_articulation_type": ["free"],
      "relation_state": ["approach_target"],
      "manipulated_entity_hint": "cup",
      "target_entity_hint": "table",
      "note": "왼팔이 컵으로 접근"
    }
  ]
}
```

## Repo v41 라벨 기준

행동 primitive는 `phase1_v41`의 유효 primitive에 맞췄습니다.

```text
approach, hold, transport, align, insert, place, open, close, adjust, withdraw
```

대상 종류는 다음 값을 사용합니다.

```text
free_object, articulated_part, control_interface, environment, ambiguous, none
```

물체/관절 운동은 다음 값을 사용합니다.

```text
free, revolute, prismatic, screw
```

세부 관계 상태는 v41 relation-state layer에서 쓰는 주요 상태를 노출합니다.

```text
approach_target, pregrasp_contact, object_hold, object_transport, object_release,
align_to_control, control_contact, active_control_motion, environment_contact, idle
```

## GitHub Pages 공유 배포

이 repo에는 `.github/workflows/deploy-annotation-web.yml`이 포함되어 있습니다.
`annotation_web/` 또는 workflow 파일이 `main` 브랜치에 push되면 GitHub Actions가 이 폴더를 GitHub Pages로 배포합니다.

예상 URL:

```text
https://anjunho98.github.io/vlm_constraint_estimation/
```

처음 한 번은 GitHub repository 설정에서 Pages source가 GitHub Actions로 되어 있는지 확인하세요.

```text
GitHub repo → Settings → Pages → Build and deployment → Source: GitHub Actions
```

배포 후 annotator에게 위 URL을 공유하면 됩니다. 비디오는 각 annotator가 로컬 파일로 선택하거나, CORS가 허용된 공개 비디오 URL을 입력해서 불러올 수 있습니다.

## 주의

- 이 MVP는 서버로 자동 저장하지 않습니다. annotator가 JSON/CSV 파일을 제출해야 합니다.
- 일반 mp4는 keyframe 구조 때문에 frame 단위 seek가 완전히 정확하지 않을 수 있습니다. 정확도가 중요하면 FPS를 고정하고 원본 비디오 인코딩 조건을 통일하세요.
- 대용량 비디오는 repo에 직접 넣지 말고 별도 스토리지/URL을 쓰는 것을 권장합니다.
=======
## 주의

- 이 웹앱은 서버 DB에 자동 저장하지 않습니다. annotator가 JSON/CSV 파일을 다운로드해서 제출해야 합니다.
- 비디오 파일은 repo에 직접 올리지 않는 것을 권장합니다. 각 annotator가 로컬 비디오 파일을 선택하거나 별도 스토리지 URL을 사용하세요.
>>>>>>> f69731155d503daac49a8ae25ba76d162b6f8d38
