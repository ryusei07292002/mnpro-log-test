export const EXAM_CONFIG = {
  examId: "medical-national-pro",
  examName: "医師国家試験 Pro",
  edition: "pro",
  appName: "国試AI学習ログ",
  studyDayBoundaryHour: 5,
  storageSchemaVersion: 8,
  appVersion: "0.6.0",

  subjects: [
    {
        id: "gastrointestinal",
        name: "消化管",
        fields: [
            "消化管 総論",
            "食道疾患",
            "胃・十二指腸疾患",
            "腸疾患",
            "肛門疾患",
            "腹壁・腹膜疾患",
            "消化管 総合問題",
            "消化管 120回問題"
        ]
    },
    {
        id: "hepatobiliary-pancreas",
        name: "肝胆膵",
        fields: [
            "肝臓 総論",
            "肝疾患",
            "胆道 総論",
            "胆道疾患",
            "膵臓 総論",
            "膵疾患",
            "肝・胆・膵 総合問題",
            "肝・胆・膵 120回問題"
        ]
    },
    {
        id: "cardiology",
        name: "循環器",
        fields: [
            "循環器 総論",
            "心不全",
            "不整脈",
            "虚血性心疾患",
            "心臓弁膜症・心内膜炎",
            "心臓腫瘍",
            "心筋疾患",
            "心膜疾患",
            "血管疾患",
            "血圧異常",
            "循環器 総合問題",
            "循環器 120回問題"
        ]
    },
    {
        id: "endocrine-metabolism",
        name: "代謝内分泌",
        fields: [
            "視床下部・下垂体疾患",
            "副腎疾患",
            "甲状腺疾患",
            "副甲状腺疾患",
            "膵内分泌腫瘍",
            "多発性内分泌腫瘍症",
            "糖質代謝異常",
            "脂質代謝異常",
            "肥満症・メタボリックシンドローム",
            "尿酸代謝異常",
            "骨代謝異常",
            "その他の代謝異常",
            "代謝・内分泌 総合問題",
            "代謝・内分泌 120回問題"
        ]
    },
    {
        id: "nephrology",
        name: "腎",
        fields: [
            "腎・泌尿器 総論",
            "腎不全",
            "尿細管機能障害・間質性疾患",
            "糸球体疾患",
            "全身疾患と腎障害",
            "腎血管性疾患",
            "遺伝性腎疾患",
            "水・電解質代謝異常",
            "腎・泌尿器 総合問題",
            "腎・泌尿器 120回問題"
        ]
    },
    {
        id: "immunology-rheumatology",
        name: "免疫膠原病",
        fields: [
            "免疫学 総論",
            "アレルギー",
            "膠原病",
            "免疫不全症",
            "免疫・膠原病 120回問題"
        ]
    },
    {
        id: "hematology",
        name: "血液",
        fields: [
            "血液 総論",
            "赤血球の異常",
            "白血病",
            "骨髄系腫瘍",
            "リンパ系腫瘍",
            "止血機構の異常",
            "造血幹細胞移植",
            "輸血療法",
            "血液 総合問題",
            "血液 120回問題"
        ]
    },
    {
        id: "infectious-disease",
        name: "感染症",
        fields: [
            "肺炎",
            "肺真菌症",
            "抗酸菌感染症",
            "腸管感染症",
            "皮膚感染症",
            "筋・腱・骨・関節感染症",
            "輸入感染症",
            "易感染性状態",
            "その他の感染症",
            "感染症 総合問題",
            "感染症 120回問題"
        ]
    },
    {
        id: "respiratory",
        name: "呼吸器",
        fields: [
            "呼吸器 総論",
            "閉塞性肺疾患",
            "間質性肺疾患",
            "免疫・アレルギー性肺疾患",
            "肺腫瘍",
            "肺循環障害",
            "換気異常・その他の肺疾患",
            "縦隔疾患",
            "胸膜疾患",
            "呼吸器 総合問題",
            "呼吸器 120回問題"
        ]
    },
    {
        id: "neurology",
        name: "神経",
        fields: [
            "神経系の構造と機能",
            "脳神経とその障害",
            "運動・感覚・自律神経とその障害",
            "頭蓋内圧亢進・脳ヘルニア",
            "髄液循環とその障害",
            "脳血管障害",
            "神経変性疾患",
            "脱髄性疾患",
            "末梢神経障害",
            "筋疾患",
            "認知症",
            "占拠性病変",
            "機能性疾患",
            "感染性疾患",
            "頭部外傷",
            "神経 その他の疾患",
            "神経 総合問題",
            "神経 120回問題"
        ]
    },
    {
        id: "pediatrics",
        name: "小児科",
        fields: [
            "成長・発達",
            "新生児・乳幼児",
            "消化管",
            "肝・胆・膵",
            "腹部の腫瘍",
            "循環器",
            "内分泌・代謝",
            "腎・泌尿器",
            "免疫・膠原病",
            "血液・造血器",
            "感染症",
            "呼吸器",
            "神経",
            "先天異常",
            "小児科 120回問題"
        ]
    },
    {
        id: "gynecology",
        name: "婦人科",
        fields: [
            "女性性器の構造と性機能",
            "内分泌の異常",
            "女性のライフサイクルの変化",
            "性器の炎症・STI",
            "類腫瘍性病変・前癌病変・腫瘍",
            "性分化と性器形態の異常",
            "不妊症・避妊",
            "乳腺疾患",
            "婦人科 120回問題"
        ]
    },
    {
        id: "obstetrics",
        name: "産科",
        fields: [
            "正常妊娠",
            "妊娠の異常",
            "合併症妊娠",
            "母子感染症",
            "正常分娩",
            "分娩の異常",
            "分娩損傷",
            "産褥",
            "産科 120回問題"
        ]
    },
    {
        id: "poisoning",
        name: "中毒",
        fields: [
            "食中毒",
            "薬剤の副作用",
            "有機溶剤および有機化合物中毒",
            "金属中毒",
            "ガス中毒",
            "農薬中毒",
            "中毒 総合問題",
            "熱中症",
            "物理的原因による疾患 総合問題",
            "中毒 120回問題"
        ]
    },
    {
        id: "emergency",
        name: "救急",
        fields: [
            "ショック",
            "心肺蘇生",
            "異物誤飲",
            "損傷・外傷",
            "圧挫症候群",
            "熱傷",
            "救急 総合",
            "災害医学",
            "救急 120回問題"
        ]
    },
    {
        id: "anesthesiology",
        name: "麻酔科",
        fields: [
            "全身麻酔",
            "局所麻酔",
            "周術期管理",
            "緩和ケア",
            "麻酔科 120回問題"
        ]
    },
    {
        id: "medical-general",
        name: "医学総論",
        fields: [
            "基本的な診療知識",
            "外科手技",
            "高齢化社会",
            "廃用症候群",
            "褥瘡",
            "腫瘍 総論",
            "医学総論 120回問題"
        ]
    },
    {
        id: "ophthalmology",
        name: "眼科",
        fields: [
            "解剖",
            "視野異常と対光反射",
            "検査",
            "症候",
            "ぶどう膜疾患",
            "網膜疾患",
            "前眼部疾患",
            "緑内障",
            "眼外傷",
            "眼科 120回問題"
        ]
    },
    {
        id: "otolaryngology",
        name: "耳鼻咽喉科",
        fields: [
            "耳疾患",
            "鼻腔・副鼻腔疾患",
            "咽頭・喉頭疾患",
            "その他の耳鼻咽喉疾患",
            "耳鼻咽喉科 120回問題"
        ]
    },
    {
        id: "orthopedics",
        name: "整形外科",
        fields: [
            "解剖",
            "脊髄・脊椎疾患",
            "感染性疾患",
            "上肢の疾患",
            "下肢の疾患",
            "腫瘍",
            "内分泌系疾患",
            "その他の疾患",
            "整形外科 120回問題"
        ]
    },
    {
        id: "psychiatry",
        name: "精神科",
        fields: [
            "精神 総論",
            "神経症性障害",
            "気分障害",
            "統合失調症とその近縁の疾患",
            "認知症",
            "精神作用物質関連障害",
            "身体因性精神障害",
            "摂食障害",
            "睡眠障害",
            "小児の精神疾患",
            "パーソナリティ障害と行動の異常",
            "精神医療と社会",
            "検査",
            "治療",
            "精神科 120回問題"
        ]
    },
    {
        id: "dermatology",
        name: "皮膚科",
        fields: [
            "皮膚科 総論",
            "水疱症・膿疱症",
            "じんま疹・湿疹・紅斑症",
            "角化症",
            "母斑・母斑症",
            "腫瘍",
            "感染症",
            "薬疹",
            "その他の疾患",
            "皮膚科 120回問題"
        ]
    },
    {
        id: "urology",
        name: "泌尿器科",
        fields: [
            "解剖・機能",
            "尿路機能障害・通過障害",
            "腫瘍",
            "結石症",
            "感染症",
            "男性器疾患",
            "形状異常・排尿障害",
            "症候・検査",
            "治療",
            "泌尿器科 120回問題"
        ]
    },
    {
        id: "radiology",
        name: "放射線科",
        fields: [
            "放射線診断学",
            "核医学",
            "放射線治療学",
            "医療被曝",
            "放射線科 120回問題"
        ]
    },
    {
        id: "public-health",
        name: "公衆衛生",
        fields: [
            "公衆衛生と健康の概念",
            "疫学",
            "保健統計",
            "医の倫理と患者の人権",
            "医師法と関係法規",
            "診療情報と各種証明書",
            "終末期医療と死の概念",
            "医療の質と安全の確保",
            "医療法と医療体制",
            "社会保障と医療経済",
            "地域保健",
            "成人保健と健康増進",
            "母子保健",
            "高齢者保健",
            "障害者福祉",
            "精神保健福祉",
            "感染症対策",
            "食品保健",
            "栄養",
            "学校保健",
            "産業保健",
            "環境保健",
            "国際保健",
            "公衆衛生 120回問題"
        ]
    },
    {
        id: "compulsory",
        name: "必修問題",
        fields: [
            "医師のプロフェッショナリズム",
            "社会と医療",
            "診療情報と諸証明書",
            "医療の質と安全の確保",
            "人体の構造と機能",
            "医療面接",
            "主要症候",
            "一般的な身体診察",
            "検査の基本",
            "臨床判断の基本",
            "救急初期診療",
            "主要疾患・症候群",
            "治療の基本",
            "基本的手技",
            "死と終末期ケア",
            "チーム医療",
            "生活習慣とリスク",
            "一般教養的事項",
            "医学英語予想問題",
            "必修問題 120回問題"
        ]
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
  ankiReportStatuses: [
    { id: "no-instruction", label: "本日のAnki操作指示なし" },
    { id: "all-completed", label: "指示された作成・修正をすべて完了" },
    { id: "partial", label: "一部だけ完了" },
    { id: "not-completed", label: "指示はあったが未完了" }
  ],
  quickNoteTypes: ["欠損知識", "迷った知識", "高確信誤答", "推論ミス", "読み落とし", "口頭再生候補", "安全課題", "自由メモ"],

  rules: {
    maxKnowledgeGapsPerBlock: 3,
    onlyFirstRoundCountsTowardProgress: true,
    unknownExposureNotForGraduation: true
  }
};
