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
    schemaVersion: config.storageSchemaVersion ?? 3,
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
      sleepHours: "",
      concentration: "",
      dailyNote: ""
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
    materialVersion: "",
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
    highConfidenceErrorCount: 0,
    durationMinutes: 0,
    knowledgeGaps: "",
    oralRecallStatus: "未実施",
    oralRecallNotes: "",
    ankiCandidates: "",
    notes: ""
  };
}

function cloneValue(value) {
  if (globalThis.structuredClone) return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function migrateRecord(input, config) {
  if (!input || typeof input !== "object") return null;
  const record = cloneValue(input);
  const targetVersion = config?.storageSchemaVersion ?? 3;

  record.schemaVersion = Number(record.schemaVersion) || 1;
  record.appVersion = config?.appVersion ?? record.appVersion ?? "";
  record.qualificationId ??= config?.examId ?? "";
  record.qualificationName ??= config?.examName ?? "";
  record.edition ??= config?.edition ?? "";
  record.revision = Number(record.revision) || 0;
  record.status = record.status === "finalized" ? "finalized" : "open";
  record.dailyContext = {
    sleepHours: "",
    concentration: "",
    dailyNote: "",
    ...(record.dailyContext ?? {})
  };
  record.blocks = Array.isArray(record.blocks) ? record.blocks : [];
  record.quickNotes = Array.isArray(record.quickNotes) ? record.quickNotes : [];
  record.planTargetDateManual = record.planTargetDateManual === true;
  record.lastFinalizedFingerprint ??= null;
  record.lastSavedAt ??= null;

  record.blocks = record.blocks.map((block) => ({
    ...createEmptyBlock(),
    ...block,
    blockId: block?.blockId || createId("block")
  }));
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
    "errorReading", "errorOther", "highConfidenceErrorCount", "durationMinutes"
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
  const highConfidenceErrorCount = Number(block.highConfidenceErrorCount) || 0;

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
  if (highConfidenceErrorCount > totals.totalErrors) {
    errors.push("高確信誤答数は総誤答数以下にしてください。");
  }

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

  if (questionCount === 0 && Number(block.durationMinutes) === 0 && !block.notes && !block.knowledgeGaps && !block.oralRecallNotes) {
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
    acc.highConfidenceErrorCount += Number(block.highConfidenceErrorCount) || 0;
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

export function generateLog(record) {
  const summary = summarizeRecord(record);
  const context = record.dailyContext ?? {};
  const lines = [
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
    `次回計画対象日：${record.planTargetDate}`,
    "",
    "【日単位情報】",
    `睡眠時間：${context.sleepHours === "" ? "未入力" : `${context.sleepHours}時間`}`,
    `集中度：${context.concentration === "" ? "未入力" : `${context.concentration}/5`}`,
    `日全体メモ：${valueOrNone(context.dailyNote)}`,
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
      `教材版：${valueOrNone(block.materialVersion)}`,
      `QBモード：${valueOrNone(block.qbMode)}`,
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
      `高確信誤答数：${Number(block.highConfidenceErrorCount) || 0}`,
      `未演習問題数：${Number(block.unattemptedQuestionCount) || 0}`,
      `未演習正解数：${Number(block.unattemptedCorrectCount) || 0}`,
      `未演習正答率：${percent(Number(block.unattemptedCorrectCount) || 0, Number(block.unattemptedQuestionCount) || 0)}`,
      `正式な未演習判定に使用可能：${formalUnseen ? "はい" : "いいえ"}`,
      `1周目進捗へ加算：${firstRound ? "はい" : "いいえ"}`,
      `所要時間：${Number(block.durationMinutes) || 0}分`,
      `欠損知識（重要上位3項目）：${valueOrNone(block.knowledgeGaps)}`,
      `口頭再生結果：${valueOrNone(block.oralRecallStatus)}`,
      `口頭再生メモ：${valueOrNone(block.oralRecallNotes)}`,
      `Anki候補：${valueOrNone(block.ankiCandidates)}`,
      `自由メモ：${valueOrNone(block.notes)}`
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
    "・演習数は、自信あり正解・迷い正解・知識不足誤答・推論ミス・読み落とし・その他誤答の合計とする。",
    "・総正解、各率、分類整合チェックはExcel数式または計算で更新する。",
    "・睡眠時間と集中度は同一学習日の最初の行だけへ入力し、重複入力しない。",
    "・コメント／欠損知識メモには、問題範囲、過去接触状況、欠損知識、口頭再生、Anki候補、自由メモを簡潔に統合する。",
    "",
    "【進捗・判定規則】",
    "・演習区分が『1周目問題』のブロックだけを、1周目問題進捗へ加算する。",
    "・『誤答再演習』『診療科内混合』『科目横断混合』『全問題演習』を1周目問題へ二重加算しない。",
    "・未演習問題数が入力されていても、過去接触状況が『未接触確認済』でない場合は、正式な未演習問題による卒業判定に使わない。",
    "・過去接触不明の問題セットは、再活性化または暫定安定の判定にのみ使用する。",
    "・同じ問題セットを、通常ブロックと混合問題の両方へ重複記載しない。",
    "・高確信誤答、安全課題、口頭再生△・×を優先して弱点・復習予定へ反映する。",
    "・Anki候補は自動採用せず、新規カード・既存カード修正・不採用を判断する。",
    "",
    "【日時・重複処理規則】",
    `・すべての学習ブロックを学習日${record.studyDate}の実績として処理する。`,
    "・終了日時が翌日でもログを日付で分割しない。",
    "・学習実績が存在しない日は0件ログを作らず、計画表との比較で未実施日として判定する。",
    `・次回計画は${record.planTargetDate}を対象とし、最終学習日＋1日から推定しない。`,
    "・同じ学習日レコードIDかつ同じリビジョンが登録済みなら重複追加しない。",
    "・同じ学習日レコードIDで新しいリビジョンなら、既存記録を更新する。",
    "",
    "【ChatGPTに実行させる処理】",
    "・Excel台帳の該当シートを更新する。",
    "・欠損知識を既存弱点と統合し、重複を除去する。",
    "・高確信誤答と安全課題を最優先で処理する。",
    "・口頭再生課題、Anki採否、復習時期、次に行う科目・分野・問題数を具体的に決定する。",
    "・学習空白日や計画遅延があれば、絶対日付に基づいて残り計画を再配分する。"
  );

  return lines.join("\n");
}
