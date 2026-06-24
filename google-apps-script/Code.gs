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
// ====================================================

const SHEET_NAME = '個案資料管理'; // ← 修改為您的工作表名稱

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
      createCaseRow(fields);
      result = { created: true };
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
      deleteCaseRow(caseName, caseNumber);
      result = { deleted: true };
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
        const val = String(r.row[i] !== null && r.row[i] !== undefined ? r.row[i] : '').trim();
        if (field === 'status') {
          obj.status = STATUS_MAP[val] || 'active';
        } else if (field === 'services') {
          obj.services = val ? val.split(/[,、，；;]/).map(function(s) { return s.trim(); }).filter(Boolean) : [];
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
    return fields[field] !== undefined && fields[field] !== null ? fields[field] : '';
  });
}

function createCaseRow(fields) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) { return String(h).trim(); });
  sheet.appendRow(fieldsToRow(headers, fields));
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

function output(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
