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


export function datetimeLocalValue(date = new Date()) {
  return `${localDateString(date)}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function calculateDurationMinutes(startedAt, endedAt) {
  if (!startedAt || !endedAt) return null;
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start) return null;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

export function blockTimingInfo(block) {
  const calculatedMinutes = calculateDurationMinutes(block?.startedAt, block?.endedAt);
  const recordedMinutes = Number(block?.durationMinutes) || 0;
  const startMethod = String(block?.startTimeInputMethod ?? 'none');
  const endMethod = String(block?.endTimeInputMethod ?? 'none');
  let method = '未計測';
  let reliability = '低';
  if (block?.startedAt && block?.endedAt && calculatedMinutes !== null) {
    method = startMethod === 'tap' && endMethod === 'tap' ? 'ワンタップ計測' : '時刻手入力を含む';
    const mismatch = Math.abs(calculatedMinutes - recordedMinutes);
    reliability = mismatch <= 2 ? (method === 'ワンタップ計測' ? '高' : '中') : '低';
  } else if (recordedMinutes > 0) {
    method = '所要時間のみ';
    reliability = '低';
  }
  return { calculatedMinutes, recordedMinutes, method, reliability };
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
      bedtimePreparationStart: "",
      paceMultiplier: 1.5
    },
    ankiReport: {
      status: "no-instruction",
      completedItems: "",
      pendingItems: "",
      notes: ""
    },
    weeklyReview: {
      enabled: false,
      reviewDate: studyDate,
      goalUpdate: "",
      consultationNotes: "",
      subjectSnapshots: (config.subjects ?? []).map((subject) => ({
        subjectId: subject.id, subjectName: subject.name, correct: null, uncertain: null, wrong: null
      }))
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
    startedAt: "",
    endedAt: "",
    startTimeInputMethod: "none",
    endTimeInputMethod: "none",
    durationInputMethod: "none",
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
  const anki = record.ankiReport ?? {};
  if (anki.status && anki.status !== "no-instruction") return true;
  if ([anki.completedItems, anki.pendingItems, anki.notes].some((value) => String(value ?? "").trim())) return true;
  if (record.weeklyReview?.enabled === true) return true;
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
    bedtimePreparationStart: String(record.nextPlanConditions?.bedtimePreparationStart ?? ""),
    paceMultiplier: Number(record.nextPlanConditions?.paceMultiplier) || 1.5
  };
  record.ankiReport = {
    status: String(record.ankiReport?.status ?? "no-instruction"),
    completedItems: String(record.ankiReport?.completedItems ?? ""),
    pendingItems: String(record.ankiReport?.pendingItems ?? ""),
    notes: String(record.ankiReport?.notes ?? "")
  };
  const existingSnapshots = Array.isArray(record.weeklyReview?.subjectSnapshots) ? record.weeklyReview.subjectSnapshots : [];
  record.weeklyReview = {
    enabled: record.weeklyReview?.enabled === true,
    reviewDate: String(record.weeklyReview?.reviewDate ?? record.studyDate ?? ""),
    goalUpdate: String(record.weeklyReview?.goalUpdate ?? ""),
    consultationNotes: String(record.weeklyReview?.consultationNotes ?? ""),
    subjectSnapshots: (config?.subjects ?? []).map((subject) => {
      const existing = existingSnapshots.find((item) => item?.subjectId === subject.id || item?.subjectName === subject.name) ?? {};
      const normalizeCount = (value) => value === null || value === undefined || value === "" ? null : Number(value);
      return {
        subjectId: subject.id,
        subjectName: subject.name,
        correct: normalizeCount(existing.correct),
        uncertain: normalizeCount(existing.uncertain),
        wrong: normalizeCount(existing.wrong)
      };
    })
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
      blockId: block?.blockId || createId("block"),
      startedAt: String(block?.startedAt ?? ""),
      endedAt: String(block?.endedAt ?? ""),
      startTimeInputMethod: String(block?.startTimeInputMethod ?? (block?.startedAt ? "manual" : "none")),
      endTimeInputMethod: String(block?.endTimeInputMethod ?? (block?.endedAt ? "manual" : "none")),
      durationInputMethod: String(block?.durationInputMethod ?? ((Number(block?.durationMinutes) || 0) > 0 ? "legacy-unknown" : "none"))
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

  const timing = blockTimingInfo(block);
  if ((block.startedAt && !block.endedAt) || (!block.startedAt && block.endedAt)) {
    warnings.push("開始日時または終了日時の片方だけが入力されています。所要時間を確認してください。");
  }
  if (block.startedAt && block.endedAt && timing.calculatedMinutes === null) {
    errors.push("終了日時は開始日時以後にしてください。");
  }
  if (timing.calculatedMinutes !== null && Math.abs(timing.calculatedMinutes - timing.recordedMinutes) > 2) {
    warnings.push("開始・終了時刻からの計算時間と所要時間が一致していません。速度推定では低信頼として扱います。");
  } else if (timing.method === "所要時間のみ" && timing.recordedMinutes > 0) {
    warnings.push("開始・終了時刻がないため、この所要時間は速度推定では低信頼として扱います。");
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

function ankiReportLabel(status) {
  return ({
    "no-instruction": "本日のAnki操作指示なし",
    "all-completed": "指示された作成・修正をすべて完了",
    "partial": "一部だけ完了",
    "not-completed": "指示はあったが未完了"
  })[status] ?? status ?? "未入力";
}

function weeklySnapshotLogLines(record) {
  const weekly = record.weeklyReview ?? {};
  if (weekly.enabled !== true) return ["週次レビュー：実施しない"];
  const lines = [
    "週次レビュー：実施する",
    `レビュー基準日：${valueOrNone(weekly.reviewDate)}`,
    `目標・模試日の変更：${valueOrNone(weekly.goalUpdate)}`,
    `今週の状況・相談事項：${valueOrNone(weekly.consultationNotes)}`,
    "",
    "【QB科目別スナップショット】",
    "科目｜○｜△｜×｜合計"
  ];
  (weekly.subjectSnapshots ?? []).forEach((item) => {
    const correct = Number(item.correct) || 0;
    const uncertain = Number(item.uncertain) || 0;
    const wrong = Number(item.wrong) || 0;
    lines.push(`${item.subjectName || item.subjectId}｜${correct}｜${uncertain}｜${wrong}｜${correct + uncertain + wrong}`);
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
    "【本日のAnki実施報告】",
    `状態：${ankiReportLabel(record.ankiReport?.status)}`,
    `完了したknowledge_id・カード：${valueOrNone(record.ankiReport?.completedItems)}`,
    `未完了・保留：${valueOrNone(record.ankiReport?.pendingItems)}`,
    `補足：${valueOrNone(record.ankiReport?.notes)}`,
    "",
    "【週次レビュー入力】",
    ...weeklySnapshotLogLines(record),
    "",
    "【次回学習条件】",
    `次回計画対象日：${record.planTargetDate}`,
    `確実に学習へ使える時間帯：${valueOrNone(nextPlan.confirmedStudyWindows)}`,
    `追加で使える可能性がある時間帯：${valueOrNone(nextPlan.optionalStudyWindows)}`,
    `固定予定・学習上の制約：${valueOrNone(nextPlan.fixedConstraints)}`,
    `就寝準備開始時刻：${valueOrNone(nextPlan.bedtimePreparationStart)}`,
    `計画ペース倍率：${Number(nextPlan.paceMultiplier) || 1.5}倍`,
    `計画時間換算：従来想定時間の約${Math.round(100 / (Number(nextPlan.paceMultiplier) || 1.5))}%を目標とする（安全課題・必要地図化は質的条件を優先）`,
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
      `ブロック開始日時：${valueOrNone(block.startedAt)}`,
      `ブロック終了日時：${valueOrNone(block.endedAt)}`,
      `時間記録方法：${blockTimingInfo(block).method}`,
      `時間信頼度：${blockTimingInfo(block).reliability}`,
      `時刻差による計算時間：${blockTimingInfo(block).calculatedMinutes === null ? "算出不可" : `${blockTimingInfo(block).calculatedMinutes}分`}`,
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
    "・01_日次ログにAC開始日時、AD終了日時、AE時間記録方法、AF時間信頼度がなければ追加し、Webログの値を保存する。",
    "・速度推定は時間信頼度『高』『中』を優先し、『低』および旧データで記録方法不明の行は原則除外する。",
    "・利用者申告により従来の所要時間入力には推測値が混在するため、v0.6.0導入前の実測速度中央値をそのまま次回計画の根拠にしない。",
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
    "・本日のAnki実施報告が『すべて完了』なら、06_Anki管理で当該日に作成・修正指示された対象を照合し、利用者の実施報告と一意に対応できる行だけを作成済み／修正済みへ更新する。対応が曖昧なら推測せず確認する。",
    "・『一部だけ完了』では、明示されたknowledge_idまたはFrontだけを完了更新し、未記載カードを完了扱いにしない。案提示、作成指示、閲覧だけを作成済みとしない。",
    "・QB科目別スナップショットの○・△・×はQB画面上の累積値であり、日次ログの6分類を上書きしない。週次レビュー時は前回スナップショットとの差分を計算する。",
    "・週次レビュー入力がある場合は、10_週次レビューへ科目別スナップショットを追加し、Excelの直近7日実績、各科目進捗、未解消安全課題、計画完遂率と統合する。",
    "",
    "【日時・重複処理規則】",
    `・すべての学習ブロックを学習日${record.studyDate}の実績として処理する。`,
    "・終了日時が翌日でもログを日付で分割しない。",
    "・学習実績が存在しない日は0件ログを作らず、計画表との比較で未実施日として判定する。",
    `・次回計画は${record.planTargetDate}を対象とし、最終学習日＋1日から推定しない。`,
    "・基本計画は『確実に学習へ使える時間帯』の範囲内だけで作成する。",
    "・計画ペース倍率を反映し、1.5倍なら従来想定時間を約2/3へ圧縮するか、同じ時間枠へ約1.5倍の学習量を配置する。",
    "・1.5倍は急いで解くことを強制する締切ではなく、計画量を多めに置く補正である。安全課題、初学地図化、口頭再生の質的終了条件は削らない。",
    "・予定より早く終わった場合は次の必須・標準ブロックを待たずに前倒しし、前倒し候補を1～2個用意する。",
    "・追加可能時間には条件付きブロックだけを置き、使えなくても遅延扱いにしない。",
    "・固定予定と就寝準備開始時刻を侵害しない。",
    "・時間条件が未入力または『未定』なら、正確な開始・終了時刻を推測せず、優先順位と所要時間の目安だけを示す。",
    "・次回計画は必須・標準・条件付きの3層に分ける。単なる時刻表や『○問処理』だけの表は禁止するが、同じ一般手順の冗長な反復も避ける。",
    "・各予定ブロックを『形成』『再診断』『補修』『転移確認』『維持』のいずれかへ分類する。形成はさらに『初学形成』と『通常形成』へ分ける。禁忌・救急・治療順序・重大副作用・高確信誤答は安全課題として優先する。",
    "・事前想起は初学者へ正答を要求する試験ではなく、現在の構造知識と地図化の深さを判定する診断として使う。中核質問の半数以上を説明できず分類軸も作れない初学分野を、地図化なしでQBへ進ませない。",
    "・地図化をM0不要、M1 5～15分、M2 15～40分、M3 40～60分へ分類する。M3は広い分野で知識がほぼなく、M2ではQB開始が困難な場合だけ使用する。",
    "・地図化は教材の要約や清書ではなく、1画面または1ページの最小判断構造とする。分類軸、病態連鎖、典型症候・検査、診断決定点、第一選択、安全事項、近接鑑別から必要な枠を選ぶ。",
    "・地図化を指示するときは、参照教材、作る図・比較表・フロー、具体的に埋める項目、上限時間、終了条件を示す。『病態・診断・第一選択を想起』『地図化する』だけの抽象指示を禁止する。",
    "・初学形成は、診断的事前想起3～5分→M2/M3地図化→QB第1群5～8問→判定→必要なら地図修正5～15分→QB第2群5～10問→構造化口頭再生→Web記録を原則とする。",
    "・QB第1群で知識不足誤答が多い、同じ軸で迷う、分類を説明できない場合は、問題数を増やさず地図修正へ戻る。安全課題誤答なら補修へ切り替える。安定していれば惰性で予定上限まで解かず早期終了する。",
    "・通常形成は事前想起3～5分→必要ならM1地図化→QB10～20問→迷い・誤答処理→口頭再生とする。",
    "・再診断は教材を先に見ず問題から開始し、十分なら早期終了、不足があれば該当分野だけM1/M2地図修正と補修へ切り替える。",
    "・補修は誤認と正解の差、誤認理由、正しい決定手掛かり、対立候補、資料なし再生、類似問題での確認まで行う。",
    "・転移確認は近接鑑別や条件変更を使い、『なぜAでBではないか』『条件が変われば何が変わるか』を説明させる。",
    "・維持は短い検索テストと早期終了条件を中心とし、形成と同じ詳細処理を強制しない。",
    "・同日に2～3分野を形成した場合は、時間と疲労を確認し、学習済み分野だけの診療科内混合10～15問を検討する。未学習分野を初回から大量に混ぜない。",
    "・QBは各問題へ回答した直後に解説が表示されるため、QBの1問処理時間は『問題を解く時間＋直後の解説確認時間』とする。問題時間と通常の解説時間を別々に二重加算しない。",
    "・初学形成の総時間を分／問×問題数だけで決めない。事前想起＋地図化＋QB問題処理＋地図修正・原因分類＋口頭再生＋Web記録で見積もる。",
    "・01_日次ログの実測速度は地図化や口頭再生等を含む場合がある。直近3～5回の中央値は、目的・教材・科目・演習区分・地図化レベル・問題数が比較可能な場合だけ使い、初学分野へ既習形成の速度だけを適用しない。",
    "・安全性を優先したうえで、出題寄与、現在の弱さ、期限超過、改善可能性、必要時間を比較し、時間当たりの合格寄与が高い内容を選ぶ。",
    "・確実枠を予定で完全に埋めず、休憩、食事、地図修正、処理時間のばらつき、記録、遅延吸収の余白を残す。最近の完遂率に応じて予定量を調整する。",
    "・迷い正解は『知識補修』『鑑別・推論練習』『根拠確認のみ』『過剰思考の是正』へ分け、一律に誤答と同じ精読をさせない。",
    "・高確信誤答は、誤認内容、誤認理由、正しい決定手掛かり、対立候補との違い、別問題での再確認、自信と正確性の再校正まで扱う。",
    "・各ブロックへ、目的・選定理由・現在状態、具体的事前想起、地図化レベルと具体内容、QB第1群・第2群、第1群後の分岐、迷い・誤答処理、具体的口頭再生、Web記録、量的・質的終了条件、成功・失敗・早期終了時の行動を示す。",
    "・条件付きブロックには実施条件と省略条件を必ず書き、省略時の遅延扱いを明示する。",
    "・同じ学習日レコードIDかつ同じリビジョンが登録済みなら重複追加しない。",
    "・同じ学習日レコードIDで新しいリビジョンなら、既存記録を更新する。",
    "",
    "【ChatGPTに実行させる処理】",
    "・Excel台帳の該当シートを更新する。",
    "・欠損知識を既存弱点と統合し、重複を除去する。",
    "・高確信誤答と安全課題を最優先で処理する。",
    "・口頭再生課題、定着方法、復習時期、次に行う科目・分野・問題数、地図化レベルと目的別学習プロトコルを決定する。",
    "・07_日別スケジュールS列『主要目的プロトコル』へ、その日の最優先ブロックの主目的を記録する。",
    "・週次レビューでは、前回比、直近7日と14日の実績ペース、目標日までの残日数、必要ペース、基準・保守・上振れの到達見込みを示す。架空の精密確率を作らず、前提と削減候補を明示する。",
    "・科目別に、演習量、QB○△×の構成と増分、1周目残数、分野状態、重大弱点を説明し、順調・要修正・高リスクへ分類する。",
    "・週次レビューは報告だけで終えず、現在の学習法を最短合格の観点から批判的に監査し、継続・停止・変更する行動、次の7日間の配分、今後1～3日の具体策を提示する。利用者の相談事項へ理由付きで回答する。",
    "・処理後の回答では、形成・補修・安全課題は詳細に、維持は簡潔にし、成功時と失敗時の分岐までそのまま実行できる粒度で書く。",
    "・学習空白日や計画遅延があれば、絶対日付に基づいて残り計画を再配分する。"
  );

  return lines.join("\n");
}
