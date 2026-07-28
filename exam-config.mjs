export const EXAM_CONFIG = {
  examId: "medical-national-pro",
  examName: "医師国家試験 Pro",
  edition: "pro",
  appName: "国試AI学習ログ",
  studyDayBoundaryHour: 5,
  storageSchemaVersion: 3,
  appVersion: "0.3.0",

  subjects: [
    {
      id: "gastrointestinal", name: "消化管",
      fields: ["消化管総論・症候", "食道疾患", "胃・十二指腸疾患", "小腸疾患", "大腸疾患", "炎症性腸疾患", "機能性消化管疾患", "消化管出血", "消化管腫瘍", "肛門疾患", "急性腹症", "消化管 総合問題", "消化管 120回問題"]
    },
    {
      id: "hepatobiliary-pancreas", name: "肝胆膵",
      fields: ["肝胆膵総論・検査", "急性肝炎・劇症肝炎", "慢性肝炎", "肝硬変・門脈圧亢進症", "代謝性・薬剤性肝障害", "肝腫瘍", "胆石・胆道感染症", "胆道腫瘍", "急性膵炎", "慢性膵炎", "膵腫瘍", "肝・胆・膵 総合問題", "肝・胆・膵 120回問題"]
    },
    {
      id: "cardiology", name: "循環器",
      fields: ["循環器総論・検査", "虚血性心疾患", "不整脈", "心不全", "心筋疾患", "弁膜症", "先天性心疾患", "心膜疾患", "感染性心内膜炎", "血管疾患", "血圧異常", "循環器 総合問題", "循環器 120回問題"]
    },
    {
      id: "endocrine-metabolism", name: "代謝内分泌",
      fields: ["代謝・内分泌 総論", "視床下部・下垂体疾患", "甲状腺疾患", "副甲状腺疾患", "副腎疾患", "糖質代謝異常", "脂質代謝異常", "尿酸代謝異常", "骨代謝異常", "その他の代謝異常", "代謝・内分泌 総合問題", "代謝・内分泌 120回問題"]
    },
    {
      id: "nephrology", name: "腎",
      fields: ["腎・泌尿器 総論", "腎不全", "尿細管機能障害・間質性疾患", "糸球体疾患", "全身疾患と腎障害", "腎血管性疾患", "遺伝性腎疾患", "水・電解質代謝異常", "腎・泌尿器 総合問題", "腎・泌尿器 120回問題"]
    },
    {
      id: "immunology-rheumatology", name: "免疫膠原病",
      fields: ["免疫学 総論", "アレルギー", "膠原病", "血管炎症候群", "自己炎症性疾患", "免疫不全症", "免疫・膠原病 総合問題", "免疫・膠原病 120回問題"]
    },
    {
      id: "hematology", name: "血液",
      fields: ["血液 総論", "赤血球の異常", "白血球の異常", "白血病", "骨髄系腫瘍", "リンパ系腫瘍", "形質細胞腫瘍", "出血・凝固異常", "造血幹細胞移植", "血液 総合問題", "血液 120回問題"]
    },
    {
      id: "infectious-disease", name: "感染症",
      fields: ["感染症 総論", "抗菌薬・感染対策", "細菌感染症", "ウイルス感染症", "真菌感染症", "原虫・寄生虫感染症", "性感染症", "人獣共通感染症", "輸入感染症", "敗血症", "感染症 総合問題", "感染症 120回問題"]
    },
    {
      id: "respiratory", name: "呼吸器",
      fields: ["呼吸器 総論・検査", "呼吸不全", "気道疾患", "感染性呼吸器疾患", "間質性肺疾患", "肺循環障害", "胸膜・縦隔疾患", "肺腫瘍", "睡眠呼吸障害", "職業性・環境性肺疾患", "呼吸器 総合問題", "呼吸器 120回問題"]
    },
    {
      id: "neurology", name: "神経",
      fields: ["神経 総論・診察", "脳血管障害", "認知症・高次脳機能障害", "変性疾患", "脱髄・炎症性疾患", "末梢神経障害", "神経筋接合部・筋疾患", "てんかん", "頭痛", "感染性疾患", "脳腫瘍", "頭部外傷", "神経 その他の疾患", "神経 総合問題", "神経 120回問題"]
    },
    {
      id: "pediatrics", name: "小児科",
      fields: ["成長・発達", "新生児・乳幼児", "消化管", "肝・胆・膵", "腹部の腫瘍", "循環器", "内分泌・代謝", "腎・泌尿器", "免疫・膠原病", "血液・造血器", "感染症", "呼吸器", "神経", "先天異常", "小児救急", "小児科 総合問題", "小児科 120回問題"]
    },
    {
      id: "gynecology", name: "婦人科",
      fields: ["女性性器の構造と性機能", "内分泌の異常", "女性のライフサイクルの変化", "性器の炎症・STI", "類腫瘍性病変・前癌病変・腫瘍", "子宮内膜症・子宮腺筋症", "不妊症・生殖医療", "骨盤臓器脱・尿失禁", "婦人科救急", "婦人科 総合問題", "婦人科 120回問題"]
    },
    {
      id: "obstetrics", name: "産科",
      fields: ["妊娠の成立・生理", "正常妊娠", "正常分娩", "産褥", "妊娠初期の異常", "妊娠高血圧症候群", "妊娠糖尿病・合併症妊娠", "胎児発育・胎児機能不全", "多胎妊娠", "前置胎盤・常位胎盤早期剥離", "分娩の異常", "産科出血", "産科感染症", "産科救急", "産科 総合問題", "産科 120回問題"]
    }
  ],

  materials: ["QB", "Q-Assist", "MEC", "medu4", "模試", "Anki", "自作ノート", "その他"],
  qbModes: ["通常モード", "未演習のみ", "誤答のみ", "ランダム", "カスタム", "該当なし"],
  exerciseTypes: [
    { id: "first-round", label: "1周目問題", requiresQuestions: true, countsTowardFirstRound: true },
    { id: "new-unseen", label: "未演習確認", requiresQuestions: true, countsTowardFirstRound: false },
    { id: "wrong-retry", label: "誤答再演習", requiresQuestions: true, countsTowardFirstRound: false },
    { id: "department-mixed", label: "診療科内混合", requiresQuestions: true, countsTowardFirstRound: false },
    { id: "cross-subject-mixed", label: "科目横断混合", requiresQuestions: true, countsTowardFirstRound: false },
    { id: "all-questions", label: "全問題演習", requiresQuestions: true, countsTowardFirstRound: false },
    { id: "review-test", label: "復習テスト", requiresQuestions: true, countsTowardFirstRound: false },
    { id: "mock-exam", label: "模試", requiresQuestions: true, countsTowardFirstRound: false },
    { id: "lecture", label: "講義・教材確認", requiresQuestions: false, countsTowardFirstRound: false },
    { id: "oral-only", label: "口頭再生のみ", requiresQuestions: false, countsTowardFirstRound: false },
    { id: "other", label: "その他", requiresQuestions: false, countsTowardFirstRound: false }
  ],
  priorExposureStatuses: [
    { id: "confirmed-unseen", label: "未接触確認済" },
    { id: "previously-seen", label: "過去接触あり" },
    { id: "unknown", label: "過去接触不明" },
    { id: "not-applicable", label: "該当なし" }
  ],
  oralRecallStatuses: ["未実施", "○", "△", "×"],
  quickNoteTypes: ["欠損知識", "迷った知識", "高確信誤答", "推論ミス", "読み落とし", "Anki候補", "口頭再生候補", "安全課題", "自由メモ"],

  rules: {
    maxKnowledgeGapsPerBlock: 3,
    onlyFirstRoundCountsTowardProgress: true,
    unknownExposureNotForGraduation: true
  }
};
