import { EXAM_CONFIG } from "./exam-config.mjs";
import {
  addDays,
  blockTotals,
  createBackupEnvelope,
  createEmptyBlock,
  createEmptyHighConfidenceError,
  createEmptyOralRecallTask,
  createId,
  createStudyDayRecord,
  finalizeRecord,
  generateLog,
  hasMeaningfulStudyData,
  localDateString,
  localDateTimeString,
  migrateRecord,
  parseBackupEnvelope,
  reopenRecord,
  suggestedStudyDate,
  summarizeRecord,
  validateBlock
} from "./core.mjs";

const storageKey = `ai-study-log::${EXAM_CONFIG.examId}::current`;
const previousKey = `ai-study-log::${EXAM_CONFIG.examId}::previous`;
const deletedKey = `ai-study-log::${EXAM_CONFIG.examId}::deleted`;
const storageTestKey = `ai-study-log::${EXAM_CONFIG.examId}::storage-test`;

let initialLoadError = "";
let storageAvailable = true;
let storageErrorShown = false;
let generatedLog = "";
let deferredInstallPrompt = null;
let waitingServiceWorker = null;
let reloadingForUpdate = false;

function loadRecord() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const migrated = migrateRecord(parsed, EXAM_CONFIG);
    if (JSON.stringify(parsed) !== JSON.stringify(migrated)) {
      localStorage.setItem(previousKey, raw);
      localStorage.setItem(storageKey, JSON.stringify(migrated));
    }
    return migrated;
  } catch (error) {
    console.error("保存データを読み込めませんでした", error);
    initialLoadError = "保存データの読み込みに失敗しました。バックアップからの復元を試してください。";
    return null;
  }
}

let record = loadRecord();

const $ = (selector) => document.querySelector(selector);
const elements = {
  examName: $("#exam-name"), appVersion: $("#app-version"), statusChip: $("#status-chip"),
  emptyState: $("#empty-state"), workspace: $("#workspace"),
  newStudyDate: $("#new-study-date"), lateNightHint: $("#late-night-hint"), startRecord: $("#start-record"),
  studyDateLabel: $("#study-date-label"), recordId: $("#record-id"), midnightWarning: $("#midnight-warning"),
  discardEmptyRecord: $("#discard-empty-record"),
  blocks: $("#blocks"), blocksEmpty: $("#blocks-empty"), addBlock: $("#add-block"),
  quickNoteType: $("#quick-note-type"), quickNoteText: $("#quick-note-text"), addQuickNote: $("#add-quick-note"), quickNotes: $("#quick-notes"),
  noStudyDay: $("#no-study-day"), dailyNote: $("#daily-note"),
  planTargetDate: $("#plan-target-date"), confirmedStudyWindows: $("#confirmed-study-windows"),
  optionalStudyWindows: $("#optional-study-windows"), fixedConstraints: $("#fixed-constraints"),
  bedtimePreparationStart: $("#bedtime-preparation-start"),
  finalizeRecord: $("#finalize-record"), copyLog: $("#copy-log"),
  openChatgpt: $("#open-chatgpt"), generatedLog: $("#generated-log"), reopenRecord: $("#reopen-record"), deleteRecord: $("#delete-record"),
  toast: $("#toast"), sumBlocks: $("#sum-blocks"), sumQuestions: $("#sum-questions"), sumConfident: $("#sum-confident"),
  sumUncertain: $("#sum-uncertain"), sumErrors: $("#sum-errors"), sumMinutes: $("#sum-minutes"), blockTemplate: $("#block-template"),
  highConfidenceTemplate: $("#high-confidence-template"), oralTaskTemplate: $("#oral-task-template"),
  connectionChip: $("#connection-chip"), saveChip: $("#save-chip"), installMessage: $("#install-message"),
  installApp: $("#install-app"), showInstallGuide: $("#show-install-guide"), installGuide: $("#install-guide"), applyUpdate: $("#apply-update"),
  exportBackup: $("#export-backup"), importBackup: $("#import-backup"), restorePrevious: $("#restore-previous"),
  restoreDeleted: $("#restore-deleted"), backupFile: $("#backup-file"), backupStatus: $("#backup-status")
};

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => elements.toast.classList.add("hidden"), 2400);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function options(items, selected = "", includeBlank = true) {
  const blank = includeBlank ? '<option value="">選択してください</option>' : "";
  return blank + items.map((item) => {
    const value = typeof item === "string" ? item : item.id;
    const label = typeof item === "string" ? item : item.label;
    return `<option value="${escapeHtml(value)}"${value === selected ? " selected" : ""}>${escapeHtml(label)}</option>`;
  }).join("");
}

function checkStorageAvailability() {
  try {
    localStorage.setItem(storageTestKey, "1");
    localStorage.removeItem(storageTestKey);
    storageAvailable = true;
  } catch (error) {
    storageAvailable = false;
    console.error("端末内保存を利用できません", error);
  }
}

function snapshotCurrent() {
  if (!storageAvailable) return;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) localStorage.setItem(previousKey, raw);
  } catch (error) {
    console.warn("復元用スナップショットを作成できませんでした", error);
  }
}

function saveRecord({ snapshotBefore = false } = {}) {
  if (!record) return true;
  if (!storageAvailable) {
    setSaveState("保存不可", "error");
    return false;
  }
  try {
    if (snapshotBefore) snapshotCurrent();
    record.lastSavedAt = localDateTimeString();
    record.schemaVersion = EXAM_CONFIG.storageSchemaVersion;
    record.appVersion = EXAM_CONFIG.appVersion;
    localStorage.setItem(storageKey, JSON.stringify(record));
    storageErrorShown = false;
    setSaveState("自動保存済", "ok");
    renderDataProtection();
    return true;
  } catch (error) {
    console.error("自動保存に失敗しました", error);
    setSaveState("保存失敗", "error");
    if (!storageErrorShown) {
      alert("端末内への自動保存に失敗しました。ブラウザの容量・プライベートモード・サイトデータ設定を確認してください。現在の画面は閉じず、バックアップを書き出してください。");
      storageErrorShown = true;
    }
    return false;
  }
}

function setSaveState(text, state = "") {
  if (!elements.saveChip) return;
  elements.saveChip.textContent = text;
  elements.saveChip.className = `mini-chip${state ? ` ${state}` : ""}`;
}

function setSuggestedDate() {
  const now = new Date();
  const suggested = suggestedStudyDate(now, EXAM_CONFIG.studyDayBoundaryHour);
  elements.newStudyDate.value = suggested;
  if (now.getHours() < EXAM_CONFIG.studyDayBoundaryHour) {
    elements.lateNightHint.textContent = `深夜帯のため、前日（${suggested}）を候補にしています。新しい日の学習なら変更してください。`;
    elements.lateNightHint.classList.remove("hidden");
  } else {
    elements.lateNightHint.classList.add("hidden");
  }
}

function normalizeRecord() {
  if (!record) return;
  record = migrateRecord(record, EXAM_CONFIG);
}

function renderRuntime() {
  elements.appVersion.textContent = `v${EXAM_CONFIG.appVersion}`;
  const online = navigator.onLine;
  elements.connectionChip.textContent = online ? "オンライン" : "オフライン";
  elements.connectionChip.className = `mini-chip ${online ? "ok" : "warn"}`;

  if (!storageAvailable) {
    setSaveState("保存不可", "error");
    elements.installMessage.textContent = "このブラウザでは端末内保存を利用できません。通常モードで開き直してください。";
  } else if (record?.lastSavedAt) {
    setSaveState("自動保存済", "ok");
  } else {
    setSaveState("保存準備完了", "ok");
  }

  const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches || navigator.standalone === true;
  const isHttp = location.protocol === "http:" || location.protocol === "https:";
  if (standalone) {
    elements.installMessage.textContent = online
      ? "ホーム画面版で起動中です。通信が切れても入力・ログ生成を継続できます。"
      : "ホーム画面版でオフライン起動中です。入力内容は端末内へ保存されます。";
    elements.installApp.classList.add("hidden");
  } else if (!isHttp) {
    elements.installMessage.textContent = "直接起動版で動作中です。入力・保存は可能ですが、ホーム画面追加はWeb公開版で行います。";
    elements.installApp.classList.add("hidden");
  } else if (deferredInstallPrompt) {
    elements.installMessage.textContent = "この端末へアプリのように追加できます。";
    elements.installApp.classList.remove("hidden");
  } else {
    elements.installMessage.textContent = "入力内容はこの端末へ自動保存されます。スマホではホーム画面追加を推奨します。";
  }
}

function renderDataProtection() {
  const hasPrevious = storageAvailable && Boolean(localStorage.getItem(previousKey));
  const hasDeleted = storageAvailable && Boolean(localStorage.getItem(deletedKey));
  elements.exportBackup.disabled = !record;
  elements.restorePrevious.classList.toggle("hidden", !hasPrevious);
  elements.restoreDeleted.classList.toggle("hidden", !hasDeleted);

  if (!storageAvailable) {
    elements.backupStatus.textContent = "端末内保存を利用できません。入力後は画面を閉じる前にバックアップを書き出してください。";
  } else if (initialLoadError) {
    elements.backupStatus.textContent = initialLoadError;
  } else if (record?.lastSavedAt) {
    elements.backupStatus.textContent = `現在の学習日：${record.studyDate}／最終保存：${record.lastSavedAt}`;
  } else if (hasDeleted) {
    elements.backupStatus.textContent = "現在の学習日はありません。削除直前のデータを復元できます。";
  } else {
    elements.backupStatus.textContent = "現在の学習日はありません。以前のJSONバックアップを読み込めます。";
  }
}

function render() {
  elements.examName.textContent = EXAM_CONFIG.examName;
  normalizeRecord();
  renderRuntime();
  renderDataProtection();

  if (!record) {
    elements.emptyState.classList.remove("hidden");
    elements.workspace.classList.add("hidden");
    elements.statusChip.textContent = "未開始";
    elements.statusChip.dataset.status = "empty";
    setSuggestedDate();
    return;
  }

  elements.emptyState.classList.add("hidden");
  elements.workspace.classList.remove("hidden");
  elements.studyDateLabel.textContent = record.studyDate;
  elements.recordId.textContent = record.studyDayId;
  elements.statusChip.textContent = record.status === "finalized" ? `確定済 v${record.revision}` : "入力中";
  elements.statusChip.dataset.status = record.status;
  elements.planTargetDate.value = record.planTargetDate || addDays(record.studyDate, 1);
  elements.noStudyDay.checked = record.dailyContext?.noStudyDay === true;
  elements.dailyNote.value = record.dailyContext.dailyNote ?? "";
  elements.confirmedStudyWindows.value = record.nextPlanConditions?.confirmedStudyWindows ?? "";
  elements.optionalStudyWindows.value = record.nextPlanConditions?.optionalStudyWindows ?? "";
  elements.fixedConstraints.value = record.nextPlanConditions?.fixedConstraints ?? "";
  elements.bedtimePreparationStart.value = record.nextPlanConditions?.bedtimePreparationStart ?? "";
  const hasStudyData = hasMeaningfulStudyData(record);
  elements.discardEmptyRecord.classList.toggle("hidden", hasStudyData || record.status === "finalized");
  elements.deleteRecord.textContent = hasStudyData
    ? "この学習日を削除して最初へ戻る"
    : "入力のない学習日を破棄して最初へ戻る";

  const today = localDateString();
  if (today > record.studyDate && record.status === "open") {
    elements.midnightWarning.textContent = `${record.studyDate}の学習として継続中`;
    elements.midnightWarning.classList.remove("hidden");
  } else {
    elements.midnightWarning.classList.add("hidden");
  }

  renderBlocks();
  renderQuickNotes();
  renderSummary();

  const isFinalized = record.status === "finalized";
  [elements.addBlock, elements.addQuickNote, elements.quickNoteText, elements.quickNoteType,
    elements.noStudyDay, elements.dailyNote, elements.planTargetDate, elements.confirmedStudyWindows, elements.optionalStudyWindows,
    elements.fixedConstraints, elements.bedtimePreparationStart, elements.finalizeRecord]
    .forEach((element) => { element.disabled = isFinalized; });
  elements.reopenRecord.classList.toggle("hidden", !isFinalized);
  elements.copyLog.disabled = !isFinalized;
  elements.openChatgpt.disabled = !isFinalized;

  if (isFinalized) {
    generatedLog = generateLog(record);
    elements.generatedLog.value = generatedLog;
  } else {
    generatedLog = "";
    elements.generatedLog.value = "";
  }
}

function renderSummary() {
  const summary = summarizeRecord(record);
  elements.sumBlocks.textContent = record.blocks.length;
  elements.sumQuestions.textContent = summary.questionCount;
  elements.sumConfident.textContent = summary.confidentCorrect;
  elements.sumUncertain.textContent = summary.uncertainCorrect;
  elements.sumErrors.textContent = summary.totalErrors;
  elements.sumMinutes.textContent = `${summary.durationMinutes}分`;
}

function selectedSubject(block) {
  return EXAM_CONFIG.subjects.find((subject) => subject.id === block.subjectId);
}

function selectedExercise(block) {
  return EXAM_CONFIG.exerciseTypes.find((exercise) => exercise.id === block.exerciseTypeId);
}

function fillFieldDatalist(card, block) {
  const list = card.querySelector(".field-options");
  const subject = selectedSubject(block);
  list.innerHTML = (subject?.fields ?? []).map((field) => `<option value="${escapeHtml(field)}"></option>`).join("");
}

function setCardDerivedValues(card, block) {
  const totals = blockTotals(block);
  const remainder = (Number(block.questionCount) || 0) - totals.classifiedTotal;
  card.querySelector(".derived-total-correct").textContent = totals.totalCorrect;
  card.querySelector(".derived-total-errors").textContent = totals.totalErrors;
  card.querySelector(".derived-classified-total").textContent = totals.classifiedTotal;
  card.querySelector(".derived-remainder").textContent = remainder;
}

function syncBlockInputs(card, block, fields = null) {
  const selected = fields ? new Set(fields) : null;
  card.querySelectorAll("[data-field]").forEach((input) => {
    const field = input.dataset.field;
    if (selected && !selected.has(field)) return;
    input.value = block[field] ?? "";
  });
}

function updateResultDetailsState(card, block) {
  const details = card.querySelector(".result-details");
  const totals = blockTotals(block);
  const exercise = selectedExercise(block);
  const hasResult = Number(block.questionCount) > 0 || totals.classifiedTotal > 0 || Number(block.durationMinutes) > 0;
  if (!details.dataset.userToggled) details.open = Boolean(exercise?.requiresQuestions || hasResult);
  details.addEventListener("toggle", () => { details.dataset.userToggled = "1"; }, { once: true });
}

function updateConditionalFields(card, block) {
  const isQb = block.materialName === "QB";
  card.querySelector(".qb-mode-field")?.classList.toggle("hidden", !isQb);

  const showUnattempted = ["first-round", "new-unseen"].includes(block.exerciseTypeId)
    || Number(block.unattemptedQuestionCount) > 0
    || Number(block.unattemptedCorrectCount) > 0;
  card.querySelectorAll(".unattempted-field").forEach((element) => element.classList.toggle("hidden", !showUnattempted));
  card.querySelector(".fill-unattempted")?.classList.toggle("hidden", !showUnattempted);

  const optional = card.querySelector(".optional-details");
  if (optional && !optional.dataset.userToggled) {
    optional.open = Boolean(showUnattempted || String(block.questionRange ?? "").trim() || block.priorExposureStatusId !== "unknown");
  }
}

function renderHighConfidenceErrors(card, block) {
  const container = card.querySelector(".high-confidence-errors");
  const empty = card.querySelector(".high-confidence-empty");
  container.innerHTML = "";
  const items = Array.isArray(block.highConfidenceErrors) ? block.highConfidenceErrors : [];
  empty.classList.toggle("hidden", items.length > 0);

  items.forEach((item, index) => {
    const fragment = elements.highConfidenceTemplate.content.cloneNode(true);
    const row = fragment.querySelector(".high-confidence-item");
    row.dataset.errorId = item.errorId;
    fragment.querySelector(".high-confidence-title").textContent = `高確信誤答 ${index + 1}`;

    fragment.querySelectorAll("[data-high-field]").forEach((input) => {
      const field = input.dataset.highField;
      input.value = item[field] ?? "";
      input.disabled = record.status === "finalized";
      input.addEventListener("input", () => updateHighConfidenceError(block.blockId, item.errorId, field, input.value, card));
    });

    const remove = fragment.querySelector(".delete-high-confidence-error");
    remove.disabled = record.status === "finalized";
    remove.addEventListener("click", () => deleteHighConfidenceError(block.blockId, item.errorId, card));
    container.appendChild(fragment);
  });
}

function addHighConfidenceError(blockId, card) {
  if (record.status === "finalized") return;
  const block = record.blocks.find((item) => item.blockId === blockId);
  if (!block) return;
  block.highConfidenceErrors ??= [];
  block.highConfidenceErrors.push(createEmptyHighConfidenceError());
  saveRecord();
  renderHighConfidenceErrors(card, block);
  updateValidationMessage(card, block);
  renderSummary();
  requestAnimationFrame(() => card.querySelector(".high-confidence-item:last-child textarea")?.focus());
}

function updateHighConfidenceError(blockId, errorId, field, value, card) {
  if (record.status === "finalized") return;
  const block = record.blocks.find((item) => item.blockId === blockId);
  const item = block?.highConfidenceErrors?.find((entry) => entry.errorId === errorId);
  if (!block || !item) return;
  item[field] = value;
  saveRecord();
  updateValidationMessage(card, block);
}

function deleteHighConfidenceError(blockId, errorId, card) {
  if (record.status === "finalized") return;
  const block = record.blocks.find((item) => item.blockId === blockId);
  if (!block) return;
  if (!confirm("この高確信誤答を削除しますか？")) return;
  snapshotCurrent();
  block.highConfidenceErrors = (block.highConfidenceErrors ?? []).filter((item) => item.errorId !== errorId);
  saveRecord();
  renderHighConfidenceErrors(card, block);
  updateValidationMessage(card, block);
  renderSummary();
}

function renderOralRecallTasks(card, block) {
  const container = card.querySelector(".oral-recall-tasks");
  const empty = card.querySelector(".oral-recall-empty");
  container.innerHTML = "";
  const tasks = Array.isArray(block.oralRecallTasks) ? block.oralRecallTasks : [];
  empty.classList.toggle("hidden", tasks.length > 0);

  tasks.forEach((task, index) => {
    const fragment = elements.oralTaskTemplate.content.cloneNode(true);
    const item = fragment.querySelector(".oral-task-item");
    item.dataset.taskId = task.taskId;
    fragment.querySelector(".oral-task-title").textContent = `口頭再生 ${index + 1}`;
    const status = fragment.querySelector('[data-oral-field="status"]');
    status.innerHTML = options(EXAM_CONFIG.oralRecallStatuses, task.status, false);

    fragment.querySelectorAll("[data-oral-field]").forEach((input) => {
      const field = input.dataset.oralField;
      if (field !== "status") input.value = task[field] ?? "";
      input.disabled = record.status === "finalized";
      const eventName = input.tagName === "SELECT" ? "change" : "input";
      input.addEventListener(eventName, () => updateOralRecallTask(block.blockId, task.taskId, field, input.value, card));
    });

    const remove = fragment.querySelector(".delete-oral-task");
    remove.disabled = record.status === "finalized";
    remove.addEventListener("click", () => deleteOralRecallTask(block.blockId, task.taskId, card));
    container.appendChild(fragment);
  });
}

function addOralRecallTask(blockId, card) {
  if (record.status === "finalized") return;
  const block = record.blocks.find((item) => item.blockId === blockId);
  if (!block) return;
  block.oralRecallTasks ??= [];
  block.oralRecallTasks.push(createEmptyOralRecallTask());
  saveRecord();
  renderOralRecallTasks(card, block);
  updateValidationMessage(card, block);
  requestAnimationFrame(() => card.querySelector(".oral-task-item:last-child textarea")?.focus());
}

function updateOralRecallTask(blockId, taskId, field, value, card) {
  if (record.status === "finalized") return;
  const block = record.blocks.find((item) => item.blockId === blockId);
  const task = block?.oralRecallTasks?.find((item) => item.taskId === taskId);
  if (!block || !task) return;
  task[field] = value;
  saveRecord();
  updateValidationMessage(card, block);
}

function deleteOralRecallTask(blockId, taskId, card) {
  if (record.status === "finalized") return;
  const block = record.blocks.find((item) => item.blockId === blockId);
  if (!block) return;
  if (!confirm("この口頭再生課題を削除しますか？")) return;
  snapshotCurrent();
  block.oralRecallTasks = (block.oralRecallTasks ?? []).filter((item) => item.taskId !== taskId);
  saveRecord();
  renderOralRecallTasks(card, block);
  updateValidationMessage(card, block);
}

function renderBlocks() {
  elements.blocks.innerHTML = "";
  elements.blocksEmpty.classList.toggle("hidden", record.blocks.length > 0);

  record.blocks.forEach((block, index) => {
    const fragment = elements.blockTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".block-card");
    card.dataset.blockId = block.blockId;
    fragment.querySelector(".block-title").textContent = `ブロック ${index + 1}`;

    const uniqueListId = `fields-${block.blockId.replaceAll(/[^A-Za-z0-9_-]/g, "")}`;
    const fieldInput = card.querySelector('[data-field="field"]');
    const fieldList = card.querySelector(".field-options");
    fieldList.id = uniqueListId;
    fieldInput.setAttribute("list", uniqueListId);

    card.querySelector('[data-field="subjectId"]').innerHTML = options(EXAM_CONFIG.subjects.map((s) => ({ id: s.id, label: s.name })), block.subjectId);
    card.querySelector('[data-field="materialName"]').innerHTML = options(EXAM_CONFIG.materials, block.materialName, false);
    card.querySelector('[data-field="qbMode"]').innerHTML = options(EXAM_CONFIG.qbModes, block.qbMode, false);
    card.querySelector('[data-field="exerciseTypeId"]').innerHTML = options(EXAM_CONFIG.exerciseTypes, block.exerciseTypeId);
    card.querySelector('[data-field="priorExposureStatusId"]').innerHTML = options(EXAM_CONFIG.priorExposureStatuses, block.priorExposureStatusId);
    fillFieldDatalist(card, block);
    const optionalDetails = card.querySelector(".optional-details");
    optionalDetails?.addEventListener("toggle", () => { optionalDetails.dataset.userToggled = "1"; });

    card.querySelectorAll("[data-field]").forEach((input) => {
      const field = input.dataset.field;
      if (!["subjectId", "materialName", "qbMode", "exerciseTypeId", "priorExposureStatusId"].includes(field)) {
        input.value = block[field] ?? "";
      }
      input.disabled = record.status === "finalized";
      const eventName = input.tagName === "SELECT" ? "change" : "input";
      input.addEventListener(eventName, () => updateBlock(block.blockId, field, input.value, card));
    });

    const disabled = record.status === "finalized";
    [".delete-block", ".duplicate-block", ".fill-confident", ".fill-unattempted", ".reset-results"].forEach((selector) => {
      card.querySelector(selector).disabled = disabled;
    });
    card.querySelector(".delete-block").addEventListener("click", () => deleteBlock(block.blockId));
    card.querySelector(".duplicate-block").addEventListener("click", () => duplicateBlock(block.blockId));
    const addHighConfidence = card.querySelector(".add-high-confidence-error");
    addHighConfidence.disabled = disabled;
    addHighConfidence.addEventListener("click", () => addHighConfidenceError(block.blockId, card));
    const addOralTask = card.querySelector(".add-oral-task");
    addOralTask.disabled = disabled;
    addOralTask.addEventListener("click", () => addOralRecallTask(block.blockId, card));
    card.querySelector(".fill-confident").addEventListener("click", () => fillRemainderAsConfident(block, card));
    card.querySelector(".fill-unattempted").addEventListener("click", () => fillUnattempted(block, card));
    card.querySelector(".reset-results").addEventListener("click", () => resetResultClassification(block, card));

    renderHighConfidenceErrors(card, block);
    renderOralRecallTasks(card, block);
    updateConditionalFields(card, block);
    setCardDerivedValues(card, block);
    updateValidationMessage(card, block);
    updateResultDetailsState(card, block);
    elements.blocks.appendChild(fragment);
  });
}

const numericFields = new Set([
  "questionCount", "unattemptedQuestionCount", "unattemptedCorrectCount", "confidentCorrect", "uncertainCorrect",
  "errorKnowledge", "errorReasoning", "errorReading", "errorOther", "durationMinutes"
]);

function updateBlock(blockId, field, value, card) {
  if (record.status === "finalized") return;
  const block = record.blocks.find((item) => item.blockId === blockId);
  if (!block) return;
  block[field] = numericFields.has(field) ? Number(value || 0) : value;

  if (field === "subjectId") {
    block.subjectName = EXAM_CONFIG.subjects.find((subject) => subject.id === value)?.name ?? "";
    fillFieldDatalist(card, block);
  }
  if (field === "materialName") {
    if (value === "QB" && block.qbMode === "該当なし") block.qbMode = "通常モード";
    if (value !== "QB") block.qbMode = "該当なし";
    syncBlockInputs(card, block, ["qbMode"]);
  }
  if (field === "exerciseTypeId") {
    block.exerciseType = EXAM_CONFIG.exerciseTypes.find((item) => item.id === value)?.label ?? "";
    updateResultDetailsState(card, block);
  }
  if (field === "priorExposureStatusId") {
    block.priorExposureStatus = EXAM_CONFIG.priorExposureStatuses.find((item) => item.id === value)?.label ?? "";
  }

  saveRecord();
  updateConditionalFields(card, block);
  setCardDerivedValues(card, block);
  updateValidationMessage(card, block);
  renderSummary();
}

function fillRemainderAsConfident(block, card) {
  const totals = blockTotals(block);
  const questionCount = Number(block.questionCount) || 0;
  const otherClassifications = totals.uncertainCorrect + totals.totalErrors;
  if (questionCount < otherClassifications) {
    alert("迷い正解と誤答の合計が演習数を超えています。先に数値を修正してください。");
    return;
  }
  block.confidentCorrect = questionCount - otherClassifications;
  saveRecord();
  syncBlockInputs(card, block, ["confidentCorrect"]);
  setCardDerivedValues(card, block);
  updateValidationMessage(card, block);
  renderSummary();
  showToast("未分類分を自信あり正解へ入力しました。");
}

function fillUnattempted(block, card) {
  const totals = blockTotals(block);
  block.unattemptedQuestionCount = Number(block.questionCount) || 0;
  block.unattemptedCorrectCount = totals.totalCorrect;
  saveRecord();
  syncBlockInputs(card, block, ["unattemptedQuestionCount", "unattemptedCorrectCount"]);
  updateConditionalFields(card, block);
  updateValidationMessage(card, block);
  showToast("未演習問題数と正解数を入力しました。接触状況も確認してください。");
}

function resetResultClassification(block, card) {
  if (!confirm("演習数と所要時間は残し、正解・誤答分類、未演習数、高確信誤答の登録をリセットしますか？")) return;
  ["confidentCorrect", "uncertainCorrect", "errorKnowledge", "errorReasoning", "errorReading", "errorOther",
    "unattemptedQuestionCount", "unattemptedCorrectCount"].forEach((field) => { block[field] = 0; });
  block.highConfidenceErrors = [];
  saveRecord({ snapshotBefore: true });
  syncBlockInputs(card, block);
  renderHighConfidenceErrors(card, block);
  updateConditionalFields(card, block);
  setCardDerivedValues(card, block);
  updateValidationMessage(card, block);
  renderSummary();
}

function updateValidationMessage(card, block) {
  const result = validateBlock(block, EXAM_CONFIG);
  const validation = card.querySelector(".validation-message");
  if (result.errors.length) {
    validation.className = "validation-message error";
    validation.textContent = result.errors.join(" ");
  } else if (result.warnings.length) {
    validation.className = "validation-message warning";
    validation.textContent = result.warnings.join(" ");
  } else {
    validation.className = "validation-message ok";
    validation.textContent = "入力値は整合しています。";
  }
}

function addBlock() {
  if (!record || record.status === "finalized") return;
  snapshotCurrent();
  record.blocks.push(createEmptyBlock());
  saveRecord();
  render();
  requestAnimationFrame(() => elements.blocks.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "center" }));
}

function deleteBlock(blockId) {
  if (!confirm("この学習ブロックを削除しますか？")) return;
  snapshotCurrent();
  record.blocks = record.blocks.filter((block) => block.blockId !== blockId);
  saveRecord();
  render();
}

function duplicateBlock(blockId) {
  const original = record.blocks.find((block) => block.blockId === blockId);
  if (!original) return;
  snapshotCurrent();
  record.blocks.push({ ...structuredClone(original), blockId: createId("block"), createdAt: localDateTimeString() });
  saveRecord();
  render();
}

function renderQuickNotes() {
  elements.quickNotes.innerHTML = "";
  record.quickNotes.forEach((note) => {
    const row = document.createElement("div");
    row.className = "quick-note-item";
    const text = document.createElement("div");
    text.innerHTML = `<strong>${escapeHtml(note.type)}</strong><p>${escapeHtml(note.text)}</p><small>${escapeHtml(note.createdAt)}</small>`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "danger-text";
    button.textContent = "削除";
    button.disabled = record.status === "finalized";
    button.addEventListener("click", () => {
      snapshotCurrent();
      record.quickNotes = record.quickNotes.filter((item) => item.noteId !== note.noteId);
      saveRecord();
      render();
    });
    row.append(text, button);
    elements.quickNotes.appendChild(row);
  });
}

function addQuickNote() {
  const text = elements.quickNoteText.value.trim();
  if (!text) return showToast("メモ本文を入力してください。");
  record.quickNotes.push({ noteId: createId("note"), createdAt: localDateTimeString(), type: elements.quickNoteType.value, text });
  elements.quickNoteText.value = "";
  saveRecord();
  render();
  showToast("メモを追加しました。");
}

function validateAllBlocks() {
  return record.blocks.flatMap((block, index) =>
    validateBlock(block, EXAM_CONFIG).errors.map((message) => `ブロック${index + 1}: ${message}`)
  );
}

function duplicateUnitWarnings() {
  const seen = new Map();
  const warnings = [];
  record.blocks.forEach((block, index) => {
    const key = [block.subjectId, block.field.trim(), block.exerciseTypeId].join("::");
    if (!block.subjectId || !block.field.trim() || !block.exerciseTypeId) return;
    if (seen.has(key)) warnings.push(`ブロック${seen.get(key)}と${index + 1}は同じ「科目×分野×演習区分」です。Excel反映時に統合可否を確認します。`);
    else seen.set(key, index + 1);
  });
  return warnings;
}

function finalizeCurrentRecord() {
  if (record.dailyContext?.noStudyDay === true && record.blocks.length > 0) {
    return alert("『本日は学習なし』と学習ブロックを同時に登録できません。どちらかを修正してください。");
  }
  if (record.dailyContext?.noStudyDay !== true && record.blocks.length === 0 && record.quickNotes.length === 0) {
    return showToast("学習ブロックまたはメモを1件以上追加するか、『本日は学習なし』を選択してください。");
  }
  const errors = validateAllBlocks();
  if (errors.length) return alert(`確定できません。\n\n${errors.join("\n")}`);
  const warnings = duplicateUnitWarnings();
  if (warnings.length && !confirm(`${warnings.join("\n")}\n\nこのまま確定しますか？`)) return;

  snapshotCurrent();
  if (!elements.planTargetDate.value) record.planTargetDateManual = false;
  record = finalizeRecord(record);
  saveRecord();
  render();
  showToast(`ログを確定しました（v${record.revision}）。`);
}

async function copyLog() {
  try {
    await navigator.clipboard.writeText(generatedLog);
  } catch {
    elements.generatedLog.focus();
    elements.generatedLog.select();
    document.execCommand("copy");
  }
  showToast("ログをコピーしました。");
}

function backupFilename() {
  const date = record?.studyDate ?? localDateString();
  const revision = record?.revision ? `_r${record.revision}` : "";
  return `医師国試Pro_学習ログ_${date}${revision}.json`;
}

function exportBackup() {
  if (!record) return showToast("書き出す学習データがありません。");
  try {
    const envelope = createBackupEnvelope(record, EXAM_CONFIG);
    const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = backupFilename();
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("バックアップを書き出しました。");
  } catch (error) {
    alert(`バックアップを書き出せませんでした。\n${error.message}`);
  }
}

async function importBackupFile(file) {
  if (!file) return;
  try {
    const text = await file.text();
    const imported = parseBackupEnvelope(text, EXAM_CONFIG);
    if (record && !confirm(`現在の${record.studyDate}のデータを置き換えて、${imported.studyDate}のバックアップを読み込みますか？`)) return;
    snapshotCurrent();
    record = imported;
    saveRecord();
    initialLoadError = "";
    render();
    showToast("バックアップを復元しました。");
  } catch (error) {
    alert(`バックアップを読み込めませんでした。\n${error.message}`);
  } finally {
    elements.backupFile.value = "";
  }
}

function restoreRawRecord(raw, label) {
  try {
    const parsed = JSON.parse(raw);
    const source = parsed?.record && parsed?.deletedAt ? parsed.record : parsed;
    const restored = migrateRecord(source, EXAM_CONFIG);
    if (!restored?.studyDayId) throw new Error("復元可能な学習データではありません。");
    if (record && !confirm(`現在の${record.studyDate}のデータを置き換えて、${restored.studyDate}の${label}を復元しますか？`)) return;
    snapshotCurrent();
    record = restored;
    saveRecord();
    render();
    showToast(`${label}を復元しました。`);
  } catch (error) {
    alert(`${label}を復元できませんでした。\n${error.message}`);
  }
}

function restorePrevious() {
  const raw = localStorage.getItem(previousKey);
  if (raw) restoreRawRecord(raw, "1つ前の保存");
}

function restoreDeleted() {
  const raw = localStorage.getItem(deletedKey);
  if (raw) restoreRawRecord(raw, "削除直前データ");
}

function deleteCurrentRecord() {
  if (!record) {
    render();
    return;
  }

  const hasStudyData = hasMeaningfulStudyData(record);
  if (!hasStudyData) {
    if (!confirm("入力のない学習日を破棄して、最初の画面へ戻りますか？")) return;
  } else {
    const phrase = prompt("現在の学習日を端末から削除します。削除直前データは復元用に残ります。続ける場合は「削除」と入力してください。");
    if (phrase !== "削除") return;
  }

  let deletedBackupSaved = false;
  if (storageAvailable) {
    try {
      if (hasStudyData) {
        localStorage.setItem(deletedKey, JSON.stringify({ deletedAt: localDateTimeString(), record }));
        deletedBackupSaved = true;
      }
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn("学習日の端末保存データを削除できませんでした", error);
      if (hasStudyData && !confirm("削除前バックアップを作れませんでした。それでも画面上の学習日を破棄しますか？")) return;
      try {
        localStorage.removeItem(storageKey);
      } catch (removeError) {
        console.warn("端末保存データの消去にも失敗しました", removeError);
      }
    }
  }

  record = null;
  generatedLog = "";
  render();
  if (!hasStudyData) {
    showToast("入力のない学習日を破棄しました。");
  } else if (deletedBackupSaved) {
    showToast("当日データを削除しました。復元は可能です。");
  } else {
    showToast("学習日を破棄して最初の画面へ戻りました。");
  }
}

function bindDailyContext() {
  elements.noStudyDay.addEventListener("change", () => {
    if (!record) return;
    record.dailyContext.noStudyDay = elements.noStudyDay.checked;
    saveRecord();
  });
  elements.dailyNote.addEventListener("input", () => {
    if (!record) return;
    record.dailyContext.dailyNote = elements.dailyNote.value;
    saveRecord();
  });
}

function bindNextPlanConditions() {
  const bindings = [
    [elements.confirmedStudyWindows, "confirmedStudyWindows"],
    [elements.optionalStudyWindows, "optionalStudyWindows"],
    [elements.fixedConstraints, "fixedConstraints"],
    [elements.bedtimePreparationStart, "bedtimePreparationStart"]
  ];
  bindings.forEach(([element, key]) => {
    const eventName = element.type === "time" ? "change" : "input";
    element.addEventListener(eventName, () => {
      if (!record) return;
      record.nextPlanConditions ??= {};
      record.nextPlanConditions[key] = element.value;
      saveRecord();
    });
  });
}

function showUpdate(worker) {
  waitingServiceWorker = worker;
  elements.applyUpdate.classList.remove("hidden");
  elements.installMessage.textContent = "新しい版を利用できます。入力内容は保持したまま更新できます。";
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !(location.protocol === "http:" || location.protocol === "https:")) return;
  navigator.serviceWorker.register("./sw.js").then((registration) => {
    if (registration.waiting) showUpdate(registration.waiting);
    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) showUpdate(worker);
      });
    });
    registration.update().catch(() => {});
  }).catch((error) => console.warn("Service Worker登録失敗", error));

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloadingForUpdate) return;
    reloadingForUpdate = true;
    location.reload();
  });
}

function bindInstallEvents() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    renderRuntime();
  });
  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    elements.installApp.classList.add("hidden");
    showToast("ホーム画面へ追加しました。");
    renderRuntime();
  });
  elements.installApp.addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
      elements.installGuide.classList.remove("hidden");
      return;
    }
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    elements.installApp.classList.add("hidden");
  });
  elements.showInstallGuide.addEventListener("click", () => {
    elements.installGuide.classList.toggle("hidden");
  });
  elements.applyUpdate.addEventListener("click", () => {
    if (waitingServiceWorker) waitingServiceWorker.postMessage({ type: "SKIP_WAITING" });
  });
}

function init() {
  checkStorageAvailability();
  elements.quickNoteType.innerHTML = options(EXAM_CONFIG.quickNoteTypes, EXAM_CONFIG.quickNoteTypes[0], false);
  elements.startRecord.addEventListener("click", () => {
    const studyDate = elements.newStudyDate.value;
    if (!studyDate) return;
    if (!storageAvailable && !confirm("端末内保存を利用できません。画面を閉じると失われる可能性がありますが、開始しますか？")) return;
    record = createStudyDayRecord({ config: EXAM_CONFIG, studyDate });
    saveRecord();
    render();
  });
  elements.addBlock.addEventListener("click", addBlock);
  elements.addQuickNote.addEventListener("click", addQuickNote);
  bindDailyContext();
  bindNextPlanConditions();
  elements.planTargetDate.addEventListener("change", () => {
    if (!record) return;
    record.planTargetDate = elements.planTargetDate.value;
    record.planTargetDateManual = true;
    saveRecord();
  });
  elements.finalizeRecord.addEventListener("click", finalizeCurrentRecord);
  elements.copyLog.addEventListener("click", copyLog);
  elements.openChatgpt.addEventListener("click", () => window.open("https://chatgpt.com/", "_blank", "noopener,noreferrer"));
  elements.reopenRecord.addEventListener("click", () => {
    snapshotCurrent();
    record = reopenRecord(record);
    saveRecord();
    render();
  });
  elements.deleteRecord.addEventListener("click", deleteCurrentRecord);
  elements.discardEmptyRecord.addEventListener("click", deleteCurrentRecord);
  elements.exportBackup.addEventListener("click", exportBackup);
  elements.importBackup.addEventListener("click", () => elements.backupFile.click());
  elements.backupFile.addEventListener("change", () => importBackupFile(elements.backupFile.files?.[0]));
  elements.restorePrevious.addEventListener("click", restorePrevious);
  elements.restoreDeleted.addEventListener("click", restoreDeleted);
  window.addEventListener("online", renderRuntime);
  window.addEventListener("offline", renderRuntime);

  bindInstallEvents();
  registerServiceWorker();
  render();
}

init();
