const pad2 = (value) => String(value).padStart(2, "0");

export function localDateString(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function localDateTimeString(date = new Date()) {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const offset = `${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
  return `${localDateString(date)}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}${offset}`;
}

export function addDays(dateString, days) {
  const [year, month, day] = dateString.split("-").map(Number);
  const value = new Date(year, month - 1, day, 12, 0, 0);
  value.setDate(value.getDate() + days);
  return localDateString(value);
}

export function suggestedStudyDate(now = new Date(), boundaryHour = 5) {
  if (now.getHours() < boundaryHour) {
    const previous = new Date(now);
    previous.setDate(previous.getDate() - 1);
    return localDateString(previous);
  }
  return localDateString(now);
}

export function computePlanTargetDate(studyDate, endedAt) {
  const nextStudyDate = addDays(studyDate, 1);
  if (!endedAt) return nextStudyDate;
  const endedDate = /^\d{4}-\d{2}-\d{2}/.test(endedAt) ? endedAt.slice(0, 10) : localDateString(new Date(endedAt));
  return endedDate > nextStudyDate ? endedDate : nextStudyDate;
}

export function createId(prefix = "id") {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${random}`;
}

export function createStudyDayRecord({ config, studyDate, now = new Date() }) {
  return {
    schemaVersion: config.storageSchemaVersion ?? 4,
    appVersion: config.appVersion ?? "",
    studyDayId: createId(`sd_${studyDate.replaceAll("-", "")}`),
    revision: 0,
    qualificationId: config.examId,
    qualificationName: config.examName,
    edition: config.edition,
    studyDate,
    startedAt: localDateTimeString(now),
    endedAt: null,
    finalizedAt: null,
    planTargetDate: addDays(studyDate, 1),
    planTargetDateManual: false,
    status: "open",
    dailyContext: {
      noStudyDay: false,
      dailyNote: ""
    },
    nextPlanConditions: {
      confirmedStudyWindows: "",
      optionalStudyWindows: "",
      fixedConstraints: "",
      bedtimePreparationStart: ""
    },
    blocks: [],
    quickNotes: [],
    lastFinalizedFingerprint: null,
    lastSavedAt: localDateTimeString(now)
  };
}

export function createEmptyBlock(now = new Date()) {
  return {
    blockId: createId("block"),
    createdAt: localDateTimeString(now),
    subjectId: "",
    subjectName: "",
    field: "",
    materialName: "QB",
    qbMode: "通常モード",
    exerciseTypeId: "",
    exerciseType: "",
    questionRange: "",
    priorExposureStatusId: "unknown",
    priorExposureStatus: "過去接触不明",
    questionCount: 0,
    unattemptedQuestionCount: 0,
    unattemptedCorrectCount: 0,
    confidentCorrect: 0,
    uncertainCorrect: 0,
    errorKnowledge: 0,
    errorReasoning: 0,
    errorReading: 0,
    errorOther: 0,
    highConfidenceErrors: [],
    durationMinutes: 0,
    knowledgeGaps: "",
    oralRecallTasks: [],
    notes: ""
  };
}

export function createEmptyHighConfidenceError() {
  return {
    errorId: createId("high"),
    misconception: "",
    correction: ""
  };
}

export function createEmptyOralRecallTask() {
  return {
    taskId: createId("oral"),
    prompt: "",
    status: "未実施",
    notes: ""
  };
}

export function hasMeaningfulStudyData(record) {
  if (!record || typeof record !== "object") return false;
  if (Array.isArray(record.blocks) && record.blocks.length > 0) return true;
  if (Array.isArray(record.quickNotes) && record.quickNotes.length > 0) return true;
  if (record.dailyContext?.noStudyDay === true) return true;
  if (String(record.dailyContext?.dailyNote ?? "").trim()) return true;
  const nextPlan = record.nextPlanConditions ?? {};
  if ([nextPlan.confirmedStudyWindows, nextPlan.optionalStudyWindows, nextPlan.fixedConstraints, nextPlan.bedtimePreparationStart]
    .some((value) => String(value ?? "").trim())) return true;
  return false;
}

function cloneValue(value) {
  if (globalThis.structuredClone) return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function migrateRecord(input, config) {
  if (!input || typeof input !== "object") return null;
  const record = cloneValue(input);
  const targetVersion = config?.storageSchemaVersion ?? 4;

  record.schemaVersion = Number(record.schemaVersion) || 1;
  record.appVersion = config?.appVersion ?? record.appVersion ?? "";
  record.qualificationId ??= config?.examId ?? "";
  record.qualificationName ??= config?.examName ?? "";
  record.edition ??= config?.edition ?? "";
  record.revision = Number(record.revision) || 0;
  record.status = record.status === "finalized" ? "finalized" : "open";
  record.dailyContext = {
    noStudyDay: record.dailyContext?.noStudyDay === true,
    dailyNote: String(record.dailyContext?.dailyNote ?? "")
  };
  record.nextPlanConditions = {
    confirmedStudyWindows: String(record.nextPlanConditions?.confirmedStudyWindows ?? ""),
    optionalStudyWindows: String(record.nextPlanConditions?.optionalStudyWindows ?? ""),
    fixedConstraints: String(record.nextPlanConditions?.fixedConstraints ?? ""),
    bedtimePreparationStart: String(record.nextPlanConditions?.bedtimePreparationStart ?? "")
  };
  record.blocks = Array.isArray(record.blocks) ? record.blocks : [];
  record.quickNotes = Array.isArray(record.quickNotes) ? record.quickNotes : [];
  record.planTargetDateManual = record.planTargetDateManual === true;
  record.lastFinalizedFingerprint ??= null;
  record.lastSavedAt ??= null;

  record.blocks = record.blocks.map((block) => {
    const migratedBlock = {
      ...createEmptyBlock(),
      ...block,
      blockId: block?.blockId || createId("block")
    };

    const existingHighConfidenceErrors = Array.isArray(block?.highConfidenceErrors) ? block.highConfidenceErrors : [];
    migratedBlock.highConfidenceErrors = existingHighConfidenceErrors.map((item) => ({
      ...createEmptyHighConfidenceError(),
      ...item,
      errorId: item?.errorId || createId("high"),
      misconception: String(item?.misconception ?? ""),
      correction: String(item?.correction ?? "")
    }));

    const legacyHighConfidenceCount = Math.max(0, Number(block?.highConfidenceErrorCount) || 0);
    if (migratedBlock.highConfidenceErrors.length === 0 && legacyHighConfidenceCount > 0) {
      for (let index = 0; index < legacyHighConfidenceCount; index += 1) {
        migratedBlock.highConfidenceErrors.push({
          ...createEmptyHighConfidenceError(),
          misconception: `旧版から移行した高確信誤答${index + 1}（内容を追記してください）`,
          correction: ""
        });
      }
    }

    const removedFieldNotes = [];
    if (String(block?.materialVersion ?? "").trim()) removedFieldNotes.push(`教材版：${String(block.materialVersion).trim()}`);
    if (String(block?.ankiCandidates ?? "").trim()) removedFieldNotes.push(`旧Anki候補：${String(block.ankiCandidates).trim()}`);
    if (removedFieldNotes.length > 0) {
      migratedBlock.notes = [String(migratedBlock.notes ?? "").trim(), ...removedFieldNotes].filter(Boolean).join("\n");
    }
    delete migratedBlock.materialVersion;
    delete migratedBlock.ankiCandidates;
    delete migratedBlock.highConfidenceErrorCount;

    const existingTasks = Array.isArray(block?.oralRecallTasks) ? block.oralRecallTasks : [];
    migratedBlock.oralRecallTasks = existingTasks.map((task) => ({
      ...createEmptyOralRecallTask(),
      ...task,
      taskId: task?.taskId || createId("oral"),
      prompt: String(task?.prompt ?? ""),
      status: String(task?.status ?? "未実施"),
      notes: String(task?.notes ?? "")
    }));

    const legacyStatus = String(block?.oralRecallStatus ?? "未実施");
    const legacyNotes = String(block?.oralRecallNotes ?? "").trim();
    if (migratedBlock.oralRecallTasks.length === 0 && (legacyStatus !== "未実施" || legacyNotes)) {
      migratedBlock.oralRecallTasks.push({
        ...createEmptyOralRecallTask(),
        prompt: "旧版から移行した口頭再生課題（課題内容を追記してください）",
        status: legacyStatus,
        notes: legacyNotes
      });
    }

    delete migratedBlock.oralRecallStatus;
    delete migratedBlock.oralRecallNotes;
    return migratedBlock;
  });
  record.quickNotes = record.quickNotes.map((note) => ({
    noteId: note?.noteId || createId("note"),
    createdAt: note?.createdAt || localDateTimeString(),
    type: note?.type || "自由メモ",
    text: String(note?.text ?? "")
  }));

  record.schemaVersion = targetVersion;
  return record;
}

export function createBackupEnvelope(record, config, now = new Date()) {
  if (!record) throw new Error("バックアップ対象の学習データがありません。");
  return {
    format: "ai-study-log-backup",
    formatVersion: 1,
    appVersion: config?.appVersion ?? record.appVersion ?? "",
    qualificationId: config?.examId ?? record.qualificationId ?? "",
    exportedAt: localDateTimeString(now),
    record: cloneValue(record)
  };
}

export function parseBackupEnvelope(value, config) {
  const data = typeof value === "string" ? JSON.parse(value) : value;
  if (!data || data.format !== "ai-study-log-backup" || data.formatVersion !== 1 || !data.record) {
    throw new Error("このファイルは対応する学習ログのバックアップではありません。");
  }
  const expectedId = config?.examId;
  const actualId = data.qualificationId || data.record.qualificationId;
  if (expectedId && actualId && expectedId !== actualId) {
    throw new Error(`資格版が異なります（${actualId}）。`);
  }
  const migrated = migrateRecord(data.record, config);
  if (!migrated?.studyDayId || !migrated?.studyDate) {
    throw new Error("学習日IDまたは学習日がなく、復元できません。");
  }
  return migrated;
}

export function blockTotals(block) {
  const confidentCorrect = Number(block.confidentCorrect) || 0;
  const uncertainCorrect = Number(block.uncertainCorrect) || 0;
  const errorKnowledge = Number(block.errorKnowledge) || 0;
  const errorReasoning = Number(block.errorReasoning) || 0;
  const errorReading = Number(block.errorReading) || 0;
  const errorOther = Number(block.errorOther) || 0;
  const totalCorrect = confidentCorrect + uncertainCorrect;
  const totalErrors = errorKnowledge + errorReasoning + errorReading + errorOther;
  const classifiedTotal = totalCorrect + totalErrors;
  return {
    confidentCorrect,
    uncertainCorrect,
    errorKnowledge,
    errorReasoning,
    errorReading,
    errorOther,
    totalCorrect,
    totalErrors,
    classifiedTotal
  };
}

function nonEmptyLines(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function validateBlock(block, config = null) {
  const errors = [];
  const warnings = [];
  const numericKeys = [
    "questionCount", "unattemptedQuestionCount", "unattemptedCorrectCount",
    "confidentCorrect", "uncertainCorrect", "errorKnowledge", "errorReasoning",
    "errorReading", "errorOther", "durationMinutes"
  ];

  for (const key of numericKeys) {
    if (!Number.isFinite(Number(block[key])) || Number(block[key]) < 0) {
      errors.push(`${key}は0以上の数値にしてください。`);
    }
  }

  if (!block.subjectId && !block.subjectName) errors.push("科目を選択してください。");
  if (!String(block.field ?? "").trim()) warnings.push("分野が未入力です。");
  if (!block.exerciseTypeId && !block.exerciseType) errors.push("演習区分を選択してください。");

  const totals = blockTotals(block);
  const questionCount = Number(block.questionCount) || 0;
  const unattemptedQuestionCount = Number(block.unattemptedQuestionCount) || 0;
  const unattemptedCorrectCount = Number(block.unattemptedCorrectCount) || 0;
  const highConfidenceErrors = Array.isArray(block.highConfidenceErrors) ? block.highConfidenceErrors : [];

  const exercise = config?.exerciseTypes?.find((item) => item.id === block.exerciseTypeId);
  if (exercise?.requiresQuestions && questionCount === 0) {
    errors.push("この演習区分では問題数を1以上にしてください。");
  }

  if (questionCount > 0 && totals.classifiedTotal !== questionCount) {
    errors.push("自信あり正解＋迷い正解＋4種類の誤答が演習数と一致していません。");
  }

  if (unattemptedQuestionCount > questionCount) {
    errors.push("未演習問題数は演習数以下にしてください。");
  }
  if (unattemptedCorrectCount > unattemptedQuestionCount) {
    errors.push("未演習正解数は未演習問題数以下にしてください。");
  }
  if (unattemptedCorrectCount > totals.totalCorrect) {
    errors.push("未演習正解数は総正解数以下にしてください。");
  }
  if (highConfidenceErrors.length > totals.totalErrors) {
    errors.push("高確信誤答の登録件数は総誤答数以下にしてください。");
  }
  highConfidenceErrors.forEach((item, index) => {
    if (!String(item?.misconception ?? "").trim()) {
      errors.push(`高確信誤答${index + 1}の誤認内容を入力してください。`);
    }
  });

  if (unattemptedQuestionCount > 0 && block.priorExposureStatusId === "unknown") {
    warnings.push("過去接触不明のため、未演習問題による正式な卒業判定には使いません。");
  }
  if (unattemptedQuestionCount > 0 && block.priorExposureStatusId === "previously-seen") {
    warnings.push("過去接触ありのため、未演習問題として卒業判定には使いません。");
  }
  if (block.exerciseTypeId === "first-round" && questionCount > 0 && unattemptedQuestionCount !== questionCount) {
    warnings.push("1周目問題では通常、未演習問題数と演習数が一致します。過去接触がある場合は確認してください。");
  }

  const maxGaps = config?.rules?.maxKnowledgeGapsPerBlock ?? 3;
  if (nonEmptyLines(block.knowledgeGaps).length > maxGaps) {
    warnings.push(`欠損知識は重要上位${maxGaps}項目までを推奨します。`);
  }

  const oralRecallTasks = Array.isArray(block.oralRecallTasks) ? block.oralRecallTasks : [];
  oralRecallTasks.forEach((task, index) => {
    if (!String(task?.prompt ?? "").trim()) {
      errors.push(`口頭再生課題${index + 1}の課題内容を入力してください。`);
    }
    const allowedStatuses = config?.oralRecallStatuses ?? ["未実施", "○", "△", "×"];
    if (!allowedStatuses.includes(String(task?.status ?? "未実施"))) {
      errors.push(`口頭再生課題${index + 1}の結果が不正です。`);
    }
  });

  if (questionCount === 0 && Number(block.durationMinutes) === 0 && !block.notes && !block.knowledgeGaps && oralRecallTasks.length === 0 && highConfidenceErrors.length === 0) {
    warnings.push("問題数・学習時間・メモがすべて空です。");
  }

  return { errors, warnings };
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((acc, key) => {
      if (!["revision", "endedAt", "finalizedAt", "lastFinalizedFingerprint", "planTargetDateManual", "status"].includes(key)) {
        acc[key] = stableValue(value[key]);
      }
      return acc;
    }, {});
  }
  return value;
}

export function contentFingerprint(record) {
  const text = JSON.stringify(stableValue(record));
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function finalizeRecord(record, now = new Date()) {
  const endedAt = localDateTimeString(now);
  const draft = {
    ...record,
    endedAt,
    planTargetDate: record.planTargetDateManual === true
      ? record.planTargetDate
      : (record.revision > 0 && record.planTargetDate
        ? record.planTargetDate
        : computePlanTargetDate(record.studyDate, endedAt))
  };
  const fingerprint = contentFingerprint(draft);
  const revision = fingerprint === record.lastFinalizedFingerprint
    ? Math.max(1, record.revision)
    : Math.max(1, record.revision + 1);

  return {
    ...draft,
    revision,
    status: "finalized",
    finalizedAt: localDateTimeString(now),
    lastFinalizedFingerprint: fingerprint
  };
}

export function reopenRecord(record) {
  return {
    ...record,
    status: "open",
    finalizedAt: null
  };
}

export function summarizeRecord(record) {
  return record.blocks.reduce((acc, block) => {
    const totals = blockTotals(block);
    acc.questionCount += Number(block.questionCount) || 0;
    acc.confidentCorrect += totals.confidentCorrect;
    acc.uncertainCorrect += totals.uncertainCorrect;
    acc.totalCorrect += totals.totalCorrect;
    acc.totalErrors += totals.totalErrors;
    acc.durationMinutes += Number(block.durationMinutes) || 0;
    acc.unattemptedQuestionCount += Number(block.unattemptedQuestionCount) || 0;
    acc.unattemptedCorrectCount += Number(block.unattemptedCorrectCount) || 0;
    acc.highConfidenceErrorCount += Array.isArray(block.highConfidenceErrors) ? block.highConfidenceErrors.length : 0;
    return acc;
  }, {
    questionCount: 0,
    confidentCorrect: 0,
    uncertainCorrect: 0,
    totalCorrect: 0,
    totalErrors: 0,
    durationMinutes: 0,
    unattemptedQuestionCount: 0,
    unattemptedCorrectCount: 0,
    highConfidenceErrorCount: 0
  });
}

function valueOrNone(value) {
  const text = String(value ?? "").trim();
  return text || "なし";
}

function percent(numerator, denominator) {
  if (!denominator) return "算出不可";
  return `${(numerator / denominator * 100).toFixed(1)}%`;
}

function highConfidenceLogLines(block) {
  const items = Array.isArray(block.highConfidenceErrors) ? block.highConfidenceErrors : [];
  if (items.length === 0) return ["高確信誤答：なし"];
  const lines = [`高確信誤答数：${items.length}`];
  items.forEach((item, index) => {
    lines.push(
      `高確信誤答${index + 1} 誤認：${valueOrNone(item.misconception)}`,
      `高確信誤答${index + 1} 修正：${valueOrNone(item.correction)}`
    );
  });
  return lines;
}

function oralRecallLogLines(block) {
  const tasks = Array.isArray(block.oralRecallTasks) ? block.oralRecallTasks : [];
  if (tasks.length === 0) return ["口頭再生課題：なし"];
  const lines = [`口頭再生課題数：${tasks.length}`];
  tasks.forEach((task, index) => {
    lines.push(
      `口頭再生${index + 1} 課題：${valueOrNone(task.prompt)}`,
      `口頭再生${index + 1} 結果：${valueOrNone(task.status)}`,
      `口頭再生${index + 1} メモ：${valueOrNone(task.notes)}`
    );
  });
  return lines;
}

export function generateLog(record) {
  const summary = summarizeRecord(record);
  const context = record.dailyContext ?? {};
  const nextPlan = record.nextPlanConditions ?? {};
  const lines = [
    "【今回のファイル更新に関する最優先指示】",
    "",
    "今回の更新対象は、このメッセージに添付されたExcelファイル1件だけです。",
    "",
    "過去のメッセージに添付されたExcel、",
    "Projectソース内のExcel、",
    "以前にChatGPTが出力したExcel、",
    "ファイル名が類似するその他のExcelは、",
    "今回の更新対象にしないでください。",
    "",
    "次のいずれかに該当する場合は、ファイルを編集せず確認してください。",
    "",
    "・このメッセージにExcelが添付されていない",
    "・このメッセージにExcelが複数添付されている",
    "・更新対象を一意に特定できない",
    "・添付Excelを正常に読み取れない",
    "・必要なシートまたは列が確認できない",
    "",
    "添付された元ファイルは上書きせず、",
    "学習ログの日付を含む別名のExcelとして保存してください。",
    "",
    "同名ファイルが存在する場合は、",
    "末尾に_2、_3のような連番を付けてください。",
    "",
    "【医師国家試験Pro 学習ログ】",
    "",
    "【レコード管理情報】",
    `学習日レコードID：${record.studyDayId}`,
    `スキーマ版：${record.schemaVersion}`,
    `リビジョン：${record.revision || 1}`,
    `資格：${record.qualificationName}`,
    `エディション：${record.edition}`,
    `学習日：${record.studyDate}`,
    `実際の開始日時：${record.startedAt}`,
    `実際の終了日時：${record.endedAt ?? "未確定"}`,
    `ログ確定日時：${record.finalizedAt ?? "未確定"}`,
    "",
    "【日単位情報】",
    `学習実績：${context.noStudyDay === true ? "なし（計画修正のみ）" : "あり"}`,
    `日全体メモ：${valueOrNone(context.dailyNote)}`,
    "",
    "【次回学習条件】",
    `次回計画対象日：${record.planTargetDate}`,
    `確実に学習へ使える時間帯：${valueOrNone(nextPlan.confirmedStudyWindows)}`,
    `追加で使える可能性がある時間帯：${valueOrNone(nextPlan.optionalStudyWindows)}`,
    `固定予定・学習上の制約：${valueOrNone(nextPlan.fixedConstraints)}`,
    `就寝準備開始時刻：${valueOrNone(nextPlan.bedtimePreparationStart)}`,
    "",
    "【当日集計】",
    `学習ブロック数：${record.blocks.length}`,
    `演習数：${summary.questionCount}`,
    `自信あり正解：${summary.confidentCorrect}`,
    `迷い正解：${summary.uncertainCorrect}`,
    `総正解：${summary.totalCorrect}`,
    `総誤答：${summary.totalErrors}`,
    `総正答率：${percent(summary.totalCorrect, summary.questionCount)}`,
    `未演習問題数：${summary.unattemptedQuestionCount}`,
    `未演習正解数：${summary.unattemptedCorrectCount}`,
    `高確信誤答数：${summary.highConfidenceErrorCount}`,
    `学習時間：${summary.durationMinutes}分`
  ];

  record.blocks.forEach((block, index) => {
    const totals = blockTotals(block);
    const formalUnseen = block.priorExposureStatusId === "confirmed-unseen";
    const firstRound = block.exerciseTypeId === "first-round";
    lines.push(
      "",
      `【学習ブロック${index + 1}】`,
      `ブロックID：${block.blockId}`,
      `科目：${block.subjectName || block.subjectId || "未入力"}`,
      `正式分野名：${valueOrNone(block.field)}`,
      `教材名：${valueOrNone(block.materialName)}`,
      `QBモード：${block.materialName === "QB" ? valueOrNone(block.qbMode) : "該当なし"}`,
      `演習区分：${block.exerciseType || block.exerciseTypeId || "未入力"}`,
      `問題範囲：${valueOrNone(block.questionRange)}`,
      `過去接触状況：${valueOrNone(block.priorExposureStatus)}`,
      `演習数：${Number(block.questionCount) || 0}`,
      `自信あり正解：${totals.confidentCorrect}`,
      `迷い正解：${totals.uncertainCorrect}`,
      `知識不足誤答：${totals.errorKnowledge}`,
      `推論ミス：${totals.errorReasoning}`,
      `読み落とし：${totals.errorReading}`,
      `その他誤答：${totals.errorOther}`,
      `総正解：${totals.totalCorrect}`,
      `総誤答：${totals.totalErrors}`,
      `総正答率：${percent(totals.totalCorrect, Number(block.questionCount) || 0)}`,
      ...highConfidenceLogLines(block),
      `未演習問題数：${Number(block.unattemptedQuestionCount) || 0}`,
      `未演習正解数：${Number(block.unattemptedCorrectCount) || 0}`,
      `未演習正答率：${percent(Number(block.unattemptedCorrectCount) || 0, Number(block.unattemptedQuestionCount) || 0)}`,
      `正式な未演習判定に使用可能：${formalUnseen ? "はい" : "いいえ"}`,
      `1周目進捗へ加算：${firstRound ? "はい" : "いいえ"}`,
      `所要時間：${Number(block.durationMinutes) || 0}分`,
      `欠損知識（重要上位3項目）：${valueOrNone(block.knowledgeGaps)}`,
      ...oralRecallLogLines(block),
      `このブロックの補足：${valueOrNone(block.notes)}`
    );
  });

  if (record.quickNotes.length > 0) {
    lines.push("", "【学習中の高速メモ】");
    record.quickNotes.forEach((note, index) => {
      lines.push(`${index + 1}. [${note.type}] ${note.text}（${note.createdAt}）`);
    });
  }

  lines.push(
    "",
    "【Excel 01_日次ログへの反映規則】",
    "・入力単位は原則として『1日×科目×分野×演習区分』とする。",
    "・Webの各学習ブロックを1行として処理し、同一単位が複数ある場合だけ内容を確認して統合する。",
    "・各実績ブロックの主目的を『形成』『再診断』『補修』『転移確認』『維持』から判定し、01_日次ログZ列『目的プロトコル』へ記録する。",
    "・教材名を01_日次ログAA列『教材』へ記録する。",
    "・01_日次ログAB列『実測処理速度(分/問)』は学習時間÷演習数で更新し、演習数0では空欄にする。推測値を入れない。",
    "・目的プロトコルは予定ではなく実際の主目的で判定する。目的が明確に分かれ、実績を分離できる場合は別行にする。",
    "・演習数は、自信あり正解・迷い正解・知識不足誤答・推論ミス・読み落とし・その他誤答の合計とする。",
    "・総正解、各率、分類整合チェックはExcel数式または計算で更新する。",
    "・日全体メモは同一学習日の最初の行だけへ入力し、重複入力しない。",
    "・『学習実績：なし（計画修正のみ）』の場合は01_日次ログへ0件行を追加せず、07_日別スケジュールの未実施判定と再配分だけを行う。",
    "・コメント／欠損知識メモには、問題範囲、過去接触状況、欠損知識、高確信誤答、口頭再生、このブロックの補足を簡潔に統合する。",
    "",
    "【進捗・判定規則】",
    "・演習区分が『1周目問題』のブロックだけを、1周目問題進捗へ加算する。",
    "・『誤答再演習』『診療科内混合』『科目横断混合』『全問題演習』を1周目問題へ二重加算しない。",
    "・未演習問題数が入力されていても、過去接触状況が『未接触確認済』でない場合は、正式な未演習問題による卒業判定に使わない。",
    "・過去接触不明の問題セットは、再活性化または暫定安定の判定にのみ使用する。",
    "・同じ問題セットを、通常ブロックと混合問題の両方へ重複記載しない。",
    "・高確信誤答、安全課題、口頭再生△・×を優先して弱点・復習予定へ反映する。",
    "・欠損知識、高確信誤答、口頭再生△・×から、利用者設定に従って適切な定着方法を判断する。Anki使用者ではExcel内の06_Anki管理を照合する。",
    "",
    "【日時・重複処理規則】",
    `・すべての学習ブロックを学習日${record.studyDate}の実績として処理する。`,
    "・終了日時が翌日でもログを日付で分割しない。",
    "・学習実績が存在しない日は0件ログを作らず、計画表との比較で未実施日として判定する。",
    `・次回計画は${record.planTargetDate}を対象とし、最終学習日＋1日から推定しない。`,
    "・基本計画は『確実に学習へ使える時間帯』の範囲内だけで作成する。",
    "・追加可能時間には条件付きブロックだけを置き、使えなくても遅延扱いにしない。",
    "・固定予定と就寝準備開始時刻を侵害しない。",
    "・時間条件が未入力または『未定』なら、正確な開始・終了時刻を推測せず、優先順位と所要時間の目安だけを示す。",
    "・次回計画は必須・標準・条件付きの3層に分ける。単なる時刻表や『○問処理』だけの表は禁止するが、同じ一般手順の冗長な反復も避ける。",
    "・各予定ブロックを『形成』『再診断』『補修』『転移確認』『維持』のいずれかへ分類し、目的に応じて手順と詳細度を変える。禁忌・救急・高確信誤答は安全課題として優先する。",
    "・形成は具体的な事前想起、QB回答と直後解説、迷い・誤答補修、構造化口頭再生まで詳細化する。",
    "・再診断は教材を先に見ず問題から開始し、十分なら早期終了、不足があれば補修へ切り替える。",
    "・補修は誤認と正解の差、正しい決定手掛かり、資料なし再生、類似問題での確認まで行う。",
    "・転移確認は近接鑑別や条件変更を使い、『なぜAでBではないか』を説明させる。",
    "・維持は短い検索テストと早期終了条件を中心とし、形成と同じ詳細処理を強制しない。",
    "・QBは各問題へ回答した直後に解説が表示されるため、QBの1問処理時間は『問題を解く時間＋直後の解説確認時間』とする。問題時間と通常の解説時間を別々に二重加算しない。",
    "・Webの所要時間はブロック全体の実測値として扱う。事前想起、重大欠損の追加補修、原因分類、口頭再生、Web記録は必要時に追加で見積もる。",
    "・可能なら01_日次ログの目的プロトコル・教材・科目・演習区分が近い直近3～5回の実測処理速度中央値から問題数と所要時間を決める。データ不足時は保守的な暫定値と明示する。",
    "・実測処理速度はブロック全体の値であり、追加補修・口頭再生・記録等を含む場合がある。比較可能な同種行だけを使う。",
    "・安全性を優先したうえで、出題寄与、現在の弱さ、期限超過、改善可能性、必要時間を比較し、時間当たりの合格寄与が高い内容を選ぶ。",
    "・確実枠を予定で完全に埋めず、休憩、食事、処理時間のばらつき、記録、遅延吸収の余白を残す。最近の完遂率に応じて予定量を調整する。",
    "・迷い正解は『知識補修』『鑑別・推論練習』『根拠確認のみ』『過剰思考の是正』へ分け、一律に誤答と同じ精読をさせない。",
    "・高確信誤答は、誤認内容、誤認理由、正しい決定手掛かり、対立候補との違い、別問題での再確認、自信と正確性の再校正まで扱う。",
    "・各ブロックへ、目的プロトコル、選定理由、時刻、科目・分野・教材・演習区分、問題範囲・問題数、開始方法、QB処理、迷い・誤答処理、口頭再生または転移確認、Web記録、終了条件、成功時の早期終了条件、失敗時の補修切替条件を具体的に書く。",
    "・条件付きブロックには実施条件と省略条件を必ず書き、省略時の遅延扱いを明示する。",
    "・同じ学習日レコードIDかつ同じリビジョンが登録済みなら重複追加しない。",
    "・同じ学習日レコードIDで新しいリビジョンなら、既存記録を更新する。",
    "",
    "【ChatGPTに実行させる処理】",
    "・Excel台帳の該当シートを更新する。",
    "・欠損知識を既存弱点と統合し、重複を除去する。",
    "・高確信誤答と安全課題を最優先で処理する。",
    "・口頭再生課題、定着方法、復習時期、次に行う科目・分野・問題数と、目的別の学習プロトコルを決定する。",
    "・07_日別スケジュールS列『主要目的プロトコル』へ、その日の最優先ブロックの主目的を記録する。",
    "・処理後の回答では、形成・補修・安全課題は詳細に、維持は簡潔にし、成功時と失敗時の分岐までそのまま実行できる粒度で書く。",
    "・学習空白日や計画遅延があれば、絶対日付に基づいて残り計画を再配分する。"
  );

  return lines.join("\n");
}
