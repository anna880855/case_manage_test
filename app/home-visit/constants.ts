// Disease list with sub-options
export const DISEASE_LIST = [
  { key: 'hypertension', label: '高血壓' },
  { key: 'diabetes', label: '糖尿病', extra: ['口服', '胰島素注射'] },
  { key: 'hyperlipidemia', label: '高血脂' },
  { key: 'heartDisease', label: '心臟病', extra: ['心衰竭', '心梗塞', '心臟支架', '其他'] },
  { key: 'kidneyDisease', label: '腎臟疾病', extra: ['藥物治療', '洗腎'] },
  { key: 'respiratory', label: '呼吸疾病', extra: ['慢性阻塞性肺部疾病', '氣喘', '其他'] },
  { key: 'gastricUlcer', label: '胃潰瘍' },
  { key: 'gerd', label: '胃食道逆流' },
  { key: 'parkinsons', label: '帕金森氏症' },
  { key: 'stroke', label: '腦中風', extra: ['出血性', '阻塞性'] },
  { key: 'prostate', label: '攝護腺肥大' },
  { key: 'spine', label: '脊椎損傷', extra: ['椎間盤突出', '脊椎壓迫', '脊椎骨裂'] },
  { key: 'hepatitis', label: '肝炎', extra: ['A型', 'B型', 'C型'] },
  { key: 'cataract', label: '白內障', extra: ['左眼', '右眼', '雙眼'] },
  { key: 'glaucoma', label: '青光眼', extra: ['左眼', '右眼', '雙眼'] },
  { key: 'macular', label: '黃斑部病變', extra: ['左眼', '右眼', '雙眼'] },
  { key: 'kneeArthritis', label: '膝關節炎', extra: ['左腳', '右腳', '雙腳', '有手術', '無手術'] },
  { key: 'hipArthritis', label: '髖關節炎', extra: ['左腳', '右腳', '雙腳', '有手術', '無手術'] },
  { key: 'fracture', label: '骨折', hasText: '骨折部位', extra: ['有手術', '無手術'] },
  { key: 'cancer', label: '癌症', hasText: '癌症詳述' },
  { key: 'autism', label: '自閉症' },
  { key: 'cerebralPalsy', label: '腦性麻痺' },
  { key: 'adhd', label: '過動症' },
  { key: 'mentalDisease', label: '精神疾病', extra: ['躁症', '鬱症', '思覺失調症', '失眠症'] },
  { key: 'dementia', label: '失智症' },
  { key: 'otherDisease', label: '其他', hasText: '其他疾病' },
]

export const RETURN_VISIT_METHODS = ['機車', '汽車', '捷運', '公車', '計程車', '長照交通車', '復康巴士', '輪椅']

export const MEDICATION_STATUS_OPTIONS = [
  '自行管理-規律', '自行管理-不規律',
  '家屬管理-每週', '家屬管理-每天',
]

export const MEDICATION_NOTES_OPTIONS = ['需提醒用藥', '要磨粉', '要協助服用', '抗拒用藥']

export const MEMORY_OPTIONS = ['正常', '短期記憶力退化', '長期記憶力退化', '短長期記憶力皆退化']
export const COGNITION_OPTIONS = ['正常', '人物混亂', '時間混亂', '地點混亂', '數學邏輯差', '危險判斷差']
export const EMOTION_OPTIONS = ['穩定', '焦慮', '易怒', '低落', '淡漠', '固執', '無法判斷']
export const CONSCIOUSNESS_OPTIONS = ['清醒', '混亂', '昏迷', '嗜睡', '無法判斷']
export const COMPREHENSION_OPTIONS = ['正常', '大部分可理解', '僅可理解單詞', '無法理解']
export const EXPRESSION_OPTIONS = ['清楚', '口齒不清', '只可回單字詞', '無法回應', '拒絕回應', '答非所問', '以紙筆對談']
export const VISION_OPTIONS = ['無礙', '老花（有佩戴眼鏡）', '老花（無佩戴眼鏡）', '近視（有佩戴眼鏡）', '近視（無佩戴眼鏡）', '僅可見大字體', '僅可見物品形體', '僅可見光影', '全盲']
export const HEARING_OPTIONS = ['無礙', '重聽-左耳', '重聽-右耳', '重聽-雙耳', '戴助聽器-左耳', '戴助聽器-右耳', '戴助聽器-雙耳', '聽不見']

export const PHYSIOLOGICAL_ISSUES = ['末梢麻痹', '頭暈', '偏癱-左側', '偏癱-右側', '截肢']
export const TOILETING_STATUS = ['獨立如廁', '他人協助攙扶', '他人協助擦拭善後', '尿布（全天）', '尿布（白天）', '尿布（夜晚）', '尿布（外出）', '便盆椅', '尿桶', '尿壺', '尿袋', '無尿']
export const BOWEL_OPTIONS = ['無便秘', '軟便藥物', '軟便塞劑', '甘油球', '小量灌腸', '大量灌腸']
export const INCONTINENCE_OPTIONS = ['無失禁', '小便失禁（來不及）', '小便失禁（無感覺）', '小便失禁（滲尿）', '大便失禁（來不及）', '大便失禁（無感覺）', '大便失禁（滲便）']
export const BATHING_OPTIONS = ['獨立', '獨立沐浴但不乾淨', '他人協助（主照者）', '他人協助（外看）', '他人協助（居服）', '擦澡']
export const SLEEP_OPTIONS = ['熟睡', '失眠', '日夜顛倒']
export const SLEEP_INSOMNIA_MED = ['有使用安眠藥物', '無使用安眠藥物', '有使用鎮靜藥物']
export const SLEEP_INSOMNIA_REASON = ['尿多', '入睡困難', '疼痛', '焦慮']
export const AIDS_LIST = ['無輔具', '輪椅（一般）', '輪椅（可拆）', '輪椅（高背）', '助行器', '四腳單拐', '單手拐', '雨傘', '醫療床', '氣墊床', '床邊扶手', '沐浴椅', '便盆椅', '浴室扶手', '斜坡板', '助步車', '爬梯機', '其他']
export const TUBES_LIST = ['無管路', '鼻胃管', '尿管', '氧氣管', '抽痰機', '胃造口', '腸造廔', '尿造廔', '氣切管', '心臟節律器', '洗腎廔管', '其他']

export const MEAL_PREP_OPTIONS = ['自行備餐', '簡易電鍋備餐', '自行加熱（電鍋）', '自行加熱（電磁爐）', '家屬備餐', '家屬代購']
export const EATING_METHOD_OPTIONS = ['由口進食', '鼻胃管灌', '胃造廔口', '靜脈注射']
export const TEETH_OPTIONS = ['全口活動假牙', '固定假牙', '剩少顆牙齒', '無牙']
export const UTENSIL_OPTIONS = ['筷子', '湯匙', '手拿']
export const CHOKING_OPTIONS = ['無嗆咳', '喝水嗆咳', '食物嗆咳（偶爾）', '食物嗆咳（有時）', '食物嗆咳（經常）', '可吞服藥丸', '無法吞服藥丸']
export const DIET_TEXTURE_OPTIONS = ['一般飲食', '剪碎食物', '軟質食物', '泥狀飲食', '流質食物', '營養管灌']
export const CALORIE_OPTIONS = ['一碗飯菜/每餐', '半碗飯菜/每餐', '不足半碗飯菜/每餐', '另有其他營養來源']

export const GROSS_MOTOR_LEVELS = [
  'LEVEL 1 可跑跳，上下樓梯不需攙扶',
  'LEVEL 2 平坦可走，不平坦較吃力，上下樓梯要扶欄杆',
  'LEVEL 3 需要扶固定物或他人攙扶',
  'LEVEL 4 不能走，但可無支撐維持坐姿',
  'LEVEL 5 無法維持坐姿',
]
export const RISE_ABILITY_OPTIONS = ['可獨立', '可獨立但費力，需要扶手', '需要攙扶']

export const PROBLEM_LIST = [
  '進食問題', '洗澡問題', '個人修飾問題', '穿脫衣物問題', '大小便控制問題',
  '上廁所問題', '移位問題', '走路問題', '上下樓梯問題', '使用電話問題',
  '購物或外出問題', '備餐問題', '處理家務問題', '用藥問題', '處理財務問題',
  '溝通問題', '短期記憶障礙', '疼痛問題', '不動症候群風險', '皮膚照護問題',
  '傷口問題', '水份及營養問題', '吞嚥問題', '管路照顧問題', '其他醫療照護問題',
  '跌倒風險', '安全疑慮', '居住環境障礙', '社會參與需協助', '困擾行為',
  '照顧負荷過重', '輔具使用問題', '感染問題', '其他問題',
]

export type ServiceCategory = 'BA' | 'BB' | 'BC' | 'BD' | 'CA' | 'CB' | 'CC' | 'CD'

export const SERVICE_CATALOG: { category: ServiceCategory; code: string; name: string }[] = [
  // ── BA 居家照顧服務 ──
  { category: 'BA', code: 'BA01', name: '基本身體清潔' },
  { category: 'BA', code: 'BA02', name: '基本日常照顧' },
  { category: 'BA', code: 'BA03', name: '測量生命徵象' },
  { category: 'BA', code: 'BA04', name: '協助進食或管灌餵食' },
  { category: 'BA', code: 'BA05', name: '餐食照顧' },
  { category: 'BA', code: 'BA07', name: '協助沐浴及洗頭' },
  { category: 'BA', code: 'BA08', name: '足部照護' },
  { category: 'BA', code: 'BA09', name: '到宅沐浴車服務--第一型' },
  { category: 'BA', code: 'BA09a', name: '到宅沐浴車服務--第二型' },
  { category: 'BA', code: 'BA10', name: '翻身拍背' },
  { category: 'BA', code: 'BA11', name: '肢體關節活動' },
  { category: 'BA', code: 'BA12', name: '協助上（下）樓梯' },
  { category: 'BA', code: 'BA13', name: '陪同外出' },
  { category: 'BA', code: 'BA14', name: '陪同就醫' },
  { category: 'BA', code: 'BA15', name: '家務協助' },
  { category: 'BA', code: 'BA16', name: '代購或代領或代送服務' },
  { category: 'BA', code: 'BA17a', name: '人工氣道管內（非氣管內管）分泌物抽吸' },
  { category: 'BA', code: 'BA17b', name: '口腔內（懸壅垂之前）分泌物抽吸' },
  { category: 'BA', code: 'BA17c', name: '尿管及鼻胃管之清潔與固定' },
  { category: 'BA', code: 'BA17d1', name: '血糖機驗血糖' },
  { category: 'BA', code: 'BA17d2', name: '甘油球通便' },
  { category: 'BA', code: 'BA17e', name: '依指示置入藥盒' },
  { category: 'BA', code: 'BA18', name: '安全看視' },
  { category: 'BA', code: 'BA20', name: '陪伴服務' },
  { category: 'BA', code: 'BA22', name: '巡視服務' },
  { category: 'BA', code: 'BA23', name: '協助洗頭' },
  { category: 'BA', code: 'BA24', name: '協助排泄' },

  // ── BB 日間照顧服務 ──
  { category: 'BB', code: 'BB01', name: '日間照顧（全日）--第一型（等級二）' },
  { category: 'BB', code: 'BB02', name: '日間照顧（半日）--第一型（等級二）' },
  { category: 'BB', code: 'BB03', name: '日間照顧（全日）--第二型（等級三）' },
  { category: 'BB', code: 'BB04', name: '日間照顧（半日）--第二型（等級三）' },
  { category: 'BB', code: 'BB05', name: '日間照顧（全日）--第三型（等級四）' },
  { category: 'BB', code: 'BB06', name: '日間照顧（半日）--第三型（等級四）' },
  { category: 'BB', code: 'BB07', name: '日間照顧（全日）--第四型（等級五）' },
  { category: 'BB', code: 'BB08', name: '日間照顧（半日）--第四型（等級五）' },
  { category: 'BB', code: 'BB09', name: '日間照顧（全日）--第五型（等級六）' },
  { category: 'BB', code: 'BB10', name: '日間照顧（半日）--第五型（等級六）' },
  { category: 'BB', code: 'BB11', name: '日間照顧（全日）--第六型（等級七）' },
  { category: 'BB', code: 'BB12', name: '日間照顧（半日）--第六型（等級七）' },
  { category: 'BB', code: 'BB13', name: '日間照顧（全日）--第七型（等級八）' },
  { category: 'BB', code: 'BB14', name: '日間照顧（半日）--第七型（等級八）' },

  // ── BC 家庭托顧服務 ──
  { category: 'BC', code: 'BC01', name: '家庭托顧（全日）--第一型（等級二）' },
  { category: 'BC', code: 'BC02', name: '家庭托顧（半日）--第一型（等級二）' },
  { category: 'BC', code: 'BC03', name: '家庭托顧（全日）--第二型（等級三）' },
  { category: 'BC', code: 'BC04', name: '家庭托顧（半日）--第二型（等級三）' },
  { category: 'BC', code: 'BC05', name: '家庭托顧（全日）--第三型（等級四）' },
  { category: 'BC', code: 'BC06', name: '家庭托顧（半日）--第三型（等級四）' },
  { category: 'BC', code: 'BC07', name: '家庭托顧（全日）--第四型（等級五）' },
  { category: 'BC', code: 'BC08', name: '家庭托顧（半日）--第四型（等級五）' },
  { category: 'BC', code: 'BC09', name: '家庭托顧（全日）--第五型（等級六）' },
  { category: 'BC', code: 'BC10', name: '家庭托顧（半日）--第五型（等級六）' },
  { category: 'BC', code: 'BC11', name: '家庭托顧（全日）--第六型（等級七）' },
  { category: 'BC', code: 'BC12', name: '家庭托顧（半日）--第六型（等級七）' },
  { category: 'BC', code: 'BC13', name: '家庭托顧（全日）--第七型（等級八）' },
  { category: 'BC', code: 'BC14', name: '家庭托顧（半日）--第七型（等級八）' },

  // ── BD 社區式服務 ──
  { category: 'BD', code: 'BD01', name: '社區式協助沐浴' },
  { category: 'BD', code: 'BD02', name: '社區式晚餐' },
  { category: 'BD', code: 'BD03', name: '社區式服務交通接送' },

  // ── CA/CB/CC/CD 專業服務 ──
  { category: 'CA', code: 'CA07', name: 'IADLs復能、ADLs復能照護' },
  { category: 'CA', code: 'CA08', name: '個別化服務計畫（ISP）擬定與執行' },
  { category: 'CB', code: 'CB01', name: '營養照護' },
  { category: 'CB', code: 'CB02', name: '進食與吞嚥照護' },
  { category: 'CB', code: 'CB03', name: '困擾行為照護' },
  { category: 'CB', code: 'CB04', name: '臥床或長期活動受限照護' },
  { category: 'CC', code: 'CC01', name: '居家環境安全或無障礙空間規劃' },
  { category: 'CD', code: 'CD02', name: '居家護理指導與諮詢' },
]
