# labeling_Test

GitHub Pages로 공유하는 temporal frame annotation 웹앱입니다.
비디오의 start/end frame 구간을 선택하고 repo v41 기준 팔/interaction primitive/target type/articulation/relation-state 라벨을 체크한 뒤 JSON/CSV로 저장합니다.

## 공유 URL

GitHub Pages 배포 후 아래 주소로 접속합니다.

```text
https://anjunho98.github.io/labeling_Test/
```

## 사용법

1. 페이지에 접속합니다.
2. 로컬 비디오 파일을 선택하거나, CORS가 허용된 비디오 URL을 입력합니다.
3. FPS를 확인합니다.
4. `[`로 start frame, `]`로 end frame을 지정합니다.
5. 팔, 행동 primitive, 대상 종류, 물체/관절 운동, relation-state를 선택합니다.
6. `구간 추가`를 누릅니다.
7. 완료 후 `JSON 다운로드` 또는 `CSV 다운로드`를 눌러 결과를 제출합니다.

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
- 비디오 파일은 repo에 직접 올리지 않는 것을 권장합니다. 각 annotator가 로컬 비디오 파일을 선택하거나 별도 스토리지 URL을 사용하세요.
