// ====================================================
// 個案管理系統 - Google Apps Script
// 用途：讓 Next.js 網站可從 Google Sheet 同步個案資料
// ====================================================
// 使用說明：
// 1. 開啟 Google Sheet「個案資料管理」
// 2. 點選「擴充功能」→「Apps Script」
// 3. 貼上此程式碼，修改下方 SHEET_NAME
// 4. 部署 → 新增部署作業 → 網頁應用程式
//    執行身分：「我」，存取：「所有人」
// 5. 複製網址到系統設定
// 6.（選用）若要每季自動清除超過一年的電訪／家訪／轉介紀錄與已結案個案，
//    在編輯器上方函式下拉選單選取 createCleanupTrigger，按「執行」一次即可，
//    詳見下方「定期清除超過保存期限的舊資料」區塊
// ====================================================

const SHEET_NAME = '個案資料管理'; // ← 修改為您的工作表名稱

// ====================================================
// 定期清除舊資料設定
// ====================================================
// 以下分頁名稱須與「系統設定」頁面填寫的分頁名稱一致，否則清除不到對應的資料
const PHONE_VISIT_SHEET_NAME = '電訪紀錄';
const HOME_VISIT_SHEET_NAME = '家訪紀錄';
const REFERRAL_SHEET_NAME = '轉介紀錄';
const PROFESSIONAL_SERVICE_SHEET_NAME_FOR_CLEANUP = '專業服務追蹤紀錄';
const RETENTION_MONTHS = 12; // 保存期限（月）：電訪／家訪／轉介紀錄與已結案個案，超過此期限即視為可清除

// 欄位對應（支援各種中文欄位名稱）
const FIELD_MAP = {
  // 姓名
  '姓名': 'name', '個案姓名': 'name', '案主姓名': 'name', '姓　名': 'name',
  // 個案編號
  '個案編號': 'caseNumber', '編號': 'caseNumber', '案號': 'caseNumber', '個案號碼': 'caseNumber',
  // 性別
  '性別': 'gender',
  // 電話
  '電話': 'phone', '聯絡電話': 'phone', '手機': 'phone', '行動電話': 'phone',
  '電話號碼': 'phone', '個案電話': 'phone', '個案手機': 'phone', '聯絡手機': 'phone',
  // 地址
  '地址': 'address', '居住地址': 'address', '戶籍地址': 'address', '住址': 'address',
  '居住地': 'address', '通訊地址': 'address',
  // 生日
  '生日': 'birthDate', '出生日期': 'birthDate', '生日（西元）': 'birthDate',
  '出生年月日': 'birthDate', '生年月日': 'birthDate', '出生日': 'birthDate',
  // 身分證
  '身分證': 'idNumber', '身分證字號': 'idNumber', '證號': 'idNumber',
  '身份證': 'idNumber', '身份證字號': 'idNumber', '身分証字號': 'idNumber',
  // 狀態
  '狀態': 'status', '在案狀態': 'status', '個案狀態': 'status',
  '服務狀態': 'status', '案況': 'status',
  // 照顧等級
  '照顧等級': 'careLevel', '長照等級': 'careLevel', '失能等級': 'careLevel',
  'CMS等級': 'careLevel', 'cms等級': 'careLevel', '長照需要等級': 'careLevel',
  '核定等級': 'careLevel', '評估等級': 'careLevel',
  // 失能狀況／身障類別
  '失能狀況': 'disability', '失能': 'disability', '身心狀況': 'disability',
  '失能類別': 'disability', '障礙類別': 'disability', '身障類別': 'disability',
  // 身障期限
  '身障期限': 'disabilityExpiry',
  // 主要照顧者
  '主要照顧者': 'guardian', '照顧者': 'guardian', '家屬': 'guardian',
  '主照顧者': 'guardian', '主照者': 'guardian', '家屬姓名': 'guardian',
  '緊急聯絡人': 'guardian', '聯絡人': 'guardian',
  // 照顧者電話
  '照顧者電話': 'guardianPhone', '家屬電話': 'guardianPhone',
  '照顧者手機': 'guardianPhone', '家屬手機': 'guardianPhone',
  '主照者電話': 'guardianPhone', '緊急聯絡電話': 'guardianPhone',
  '聯絡人電話': 'guardianPhone',
  // 服務項目
  '服務項目': 'services', '使用服務': 'services', '服務': 'services',
  '長照服務': 'services', '服務內容': 'services', '核定服務': 'services',
  '使用服務項目': 'services', '服務類型': 'services', '服務類別': 'services',
  // 短中長期目標
  '短期目標': 'shortGoal', '短期照顧目標': 'shortGoal',
  '中期目標': 'midGoal', '中期照顧目標': 'midGoal',
  '長期目標': 'longGoal', '長期照顧目標': 'longGoal',
  // 身體狀況
  '身體狀況': 'physicalStatus', '身心狀況': 'physicalStatus', '個案身心狀況': 'physicalStatus',
  // 服務安排
  '服務安排': 'caseHomeServices', '四大包服務': 'caseHomeServices', '照顧服務安排': 'caseHomeServices',
  // 備註
  '備註': 'notes', '備註1': 'notes', '注意事項': 'notes', '備注': 'notes',
  '說明': 'notes', '特殊狀況': 'notes', '其他': 'notes',
  // 最近家訪日
  '最近家訪日': 'lastHomeVisitDate', '最近家訪日期': 'lastHomeVisitDate', '上次家訪日': 'lastHomeVisitDate',
  // 最新一筆電訪記錄
  '最新電訪日': 'lastPhoneVisitDate', '最近電訪日': 'lastPhoneVisitDate', '上次電訪日': 'lastPhoneVisitDate',
  '最新電訪記錄': 'lastPhoneVisitContent', '最新電訪內容': 'lastPhoneVisitContent', '最近電訪記錄': 'lastPhoneVisitContent',
  // 最新一筆家訪記錄
  '最新家訪記錄': 'lastHomeVisitContent', '最新家訪內容': 'lastHomeVisitContent', '最近家訪記錄': 'lastHomeVisitContent',
  // 負責社工
  '負責社工': 'responsibleWorker', '社工': 'responsibleWorker', '個管師': 'responsibleWorker',
};

const STATUS_MAP = {
  '在案': 'active', '服務中': 'active', 'active': 'active',
  '有效': 'active', '在案服務': 'active', '正常': 'active',
  '暫停': 'suspended', '暫停服務': 'suspended', 'suspended': 'suspended',
  '停案': 'suspended', '暫停案': 'suspended',
  '結案': 'closed', '已結案': 'closed', 'closed': 'closed',
  '離案': 'closed', '退案': 'closed',
};

const STATUS_REVERSE = { 'active': '在案', 'suspended': '暫停', 'closed': '結案' };

function doPost(e) {
  return doGet(e);
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'getCasesOnly';
  try {
    let result;
    if (action === 'getCasesOnly') {
      result = { cases: getCases() };
    } else if (action === 'createCase') {
      const fields = JSON.parse(e.parameter.fields || '{}');
      const created = createCaseRow(fields);
      result = { created: created, duplicate: !created };
    } else if (action === 'updateCase') {
      const caseName = e.parameter.caseName || '';
      const caseNumber = e.parameter.caseNumber || '';
      const fields = JSON.parse(e.parameter.fields || '{}');
      updateCaseFields(caseName, caseNumber, fields);
      result = { updated: true };
    } else if (action === 'updateStatus') {
      const caseName = e.parameter.caseName || '';
      const caseNumber = e.parameter.caseNumber || '';
      const status = e.parameter.status || '';
      updateCaseStatus(caseName, caseNumber, status);
      result = { updated: true };
    } else if (action === 'deleteCase') {
      const caseName = e.parameter.caseName || '';
      const caseNumber = e.parameter.caseNumber || '';
      const professionalServiceSheetName = e.parameter.professionalServiceSheetName || '';
      deleteCaseRow(caseName, caseNumber);
      // 家訪紀錄／電訪紀錄／轉介紀錄留存供日後查核與衛生局報表回溯，僅一併清除
      // 專業服務追蹤紀錄與家訪草稿（皆屬個案刪除後即無意義的暫時性/追蹤性資料）
      if (professionalServiceSheetName) {
        deleteProfessionalServiceRowsForCase(professionalServiceSheetName, caseName, caseNumber);
      }
      deleteDraftsForCase(caseNumber);
      result = { deleted: true };
    } else if (action === 'appendVisit') {
      const sheetName = e.parameter.sheetName || '';
      const record = JSON.parse(e.parameter.record || '{}');
      appendVisitRow(sheetName, record);
      result = { appended: true };
    } else if (action === 'getPhoneVisits') {
      const sheetName = e.parameter.sheetName || '';
      result = { rows: getPhoneVisitRows(sheetName) };
    } else if (action === 'getHomeVisits') {
      const sheetName = e.parameter.sheetName || '';
      result = { visits: getHomeVisitRows(sheetName) };
    } else if (action === 'getReferrals') {
      const sheetName = e.parameter.sheetName || '';
      result = { referrals: getReferralRows(sheetName) };
    } else if (action === 'updateReferralTracking') {
      const sheetName = e.parameter.sheetName || '';
      const id = e.parameter.id || '';
      const fields = JSON.parse(e.parameter.fields || '{}');
      updateReferralTrackingRow(sheetName, id, fields);
      result = { updated: true };
    } else if (action === 'getProfessionalServices') {
      const sheetName = e.parameter.sheetName || '';
      result = { professionalServices: getProfessionalServiceRows(sheetName) };
    } else if (action === 'updateProfessionalService') {
      const sheetName = e.parameter.sheetName || '';
      const id = e.parameter.id || '';
      const fields = JSON.parse(e.parameter.fields || '{}');
      updateProfessionalServiceRow(sheetName, id, fields);
      result = { updated: true };
    } else if (action === 'getDrafts') {
      const caseNumber = e.parameter.caseNumber || '';
      result = { drafts: getDrafts(caseNumber) };
    } else if (action === 'saveDraft') {
      const record = JSON.parse(e.parameter.record || '{}');
      saveDraft(record);
      result = { saved: true };
    } else if (action === 'deleteDraft') {
      const caseNumber = e.parameter.caseNumber || '';
      const ts = e.parameter.ts || '';
      deleteDraft(caseNumber, ts);
      result = { deleted: true };
    } else if (action === 'getSentences') {
      const sheetName = e.parameter.sheetName || '';
      result = { sentences: getSentenceRows(sheetName) };
    } else if (action === 'addSentence') {
      const sheetName = e.parameter.sheetName || '';
      const sentence = JSON.parse(e.parameter.sentence || '{}');
      addSentenceRow(sheetName, sentence);
      result = { added: true };
    } else if (action === 'updateSentence') {
      const sheetName = e.parameter.sheetName || '';
      const id = e.parameter.id || '';
      const fields = JSON.parse(e.parameter.fields || '{}');
      updateSentenceRow(sheetName, id, fields);
      result = { updated: true };
    } else if (action === 'deleteSentence') {
      const sheetName = e.parameter.sheetName || '';
      const id = e.parameter.id || '';
      deleteSentenceRow(sheetName, id);
      result = { deleted: true };
    } else if (action === 'setSentences') {
      const sheetName = e.parameter.sheetName || '';
      const sentences = JSON.parse(e.parameter.sentences || '[]');
      setSentenceRows(sheetName, sentences);
      result = { set: true };
    } else if (action === 'cleanupOldRecords') {
      // 手動立即執行一次定期清除（供測試保存期限設定是否正確用，不受排程限制），
      // 詳見下方「定期清除超過保存期限的舊資料」區塊
      result = cleanupOldRecords();
    } else {
      throw new Error('Unknown action: ' + action);
    }
    return output({ ok: true, data: result });
  } catch (err) {
    return output({ ok: false, error: err.message });
  }
}

function getCases() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0].map(function(h) { return String(h).trim(); });
  const rows = data.slice(1);
  const nameColIdx = headers.findIndex(function(h) { return FIELD_MAP[h] === 'name'; });
  const numColIdx = headers.findIndex(function(h) { return FIELD_MAP[h] === 'caseNumber'; });

  return rows
    .map(function(row) {
      const rowName = nameColIdx >= 0 ? String(row[nameColIdx] || '').trim() : '';
      const rowNum = numColIdx >= 0 ? String(row[numColIdx] || '').trim() : '';
      return { row: row, rowName: rowName, rowNum: rowNum };
    })
    .filter(function(r) { return r.rowName || r.rowNum; })
    .map(function(r) {
      const obj = { id: r.rowNum || r.rowName, status: 'active', services: [] };
      headers.forEach(function(h, i) {
        const field = FIELD_MAP[h];
        if (!field) return;
        const raw = r.row[i] !== null && r.row[i] !== undefined ? r.row[i] : '';
        const DATE_FIELDS = ['birthDate', 'disabilityExpiry', 'lastHomeVisitDate', 'lastPhoneVisitDate'];
        const val = (raw instanceof Date && DATE_FIELDS.indexOf(field) >= 0)
          ? toLocalDateStr(raw)
          : String(raw).trim();
        if (field === 'status') {
          obj.status = STATUS_MAP[val] || 'active';
        } else if (field === 'services') {
          obj.services = val ? val.split(/[,、，；;]/).map(function(s) { return s.trim(); }).filter(Boolean) : [];
        } else if (field === 'caseHomeServices') {
          try { obj.caseHomeServices = val ? JSON.parse(val) : []; } catch(e) { obj.caseHomeServices = []; }
        } else {
          obj[field] = val;
        }
      });
      return obj;
    });
}

// 依姓名＋個案編號找到對應列號（1-indexed sheet row）
function findRow(caseName, caseNumber) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(function(h) { return String(h).trim(); });

  const nameColIdx = headers.findIndex(function(h) { return FIELD_MAP[h] === 'name'; });
  const numColIdx = headers.findIndex(function(h) { return FIELD_MAP[h] === 'caseNumber'; });

  for (var i = 1; i < data.length; i++) {
    var rowName = nameColIdx >= 0 ? String(data[i][nameColIdx] || '').trim() : String(data[i][0] || '').trim();
    var rowNum = numColIdx >= 0 ? String(data[i][numColIdx] || '').trim() : '';
    if (rowName === caseName && (!caseNumber || rowNum === caseNumber)) {
      return i + 1; // 1-indexed sheet row
    }
  }
  return -1;
}

function updateCaseStatus(caseName, caseNumber, status) {
  var rowIndex = findRow(caseName, caseNumber);
  if (rowIndex < 0) throw new Error('找不到個案：' + caseName);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colIdx = headers.findIndex(function(h) {
    return ['狀態', '在案狀態', '個案狀態', '服務狀態', '案況'].indexOf(String(h).trim()) >= 0;
  });
  if (colIdx < 0) throw new Error('找不到狀態欄位，請確認試算表有「狀態」欄');

  sheet.getRange(rowIndex, colIdx + 1).setValue(STATUS_REVERSE[status] || status);
}

// 將欄位值依工作表標題列轉換成一列陣列（共用於新增與更新）
function fieldsToRow(headers, fields) {
  return headers.map(function(h) {
    const field = FIELD_MAP[h];
    if (!field) return '';
    if (field === 'status') return STATUS_REVERSE[fields.status] || fields.status || '在案';
    if (field === 'services') return (fields.services || []).join('、');
    if (field === 'caseHomeServices') return fields.caseHomeServices ? JSON.stringify(fields.caseHomeServices) : '';
    return fields[field] !== undefined && fields[field] !== null ? fields[field] : '';
  });
}

// 案號＋個案姓名只會有一種搭配，用來判斷是否為重複個案：
// 案號相同（不論姓名是否打字有落差）或姓名相同（無案號時）都視為同一位個案
function findDuplicateRow(caseName, caseNumber) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return -1;
  const headers = data[0].map(function(h) { return String(h).trim(); });

  const nameColIdx = headers.findIndex(function(h) { return FIELD_MAP[h] === 'name'; });
  const numColIdx = headers.findIndex(function(h) { return FIELD_MAP[h] === 'caseNumber'; });

  const name = String(caseName || '').trim();
  const num = String(caseNumber || '').trim();
  if (!name && !num) return -1;

  for (var i = 1; i < data.length; i++) {
    var rowName = nameColIdx >= 0 ? String(data[i][nameColIdx] || '').trim() : '';
    var rowNum = numColIdx >= 0 ? String(data[i][numColIdx] || '').trim() : '';
    if (!rowName && !rowNum) continue;
    if (num && rowNum && rowNum === num) return i + 1;
    if (name && rowName === name && (!num || !rowNum)) return i + 1;
  }
  return -1;
}

// 新增個案列前先檢查是否已存在相同案號／姓名的個案，避免斷線重試或重複點擊
// 造成同一個案被上傳兩次；回傳 true 表示已實際新增，false 表示偵測到重複而略過
function createCaseRow(fields) {
  if (findDuplicateRow(fields.name, fields.caseNumber) > 0) {
    return false;
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) { return String(h).trim(); });
  sheet.appendRow(fieldsToRow(headers, fields));
  return true;
}

function updateCaseFields(caseName, caseNumber, fields) {
  var rowIndex = findRow(caseName, caseNumber);
  if (rowIndex < 0) throw new Error('找不到個案：' + caseName);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) { return String(h).trim(); });

  headers.forEach(function(h, i) {
    const field = FIELD_MAP[h];
    if (!field || fields[field] === undefined) return;
    const value = field === 'status' ? (STATUS_REVERSE[fields.status] || fields.status)
      : field === 'services' ? (fields.services || []).join('、')
      : fields[field];
    sheet.getRange(rowIndex, i + 1).setValue(value);
  });
}

function deleteCaseRow(caseName, caseNumber) {
  var rowIndex = findRow(caseName, caseNumber);
  if (rowIndex < 0) throw new Error('找不到個案：' + caseName);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  sheet.deleteRow(rowIndex);
}

// 刪除個案時，一併清除該個案在「專業服務追蹤紀錄」分頁的所有列（欄位順序見 PROFESSIONAL_SERVICE_HEADERS：
// A=個案姓名、B=個案編號）；由下往上刪除以避免刪列後索引跑掉漏刪
function deleteProfessionalServiceRowsForCase(sheetName, caseName, caseNumber) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  const name = String(caseName || '').trim();
  const num = String(caseNumber || '').trim();
  if (!name && !num) return;
  for (var i = data.length - 1; i >= 1; i--) {
    var rowName = String(data[i][0] || '').trim();
    var rowNum = String(data[i][1] || '').trim();
    var match = num ? (rowNum === num) : (rowName === name);
    if (match) sheet.deleteRow(i + 1);
  }
}

// ====================================================
// 電訪／家訪紀錄（每一筆寫入獨立工作表，依設定頁的分頁名稱建立）
// ====================================================

// 與衛生局範例格式完全一致的 25 欄（A~Y），最後加「個案姓名」一欄供人工辨識，
// 換電腦時即使本機資料遺失，也能直接用這個分頁的 A:Y 重建衛生局報表。
const PHONE_VISIT_HEADERS = [
  '身分證字號',
  '服務日期\n(請輸入7碼)',
  '服務項目-電訪',
  '服務項目-家訪',
  '服務項目-調整照顧計畫【不涉及額度變更】',
  '服務項目-接受長照需要者及其家屬有關長照服務諮詢、申訴與處理',
  '服務項目-照會或連結至服務提供單位',
  '服務項目-其他(執行服務計畫、專業服務新增、延案或結案、更換社區整合型服務中心、其他等)',
  '服務項目-其他服務項目說明',
  '服務重點-追蹤長照需要者與各項服務之連結情形',
  '服務重點-計畫與內容異動討論',
  '服務重點-協助長照需要者或其家屬其他資源連結',
  '服務重點-接受長照需要者及其家屬有關長照服務諮詢、申訴與處理',
  '服務重點-接受申訴',
  '服務重點-其他',
  '服務重點-其他備註',
  '服務對象-服務使用者',
  '服務對象-家庭照顧者',
  '主責個管員身分證',
  '提醒照專',
  '提醒自己何時再查看日期\n(請輸入7碼)',
  '追蹤服務適應與介入情形',
  '各項服務目標及整體計畫目標達成情形',
  '整體計畫的適切性及需求異動',
  '其他處理事項',
  '個案姓名',
];

const HOME_VISIT_HEADERS = [
  '個案姓名', '個案編號', '身分證字號', '家訪日期',
  '家訪對象', '個案病史', '個案摘述', '主要照顧者資訊',
  '問題清單', '問題說明',
  '短期目標', '中期目標', '長期目標',
  '照顧及專業服務JSON', '交通接送', '就醫機構', '輔具', '喘息服務', '轉介說明',
  '家訪計劃內容', '建立時間',
];

const REFERRAL_HEADERS = [
  '個案姓名', '個案編號', '身分證字號', '轉介日期',
  '轉介類型', '轉介類型其他說明', '收案單位',
  '聯絡電話對象', '聯絡電話', '主要聯絡人關係', '個案概況', '轉介需求',
  '個管姓名', '追蹤狀態', '追蹤備註', '回覆日期', '建立時間', '本機ID',
];

const REFERRAL_TRACKING_LABEL = { pending: '待回覆', accepted: '已提供服務', declined: '無法提供服務' };
const REFERRAL_TRACKING_REVERSE = { '待回覆': 'pending', '已提供服務': 'accepted', '無法提供服務': 'declined' };

const PROFESSIONAL_SERVICE_HEADERS = [
  '個案姓名', '個案編號', '身分證字號', '服務項目', '服務目標',
  '期程起', '期程迄', '規劃次數', '已完成次數', '狀態', '備註', '建立時間', '本機ID',
];

const PROFESSIONAL_SERVICE_STATUS_LABEL = { active: '進行中', completed: '已完成', stopped: '已中止' };
const PROFESSIONAL_SERVICE_STATUS_REVERSE = { '進行中': 'active', '已完成': 'completed', '已中止': 'stopped' };

function getOrCreateVisitSheet(sheetName, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
  }
  return sheet;
}

function toLocalDateStr(d) {
  if (!(d instanceof Date)) return String(d || '').trim();
  var year = d.getFullYear();
  var month = ('0' + (d.getMonth() + 1)).slice(-2);
  var day = ('0' + d.getDate()).slice(-2);
  return year + '-' + month + '-' + day;
}

function toRocDate(raw) {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '';
  const roc = d.getFullYear() - 1911;
  const mm = ('0' + (d.getMonth() + 1)).slice(-2);
  const dd = ('0' + d.getDate()).slice(-2);
  return '' + roc + mm + dd;
}

function appendVisitRow(sheetName, record) {
  if (record.kind === 'home') {
    const sheet = getOrCreateVisitSheet(sheetName, HOME_VISIT_HEADERS);
    // 防重：(個案編號 或 個案姓名) + 家訪日期 相同則跳過
    const data = sheet.getDataRange().getValues();
    const recNum = String(record.caseNumber || '').trim();
    const recName = String(record.caseName || '').trim();
    const recDate = String(record.date || '').trim();
    for (var i = 1; i < data.length; i++) {
      var sheetNum = String(data[i][1] || '').trim();
      var sheetName = String(data[i][0] || '').trim();
      var sheetDate = toLocalDateStr(data[i][3]);
      var caseMatch = recNum ? (sheetNum === recNum) : (sheetName === recName);
      if (caseMatch && sheetDate === recDate) {
        return; // 已存在，不重複寫入
      }
    }
    const sd = record.serviceDetail || {};
    const goals = record.serviceGoals || {};
    sheet.appendRow([
      record.caseName || '', record.caseNumber || '', record.idNumber || '', record.date || '',
      record.visitTarget || '', record.diseaseHistory || '', record.caseSummary || '', record.caregiverInfo || '',
      JSON.stringify(record.problemList || []), record.problemExplanations || '',
      goals.short || '', goals.mid || '', goals.long || '',
      JSON.stringify(sd.services || []), sd.transportation || '', sd.transportHospital || '',
      sd.aidsDetail || '', sd.respiteDetail || '', sd.referral || '',
      record.planContent || '', new Date(),
    ]);
    return;
  }

  if (record.kind === 'referral') {
    const sheet = getOrCreateVisitSheet(sheetName, REFERRAL_HEADERS);
    sheet.appendRow([
      record.caseName || '', record.caseNumber || '', record.idNumber || '', record.date || '',
      (record.referralTypes || []).join('、'), record.referralTypeOtherNote || '', record.receivingUnit || '',
      record.contactPersonType === 'guardian' ? '主要聯絡人' : '本人', record.contactPhone || '', record.relationship || '',
      record.caseOverview || '', record.referralNeeds || '',
      record.managerName || '', REFERRAL_TRACKING_LABEL[record.trackingStatus] || REFERRAL_TRACKING_LABEL.pending,
      record.trackingNote || '', record.trackingDate || '', new Date(), record.id || '',
    ]);
    return;
  }

  if (record.kind === 'professionalService') {
    const sheet = getOrCreateVisitSheet(sheetName, PROFESSIONAL_SERVICE_HEADERS);
    sheet.appendRow([
      record.caseName || '', record.caseNumber || '', record.idNumber || '',
      record.serviceName || '', record.goal || '',
      record.startDate || '', record.endDate || '',
      record.plannedSessions || 0, record.completedSessions || 0,
      PROFESSIONAL_SERVICE_STATUS_LABEL[record.status] || PROFESSIONAL_SERVICE_STATUS_LABEL.active,
      record.notes || '', new Date(), record.id || '',
    ]);
    return;
  }

  const hb = record.healthBureau || {};
  const items = hb.serviceItems || {};
  const focus = hb.serviceFocus || {};
  const target = hb.serviceTarget || {};
  const sheet = getOrCreateVisitSheet(sheetName, PHONE_VISIT_HEADERS);
  const rowValues = [
    record.idNumber || '',
    toRocDate(record.date),
    'V', '',
    items.adjustPlan ? 'V' : '', items.consultComplaint ? 'V' : '',
    items.referral ? 'V' : '', items.other ? 'V' : '', items.otherNote || '',
    focus.trackLinkage ? 'V' : '', focus.planDiscussion ? 'V' : '',
    focus.resourceLink ? 'V' : '', focus.consultComplaint ? 'V' : '',
    focus.acceptComplaint ? 'V' : '', focus.other ? 'V' : '', focus.otherNote || '',
    target.user ? 'V' : '', target.caregiver ? 'V' : '',
    record.managerIdNumber || '',
    '', '',
    hb.trackingAdaptation || '', hb.goalAchievement || '', hb.planAppropriateness || '', hb.otherHandling || '無',
    record.caseName || '',
  ];

  // 衛生局一個月只接受一筆紀錄：同一身分證字號、同一服務月份（ROC 年+月）已有列時直接覆蓋該列，
  // 而不是新增一列，讓個管師可以分次補記錄，最後匯出時每個個案每月仍只有一列。
  const recIdNumber = String(record.idNumber || '').trim();
  const recYearMonth = rocYearMonth(rowValues[1]);
  if (recIdNumber && recYearMonth) {
    const data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var sheetIdNumber = String(data[i][0] || '').trim();
      var sheetYearMonth = rocYearMonth(String(data[i][1] || '').trim());
      if (sheetIdNumber === recIdNumber && sheetYearMonth === recYearMonth) {
        sheet.getRange(i + 1, 1, 1, rowValues.length).setValues([rowValues]);
        return;
      }
    }
  }
  sheet.appendRow(rowValues);
}

// 把 7 碼民國日期（如 "1150703"）取出「年+月」部分（如 "1150 7"→"1150" + "07"），用來判斷是否同月
function rocYearMonth(rocDate) {
  var s = String(rocDate || '').trim();
  if (s.length < 5) return '';
  return s.slice(0, s.length - 4) + s.slice(-4, -2);
}

// 讀回家訪紀錄，重建為 HomeVisitRecord 物件陣列
function getHomeVisitRows(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  return data.slice(1).map(function(row) {
    var problemList = [];
    try { problemList = JSON.parse(String(row[8] || '[]')); } catch(e) {}
    var services = [];
    try { services = JSON.parse(String(row[13] || '[]')); } catch(e) {}
    return {
      id: String(row[1] || '') + '|' + String(row[3] || ''),
      caseId: String(row[1] || ''),
      caseName: String(row[0] || ''),
      date: toLocalDateStr(row[3]),
      visitTarget: String(row[4] || ''),
      diseaseHistory: String(row[5] || ''),
      caseSummary: String(row[6] || ''),
      caregiverInfo: String(row[7] || ''),
      problemList: problemList,
      problemExplanations: String(row[9] || ''),
      serviceGoals: { short: String(row[10] || ''), mid: String(row[11] || ''), long: String(row[12] || '') },
      serviceDetail: {
        services: services,
        transportEnabled: !!String(row[14] || ''),
        transportation: String(row[14] || ''),
        transportHospital: String(row[15] || ''),
        transportExpectedTime: '',
        aidsDetail: String(row[16] || ''),
        aidsExpectedTime: '',
        respiteEnabled: !!String(row[17] || ''),
        respiteDetail: String(row[17] || ''),
        respiteExpectedTime: '',
        referral: String(row[18] || ''),
      },
      planContent: String(row[19] || ''),
      createdAt: row[20] instanceof Date ? row[20].toISOString() : String(row[20] || ''),
    };
  });
}

// 把「服務日期」欄位（7碼民國日期）正規化：使用者手動編輯後 Google Sheets 常會把它
// 自動存成日期型別或去掉開頭的 0，這裡一律轉回固定 7 碼字串，避免報表比對日期時抓不到該筆紀錄
function normalizeRocDateCell(cell) {
  if (cell instanceof Date) return toRocDate(cell);
  const s = String(cell || '').trim();
  if (/^\d+$/.test(s) && s.length > 0 && s.length < 7) {
    return ('0000000' + s).slice(-7);
  }
  return s;
}

// 讀回電訪紀錄分頁（已是衛生局報表 25 欄格式 + 個案姓名），供換電腦時重建報表用
function getPhoneVisitRows(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  return data.slice(1).map(function(row) {
    return row.map(function(cell, i) {
      if (i === 1) return normalizeRocDateCell(cell);
      return cell instanceof Date ? '' : String(cell || '');
    });
  });
}

// 讀回轉介紀錄，重建為物件陣列，供跨裝置查看轉介及追蹤狀態使用
function getReferralRows(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  return data.slice(1).map(function(row) {
    return {
      id: String(row[17] || ''),
      caseName: String(row[0] || ''),
      caseId: String(row[1] || ''),
      idNumber: String(row[2] || ''),
      date: toLocalDateStr(row[3]),
      referralTypes: String(row[4] || '').split('、').filter(Boolean),
      referralTypeOtherNote: String(row[5] || ''),
      receivingUnit: String(row[6] || ''),
      contactPersonType: String(row[7] || '') === '主要聯絡人' ? 'guardian' : 'self',
      relationship: String(row[9] || ''),
      caseOverview: String(row[10] || ''),
      referralNeeds: String(row[11] || ''),
      managerName: String(row[12] || ''),
      trackingStatus: REFERRAL_TRACKING_REVERSE[String(row[13] || '')] || 'pending',
      trackingNote: String(row[14] || ''),
      trackingDate: String(row[15] || ''),
      createdAt: row[16] instanceof Date ? row[16].toISOString() : String(row[16] || ''),
    };
  });
}

// 依本機 ID 找到轉介列，更新追蹤（回覆單）欄位
function updateReferralTrackingRow(sheetName, id, fields) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('找不到轉介紀錄分頁：' + sheetName);
  const data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][17] || '') === id) {
      if (fields.trackingStatus !== undefined) {
        sheet.getRange(i + 1, 14).setValue(REFERRAL_TRACKING_LABEL[fields.trackingStatus] || REFERRAL_TRACKING_LABEL.pending);
      }
      if (fields.trackingNote !== undefined) sheet.getRange(i + 1, 15).setValue(fields.trackingNote);
      if (fields.trackingDate !== undefined) sheet.getRange(i + 1, 16).setValue(fields.trackingDate);
      return;
    }
  }
  throw new Error('找不到對應的轉介紀錄');
}

// 讀回專業服務追蹤紀錄，重建為物件陣列，供跨裝置查看追蹤進度使用
function getProfessionalServiceRows(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  return data.slice(1)
    .filter(function(row) { return String(row[12] || '').trim(); })
    .map(function(row) {
      return {
        id: String(row[12] || ''),
        caseId: String(row[1] || ''),
        caseName: String(row[0] || ''),
        serviceName: String(row[3] || ''),
        goal: String(row[4] || ''),
        startDate: toLocalDateStr(row[5]),
        endDate: toLocalDateStr(row[6]),
        plannedSessions: Number(row[7]) || 0,
        completedSessions: Number(row[8]) || 0,
        status: PROFESSIONAL_SERVICE_STATUS_REVERSE[String(row[9] || '')] || 'active',
        notes: String(row[10] || ''),
        createdAt: row[11] instanceof Date ? row[11].toISOString() : String(row[11] || ''),
      };
    });
}

// 依本機 ID 找到專業服務追蹤列，更新完成次數／狀態／備註
function updateProfessionalServiceRow(sheetName, id, fields) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('找不到專業服務追蹤紀錄分頁：' + sheetName);
  const data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][12] || '') === id) {
      if (fields.completedSessions !== undefined) sheet.getRange(i + 1, 9).setValue(fields.completedSessions);
      if (fields.status !== undefined) {
        sheet.getRange(i + 1, 10).setValue(PROFESSIONAL_SERVICE_STATUS_LABEL[fields.status] || PROFESSIONAL_SERVICE_STATUS_LABEL.active);
      }
      if (fields.notes !== undefined) sheet.getRange(i + 1, 11).setValue(fields.notes);
      return;
    }
  }
  throw new Error('找不到對應的專業服務追蹤紀錄');
}

// ====================================================
// 電訪句型庫（讓所有個管師共用同一份句型，供電訪產生器抽句使用）
// ====================================================

const SENTENCE_HEADERS = ['id', '分類', '服務項目', '句型內容'];

function getOrCreateSentenceSheet(sheetName) {
  return getOrCreateVisitSheet(sheetName, SENTENCE_HEADERS);
}

function getSentenceRows(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  return data.slice(1)
    .filter(function(row) { return String(row[0] || '').trim(); })
    .map(function(row) {
      const obj = { id: String(row[0] || ''), category: String(row[1] || ''), text: String(row[3] || '') };
      const serviceType = String(row[2] || '').trim();
      if (serviceType) obj.serviceType = serviceType;
      return obj;
    });
}

// 依 id（第一欄）找列號，找不到回傳 -1
function findSentenceRow(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0] || '') === id) return i + 1;
  }
  return -1;
}

// 新增前先檢查 id 是否已存在，避免斷線重試造成同一句型被重複寫入
function addSentenceRow(sheetName, sentence) {
  const sheet = getOrCreateSentenceSheet(sheetName);
  if (findSentenceRow(sheet, sentence.id) > 0) return;
  sheet.appendRow([sentence.id || '', sentence.category || '', sentence.serviceType || '', sentence.text || '']);
}

function updateSentenceRow(sheetName, id, fields) {
  const sheet = getOrCreateSentenceSheet(sheetName);
  const rowIndex = findSentenceRow(sheet, id);
  if (rowIndex < 0) throw new Error('找不到句型：' + id);
  if (fields.category !== undefined) sheet.getRange(rowIndex, 2).setValue(fields.category);
  if (fields.serviceType !== undefined) sheet.getRange(rowIndex, 3).setValue(fields.serviceType || '');
  if (fields.text !== undefined) sheet.getRange(rowIndex, 4).setValue(fields.text);
}

function deleteSentenceRow(sheetName, id) {
  const sheet = getOrCreateSentenceSheet(sheetName);
  const rowIndex = findSentenceRow(sheet, id);
  if (rowIndex < 0) return;
  sheet.deleteRow(rowIndex);
}

// 整批覆蓋雲端句型庫，供「上傳本機句型庫到雲端」這類一次性動作使用
function setSentenceRows(sheetName, sentences) {
  const sheet = getOrCreateSentenceSheet(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, SENTENCE_HEADERS.length).clearContent();
  const rows = (sentences || []).map(function(s) { return [s.id || '', s.category || '', s.serviceType || '', s.text || '']; });
  if (rows.length > 0) sheet.getRange(2, 1, rows.length, SENTENCE_HEADERS.length).setValues(rows);
}

// ====================================================
// 家訪草稿（暫存於獨立工作表，不影響個案資料表）
// ====================================================

const DRAFTS_SHEET_NAME = '家訪草稿';
const DRAFT_HEADERS = ['caseNumber', 'ts', 'label', 'data'];

function getOrCreateDraftSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(DRAFTS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(DRAFTS_SHEET_NAME);
    sheet.appendRow(DRAFT_HEADERS);
  }
  return sheet;
}

function getDrafts(caseNumber) {
  const sheet = getOrCreateDraftSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  return data.slice(1)
    .filter(function(row) { return String(row[0] || '').trim() === caseNumber; })
    .map(function(row) {
      return { caseNumber: String(row[0] || ''), ts: String(row[1] || ''), label: String(row[2] || ''), data: String(row[3] || '') };
    });
}

function saveDraft(record) {
  const sheet = getOrCreateDraftSheet();
  sheet.appendRow([record.caseNumber || '', record.ts || '', record.label || '', record.data || '']);
}

function deleteDraft(caseNumber, ts) {
  const sheet = getOrCreateDraftSheet();
  const data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0] || '').trim() === caseNumber && String(data[i][1] || '') === ts) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}

// 刪除個案時，一併清除該個案在「家訪草稿」分頁的所有草稿列（草稿僅以個案編號辨識個案，
// 沒有案號的個案無法安全比對，略過不刪）；由下往上刪除以避免刪列後索引跑掉漏刪
function deleteDraftsForCase(caseNumber) {
  const num = String(caseNumber || '').trim();
  if (!num) return;
  const sheet = getOrCreateDraftSheet();
  const data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0] || '').trim() === num) sheet.deleteRow(i + 1);
  }
}

// ====================================================
// 定期清除超過保存期限的舊資料
// ====================================================
// 這些長照服務紀錄會另外上傳至衛生局留存，本機 Sheet 不需長期保留，
// 依使用者需求：電訪／家訪／轉介紀錄與已結案個案，超過 RETENTION_MONTHS
// （預設 12 個月）即自動清除；此操作無法復原，請確認資料已完成上傳／備份。

// 手動或排程呼叫皆可：立即依保存期限清除一次，回傳各分頁刪除筆數方便確認結果
function cleanupOldRecords() {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - RETENTION_MONTHS);

  const result = {
    cutoff: toLocalDateStr(cutoff),
    phoneVisitsDeleted: cleanupSheetByDate(PHONE_VISIT_SHEET_NAME, 1, cutoff, true),
    homeVisitsDeleted: cleanupSheetByDate(HOME_VISIT_SHEET_NAME, 3, cutoff, false),
    referralsDeleted: cleanupSheetByDate(REFERRAL_SHEET_NAME, 3, cutoff, false),
    closedCasesDeleted: cleanupClosedCases(cutoff),
  };
  Logger.log(JSON.stringify(result));
  return result;
}

// 依指定日期欄位清除某分頁中過期的列；isRocDate 為 true 時該欄位為 7 碼民國日期
// （電訪紀錄採衛生局報表格式），否則視為一般西元日期／Date 物件
function cleanupSheetByDate(sheetName, dateColIdx, cutoff, isRocDate) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return 0;
  const data = sheet.getDataRange().getValues();
  let deleted = 0;
  for (var i = data.length - 1; i >= 1; i--) {
    var d = isRocDate ? parseRocDateCell(data[i][dateColIdx]) : parseDateCell(data[i][dateColIdx]);
    if (d && d < cutoff) {
      sheet.deleteRow(i + 1);
      deleted++;
    }
  }
  return deleted;
}

// 清除已結案且最後活動（家訪／電訪較晚者）已超過保存期限的個案，
// 並比照手動刪除個案的行為，一併清除其專業服務追蹤紀錄與家訪草稿；
// 找不到任何家訪／電訪日期可判斷活動時間的結案個案，無法安全判斷是否過期，略過不刪
function cleanupClosedCases(cutoff) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return 0;
  const headers = data[0].map(function(h) { return String(h).trim(); });

  const nameColIdx = headers.findIndex(function(h) { return FIELD_MAP[h] === 'name'; });
  const numColIdx = headers.findIndex(function(h) { return FIELD_MAP[h] === 'caseNumber'; });
  const statusColIdx = headers.findIndex(function(h) {
    return ['狀態', '在案狀態', '個案狀態', '服務狀態', '案況'].indexOf(h) >= 0;
  });
  const lastHomeColIdx = headers.findIndex(function(h) { return FIELD_MAP[h] === 'lastHomeVisitDate'; });
  const lastPhoneColIdx = headers.findIndex(function(h) { return FIELD_MAP[h] === 'lastPhoneVisitDate'; });
  if (statusColIdx < 0) return 0;

  let deleted = 0;
  for (var i = data.length - 1; i >= 1; i--) {
    var status = String(data[i][statusColIdx] || '').trim();
    if (STATUS_MAP[status] !== 'closed') continue;

    var lastHome = lastHomeColIdx >= 0 ? parseDateCell(data[i][lastHomeColIdx]) : null;
    var lastPhone = lastPhoneColIdx >= 0 ? parseDateCell(data[i][lastPhoneColIdx]) : null;
    var lastActivity = (lastHome && lastPhone) ? (lastHome > lastPhone ? lastHome : lastPhone) : (lastHome || lastPhone);
    if (!lastActivity || lastActivity >= cutoff) continue;

    var caseName = nameColIdx >= 0 ? String(data[i][nameColIdx] || '').trim() : '';
    var caseNumber = numColIdx >= 0 ? String(data[i][numColIdx] || '').trim() : '';
    sheet.deleteRow(i + 1);
    deleteProfessionalServiceRowsForCase(PROFESSIONAL_SERVICE_SHEET_NAME_FOR_CLEANUP, caseName, caseNumber);
    deleteDraftsForCase(caseNumber);
    deleted++;
  }
  return deleted;
}

function parseDateCell(cell) {
  if (cell instanceof Date) return cell;
  var s = String(cell || '').trim();
  if (!s) return null;
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function parseRocDateCell(cell) {
  var s = normalizeRocDateCell(cell);
  if (!/^\d{7}$/.test(s)) return null;
  var year = parseInt(s.slice(0, 3), 10) + 1911;
  var month = parseInt(s.slice(3, 5), 10);
  var day = parseInt(s.slice(5, 7), 10);
  var d = new Date(year, month - 1, day);
  return isNaN(d.getTime()) ? null : d;
}

// ── 排程設定：Apps Script 原生時間觸發器沒有「每 3 個月」的選項，
// 改用每月 1 號觸發一次，僅在每季第一個月（1、4、7、10 月）實際執行清除，其餘月份略過。
// 使用方式：在 Apps Script 編輯器選取 createCleanupTrigger 函式並執行「一次」以建立排程，
// 之後就會依上述週期自動執行，不需要再手動操作。

// 建立／重建每月 1 號的排程觸發器（重複執行本函式不會建立重複的觸發器）
function createCleanupTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'cleanupOldRecordsScheduled') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('cleanupOldRecordsScheduled')
    .timeBased()
    .onMonthDay(1)
    .atHour(3)
    .create();
}

// 排程觸發器實際呼叫的函式：非每季第一個月時直接略過，不執行清除
function cleanupOldRecordsScheduled() {
  const quarterStartMonths = [1, 4, 7, 10];
  const month = new Date().getMonth() + 1;
  if (quarterStartMonths.indexOf(month) === -1) return;
  cleanupOldRecords();
}

function output(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
