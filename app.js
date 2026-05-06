(() => {
  "use strict";

  const LABELS = {
    actor: [
      { value: "left_arm", label: "왼팔" },
      { value: "right_arm", label: "오른팔" },
      { value: "both_arms", label: "양팔" },
      { value: "unknown_actor", label: "판단 불가" },
    ],
    action: [
      { value: "approach", label: "approach / 대상에 접근" },
      { value: "hold", label: "hold / 잡고 있음·접촉 유지" },
      { value: "transport", label: "transport / 자유 물체 운반" },
      { value: "align", label: "align / 정렬" },
      { value: "insert", label: "insert / 삽입" },
      { value: "place", label: "place / 놓기·release" },
      { value: "open", label: "open / 열기" },
      { value: "close", label: "close / 닫기" },
      { value: "adjust", label: "adjust / 조작·조정" },
      { value: "withdraw", label: "withdraw / 물러남" },
    ],
    target_type: [
      { value: "free_object", label: "free_object / 자유 물체" },
      { value: "articulated_part", label: "articulated_part / 관절 부품" },
      { value: "control_interface", label: "control_interface / 버튼·손잡이·레버" },
      { value: "environment", label: "environment / 환경 접촉" },
      { value: "ambiguous", label: "ambiguous / 애매함" },
      { value: "none", label: "none / 없음" },
    ],
    articulation_type: [
      { value: "free", label: "free / 자유 물체 운동" },
      { value: "revolute", label: "revolute / 회전 관절" },
      { value: "prismatic", label: "prismatic / 직선·슬라이딩 관절" },
      { value: "screw", label: "screw / 나사·스크류 운동" },
    ],
    relation_state: [
      { value: "approach_target", label: "approach_target / 대상 접근" },
      { value: "pregrasp_contact", label: "pregrasp_contact / 잡기 전 접촉" },
      { value: "object_hold", label: "object_hold / 물체 보유" },
      { value: "object_transport", label: "object_transport / 물체 운반" },
      { value: "object_release", label: "object_release / 물체 놓기" },
      { value: "align_to_control", label: "align_to_control / 조작부 정렬" },
      { value: "control_contact", label: "control_contact / 조작부 접촉" },
      { value: "active_control_motion", label: "active_control_motion / 능동 관절 조작" },
      { value: "environment_contact", label: "environment_contact / 환경 접촉" },
      { value: "idle", label: "idle / 대기" },
    ],
  };

  const DRAFT_KEY = "temporalFrameLabeler.v1.draft";
  const BUNDLE_KEY = "temporalFrameLabeler.v1.bundle";

  const elements = {
    datasetFolder: document.getElementById("datasetFolder"),
    localDatasetPath: document.getElementById("localDatasetPath"),
    loadLocalDatasetPath: document.getElementById("loadLocalDatasetPath"),
    datasetStatus: document.getElementById("datasetStatus"),
    datasetSelect: document.getElementById("datasetSelect"),
    cameraSelect: document.getElementById("cameraSelect"),
    loadDatasetVideo: document.getElementById("loadDatasetVideo"),
    datasetInfo: document.getElementById("datasetInfo"),
    videoFile: document.getElementById("videoFile"),
    videoUrl: document.getElementById("videoUrl"),
    loadUrl: document.getElementById("loadUrl"),
    annotatorId: document.getElementById("annotatorId"),
    videoId: document.getElementById("videoId"),
    fps: document.getElementById("fps"),
    totalFrames: document.getElementById("totalFrames"),
    video: document.getElementById("video"),
    currentFrame: document.getElementById("currentFrame"),
    maxFrame: document.getElementById("maxFrame"),
    currentTime: document.getElementById("currentTime"),
    frameSlider: document.getElementById("frameSlider"),
    markStart: document.getElementById("markStart"),
    markEnd: document.getElementById("markEnd"),
    startFrame: document.getElementById("startFrame"),
    endFrame: document.getElementById("endFrame"),
    actorOptions: document.getElementById("actorOptions"),
    actionOptions: document.getElementById("actionOptions"),
    targetTypeOptions: document.getElementById("targetTypeOptions"),
    articulationOptions: document.getElementById("articulationOptions"),
    relationStateOptions: document.getElementById("relationStateOptions"),
    manipulatedEntity: document.getElementById("manipulatedEntity"),
    targetEntity: document.getElementById("targetEntity"),
    note: document.getElementById("note"),
    warning: document.getElementById("warning"),
    saveSegment: document.getElementById("saveSegment"),
    resetForm: document.getElementById("resetForm"),
    segmentCount: document.getElementById("segmentCount"),
    timeline: document.getElementById("timeline"),
    segmentsBody: document.getElementById("segmentsBody"),
    importJsonButton: document.getElementById("importJsonButton"),
    importJson: document.getElementById("importJson"),
    exportJson: document.getElementById("exportJson"),
    exportCsv: document.getElementById("exportCsv"),
    clearSegments: document.getElementById("clearSegments"),
    addToBundle: document.getElementById("addToBundle"),
    bundleCount: document.getElementById("bundleCount"),
    bundleList: document.getElementById("bundleList"),
    downloadBundleJson: document.getElementById("downloadBundleJson"),
    downloadBundleCsv: document.getElementById("downloadBundleCsv"),
    clearBundle: document.getElementById("clearBundle"),
  };

  let segments = [];
  let editingIndex = null;
  let objectUrl = null;
  let loadedVideoName = "";
  let loadedVideoUrl = "";
  let autoTotalFrames = true;
  let datasetItems = [];
  let currentDatasetItem = null;
  let annotationBundle = [];

  function labelMap(kind) {
    return new Map(LABELS[kind].map((item) => [item.value, item.label]));
  }

  const maps = {
    actor: labelMap("actor"),
    action: labelMap("action"),
    target_type: labelMap("target_type"),
    articulation_type: labelMap("articulation_type"),
    relation_state: labelMap("relation_state"),
  };

  function renderOptions(kind, container) {
    container.innerHTML = "";
    for (const option of LABELS[kind]) {
      const id = `${kind}-${option.value}`;
      const label = document.createElement("label");
      label.className = "check-item";
      label.innerHTML = `
        <input type="checkbox" id="${id}" name="${kind}" value="${option.value}">
        <span>${option.label}</span>
      `;
      container.appendChild(label);
    }
  }

  async function handleDatasetFolderSelection(fileList) {
    const files = [...(fileList || [])].filter((file) => file.webkitRelativePath);
    if (files.length === 0) {
      setDatasetStatus("선택된 dataset 폴더 파일이 없습니다. Symlink만 담긴 폴더라면 local_server.py로 실행한 뒤 로컬 dataset 경로를 사용하세요.");
      return;
    }
    setDatasetStatus(`${files.length}개 파일 선택됨. dataset 구조를 읽는 중...`);

    try {
      const parsedItems = await parseDatasetFiles(files);
      await addParsedDatasetItems(parsedItems);
    } catch (error) {
      setDatasetStatus(`Dataset 폴더 읽기 실패: ${error.message || error}`);
    } finally {
      elements.datasetFolder.value = "";
    }
  }

  async function handleLocalDatasetPath() {
    const root = elements.localDatasetPath.value.trim();
    if (!root) {
      setDatasetStatus("로컬 dataset 경로를 입력하세요.");
      return;
    }
    if (!/^https?:$/.test(window.location.protocol)) {
      setDatasetStatus("로컬 dataset 경로 로딩은 `python3 local_server.py`로 실행한 http://127.0.0.1 페이지에서만 사용할 수 있습니다.");
      return;
    }

    setDatasetStatus(`로컬 dataset 경로 스캔 중: ${root}`);
    try {
      const apiUrl = new URL("/api/datasets", window.location.href);
      apiUrl.searchParams.set("root", root);
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response));
      }
      const payload = await response.json();
      const parsedItems = (payload.items || []).map(normalizeLocalDatasetItem).filter(Boolean);
      await addParsedDatasetItems(parsedItems);
    } catch (error) {
      setDatasetStatus(`로컬 dataset 경로 읽기 실패: ${error.message || error}`);
    }
  }

  async function addParsedDatasetItems(parsedItems) {
    if (parsedItems.length === 0) {
      setDatasetStatus("meta/info.json과 videos/.../episode_*.mp4 구조를 찾지 못했습니다.");
      return;
    }

    mergeDatasetItems(parsedItems);
    renderDatasetSelectors();
    setDatasetStatus(`${parsedItems.length}개 video stream 인식, 전체 ${datasetItems.length}개 stream 사용 가능.`);
    if (!currentDatasetItem) {
      elements.datasetSelect.value = episodeKey(parsedItems[0]);
      renderCameraSelector();
      elements.cameraSelect.value = parsedItems[0].camera;
      await loadSelectedDatasetVideo({ clearExistingSegments: segments.length === 0 });
    }
  }

  async function responseErrorMessage(response) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await response.json().catch(() => null);
      if (body && body.error) return body.error;
    }
    if (response.status === 404) {
      return "local_server.py로 실행한 페이지에서만 로컬 경로를 읽을 수 있습니다.";
    }
    const text = await response.text().catch(() => "");
    return text.trim().slice(0, 200) || `${response.status} ${response.statusText}`;
  }

  function normalizeLocalDatasetItem(item) {
    if (!item || !item.video_url || !item.episode_id) return null;
    const datasetRoot = String(item.dataset_root || item.dataset_id || "");
    const episodeId = String(item.episode_id);
    const camera = String(item.camera || "camera");
    const fpsValue = Number.parseFloat(item.fps);
    return {
      key: String(item.key || `${datasetRoot}|${episodeId}|${camera}`),
      dataset_root: datasetRoot,
      dataset_id: String(item.dataset_id || datasetRoot || "local_dataset"),
      episode_id: episodeId,
      camera,
      camera_path: String(item.camera_path || camera),
      video_url: String(item.video_url),
      video_relative_path: String(item.video_relative_path || item.video_url),
      fps: Number.isFinite(fpsValue) && fpsValue > 0 ? fpsValue : 30,
      task_description: String(item.task_description || ""),
      num_steps: item.num_steps,
      primary_camera: item.primary_camera,
      _phase_loaded: true,
    };
  }

  async function parseDatasetFiles(files) {
    const byPath = new Map(files.map((file) => [file.webkitRelativePath, file]));
    const roots = [];
    for (const file of files) {
      const path = file.webkitRelativePath;
      if (path.endsWith("/meta/info.json")) {
        roots.push(path.slice(0, -"/meta/info.json".length));
      }
    }
    if (roots.length === 0) {
      for (const file of files) {
        const path = file.webkitRelativePath;
        const marker = "/videos/";
        if (path.includes(marker)) {
          roots.push(path.slice(0, path.indexOf(marker)));
        } else if (path.startsWith("videos/")) {
          roots.push("");
        }
      }
    }

    const items = [];
    for (const root of [...new Set(roots)].sort()) {
      const rootPrefix = root ? `${root}/` : "";
      const info = await readJsonFile(byPath.get(`${rootPrefix}meta/info.json`), {});
      const tasks = await readJsonlFile(byPath.get(`${rootPrefix}meta/tasks.jsonl`));
      const fpsValue = datasetFps(info);
      const datasetId = root.split("/").filter(Boolean).pop() || "selected_dataset";
      const defaultTask = defaultTaskDescription(tasks);
      const phaseCacheByEpisode = phaseCacheMap(files, root);

      for (const file of files) {
        const relativePath = file.webkitRelativePath;
        const prefix = `${rootPrefix}videos/`;
        if (!relativePath.startsWith(prefix) || !relativePath.toLowerCase().endsWith(".mp4")) continue;
        const tail = relativePath.slice(prefix.length);
        const parts = tail.split("/");
        const filename = parts[parts.length - 1];
        const episodeId = filename.replace(/\.mp4$/i, "");
        if (!/^episode_\d+$/i.test(episodeId)) continue;
        const cameraPath = parts.slice(0, -1).join("/");
        const camera = cameraName(cameraPath);
        const item = {
          key: `${root}|${episodeId}|${camera}`,
          dataset_root: root,
          dataset_id: datasetId,
          episode_id: episodeId,
          camera,
          camera_path: cameraPath,
          video_file: file,
          video_relative_path: relativePath,
          fps: fpsValue,
          task_description: defaultTask,
          phase_cache_file: phaseCacheByEpisode.get(episodeId) || null,
        };
        items.push(item);
      }
    }

    items.sort((a, b) => a.key.localeCompare(b.key));
    return items;
  }

  function mergeDatasetItems(items) {
    const byKey = new Map(datasetItems.map((item) => [item.key, item]));
    for (const item of items) byKey.set(item.key, item);
    datasetItems = [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
  }

  function phaseCacheMap(files, root) {
    const out = new Map();
    const preferred = [".phase1_v41_local", ".phase1_v40_local", ".phase1_local"];
    const rootPrefix = root ? `${root}/` : "";
    for (const phaseRoot of preferred) {
      for (const file of files) {
        const path = file.webkitRelativePath;
        if (!path.startsWith(`${rootPrefix}${phaseRoot}/`) || !path.endsWith(".json")) continue;
        const match = path.match(/(episode_\d+)\.phase1(?:_v\d+)?(?:\.[^.]+)?\.json$/);
        if (match && !out.has(match[1])) out.set(match[1], file);
      }
    }
    return out;
  }

  async function readJsonFile(file, fallback = null) {
    if (!file) return fallback;
    try {
      return JSON.parse(await file.text());
    } catch (_) {
      return fallback;
    }
  }

  async function readJsonlFile(file) {
    if (!file) return [];
    try {
      return (await file.text())
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => JSON.parse(line));
    } catch (_) {
      return [];
    }
  }

  function datasetFps(info) {
    const direct = Number.parseFloat(info && info.fps);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const features = info && typeof info.features === "object" ? info.features : {};
    for (const spec of Object.values(features)) {
      const videoFps = Number.parseFloat(spec && spec.video_info && spec.video_info["video.fps"]);
      if (Number.isFinite(videoFps) && videoFps > 0) return videoFps;
    }
    return 30;
  }

  function defaultTaskDescription(tasks) {
    const valid = tasks.find((item) => item && item.task && String(item.task).trim().toLowerCase() !== "valid");
    const first = valid || tasks.find((item) => item && item.task);
    return first ? String(first.task).trim() : "";
  }

  function cameraName(cameraPath) {
    const last = String(cameraPath || "").split("/").filter(Boolean).pop() || "camera";
    return last.replace(/^observation\.images?\./, "");
  }

  function episodeKey(item) {
    return `${item.dataset_root}|${item.episode_id}`;
  }

  function setDatasetStatus(message) {
    elements.datasetStatus.textContent = message || "";
  }

  function renderDatasetSelectors() {
    const current = elements.datasetSelect.value;
    const seen = new Set();
    elements.datasetSelect.innerHTML = "";
    for (const item of datasetItems) {
      const key = episodeKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      const option = document.createElement("option");
      option.value = key;
      option.textContent = `${item.dataset_id} / ${item.episode_id}`;
      elements.datasetSelect.appendChild(option);
    }
    if (current && [...elements.datasetSelect.options].some((option) => option.value === current)) {
      elements.datasetSelect.value = current;
    }
    renderCameraSelector();
  }

  function renderCameraSelector() {
    const selectedEpisode = elements.datasetSelect.value;
    const current = elements.cameraSelect.value;
    const items = datasetItems.filter((item) => episodeKey(item) === selectedEpisode);
    elements.cameraSelect.innerHTML = "";
    for (const item of items) {
      const option = document.createElement("option");
      option.value = item.camera;
      option.textContent = item.camera;
      elements.cameraSelect.appendChild(option);
    }
    if (current && items.some((item) => item.camera === current)) {
      elements.cameraSelect.value = current;
    }
  }

  async function loadSelectedDatasetVideo(options = {}) {
    const item = datasetItems.find(
      (candidate) =>
        episodeKey(candidate) === elements.datasetSelect.value &&
        candidate.camera === elements.cameraSelect.value
    );
    if (!item) {
      setDatasetStatus("로드할 dataset video가 선택되지 않았습니다.");
      return;
    }
    if (!options.clearExistingSegments && segments.length > 0) {
      const ok = window.confirm("현재 등록된 구간이 있습니다. 먼저 '현재 annotation 누적' 또는 JSON 다운로드를 권장합니다. 그래도 새 영상을 로드할까요?");
      if (!ok) return;
    }

    const enriched = await enrichDatasetItem(item);
    currentDatasetItem = enriched;
    elements.fps.value = String(enriched.fps || 30);
    autoTotalFrames = true;
    const isObjectUrl = Boolean(enriched.video_file);
    const videoSource = isObjectUrl ? URL.createObjectURL(enriched.video_file) : enriched.video_url;
    if (!videoSource) {
      setDatasetStatus("선택한 dataset video를 열 수 없습니다.");
      return;
    }
    setVideoSource(videoSource, enriched.video_relative_path || videoSource, isObjectUrl);
    elements.videoId.value = videoIdForDatasetItem(enriched);
    loadedVideoName = enriched.video_relative_path;
    loadedVideoUrl = isObjectUrl ? "" : videoSource;
    segments = [];
    editingIndex = null;
    elements.startFrame.value = "0";
    elements.endFrame.value = "0";
    resetForm({ keepFrames: true });
    renderDatasetInfo(enriched);
    saveDraft();
  }

  async function enrichDatasetItem(item) {
    if (!item.phase_cache_file || item._phase_loaded) return item;
    const cache = await readJsonFile(item.phase_cache_file, {});
    item._phase_loaded = true;
    if (cache && typeof cache === "object") {
      const task = String(cache.task_description || cache.task_name || "").trim();
      if (task) item.task_description = task;
      const cacheFps = Number.parseFloat(cache.fps);
      if (Number.isFinite(cacheFps) && cacheFps > 0) item.fps = cacheFps;
      if (cache.num_steps) item.num_steps = Number.parseInt(cache.num_steps, 10);
      if (cache.primary_camera) item.primary_camera = String(cache.primary_camera);
    }
    return item;
  }

  function videoIdForDatasetItem(item) {
    return `${item.dataset_id}__${item.episode_id}__${item.camera}`;
  }

  function renderDatasetInfo(item) {
    elements.datasetInfo.hidden = false;
    elements.datasetInfo.innerHTML = `
      <dl>
        <dt>Dataset</dt><dd>${escapeHtml(item.dataset_id)}</dd>
        <dt>Episode</dt><dd>${escapeHtml(item.episode_id)}</dd>
        <dt>Camera</dt><dd>${escapeHtml(item.camera)}</dd>
        <dt>Task</dt><dd>${escapeHtml(item.task_description || "(unknown)")}</dd>
        <dt>FPS</dt><dd>${escapeHtml(item.fps)}</dd>
        <dt>Video</dt><dd>${escapeHtml(item.video_relative_path)}</dd>
      </dl>
    `;
  }

  function fps() {
    const value = Number.parseFloat(elements.fps.value);
    return Number.isFinite(value) && value > 0 ? value : 30;
  }

  function estimatedTotalFrames() {
    if (Number.isFinite(elements.video.duration) && elements.video.duration > 0) {
      return Math.max(1, Math.floor(elements.video.duration * fps()) + 1);
    }
    return null;
  }

  function explicitTotalFrames() {
    const explicitTotal = Number.parseInt(elements.totalFrames.value, 10);
    return Number.isFinite(explicitTotal) && explicitTotal > 0 ? explicitTotal : null;
  }

  function computedTotalFrames() {
    const explicitTotal = explicitTotalFrames();
    if (!autoTotalFrames && explicitTotal !== null) {
      return explicitTotal;
    }
    const estimatedTotal = estimatedTotalFrames();
    if (estimatedTotal !== null) {
      return estimatedTotal;
    }
    if (explicitTotal !== null) {
      return explicitTotal;
    }
    return Math.max(1, Number.parseInt(elements.frameSlider.max, 10) + 1 || 1);
  }

  function maxFrame() {
    return Math.max(0, computedTotalFrames() - 1);
  }

  function currentFrame() {
    return clamp(Math.round(elements.video.currentTime * fps()), 0, maxFrame());
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function updateVideoMetadata() {
    const total = computedTotalFrames();
    if (autoTotalFrames) {
      elements.totalFrames.value = String(total);
    }
    elements.frameSlider.max = String(Math.max(0, total - 1));
    elements.maxFrame.textContent = String(Math.max(0, total - 1));
    updateFrameDisplay();
    renderTimeline();
  }

  function updateFrameDisplay() {
    const frame = currentFrame();
    elements.currentFrame.textContent = String(frame);
    elements.currentTime.textContent = `${elements.video.currentTime.toFixed(3)}s`;
    elements.frameSlider.value = String(frame);
  }

  function seekToFrame(frame) {
    const target = clamp(Math.round(frame), 0, maxFrame());
    elements.video.pause();
    elements.video.currentTime = target / fps();
    elements.frameSlider.value = String(target);
    elements.currentFrame.textContent = String(target);
  }

  function stepFrame(delta) {
    seekToFrame(currentFrame() + delta);
  }

  function setVideoSource(src, name, isObjectUrl = false) {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    if (isObjectUrl) {
      objectUrl = src;
      loadedVideoUrl = "";
    } else {
      loadedVideoUrl = src;
    }
    loadedVideoName = name || "video";
    autoTotalFrames = true;
    elements.totalFrames.value = "";
    elements.video.src = src;
    elements.videoId.value = inferVideoId(loadedVideoName || src);
  }

  function inferVideoId(source) {
    const clean = String(source || "")
      .split(/[?#]/, 1)[0]
      .split("/")
      .pop()
      .replace(/\.[^.]+$/, "");
    return clean || "video";
  }

  function valuesFor(kind) {
    return [...document.querySelectorAll(`input[name="${kind}"]:checked`)].map((input) => input.value);
  }

  function setValues(kind, values) {
    const selected = new Set(Array.isArray(values) ? values : []);
    for (const input of document.querySelectorAll(`input[name="${kind}"]`)) {
      input.checked = selected.has(input.value);
    }
  }

  function labelsFor(kind, values) {
    const map = maps[kind];
    return (Array.isArray(values) ? values : []).map((value) => map.get(value) || value);
  }

  function entityHintText(segment) {
    const manipulated = String(segment.manipulated_entity_hint || "").trim();
    const target = String(segment.target_entity_hint || "").trim();
    if (manipulated && target) return `${manipulated} → ${target}`;
    return manipulated || target || "";
  }

  function showWarning(message) {
    if (!message) {
      elements.warning.hidden = true;
      elements.warning.textContent = "";
      return;
    }
    elements.warning.hidden = false;
    elements.warning.textContent = message;
  }

  function formSegment() {
    const start = Number.parseInt(elements.startFrame.value, 10);
    const end = Number.parseInt(elements.endFrame.value, 10);
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      throw new Error("Start/End frame은 숫자여야 합니다.");
    }
    if (start < 0 || end < 0) {
      throw new Error("Start/End frame은 0 이상이어야 합니다.");
    }
    if (end < start) {
      throw new Error("End frame은 Start frame보다 크거나 같아야 합니다.");
    }

    const actor = valuesFor("actor");
    const action = valuesFor("action");
    const targetType = valuesFor("target_type");
    const articulationType = valuesFor("articulation_type");
    const relationState = valuesFor("relation_state");
    if (actor.length === 0) {
      throw new Error("팔/행위자를 하나 이상 선택하세요. 애매하면 '판단 불가'를 선택하세요.");
    }
    if (action.length === 0) {
      throw new Error("행동 primitive를 하나 이상 선택하세요.");
    }

    return {
      id: editingIndex === null ? cryptoId() : segments[editingIndex].id || cryptoId(),
      start_frame: start,
      end_frame: end,
      actor,
      action,
      target_type: targetType,
      articulation_type: articulationType,
      relation_state: relationState,
      manipulated_entity_hint: elements.manipulatedEntity.value.trim(),
      target_entity_hint: elements.targetEntity.value.trim(),
      note: elements.note.value.trim(),
    };
  }

  function cryptoId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return `seg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function overlappingSegments(candidate, ignoreIndex = null) {
    return segments
      .map((segment, index) => ({ segment, index }))
      .filter(({ index }) => index !== ignoreIndex)
      .filter(({ segment }) => candidate.start_frame <= segment.end_frame && segment.start_frame <= candidate.end_frame);
  }

  function sortSegments() {
    segments.sort((a, b) => {
      if (a.start_frame !== b.start_frame) return a.start_frame - b.start_frame;
      return a.end_frame - b.end_frame;
    });
  }

  function saveCurrentSegment() {
    try {
      const segment = formSegment();
      const overlaps = overlappingSegments(segment, editingIndex);
      if (overlaps.length > 0) {
        showWarning(`주의: 기존 ${overlaps.length}개 구간과 frame 범위가 겹칩니다. 저장은 허용했습니다.`);
      } else {
        showWarning("");
      }

      if (editingIndex === null) {
        segments.push(segment);
      } else {
        segments[editingIndex] = segment;
      }
      sortSegments();
      editingIndex = null;
      resetForm({ keepFrames: true });
      renderSegments();
      saveDraft();
    } catch (error) {
      showWarning(error.message || String(error));
    }
  }

  function resetForm(options = {}) {
    const keepFrames = Boolean(options.keepFrames);
    if (!keepFrames) {
      const frame = currentFrame();
      elements.startFrame.value = String(frame);
      elements.endFrame.value = String(frame);
    }
    setValues("actor", []);
    setValues("action", []);
    setValues("target_type", []);
    setValues("articulation_type", []);
    setValues("relation_state", []);
    elements.manipulatedEntity.value = "";
    elements.targetEntity.value = "";
    elements.note.value = "";
    editingIndex = null;
    elements.saveSegment.textContent = "구간 추가";
    showWarning("");
    renderSegments();
  }

  function renderSegments() {
    elements.segmentCount.textContent = `${segments.length}개`;
    elements.segmentsBody.innerHTML = "";

    if (segments.length === 0) {
      elements.segmentsBody.innerHTML = '<tr><td colspan="10" class="empty">아직 등록된 구간이 없습니다.</td></tr>';
      renderTimeline();
      return;
    }

    segments.forEach((segment, index) => {
      const row = document.createElement("tr");
      if (index === editingIndex) row.classList.add("editing");
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${segment.start_frame}~${segment.end_frame}</td>
        <td>${escapeHtml(labelsFor("actor", segment.actor).join(", "))}</td>
        <td>${escapeHtml(labelsFor("action", segment.action).join(", "))}</td>
        <td>${escapeHtml(labelsFor("target_type", segment.target_type).join(", "))}</td>
        <td>${escapeHtml(labelsFor("articulation_type", segment.articulation_type).join(", "))}</td>
        <td>${escapeHtml(labelsFor("relation_state", segment.relation_state).join(", "))}</td>
        <td>${escapeHtml(entityHintText(segment))}</td>
        <td>${escapeHtml(segment.note || "")}</td>
        <td class="row-actions">
          <button type="button" data-edit="${index}">수정</button>
          <button type="button" data-seek-start="${segment.start_frame}">이동</button>
          <button type="button" data-delete="${index}" class="danger">삭제</button>
        </td>
      `;
      elements.segmentsBody.appendChild(row);
    });

    renderTimeline();
  }

  function renderTimeline() {
    elements.timeline.innerHTML = "";
    const total = computedTotalFrames();
    if (total <= 1 || segments.length === 0) return;

    segments.forEach((segment, index) => {
      const item = document.createElement("div");
      item.className = "timeline-segment";
      const left = clamp((segment.start_frame / total) * 100, 0, 100);
      const width = clamp(((segment.end_frame - segment.start_frame + 1) / total) * 100, 0.4, 100 - left);
      item.style.left = `${left}%`;
      item.style.width = `${width}%`;
      item.style.background = colorForSegment(segment);
      item.textContent = labelsFor("action", segment.action).join(", ") || `${segment.start_frame}~${segment.end_frame}`;
      item.title = `${segment.start_frame}~${segment.end_frame}: ${item.textContent}`;
      item.addEventListener("click", () => editSegment(index));
      elements.timeline.appendChild(item);
    });
  }

  function colorForSegment(segment) {
    const text = [...(segment.action || []), ...(segment.actor || [])].join("|") || "segment";
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
      hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    }
    const hue = hash % 360;
    return `hsl(${hue} 72% 45%)`;
  }

  function editSegment(index) {
    const segment = segments[index];
    if (!segment) return;
    editingIndex = index;
    elements.startFrame.value = String(segment.start_frame);
    elements.endFrame.value = String(segment.end_frame);
    setValues("actor", segment.actor);
    setValues("action", segment.action);
    setValues("target_type", segment.target_type);
    setValues("articulation_type", segment.articulation_type);
    setValues("relation_state", segment.relation_state);
    elements.manipulatedEntity.value = segment.manipulated_entity_hint || "";
    elements.targetEntity.value = segment.target_entity_hint || "";
    elements.note.value = segment.note || "";
    elements.saveSegment.textContent = "구간 저장";
    seekToFrame(segment.start_frame);
    showWarning("");
    renderSegments();
  }

  function deleteSegment(index) {
    if (!segments[index]) return;
    segments.splice(index, 1);
    if (editingIndex === index) editingIndex = null;
    renderSegments();
    saveDraft();
  }

  function exportPayload() {
    const dataset = currentDatasetItem ? {
      id: currentDatasetItem.dataset_id,
      root: currentDatasetItem.dataset_root,
      episode_id: currentDatasetItem.episode_id,
      camera: currentDatasetItem.camera,
      camera_path: currentDatasetItem.camera_path,
      task_description: currentDatasetItem.task_description || "",
      video_relative_path: currentDatasetItem.video_relative_path,
    } : null;
    return {
      schema_version: "temporal_segment_annotation_v41_labels_v2",
      exported_at: new Date().toISOString(),
      annotator_id: elements.annotatorId.value.trim(),
      dataset,
      dataset_id: dataset ? dataset.id : "",
      episode_id: dataset ? dataset.episode_id : "",
      camera: dataset ? dataset.camera : "",
      task_description: dataset ? dataset.task_description : "",
      video: {
        id: elements.videoId.value.trim() || inferVideoId(loadedVideoName || loadedVideoUrl),
        name: loadedVideoName,
        source_url: loadedVideoUrl,
        relative_path: dataset ? dataset.video_relative_path : "",
        fps: fps(),
        duration_sec: Number.isFinite(elements.video.duration) ? elements.video.duration : null,
        total_frames: computedTotalFrames(),
      },
      label_schema: LABELS,
      segments: segments.map((segment) => ({
        ...segment,
        actor_labels: labelsFor("actor", segment.actor),
        action_labels: labelsFor("action", segment.action),
        interaction_primitive: segment.action,
        interaction_primitive_labels: labelsFor("action", segment.action),
        target_type_labels: labelsFor("target_type", segment.target_type),
        object_articulation_type: segment.articulation_type,
        object_articulation_labels: labelsFor("articulation_type", segment.articulation_type),
        relation_state_labels: labelsFor("relation_state", segment.relation_state),
      })),
    };
  }

  function downloadJson() {
    const payload = exportPayload();
    const name = filenameBase(payload.video.id, payload.annotator_id);
    downloadBlob(`${name}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
  }

  function downloadCsv() {
    const payload = exportPayload();
    const rows = [[
      "dataset_id",
      "episode_id",
      "camera",
      "task_description",
      "video_relative_path",
      "video_id",
      "annotator_id",
      "start_frame",
      "end_frame",
      "actor",
      "actor_labels",
      "interaction_primitive",
      "interaction_primitive_labels",
      "target_type",
      "target_type_labels",
      "object_articulation_type",
      "object_articulation_labels",
      "relation_state",
      "relation_state_labels",
      "manipulated_entity_hint",
      "target_entity_hint",
      "note",
    ]];

    for (const segment of payload.segments) {
      rows.push([
        payload.dataset_id || "",
        payload.episode_id || "",
        payload.camera || "",
        payload.task_description || "",
        payload.video.relative_path || "",
        payload.video.id,
        payload.annotator_id,
        segment.start_frame,
        segment.end_frame,
        (segment.actor || []).join("|"),
        (segment.actor_labels || []).join("|"),
        (segment.action || []).join("|"),
        (segment.interaction_primitive_labels || []).join("|"),
        (segment.target_type || []).join("|"),
        (segment.target_type_labels || []).join("|"),
        (segment.articulation_type || []).join("|"),
        (segment.object_articulation_labels || []).join("|"),
        (segment.relation_state || []).join("|"),
        (segment.relation_state_labels || []).join("|"),
        segment.manipulated_entity_hint || "",
        segment.target_entity_hint || "",
        segment.note || "",
      ]);
    }

    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const name = filenameBase(payload.video.id, payload.annotator_id);
    downloadBlob(`${name}.csv`, csv, "text/csv;charset=utf-8");
  }

  function addCurrentAnnotationToBundle() {
    const payload = exportPayload();
    if (payload.segments.length === 0) {
      showWarning("누적할 segment가 없습니다. 먼저 구간을 추가하세요.");
      return;
    }
    const key = annotationBundleKey(payload);
    const existingIndex = annotationBundle.findIndex((item) => item.key === key);
    if (existingIndex >= 0) {
      const ok = window.confirm("같은 annotator/dataset/episode/camera annotation이 이미 누적되어 있습니다. 새 내용으로 교체할까요?");
      if (!ok) return;
      annotationBundle[existingIndex] = { key, added_at: new Date().toISOString(), payload };
    } else {
      annotationBundle.push({ key, added_at: new Date().toISOString(), payload });
    }
    saveBundle();
    renderBundle();
    showWarning("");
  }

  function annotationBundleKey(payload) {
    return [
      payload.annotator_id || "annotator",
      payload.dataset_id || "manual",
      payload.episode_id || payload.video.id || "episode",
      payload.camera || "camera",
    ].join("|");
  }

  function downloadBundleJson() {
    const bundle = bundlePayload();
    if (bundle.annotations.length === 0) {
      showWarning("다운로드할 누적 annotation이 없습니다.");
      return;
    }
    const name = sanitizeFilename(`annotation_bundle_${elements.annotatorId.value.trim() || "annotator"}`);
    downloadBlob(`${name}.json`, JSON.stringify(bundle, null, 2), "application/json;charset=utf-8");
  }

  function downloadBundleCsv() {
    const bundle = bundlePayload();
    if (bundle.annotations.length === 0) {
      showWarning("다운로드할 누적 annotation이 없습니다.");
      return;
    }
    const rows = [[
      "bundle_index",
      "dataset_id",
      "episode_id",
      "camera",
      "task_description",
      "video_relative_path",
      "video_id",
      "annotator_id",
      "start_frame",
      "end_frame",
      "actor",
      "interaction_primitive",
      "target_type",
      "object_articulation_type",
      "relation_state",
      "manipulated_entity_hint",
      "target_entity_hint",
      "note",
    ]];

    bundle.annotations.forEach((payload, bundleIndex) => {
      for (const segment of payload.segments || []) {
        rows.push([
          bundleIndex,
          payload.dataset_id || "",
          payload.episode_id || "",
          payload.camera || "",
          payload.task_description || "",
          (payload.video && payload.video.relative_path) || "",
          (payload.video && payload.video.id) || "",
          payload.annotator_id || "",
          segment.start_frame,
          segment.end_frame,
          (segment.actor || []).join("|"),
          (segment.action || segment.interaction_primitive || []).join("|"),
          (segment.target_type || []).join("|"),
          (segment.articulation_type || segment.object_articulation_type || []).join("|"),
          (segment.relation_state || []).join("|"),
          segment.manipulated_entity_hint || "",
          segment.target_entity_hint || "",
          segment.note || "",
        ]);
      }
    });

    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const name = sanitizeFilename(`annotation_bundle_${elements.annotatorId.value.trim() || "annotator"}`);
    downloadBlob(`${name}.csv`, csv, "text/csv;charset=utf-8");
  }

  function bundlePayload() {
    return {
      schema_version: "temporal_segment_annotation_bundle_v1",
      exported_at: new Date().toISOString(),
      annotator_id: elements.annotatorId.value.trim(),
      count: annotationBundle.length,
      annotations: annotationBundle.map((item) => item.payload),
    };
  }

  function saveBundle() {
    try {
      localStorage.setItem(BUNDLE_KEY, JSON.stringify(annotationBundle));
    } catch (_) {
      // Bundle save is best-effort only.
    }
  }

  function restoreBundle() {
    try {
      const raw = localStorage.getItem(BUNDLE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) annotationBundle = parsed.filter((item) => item && item.payload);
    } catch (_) {
      annotationBundle = [];
    }
  }

  function renderBundle() {
    elements.bundleCount.textContent = `${annotationBundle.length}개`;
    if (annotationBundle.length === 0) {
      elements.bundleList.className = "bundle-list empty";
      elements.bundleList.textContent = "아직 누적된 annotation이 없습니다.";
      return;
    }
    elements.bundleList.className = "bundle-list";
    elements.bundleList.innerHTML = "";
    annotationBundle.forEach((item, index) => {
      const payload = item.payload || {};
      const div = document.createElement("div");
      div.className = "bundle-item";
      div.textContent = `${index + 1}. ${payload.dataset_id || "manual"} / ${payload.episode_id || payload.video?.id || "video"} / ${payload.camera || "-"} — ${(payload.segments || []).length} segments`;
      elements.bundleList.appendChild(div);
    });
  }

  function filenameBase(videoId, annotatorId) {
    const safeVideo = sanitizeFilename(videoId || "video");
    const safeAnnotator = sanitizeFilename(annotatorId || "annotator");
    return `${safeVideo}_${safeAnnotator}_segments`;
  }

  function sanitizeFilename(value) {
    return String(value).trim().replace(/[^a-zA-Z0-9가-힣_.-]+/g, "_") || "export";
  }

  function downloadBlob(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function csvCell(value) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function importJsonFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || "{}"));
        const importedSegments = Array.isArray(parsed) ? parsed : parsed.segments;
        if (!Array.isArray(importedSegments)) {
          throw new Error("JSON에 segments 배열이 없습니다.");
        }
        segments = importedSegments.map(normalizeImportedSegment).filter(Boolean);
        sortSegments();

        if (parsed.video && typeof parsed.video === "object") {
          if (parsed.video.id) elements.videoId.value = parsed.video.id;
          if (parsed.video.fps) elements.fps.value = parsed.video.fps;
          if (parsed.video.total_frames) {
            elements.totalFrames.value = parsed.video.total_frames;
            autoTotalFrames = false;
          }
        }
        if (parsed.annotator_id) elements.annotatorId.value = parsed.annotator_id;

        editingIndex = null;
        renderSegments();
        updateVideoMetadata();
        saveDraft();
        showWarning("");
      } catch (error) {
        showWarning(`JSON 불러오기 실패: ${error.message || error}`);
      } finally {
        elements.importJson.value = "";
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function normalizeImportedSegment(raw) {
    if (!raw || typeof raw !== "object") return null;
    const start = Number.parseInt(raw.start_frame, 10);
    const end = Number.parseInt(raw.end_frame, 10);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
    return {
      id: raw.id || cryptoId(),
      start_frame: start,
      end_frame: end,
      actor: normalizeArray(raw.actor),
      action: normalizeArray(raw.action || raw.interaction_primitive),
      target_type: normalizeArray(raw.target_type).concat(legacyObjectToTargetType(raw.object)),
      articulation_type: normalizeArray(
        raw.articulation_type ||
        raw.object_articulation_type ||
        (raw.object_articulation && raw.object_articulation.type)
      ),
      relation_state: normalizeArray(raw.relation_state),
      manipulated_entity_hint: String(raw.manipulated_entity_hint || raw.custom_object || ""),
      target_entity_hint: String(raw.target_entity_hint || ""),
      note: String(raw.note || ""),
    };
  }

  function normalizeArray(value) {
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === "string" && value.trim()) return value.split("|").map((item) => item.trim()).filter(Boolean);
    return [];
  }

  function legacyObjectToTargetType(value) {
    const items = normalizeArray(value);
    if (items.length === 0) return [];
    const out = new Set();
    for (const item of items) {
      if (["generic_object", "cup", "box", "tray", "tool", "other_object"].includes(item)) {
        out.add("free_object");
      } else if (["handle", "door"].includes(item)) {
        out.add("control_interface");
      } else if (item === "unknown_object") {
        out.add("ambiguous");
      }
    }
    return [...out];
  }

  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(exportPayload()));
    } catch (_) {
      // Draft save is best-effort only.
    }
  }

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.segments)) return;
      segments = parsed.segments.map(normalizeImportedSegment).filter(Boolean);
      if (parsed.annotator_id) elements.annotatorId.value = parsed.annotator_id;
      if (parsed.video) {
        if (parsed.video.id) elements.videoId.value = parsed.video.id;
        if (parsed.video.fps) elements.fps.value = parsed.video.fps;
        if (parsed.video.total_frames) {
          elements.totalFrames.value = parsed.video.total_frames;
          autoTotalFrames = false;
        }
      }
      renderSegments();
    } catch (_) {
      // Ignore corrupted local drafts.
    }
  }

  function bindEvents() {
    elements.datasetFolder.addEventListener("change", () => {
      handleDatasetFolderSelection(elements.datasetFolder.files);
    });

    if (elements.localDatasetPath && elements.loadLocalDatasetPath) {
      elements.loadLocalDatasetPath.addEventListener("click", handleLocalDatasetPath);
      elements.localDatasetPath.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        handleLocalDatasetPath();
      });
    }

    elements.datasetSelect.addEventListener("change", () => {
      renderCameraSelector();
    });

    elements.loadDatasetVideo.addEventListener("click", () => {
      loadSelectedDatasetVideo();
    });

    elements.videoFile.addEventListener("change", () => {
      const file = elements.videoFile.files && elements.videoFile.files[0];
      if (!file) return;
      currentDatasetItem = null;
      elements.datasetInfo.hidden = true;
      setVideoSource(URL.createObjectURL(file), file.name, true);
    });

    elements.loadUrl.addEventListener("click", () => {
      const url = elements.videoUrl.value.trim();
      if (!url) {
        showWarning("비디오 URL을 입력하세요.");
        return;
      }
      currentDatasetItem = null;
      elements.datasetInfo.hidden = true;
      setVideoSource(url, inferVideoId(url), false);
    });

    elements.video.addEventListener("loadedmetadata", updateVideoMetadata);
    elements.video.addEventListener("timeupdate", updateFrameDisplay);
    elements.video.addEventListener("seeked", updateFrameDisplay);

    elements.fps.addEventListener("change", () => {
      autoTotalFrames = true;
      elements.totalFrames.value = "";
      updateVideoMetadata();
      saveDraft();
    });

    elements.totalFrames.addEventListener("input", () => {
      autoTotalFrames = elements.totalFrames.value.trim() === "";
      updateVideoMetadata();
      saveDraft();
    });

    elements.frameSlider.addEventListener("input", () => {
      seekToFrame(Number.parseInt(elements.frameSlider.value, 10));
    });

    for (const button of document.querySelectorAll("button[data-step]")) {
      button.addEventListener("click", () => stepFrame(Number.parseInt(button.dataset.step, 10)));
    }

    elements.markStart.addEventListener("click", () => {
      elements.startFrame.value = String(currentFrame());
    });
    elements.markEnd.addEventListener("click", () => {
      elements.endFrame.value = String(currentFrame());
    });

    elements.saveSegment.addEventListener("click", saveCurrentSegment);
    elements.resetForm.addEventListener("click", () => resetForm());

    elements.segmentsBody.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const edit = target.getAttribute("data-edit");
      const del = target.getAttribute("data-delete");
      const seekStart = target.getAttribute("data-seek-start");
      if (edit !== null) editSegment(Number.parseInt(edit, 10));
      if (del !== null) deleteSegment(Number.parseInt(del, 10));
      if (seekStart !== null) seekToFrame(Number.parseInt(seekStart, 10));
    });

    elements.importJsonButton.addEventListener("click", () => elements.importJson.click());
    elements.importJson.addEventListener("change", () => {
      const file = elements.importJson.files && elements.importJson.files[0];
      importJsonFile(file);
    });

    elements.exportJson.addEventListener("click", downloadJson);
    elements.exportCsv.addEventListener("click", downloadCsv);
    elements.addToBundle.addEventListener("click", addCurrentAnnotationToBundle);
    elements.downloadBundleJson.addEventListener("click", downloadBundleJson);
    elements.downloadBundleCsv.addEventListener("click", downloadBundleCsv);
    elements.clearBundle.addEventListener("click", () => {
      if (annotationBundle.length > 0 && !window.confirm("누적된 annotation bundle을 모두 삭제할까요?")) return;
      annotationBundle = [];
      saveBundle();
      renderBundle();
    });

    elements.clearSegments.addEventListener("click", () => {
      if (segments.length > 0 && !window.confirm("등록된 모든 구간을 삭제할까요?")) return;
      segments = [];
      editingIndex = null;
      renderSegments();
      saveDraft();
    });

    document.addEventListener("keydown", handleKeydown);
  }

  function handleKeydown(event) {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
      return;
    }

    if (event.key === "[") {
      elements.startFrame.value = String(currentFrame());
      event.preventDefault();
    } else if (event.key === "]") {
      elements.endFrame.value = String(currentFrame());
      event.preventDefault();
    } else if (event.key === "ArrowLeft") {
      stepFrame(event.shiftKey ? -10 : -1);
      event.preventDefault();
    } else if (event.key === "ArrowRight") {
      stepFrame(event.shiftKey ? 10 : 1);
      event.preventDefault();
    } else if (event.key === "Enter") {
      saveCurrentSegment();
      event.preventDefault();
    } else if (event.key === " ") {
      if (elements.video.paused) {
        const playPromise = elements.video.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {});
        }
      } else {
        elements.video.pause();
      }
      event.preventDefault();
    }
  }

  function init() {
    renderOptions("actor", elements.actorOptions);
    renderOptions("action", elements.actionOptions);
    renderOptions("target_type", elements.targetTypeOptions);
    renderOptions("articulation_type", elements.articulationOptions);
    renderOptions("relation_state", elements.relationStateOptions);
    bindEvents();
    restoreDraft();
    restoreBundle();
    renderDatasetSelectors();
    renderBundle();
    updateVideoMetadata();
    resetForm({ keepFrames: true });
  }

  init();
})();
