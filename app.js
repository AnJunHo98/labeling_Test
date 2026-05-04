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

  const elements = {
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
  };

  let segments = [];
  let editingIndex = null;
  let objectUrl = null;
  let loadedVideoName = "";
  let loadedVideoUrl = "";
  let autoTotalFrames = true;

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
    return {
      schema_version: "temporal_segment_annotation_v41_labels_v2",
      exported_at: new Date().toISOString(),
      annotator_id: elements.annotatorId.value.trim(),
      video: {
        id: elements.videoId.value.trim() || inferVideoId(loadedVideoName || loadedVideoUrl),
        name: loadedVideoName,
        source_url: loadedVideoUrl,
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
    elements.videoFile.addEventListener("change", () => {
      const file = elements.videoFile.files && elements.videoFile.files[0];
      if (!file) return;
      setVideoSource(URL.createObjectURL(file), file.name, true);
    });

    elements.loadUrl.addEventListener("click", () => {
      const url = elements.videoUrl.value.trim();
      if (!url) {
        showWarning("비디오 URL을 입력하세요.");
        return;
      }
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
    updateVideoMetadata();
    resetForm({ keepFrames: true });
  }

  init();
})();
