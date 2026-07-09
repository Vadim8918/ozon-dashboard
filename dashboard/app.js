const loginView = document.querySelector("#loginView");
const appView = document.querySelector("#appView");
const loginForm = document.querySelector("#loginForm");
const summaryForm = document.querySelector("#summaryForm");
const statusBox = document.querySelector("#status");
const statusText = document.querySelector("#statusText");
const periodMode = document.querySelector("#periodMode");
const periodPicker = document.querySelector("#periodPicker");
const periodButton = document.querySelector("#periodButton");
const periodButtonText = document.querySelector("#periodButtonText");
const periodMenu = document.querySelector("#periodMenu");
const monthTrigger = document.querySelector("#monthTrigger");
const monthMenu = document.querySelector("#monthMenu");
const hideComparisonInput = document.querySelector("#hideComparison");
const dateFromInput = document.querySelector("#dateFrom");
const dateToInput = document.querySelector("#dateTo");
const compareDateFromInput = document.querySelector("#compareDateFrom");
const compareDateToInput = document.querySelector("#compareDateTo");
const downloadCostTemplateButton = document.querySelector("#downloadCostTemplate");
const uploadCostTemplateButton = document.querySelector("#uploadCostTemplate");
const costTemplateFileInput = document.querySelector("#costTemplateFile");
const uploadTariffsFileButton = document.querySelector("#uploadTariffsFile");
const viewTariffsFileButton = document.querySelector("#viewTariffsFile");
const tariffsFileInput = document.querySelector("#tariffsFile");
const tariffsStatus = document.querySelector("#tariffsStatus");
const tariffsPreview = document.querySelector("#tariffsPreview");
const taxationModeMenu = document.querySelector("#taxationMode");
const taxationModeButton = document.querySelector("#taxationModeButton");
const taxationModeDropdown = document.querySelector("#taxationModeDropdown");
let taxationModeInfo = document.querySelector("#taxationModeInfo");
const logoutButton = document.querySelector("#logoutButton");
const userLine = document.querySelector("#userLine");
const accountButton = document.querySelector("#accountButton");
const accountLabel = document.querySelector("#accountLabel");
const accountDropdown = document.querySelector("#accountDropdown");
const accountList = document.querySelector("#accountList");
const accountForm = document.querySelector("#accountForm");
const adminPanel = document.querySelector("#adminPanel");
const ozonConfigForm = document.querySelector("#ozonConfigForm");
const performanceConfigForm = document.querySelector("#performanceConfigForm");
const clearOzonKey = document.querySelector("#clearOzonKey");
const clearPerformanceKey = document.querySelector("#clearPerformanceKey");
const userForm = document.querySelector("#userForm");
const usersList = document.querySelector("#usersList");
const dashboardTab = document.querySelector("#dashboardTab");
const tnvedTab = document.querySelector("#tnvedTab");
const unitTab = document.querySelector("#unitTab");
const unitTabMenu = document.querySelector("#unitTabMenu");
const unitDropdown = document.querySelector("#unitDropdown");
const unitFboTab = document.querySelector("#unitFboTab");
const unitFbsTab = document.querySelector("#unitFbsTab");
const cacheTab = document.querySelector("#cacheTab");
const tariffsTab = document.querySelector("#tariffsTab");
const apiTab = document.querySelector("#apiTab");
const adminTab = document.querySelector("#adminTab");
const dashboardView = document.querySelector("#dashboardView");
const tnvedView = document.querySelector("#tnvedView");
const cacheView = document.querySelector("#cacheView");
const tariffsView = document.querySelector("#tariffsView");
const apiView = document.querySelector("#apiView");
const adminView = document.querySelector("#adminView");
const productsTitle = document.querySelector("#productsTitle");
const tnvedSearch = document.querySelector("#tnvedSearch");
const tnvedOnlyStock = document.querySelector("#tnvedOnlyStock");
const tnvedRefresh = document.querySelector("#tnvedRefresh");
const tnvedMeta = document.querySelector("#tnvedMeta");
const tnvedHead = document.querySelector("#tnvedHead");
const tnvedBody = document.querySelector("#tnvedBody");
const productStatusTabs = document.querySelector("#productStatusTabs");
const columnsButton = document.querySelector("#columnsButton");
const columnsDropdown = document.querySelector("#columnsDropdown");
const cacheRefresh = document.querySelector("#cacheRefresh");
const cacheStatus = document.querySelector("#cacheStatus");
const cacheRows = document.querySelector("#cacheRows");
const apiRefresh = document.querySelector("#apiRefresh");
const apiStatus = document.querySelector("#apiStatus");
const apiRows = document.querySelector("#apiRows");

let currentUser = null;
let currentAccount = null;
let ozonAccounts = [];
let tnvedItems = [];
let tnvedLoadedOnce = false;
let tnvedTimer = null;
let tnvedLastDuration = null;
let activeProductsTab = "tnved";
let cacheLoadedOnce = false;
let apiLoadedOnce = false;
let lastSummaryData = null;
let lastCompareData = null;
let comparePeriodTouched = false;
let periodCloseTimer = null;
let monthCacheLoadToken = 0;
const TNVED_STATE_KEY = "ozonTnvedStateV4";
const DAILY_CARD_STATE_KEY = "ozonDailyCardsHiddenV1";
const DAILY_CARD_ORDER_KEY = "ozonDailyCardsOrderV1";
const TAXATION_MODE_KEY = "ozonTaxationModeV1";

const DAILY_CARD_OPTIONS = [
  { key: "orders", label: "Заказы", valueId: "orders" },
  { key: "sales", label: "Продажи", valueId: "salesCardAmount" },
  { key: "logistics", label: "Логистика", valueId: "logisticsCardAmount" },
  { key: "ads", label: "Реклама", valueId: "ads" },
  { key: "commission", label: "Комиссии", valueId: "commission" },
  { key: "allServices", label: "Все услуги", valueId: "allServicesCardAmount" },
  { key: "fboOrdered", label: "FBO заказано", valueId: "fboOrdered" },
  { key: "fboDelivered", label: "FBO выкуплено", valueId: "fboDelivered" },
  { key: "fboReturns", label: "FBO возвраты", valueId: "fboReturns" },
  { key: "fboCancelled", label: "FBO отмены", valueId: "fboCancelled" },
  { key: "fbsOrdered", label: "FBS заказы", valueId: "fbsOrdered" },
  { key: "fbsDelivered", label: "FBS выкуплено", valueId: "fbsDelivered" },
  { key: "fbsReturns", label: "FBS возвраты", valueId: "fbsReturns" },
  { key: "fbsCancelled", label: "FBS отмены", valueId: "fbsCancelled" },
  { key: "paidStorage", label: "Платное хранение", valueId: "paidStorageCardAmount" },
];
let hiddenDailyCards = loadHiddenDailyCards();
let dailyCardOrder = loadDailyCardOrder();
let draggedDailyCardKey = null;

const TAXATION_MODE_LABELS = {
  osno: "ОСНО",
  usn_income_1: "УСН доходы 1%",
  usn_income_2: "УСН доходы 2%",
  usn_income_3: "УСН доходы 3%",
  usn_income_4: "УСН доходы 4%",
  usn_income_5: "УСН доходы 5%",
  usn_income_6: "УСН доходы 6%",
  usn_income_expense_5: "УСН доходы-расходы 5%",
  usn_income_expense_6: "УСН доходы-расходы 6%",
  usn_income_expense_7: "УСН доходы-расходы 7%",
  usn_income_expense_8: "УСН доходы-расходы 8%",
  usn_income_expense_9: "УСН доходы-расходы 9%",
  usn_income_expense_10: "УСН доходы-расходы 10%",
  usn_income_expense_11: "УСН доходы-расходы 11%",
  usn_income_expense_12: "УСН доходы-расходы 12%",
  usn_income_expense_13: "УСН доходы-расходы 13%",
  usn_income_expense_14: "УСН доходы-расходы 14%",
  usn_income_expense_15: "УСН доходы-расходы 15%",
  ausn_income: "АУСН доходы 8%",
  ausn_income_expense: "АУСН доходы-расходы 20%",
  psn: "ПСН",
  npd: "НПД",
};

const TAXATION_MODE_INFO = {
  osno: {
    title: "ОСНО",
    body: "Общая система налогообложения. Обычно включает НДС, налог на прибыль для организаций или НДФЛ для ИП и учет расходов.",
  },
  usn_income: {
    title: "УСН доходы",
    body: "Упрощенная система: налог считается с доходов. Расходы и себестоимость обычно не уменьшают налоговую базу.",
  },
  usn_income_expense: {
    title: "УСН доходы-расходы",
    body: "Упрощенная система: налог считается с разницы между доходами и подтвержденными расходами.",
  },
  ausn_income: {
    title: "АУСН доходы",
    body: "Автоматизированная УСН: налог считается с доходов, часть отчетности и расчетов автоматизирована.",
  },
  ausn_income_expense: {
    title: "АУСН доходы-расходы",
    body: "Автоматизированная УСН: налог считается с доходов минус расходы, ставка выше, но база меньше.",
  },
  psn: {
    title: "ПСН",
    body: "Патентная система для ИП по отдельным видам деятельности. Налог обычно фиксирован стоимостью патента.",
  },
  npd: {
    title: "НПД",
    body: "Налог на профессиональный доход для самозанятых. Подходит только при соблюдении ограничений режима.",
  },
};

function taxationInfoKey(value) {
  if (!value) {
    return "osno";
  }
  if (value.startsWith("usn_income_expense")) {
    return "usn_income_expense";
  }
  if (value.startsWith("usn_income")) {
    return "usn_income";
  }
  return TAXATION_MODE_INFO[value] ? value : "osno";
}

function selectedTaxationMode() {
  return taxationModeButton?.dataset.taxationValue || localStorage.getItem(TAXATION_MODE_KEY) || "osno";
}

function taxationPercent(mode) {
  const incomeRate = /^usn_income_(\d+)$/.exec(mode);
  if (incomeRate) {
    return Number(incomeRate[1]) / 100;
  }
  const incomeExpenseRate = /^usn_income_expense_(\d+)$/.exec(mode);
  if (incomeExpenseRate) {
    return Number(incomeExpenseRate[1]) / 100;
  }
  if (mode === "ausn_income") {
    return 0.08;
  }
  if (mode === "ausn_income_expense") {
    return 0.20;
  }
  if (mode === "npd") {
    return 0.06;
  }
  return 0;
}

function taxationKind(mode) {
  if (mode.startsWith("usn_income_expense") || mode === "ausn_income_expense") {
    return "income_expense";
  }
  if (mode.startsWith("usn_income") || mode === "ausn_income" || mode === "npd") {
    return "income";
  }
  return "manual";
}

function calculateTaxAmount({
  salesRevenue,
  partnerPrograms,
  servicesTotal,
  costsTotal,
  buyoutCostTotal,
}) {
  const mode = selectedTaxationMode();
  const rate = taxationPercent(mode);
  const kind = taxationKind(mode);
  const taxableIncome = Math.max(0, Number(salesRevenue || 0) + Number(partnerPrograms || 0));
  const deductibleExpenses = Math.max(
    0,
    Number(servicesTotal || 0) + Number(costsTotal || 0) + Number(buyoutCostTotal || 0)
  );

  if (!rate || kind === "manual") {
    return {
      amount: 0,
      mode,
      taxableIncome,
      deductibleExpenses,
      base: 0,
      calculated: false,
    };
  }

  if (kind === "income") {
    return {
      amount: taxableIncome * rate,
      mode,
      taxableIncome,
      deductibleExpenses,
      base: taxableIncome,
      calculated: true,
    };
  }

  const base = Math.max(0, taxableIncome - deductibleExpenses);
  const minimumRate = mode.startsWith("usn_income_expense") ? 0.01 : mode === "ausn_income_expense" ? 0.03 : 0;
  const regularTax = base * rate;
  const minimumTax = taxableIncome * minimumRate;
  return {
    amount: Math.max(regularTax, minimumTax),
    mode,
    taxableIncome,
    deductibleExpenses,
    base,
    calculated: true,
  };
}

function initTaxationModeSelect() {
  if (!taxationModeMenu || !taxationModeButton || !taxationModeDropdown) {
    return;
  }
  if (!taxationModeInfo) {
    taxationModeInfo = document.createElement("aside");
    taxationModeInfo.id = "taxationModeInfo";
    taxationModeInfo.className = "taxationModeInfo";
    taxationModeInfo.innerHTML = "<strong></strong><span></span>";
    taxationModeDropdown.appendChild(taxationModeInfo);
  }
  const legacyModeMap = {
    usn_income: "usn_income_6",
    usn_income_expense: "usn_income_expense_15",
  };
  const savedMode = legacyModeMap[localStorage.getItem(TAXATION_MODE_KEY)] || localStorage.getItem(TAXATION_MODE_KEY);
  const selectedMode = TAXATION_MODE_LABELS[savedMode] ? savedMode : "osno";

  function setTaxationMode(mode) {
    const label = TAXATION_MODE_LABELS[mode];
    if (!label) {
      return;
    }
    taxationModeButton.textContent = label;
    taxationModeButton.dataset.taxationValue = mode;
    localStorage.setItem(TAXATION_MODE_KEY, mode);
    if (lastSummaryData) {
      render(lastSummaryData, lastCompareData);
    }
  }

  function setTaxationInfo(key, rateText = "") {
    if (!taxationModeInfo) {
      return;
    }
    const info = TAXATION_MODE_INFO[taxationInfoKey(key)] || TAXATION_MODE_INFO.osno;
    taxationModeInfo.querySelector("strong").textContent = rateText ? `${info.title} ${rateText}` : info.title;
    taxationModeInfo.querySelector("span").textContent = info.body;
  }

  function optionInfo(option) {
    const value = option.dataset.taxationValue || option.dataset.taxationInfo || "";
    if (value) {
      const rate = option.dataset.taxationRate || (/^\d+%$/.test(option.textContent.trim()) ? option.textContent.trim() : "");
      return { key: value, rate };
    }
    const firstSubmenuOption = option.parentElement?.querySelector(".taxationSubmenu [data-taxation-value]");
    return {
      key: firstSubmenuOption?.dataset.taxationValue || "osno",
      rate: "",
    };
  }

  setTaxationMode(selectedMode);
  setTaxationInfo(selectedMode);

  taxationModeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    taxationModeDropdown.classList.toggle("hidden");
  });

  taxationModeDropdown.addEventListener("click", (event) => {
    const option = event.target.closest("[data-taxation-value]");
    if (!option) {
      return;
    }
    setTaxationMode(option.dataset.taxationValue);
    taxationModeDropdown.classList.add("hidden");
  });

  taxationModeDropdown.addEventListener("mouseover", (event) => {
    const option = event.target.closest("button");
    if (!option || !taxationModeDropdown.contains(option)) {
      return;
    }
    const info = optionInfo(option);
    setTaxationInfo(info.key, info.rate);
  });

  taxationModeDropdown.addEventListener("focusin", (event) => {
    const option = event.target.closest("button");
    if (!option || !taxationModeDropdown.contains(option)) {
      return;
    }
    const info = optionInfo(option);
    setTaxationInfo(info.key, info.rate);
  });

  document.addEventListener("click", (event) => {
    if (!taxationModeMenu.contains(event.target)) {
      taxationModeDropdown.classList.add("hidden");
    }
  });
}

const profitTableState = {
  category: { filter: "", sortKey: "net_profit", sortDirection: "desc", showZero: false },
  type: { filter: "", sortKey: "net_profit", sortDirection: "desc", showZero: false },
  article: { filter: "", sortKey: "net_profit", sortDirection: "desc" },
};

const PROFIT_ZERO_FIELDS = [
  "revenue",
  "commission",
  "services",
  "service_logistics",
  "service_delivery",
  "service_processing",
  "service_mainline",
  "service_last_mile",
  "service_other",
  "returns",
  "paid_storage",
  "profit_before_cost",
  "buyout_cost",
  "net_profit",
];

const SERVICE_PROFIT_FIELDS = [
  "service_logistics",
  "service_delivery",
  "service_processing",
  "service_mainline",
  "service_last_mile",
  "service_other",
];

const PERIOD_LABELS = {
  day: "День",
  week: "Неделя",
  month: "Месяц",
  custom: "Свой период",
};

const MONTH_NAMES = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const now = new Date();
setPeriodMode("month");

const TNVED_COLUMNS = [
  { key: "photo", title: "Фото", type: "image", defaultVisible: true },
  { key: "offer_id", title: "Артикул / SKU", type: "article", defaultVisible: true },
  { key: "name", title: "Название товара", type: "text", defaultVisible: true },
  { key: "status", title: "Статус", type: "text", defaultVisible: true },
  { key: "category", title: "Категория", type: "text", defaultVisible: true },
  { key: "type", title: "Тип", type: "text", defaultVisible: true },
  { key: "tnved", title: "ТНВЭД", type: "text", defaultVisible: true },
  { key: "fbo", title: "FBO", type: "number", defaultVisible: true },
  { key: "fbs", title: "FBS", type: "number", defaultVisible: true },
  { key: "price", title: "Цена", type: "number", defaultVisible: true },
  { key: "discount_price", title: "Цена со скидкой", type: "number", defaultVisible: true },
  { key: "old_price", title: "Цена до скидки", type: "number", defaultVisible: true },
  { key: "cost_price", title: "Себестоимость", type: "number", defaultVisible: true },
  { key: "volume_liters", title: "Объем в литрах", type: "number", defaultVisible: true },
];

const UNIT_PROFIT_COLUMN = {
  key: "unit_profit",
  title: "Прибыль за 1 ед",
  type: "number",
  defaultVisible: true,
};

const UNIT_COMMISSION_PERCENT_COLUMN = {
  key: "commission_percent",
  title: "Комиссия %",
  type: "percent",
  defaultVisible: true,
};

const UNIT_COMMISSION_RUB_COLUMN = {
  key: "commission_rub",
  title: "Комиссия в руб.",
  type: "number",
  defaultVisible: true,
};

const MIN_TNVED_COLUMN_WIDTH = 56;

const DEFAULT_TNVED_STATE = {
  search: "",
  onlyStock: false,
  sort: { key: "product_id", direction: "desc" },
  status: "all",
  filters: {},
  visible: Object.fromEntries(TNVED_COLUMNS.map((column) => [column.key, column.defaultVisible])),
  widths: {},
};

let tnvedState = loadTnvedState();

const ROLE_TITLES = {
  owner: "Филькина Грамота а",
  admin: "Админ",
  viewer: "Филькина Грамота",
};

function canManageAdmin(user) {
  return user && (user.role === "owner" || user.role === "admin");
}

const rub = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
});

function loadTnvedState() {
  try {
    const saved = JSON.parse(localStorage.getItem(TNVED_STATE_KEY) || "{}");
    return {
      ...DEFAULT_TNVED_STATE,
      visible: { ...DEFAULT_TNVED_STATE.visible, ...(saved.visible || {}) },
      widths: { ...(saved.widths || {}) },
    };
  } catch {
    return structuredClone(DEFAULT_TNVED_STATE);
  }
}

function saveTnvedColumns() {
  localStorage.setItem(TNVED_STATE_KEY, JSON.stringify({
    visible: tnvedState.visible,
    widths: tnvedState.widths,
  }));
}

function loadHiddenDailyCards() {
  try {
    const saved = JSON.parse(localStorage.getItem(DAILY_CARD_STATE_KEY) || "[]");
    return new Set(Array.isArray(saved) ? saved : []);
  } catch {
    return new Set();
  }
}

function saveHiddenDailyCards() {
  localStorage.setItem(DAILY_CARD_STATE_KEY, JSON.stringify([...hiddenDailyCards]));
}

function defaultDailyCardOrder() {
  return DAILY_CARD_OPTIONS.map((option) => option.key);
}

function sanitizeDailyCardOrder(order) {
  const defaultOrder = defaultDailyCardOrder();
  const allowed = new Set(defaultOrder);
  const result = [];
  (Array.isArray(order) ? order : []).forEach((key) => {
    if (allowed.has(key) && !result.includes(key)) {
      result.push(key);
    }
  });
  defaultOrder.forEach((key) => {
    if (!result.includes(key)) {
      result.push(key);
    }
  });
  return result;
}

function loadDailyCardOrder() {
  try {
    return sanitizeDailyCardOrder(JSON.parse(localStorage.getItem(DAILY_CARD_ORDER_KEY) || "[]"));
  } catch {
    return defaultDailyCardOrder();
  }
}

function saveDailyCardOrder() {
  localStorage.setItem(DAILY_CARD_ORDER_KEY, JSON.stringify(dailyCardOrder));
}

function dailyCardOption(key) {
  return DAILY_CARD_OPTIONS.find((option) => option.key === key) || null;
}

function dailyCardElement(option) {
  return document.querySelector(`#${option.valueId}`)?.closest(".dailyCard") || null;
}

function dailyCardByKey(key) {
  return Array.from(document.querySelectorAll("[data-daily-card]"))
    .find((card) => card.dataset.dailyCard === key) || null;
}

function shouldInsertDailyCardAfter(card, event) {
  const rect = card.getBoundingClientRect();
  return event.clientX > rect.left + rect.width / 2 || event.clientY > rect.top + rect.height * 0.62;
}

function clearDailyCardDropMarkers() {
  document.querySelectorAll(".dailyCardDropBefore, .dailyCardDropAfter").forEach((card) => {
    card.classList.remove("dailyCardDropBefore", "dailyCardDropAfter");
  });
}

function updateDailyCardDropMarker(card, event) {
  const after = shouldInsertDailyCardAfter(card, event);
  clearDailyCardDropMarkers();
  card.classList.toggle("dailyCardDropBefore", !after);
  card.classList.toggle("dailyCardDropAfter", after);
}

function refreshDailyCardsDropdown() {
  const dropdown = document.querySelector("#dailyCardsDropdown");
  if (dropdown) {
    renderDailyCardsDropdown(dropdown);
  }
}

function moveDailyCard(sourceKey, targetKey, insertAfter) {
  if (!sourceKey || !targetKey || sourceKey === targetKey) {
    return;
  }
  const nextOrder = sanitizeDailyCardOrder(dailyCardOrder).filter((key) => key !== sourceKey);
  const targetIndex = nextOrder.indexOf(targetKey);
  if (targetIndex === -1) {
    return;
  }
  nextOrder.splice(targetIndex + (insertAfter ? 1 : 0), 0, sourceKey);
  dailyCardOrder = sanitizeDailyCardOrder(nextOrder);
  saveDailyCardOrder();
  applyDailyCardsVisibility();
  refreshDailyCardsDropdown();
}

function setupDailyCardDrag(card) {
  card.draggable = true;
  if (card.dataset.dragReady === "true") {
    return;
  }
  card.dataset.dragReady = "true";
  card.addEventListener("dragstart", (event) => {
    draggedDailyCardKey = card.dataset.dailyCard;
    card.classList.add("dailyCardDragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draggedDailyCardKey || "");
  });
  card.addEventListener("dragover", (event) => {
    if (!draggedDailyCardKey || draggedDailyCardKey === card.dataset.dailyCard) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    updateDailyCardDropMarker(card, event);
  });
  card.addEventListener("dragleave", () => {
    card.classList.remove("dailyCardDropBefore", "dailyCardDropAfter");
  });
  card.addEventListener("drop", (event) => {
    event.preventDefault();
    const sourceKey = event.dataTransfer.getData("text/plain") || draggedDailyCardKey;
    moveDailyCard(sourceKey, card.dataset.dailyCard, shouldInsertDailyCardAfter(card, event));
    clearDailyCardDropMarkers();
  });
  card.addEventListener("dragend", () => {
    card.classList.remove("dailyCardDragging");
    draggedDailyCardKey = null;
    clearDailyCardDropMarkers();
  });
}

function ensureDailyCardKeys() {
  DAILY_CARD_OPTIONS.forEach((option) => {
    const card = dailyCardElement(option);
    if (card) {
      card.dataset.dailyCard = option.key;
      setupDailyCardDrag(card);
    }
  });
}

function placeDailyCardsInSavedOrder() {
  const container = document.querySelector(".dailyCards");
  if (!container) {
    return;
  }
  dailyCardOrder = sanitizeDailyCardOrder(dailyCardOrder);
  dailyCardOrder.forEach((key) => {
    const card = dailyCardByKey(key);
    if (card) {
      container.appendChild(card);
    }
  });
}

function applyDailyCardsVisibility() {
  ensureDailyCardKeys();
  placeDailyCardsInSavedOrder();
  document.querySelectorAll("[data-daily-card]").forEach((card) => {
    card.classList.toggle("hiddenDailyCard", hiddenDailyCards.has(card.dataset.dailyCard));
  });
  document.querySelectorAll(".dailyCards").forEach((section) => {
    const visibleCard = section.querySelector(".dailyCard:not(.hiddenDailyCard)");
    section.classList.toggle("emptyDailyCards", !visibleCard);
  });
}

function closeDailyCardsDropdown() {
  document.querySelector("#dailyCardsDropdown")?.classList.add("hidden");
}

function scrollToDashboardSection(sectionId) {
  const target = document.querySelector(`#${sectionId}`);
  if (!target) {
    return;
  }
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderDailyCardsDropdown(dropdown) {
  dropdown.innerHTML = "";
  sanitizeDailyCardOrder(dailyCardOrder).map(dailyCardOption).filter(Boolean).forEach((option) => {
    const row = document.createElement("label");
    row.className = "dailyCardsOption";
    row.innerHTML = `
      <input type="checkbox" value="${option.key}" ${hiddenDailyCards.has(option.key) ? "checked" : ""}>
      <span>${escapeHtml(option.label)}</span>
    `;
    row.querySelector("input").addEventListener("change", (event) => {
      if (event.target.checked) {
        hiddenDailyCards.add(option.key);
      } else {
        hiddenDailyCards.delete(option.key);
      }
      saveHiddenDailyCards();
      applyDailyCardsVisibility();
    });
    dropdown.appendChild(row);
  });
}

function initDailyCardsControl() {
  const firstDailyCards = document.querySelector(".dailyCards");
  if (!firstDailyCards || document.querySelector("#dailyCardsControl")) {
    applyDailyCardsVisibility();
    return;
  }

  const toolbar = document.createElement("section");
  toolbar.id = "dailyCardsControl";
  toolbar.className = "dailyCardsControl";
  toolbar.innerHTML = `
    <div class="dailyCardsMenu">
      <button id="dailyCardsButton" class="dailyCardsButton" type="button">Настроить блоки</button>
      <div id="dailyCardsDropdown" class="dailyCardsDropdown hidden"></div>
    </div>
    <nav class="dashboardAnchorNav" aria-label="Быстрый переход по дашборду">
      <button type="button" data-scroll-target="operationsSection">Все операции</button>
      <button type="button" data-scroll-target="categoryProfitSection">По категориям</button>
      <button type="button" data-scroll-target="typeProfitSection">По типам</button>
      <button type="button" data-scroll-target="articleProfitSection">По артикулу</button>
    </nav>
  `;
  firstDailyCards.insertAdjacentElement("beforebegin", toolbar);
  const costTemplateActions = document.querySelector(".costTemplateActions");
  if (costTemplateActions) {
    toolbar.appendChild(costTemplateActions);
  }

  const button = toolbar.querySelector("#dailyCardsButton");
  const dropdown = toolbar.querySelector("#dailyCardsDropdown");
  renderDailyCardsDropdown(dropdown);
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    dropdown.classList.toggle("hidden");
  });
  dropdown.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  toolbar.querySelectorAll("[data-scroll-target]").forEach((anchorButton) => {
    anchorButton.addEventListener("click", () => {
      closeDailyCardsDropdown();
      scrollToDashboardSection(anchorButton.dataset.scrollTarget);
    });
  });
  applyDailyCardsVisibility();
}

function formatDateInput(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function todayDateInput() {
  return formatDateInput(new Date());
}

function limitDateInputToToday(input) {
  if (!input) {
    return false;
  }
  const today = todayDateInput();
  input.max = today;
  if (input.value && input.value > today) {
    input.value = today;
    return true;
  }
  return false;
}

function applyDateLimits() {
  [dateFromInput, dateToInput, compareDateFromInput, compareDateToInput].forEach(limitDateInputToToday);
}

function formatShortDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return value || "-";
  }
  return `${match[3]}.${match[2]}`;
}

function formatShortRange(period) {
  if (!period?.from || !period?.to) {
    return "-";
  }
  return `${formatShortDate(period.from)} - ${formatShortDate(period.to)}`;
}

function parseDateInput(value) {
  const [year, month, day] = String(value || "").split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function daysBetweenInclusive(start, end) {
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.round((end - start) / dayMs) + 1);
}

function setDefaultComparePeriod(force = false) {
  if (!force && comparePeriodTouched) {
    return;
  }
  const start = parseDateInput(dateFromInput.value);
  const end = parseDateInput(dateToInput.value);
  if (!start || !end) {
    return;
  }
  if (periodMode.value === "month") {
    const previousMonthStart = new Date(start.getFullYear(), start.getMonth() - 1, 1);
    compareDateFromInput.value = formatDateInput(previousMonthStart);
    compareDateToInput.value = formatDateInput(monthEnd(previousMonthStart));
    return;
  }
  const days = daysBetweenInclusive(start, end);
  const compareEnd = addDays(start, -1);
  const compareStart = addDays(compareEnd, -(days - 1));
  compareDateFromInput.value = formatDateInput(compareStart);
  compareDateToInput.value = formatDateInput(compareEnd);
}

function monthEnd(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function closedMonthOptions(limit = 12) {
  const current = new Date();
  const options = [];
  for (let offset = 1; offset <= limit; offset += 1) {
    const start = new Date(current.getFullYear(), current.getMonth() - offset, 1);
    const end = monthEnd(start);
    options.push({
      label: `${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`,
      range: `с ${start.getDate()} по ${end.getDate()}`,
      from: formatDateInput(start),
      to: formatDateInput(end),
    });
  }
  return options;
}

function latestClosedMonth() {
  return closedMonthOptions(1)[0];
}

function weekBounds(date) {
  const start = new Date(date);
  const day = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

function syncPeriodButton() {
  if (periodButtonText) {
    periodButtonText.textContent = PERIOD_LABELS[periodMode.value] || PERIOD_LABELS.custom;
  }
}

function setPeriodMode(mode, selectedMonth = null) {
  periodMode.value = mode;
  const current = new Date();
  if (mode === "day") {
    dateFromInput.value = formatDateInput(current);
    dateToInput.value = formatDateInput(current);
  } else if (mode === "week") {
    const { start, end } = weekBounds(current);
    dateFromInput.value = formatDateInput(start);
    dateToInput.value = formatDateInput(end > current ? current : end);
  } else if (mode === "month") {
    const month = selectedMonth || latestClosedMonth();
    if (month) {
      dateFromInput.value = month.from;
      dateToInput.value = month.to;
    }
  }
  applyDateLimits();
  syncPeriodButton();
  setDefaultComparePeriod();
}

function openPeriodMenu() {
  if (periodCloseTimer) {
    clearTimeout(periodCloseTimer);
    periodCloseTimer = null;
  }
  periodMenu.classList.remove("hidden");
  periodButton.setAttribute("aria-expanded", "true");
}

function closePeriodMenu() {
  periodMenu.classList.add("hidden");
  monthMenu.classList.add("hidden");
  periodButton.setAttribute("aria-expanded", "false");
}

function renderMonthMenu() {
  const months = closedMonthOptions(12);
  monthMenu.innerHTML = months
    .map(
      (month) => `
        <button class="monthOption" type="button" data-from="${month.from}" data-to="${month.to}">
          <strong>${month.label}</strong>
          <span>${month.range}</span>
        </button>
      `
    )
    .join("");
}

function openMonthMenu() {
  if (periodCloseTimer) {
    clearTimeout(periodCloseTimer);
    periodCloseTimer = null;
  }
  renderMonthMenu();
  monthMenu.classList.remove("hidden");
}

function selectMonthPeriod(from, to) {
  periodMode.value = "month";
  dateFromInput.value = from;
  dateToInput.value = to;
  applyDateLimits();
  syncPeriodButton();
  setDefaultComparePeriod(true);
  closePeriodMenu();
  loadSelectedMonthFromCache();
}

function setText(id, value) {
  document.querySelector(`#${id}`).textContent = value;
}

function setOptionalText(id, value) {
  const element = document.querySelector(`#${id}`);
  if (element) {
    element.textContent = value;
  }
}

function formatMoney(value) {
  return rub.format(Number(value || 0));
}

function formatNumber(value) {
  return number.format(Number(value || 0));
}

function formatPercent(value) {
  const numberValue = Number(value || 0);
  return `${numberValue.toFixed(2).replace(".", ",")}%`;
}

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusBox.classList.toggle("error", isError);
}

function visibleDashboardErrors(errors = []) {
  return errors.filter((error) => {
    const text = String(error || "").toLowerCase();
    return !(
      text.includes("/v2/finance/realization")
      && text.includes("report")
      && text.includes("not found")
    );
  });
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(data.error || "Запрос не выполнен.");
  }
  return data;
}

function setAccountHeader(account) {
  currentAccount = account || null;
  if (!account) {
    accountLabel.textContent = "Аккаунт не выбран";
    return;
  }
  accountLabel.textContent = `${account.name || "Ozon аккаунт"} · ID ${account.client_id}`;
}

async function loadAccounts() {
  const data = await api("/api/accounts");
  ozonAccounts = data.accounts || [];
  setAccountHeader(data.active_account);
  accountForm.classList.remove("hidden");
  renderAccountList(data.active_client_id);
  return data;
}

function renderAccountList(activeClientId) {
  accountList.innerHTML = "";
  ozonAccounts.forEach((account) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `accountOption ${account.client_id === activeClientId ? "active" : ""}`;
    button.innerHTML = `
      <strong>${escapeHtml(account.name || "Ozon аккаунт")}</strong>
      <span>ID ${escapeHtml(account.client_id)}</span>
    `;
    button.addEventListener("click", () => switchAccount(account.client_id));
    accountList.appendChild(button);
  });
}

function updateUserChrome() {
  if (!currentUser) {
    return;
  }
  userLine.textContent = `${currentUser.login} - ${ROLE_TITLES[currentUser.role] || currentUser.role}`;
  adminTab.classList.toggle("hidden", !canManageAdmin(currentUser));
  if (!canManageAdmin(currentUser) && !adminView.classList.contains("hidden")) {
    switchTab("dashboard");
  }
}

async function switchAccount(clientId) {
  const data = await api("/api/accounts/select", {
    method: "POST",
    body: JSON.stringify({ client_id: clientId }),
  });
  currentUser = data.user;
  updateUserChrome();
  ozonAccounts = data.accounts || [];
  setAccountHeader(data.active_account);
  renderAccountList(data.active_client_id);
  accountDropdown.classList.add("hidden");
  tnvedItems = [];
  tnvedLoadedOnce = false;
  cacheLoadedOnce = false;
  apiLoadedOnce = false;
  tnvedMeta.textContent = "Товары еще не загружены.";
  if (!tnvedView.classList.contains("hidden")) {
    loadTnvedProducts();
  }
  if (!adminView.classList.contains("hidden") && canManageAdmin(currentUser)) {
    refreshAdminConfig().catch((error) => setStatus(error.message, true));
  }
  if (!dashboardView.classList.contains("hidden")) {
    loadDefaultDashboardSummary();
  }
}

function isUnitProductsTab(tab) {
  return tab === "unit" || tab === "unit-fbo" || tab === "unit-fbs";
}

function unitModeLabel(tab) {
  if (tab === "unit-fbs") {
    return "FBS";
  }
  return "FBO";
}

function closeUnitDropdown() {
  unitDropdown?.classList.add("hidden");
  unitTab?.setAttribute("aria-expanded", "false");
}

function switchTab(tab) {
  if (tab === "admin" && !canManageAdmin(currentUser)) {
    tab = "dashboard";
  }
  if (tab === "unit") {
    tab = "unit-fbo";
  }
  const isUnit = isUnitProductsTab(tab);
  const isTnved = tab === "tnved" || isUnit;
  const isCache = tab === "cache";
  const isTariffs = tab === "tariffs";
  const isApi = tab === "api";
  const isAdmin = tab === "admin";
  dashboardTab.classList.toggle("active", tab === "dashboard");
  tnvedTab.classList.toggle("active", tab === "tnved");
  unitTab.classList.toggle("active", isUnit);
  cacheTab.classList.toggle("active", isCache);
  tariffsTab.classList.toggle("active", isTariffs);
  apiTab.classList.toggle("active", isApi);
  adminTab.classList.toggle("active", isAdmin);
  dashboardView.classList.toggle("hidden", tab !== "dashboard");
  tnvedView.classList.toggle("hidden", !isTnved);
  cacheView.classList.toggle("hidden", !isCache);
  tariffsView.classList.toggle("hidden", !isTariffs);
  apiView.classList.toggle("hidden", !isApi);
  adminView.classList.toggle("hidden", !isAdmin);
  localStorage.setItem("ozonActiveTab", tab);
  closeUnitDropdown();
  if (isTnved) {
    activeProductsTab = tab;
    if (productsTitle) {
      productsTitle.textContent = isUnit ? `Юнит ${unitModeLabel(tab)}` : "Список товаров";
    }
    if (tnvedLoadedOnce) {
      renderTnved();
    }
  }
  if (isTnved && !tnvedLoadedOnce) {
    loadTnvedProducts();
  }
  if (isCache && !cacheLoadedOnce) {
    loadCacheStatus();
  }
  if (isApi && !apiLoadedOnce) {
    loadApiStatus();
  }
  if (isAdmin && canManageAdmin(currentUser)) {
    loadAdmin();
  }
}

async function showApp(user) {
  currentUser = user;
  loginView.classList.add("hidden");
  appView.classList.remove("hidden");
  loadAccounts().catch(() => setAccountHeader(null));
  updateUserChrome();
  setStatus("Загружаю вчерашний отчет из кэша...");
  if (canManageAdmin(user)) {
    loadAdmin();
  }
  switchTab(localStorage.getItem("ozonActiveTab") || "dashboard");
  loadDefaultDashboardSummary();
  loadTnvedProducts({ silent: true });
  startTnvedAutoRefresh();
}

function showLogin() {
  currentUser = null;
  currentAccount = null;
  ozonAccounts = [];
  cacheLoadedOnce = false;
  apiLoadedOnce = false;
  accountDropdown.classList.add("hidden");
  appView.classList.add("hidden");
  loginView.classList.remove("hidden");
  stopTnvedAutoRefresh();
}

function renderBars(containerId, items, valueKey = "amount") {
  const container = document.querySelector(`#${containerId}`);
  container.innerHTML = "";
  const max = Math.max(...items.map((item) => Math.abs(Number(item[valueKey] || 0))), 1);

  items.forEach((item) => {
    const value = Number(item[valueKey] || 0);
    const row = document.createElement("div");
    row.className = `barRow ${value < 0 ? "negative" : ""}`;
    row.innerHTML = `
      <div>
        <div class="barLabel" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
        <div class="barTrack"><div class="barFill" style="width:${Math.max(3, Math.abs(value) / max * 100)}%"></div></div>
      </div>
      <div class="barAmount">${valueKey === "count" ? formatNumber(value) : formatMoney(value)}</div>
    `;
    container.appendChild(row);
  });

  if (!items.length) {
    container.innerHTML = '<div class="small">Нет данных за выбранный период.</div>';
  }
}

function renderSegments(containerId, segments) {
  const container = document.querySelector(`#${containerId}`);
  if (!container) {
    return;
  }
  const total = segments.reduce((sum, segment) => sum + Math.abs(Number(segment.value || 0)), 0) || 1;
  container.innerHTML = segments
    .filter((segment) => Number(segment.value || 0) !== 0)
    .map((segment) => {
      const width = Math.max(4, Math.abs(Number(segment.value || 0)) / total * 100);
      return `<span class="${segment.className}" style="width:${width}%"></span>`;
    })
    .join("");
}

function periodLabel(period) {
  if (!period) {
    return "-";
  }
  return period.label || `${period.from} - ${period.to}`;
}

function setPeriodCaptions(period) {
  const caption = periodLabel(period);
  [
    "ordersPeriod",
    "salesPeriod",
    "logisticsPeriod",
    "adsPeriod",
    "commissionPeriod",
    "servicesPeriod",
    "fboOrderedPeriod",
    "fboDeliveredPeriod",
    "fboReturnsPeriod",
    "fboCancelledPeriod",
    "fbsOrderedPeriod",
    "fbsDeliveredPeriod",
    "fbsReturnsPeriod",
    "fbsCancelledPeriod",
    "paidStoragePeriod",
  ].forEach((id) => setOptionalText(id, caption));
}

function renderOperations(items) {
  const container = document.querySelector("#operationRows");
  container.innerHTML = "";
  const columns = [document.createElement("div"), document.createElement("div")];
  const columnHeights = [0, 0];
  columns.forEach((column) => {
    column.className = "operationColumn";
    container.appendChild(column);
  });

  (items || []).forEach((group, index) => {
    const groupId = `operationGroup${index}`;
    const card = document.createElement("article");
    card.className = "operationCard";
    card.innerHTML = `
      <div class="operationGroupRow">
        <div class="operationTitle">
          <strong>${escapeHtml(group.name)}</strong>
          <button type="button" class="operationToggle" aria-label="Свернуть или раскрыть список" aria-expanded="true" data-group="${groupId}">▾</button>
        </div>
        <strong class="operationAmount">${formatMoney(group.amount)}</strong>
      </div>
      <div class="operationChildren" data-parent="${groupId}"></div>
    `;
    const children = card.querySelector(".operationChildren");

    (group.items || []).forEach((item) => {
      const child = document.createElement("div");
      child.className = "operationChildRow";
      child.innerHTML = `
        <div class="operationChildInfo">
          <span class="operationChildName">${escapeHtml(item.name)}</span>
        </div>
        <strong class="operationAmount">${formatMoney(item.amount)}</strong>
      `;
      children.appendChild(child);
    });
    const targetColumnIndex = columnHeights[0] <= columnHeights[1] ? 0 : 1;
    columns[targetColumnIndex].appendChild(card);
    columnHeights[targetColumnIndex] += 1 + (group.items || []).length;
  });
  if (!items || !items.length) {
    container.innerHTML = '<div class="operationEmpty">Нет операций за выбранный период.</div>';
  }

  container.querySelectorAll(".operationToggle").forEach((button) => {
    button.addEventListener("click", () => {
      const groupId = button.dataset.group;
      const expanded = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", String(expanded));
      button.textContent = expanded ? "▾" : "▸";
      container.querySelector(`[data-parent="${groupId}"]`)?.classList.toggle("hidden", !expanded);
    });
  });
}

function profitCellValue(item, key) {
  const value = item[key];
  if (typeof value === "number") {
    return value;
  }
  const numberValue = Number(value);
  if (value !== "" && value !== null && value !== undefined && !Number.isNaN(numberValue)) {
    return numberValue;
  }
  return String(value || "").toLowerCase();
}

function isZeroProfitRow(item) {
  return PROFIT_ZERO_FIELDS.every((key) => Math.abs(Number(item[key] || 0)) < 0.005);
}

function getProfitRows(tableName, items, filterKeys) {
  const state = profitTableState[tableName];
  const query = state.filter.trim().toLowerCase();
  let rows = [...(items || [])];

  if (query) {
    rows = rows.filter((item) =>
      filterKeys.some((key) => String(item[key] ?? "").toLowerCase().includes(query))
    );
  }

  if ((tableName === "category" || tableName === "type") && !state.showZero) {
    rows = rows.filter((item) => !isZeroProfitRow(item));
  }

  rows.sort((left, right) => {
    const leftValue = profitCellValue(left, state.sortKey);
    const rightValue = profitCellValue(right, state.sortKey);
    let result = 0;
    if (typeof leftValue === "number" && typeof rightValue === "number") {
      result = leftValue - rightValue;
    } else {
      result = String(leftValue).localeCompare(String(rightValue), "ru", { numeric: true });
    }
    return state.sortDirection === "asc" ? result : -result;
  });

  updateProfitSortButtons(tableName);
  return rows;
}

function updateProfitSortButtons(tableName) {
  const state = profitTableState[tableName];
  document.querySelectorAll(`[data-profit-table="${tableName}"] [data-sort-key]`).forEach((button) => {
    const label = button.dataset.label || button.textContent.replace(/[\u25B2\u25BC]/g, "").trim();
    button.dataset.label = label;
    const isActive = button.dataset.sortKey === state.sortKey;
    const arrow = isActive && state.sortDirection === "asc" ? "&#9650;" : "&#9660;";
    button.classList.toggle("active", isActive);
    button.innerHTML = `<span class="sortLabel">${escapeHtml(label)}</span><span class="sortArrow">${arrow}</span>`;
  });
}

function setProfitSort(tableName, sortKey) {
  const state = profitTableState[tableName];
  if (state.sortKey === sortKey) {
    state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
  } else {
    state.sortKey = sortKey;
    state.sortDirection = "desc";
  }
  renderProfitTables();
}

function renderProfitTables() {
  if (!lastSummaryData) {
    updateProfitSortButtons("category");
    updateProfitSortButtons("type");
    updateProfitSortButtons("article");
    return;
  }
  const finance = lastSummaryData.finance || {};
  renderCategoryProfit(finance.by_category);
  renderTypeProfit(finance.by_product_type);
  renderArticleProfit(finance.by_article);
}

function emptyServiceProfitTotals() {
  return SERVICE_PROFIT_FIELDS.reduce((totals, field) => {
    totals[field] = 0;
    return totals;
  }, {});
}

function normalizeServiceProfitRow(item) {
  const row = { ...item };
  const sortingTotal = Math.abs(Number(row.service_sorting || 0));
  if (sortingTotal >= 0.01) {
    row.service_other = Number(row.service_other || 0) + sortingTotal;
    row.service_sorting = 0;
  }
  const breakdownTotal = SERVICE_PROFIT_FIELDS.reduce((total, field) => total + Math.abs(Number(row[field] || 0)), 0);
  const servicesTotal = Math.abs(Number(row.services || 0));
  if (servicesTotal >= 0.01 && breakdownTotal < 0.01) {
    row.service_other = servicesTotal;
  }
  return row;
}

function normalizeServiceProfitRows(items) {
  return (items || []).map(normalizeServiceProfitRow);
}

function addServiceProfitTotals(totals, item) {
  SERVICE_PROFIT_FIELDS.forEach((field) => {
    totals[field] += Number(item[field] || 0);
  });
}

function renderServiceProfitCells(item) {
  return SERVICE_PROFIT_FIELDS
    .map((field) => `<td>${formatMoney(-Math.abs(Number(item[field] || 0)))}</td>`)
    .join("");
}

function renderCategoryProfit(items) {
  const tbody = document.querySelector("#categoryProfitRows");
  if (!tbody) {
    return;
  }
  tbody.innerHTML = "";
  const rows = getProfitRows("category", normalizeServiceProfitRows(items), [
    "category",
    "items_count",
    "revenue",
    "commission",
    ...SERVICE_PROFIT_FIELDS,
    "returns",
    "paid_storage",
    "profit_before_cost",
    "buyout_cost",
    "net_profit",
  ]);

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="15">Нет данных по категориям за выбранный период.</td></tr>';
    return;
  }

  const totals = {
    items_count: 0,
    revenue: 0,
    commission: 0,
    services: 0,
    ...emptyServiceProfitTotals(),
    returns: 0,
    paid_storage: 0,
    profit_before_cost: 0,
    buyout_cost: 0,
    net_profit: 0,
  };

  rows.forEach((item) => {
    totals.items_count += Number(item.items_count || 0);
    totals.revenue += Number(item.revenue || 0);
    totals.commission += Number(item.commission || 0);
    totals.services += Number(item.services || 0);
    addServiceProfitTotals(totals, item);
    totals.returns += Number(item.returns || 0);
    totals.paid_storage += Number(item.paid_storage || 0);
    totals.profit_before_cost += Number(item.profit_before_cost || 0);
    totals.buyout_cost += Number(item.buyout_cost || 0);
    totals.net_profit += Number(item.profit_before_cost || 0) - Number(item.buyout_cost || 0);

    const profit = Number(item.profit_before_cost || 0);
    const buyoutCost = Number(item.buyout_cost || 0);
    const netProfit = profit - buyoutCost;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <strong>${escapeHtml(item.category || "Без категории")}</strong>
        <span>${formatNumber(item.types_count || 0)} типов</span>
      </td>
      <td>${formatNumber(item.items_count || 0)}</td>
      <td>${formatMoney(item.revenue)}</td>
      <td>${formatMoney(-Number(item.commission || 0))}</td>
      ${renderServiceProfitCells(item)}
      <td>${formatMoney(-Math.abs(Number(item.returns || 0)))}</td>
      <td>${formatMoney(-Math.abs(Number(item.paid_storage || 0)))}</td>
      <td class="${profit < 0 ? "negativeMoney" : "positiveMoney"}">${formatMoney(profit)}</td>
      <td>${formatMoney(-Math.abs(buyoutCost))}</td>
      <td class="${netProfit < 0 ? "negativeMoney" : "positiveMoney"}">${formatMoney(netProfit)}</td>
    `;
    tbody.appendChild(tr);
  });

  const totalRow = document.createElement("tr");
  totalRow.className = "categoryTotalRow";
  totalRow.innerHTML = `
    <td><strong>Итого</strong></td>
    <td>${formatNumber(totals.items_count)}</td>
    <td>${formatMoney(totals.revenue)}</td>
    <td>${formatMoney(-totals.commission)}</td>
    ${renderServiceProfitCells(totals)}
    <td>${formatMoney(-Math.abs(totals.returns))}</td>
    <td>${formatMoney(-Math.abs(totals.paid_storage))}</td>
    <td class="${totals.profit_before_cost < 0 ? "negativeMoney" : "positiveMoney"}">${formatMoney(totals.profit_before_cost)}</td>
    <td>${formatMoney(-Math.abs(totals.buyout_cost))}</td>
    <td class="${totals.net_profit < 0 ? "negativeMoney" : "positiveMoney"}">${formatMoney(totals.net_profit)}</td>
  `;
  tbody.appendChild(totalRow);
}

function renderTypeProfit(items) {
  const tbody = document.querySelector("#typeProfitRows");
  if (!tbody) {
    return;
  }
  tbody.innerHTML = "";
  const rows = getProfitRows("type", normalizeServiceProfitRows(items), [
    "type",
    "items_count",
    "revenue",
    "commission",
    ...SERVICE_PROFIT_FIELDS,
    "returns",
    "paid_storage",
    "profit_before_cost",
    "buyout_cost",
    "net_profit",
  ]);

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="15">Нет данных по типам за выбранный период.</td></tr>';
    return;
  }

  const totals = {
    items_count: 0,
    revenue: 0,
    commission: 0,
    services: 0,
    ...emptyServiceProfitTotals(),
    returns: 0,
    paid_storage: 0,
    profit_before_cost: 0,
    buyout_cost: 0,
    net_profit: 0,
  };

  rows.forEach((item) => {
    totals.items_count += Number(item.items_count || 0);
    totals.revenue += Number(item.revenue || 0);
    totals.commission += Number(item.commission || 0);
    totals.services += Number(item.services || 0);
    addServiceProfitTotals(totals, item);
    totals.returns += Number(item.returns || 0);
    totals.paid_storage += Number(item.paid_storage || 0);
    totals.profit_before_cost += Number(item.profit_before_cost || 0);
    totals.buyout_cost += Number(item.buyout_cost || 0);
    totals.net_profit += Number(item.profit_before_cost || 0) - Number(item.buyout_cost || 0);

    const profit = Number(item.profit_before_cost || 0);
    const buyoutCost = Number(item.buyout_cost || 0);
    const netProfit = profit - buyoutCost;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <strong>${escapeHtml(item.type || "Без типа")}</strong>
      </td>
      <td>${formatNumber(item.items_count || 0)}</td>
      <td>${formatMoney(item.revenue)}</td>
      <td>${formatMoney(-Number(item.commission || 0))}</td>
      ${renderServiceProfitCells(item)}
      <td>${formatMoney(-Math.abs(Number(item.returns || 0)))}</td>
      <td>${formatMoney(-Math.abs(Number(item.paid_storage || 0)))}</td>
      <td class="${profit < 0 ? "negativeMoney" : "positiveMoney"}">${formatMoney(profit)}</td>
      <td>${formatMoney(-Math.abs(buyoutCost))}</td>
      <td class="${netProfit < 0 ? "negativeMoney" : "positiveMoney"}">${formatMoney(netProfit)}</td>
    `;
    tbody.appendChild(tr);
  });

  const totalRow = document.createElement("tr");
  totalRow.className = "categoryTotalRow";
  totalRow.innerHTML = `
    <td><strong>Итого</strong></td>
    <td>${formatNumber(totals.items_count)}</td>
    <td>${formatMoney(totals.revenue)}</td>
    <td>${formatMoney(-totals.commission)}</td>
    ${renderServiceProfitCells(totals)}
    <td>${formatMoney(-Math.abs(totals.returns))}</td>
    <td>${formatMoney(-Math.abs(totals.paid_storage))}</td>
    <td class="${totals.profit_before_cost < 0 ? "negativeMoney" : "positiveMoney"}">${formatMoney(totals.profit_before_cost)}</td>
    <td>${formatMoney(-Math.abs(totals.buyout_cost))}</td>
    <td class="${totals.net_profit < 0 ? "negativeMoney" : "positiveMoney"}">${formatMoney(totals.net_profit)}</td>
  `;
  tbody.appendChild(totalRow);
}

function renderArticleProfit(items) {
  const tbody = document.querySelector("#articleProfitRows");
  if (!tbody) {
    return;
  }
  tbody.innerHTML = "";
  const rows = getProfitRows("article", normalizeServiceProfitRows(items), [
    "article",
    "sku",
    "name",
    "category",
    "type",
    "revenue",
    "commission",
    ...SERVICE_PROFIT_FIELDS,
    "returns",
    "paid_storage",
    "profit_before_cost",
    "buyout_cost",
    "net_profit",
  ]);

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="17">Нет данных по артикулам за выбранный период.</td></tr>';
    return;
  }

  const totals = {
    revenue: 0,
    commission: 0,
    services: 0,
    ...emptyServiceProfitTotals(),
    returns: 0,
    paid_storage: 0,
    profit_before_cost: 0,
    buyout_cost: 0,
    net_profit: 0,
  };

  rows.forEach((item) => {
    totals.revenue += Number(item.revenue || 0);
    totals.commission += Number(item.commission || 0);
    totals.services += Number(item.services || 0);
    addServiceProfitTotals(totals, item);
    totals.returns += Number(item.returns || 0);
    totals.paid_storage += Number(item.paid_storage || 0);
    totals.profit_before_cost += Number(item.profit_before_cost || 0);
    totals.buyout_cost += Number(item.buyout_cost || 0);
    totals.net_profit += Number(item.profit_before_cost || 0) - Number(item.buyout_cost || 0);

    const profit = Number(item.profit_before_cost || 0);
    const buyoutCost = Number(item.buyout_cost || 0);
    const netProfit = profit - buyoutCost;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <strong>${escapeHtml(item.article || "Без артикула")}</strong>
        <span>SKU ${escapeHtml(item.sku || "-")}</span>
      </td>
      <td>${escapeHtml(item.name || "-")}</td>
      <td>${escapeHtml(item.category || "Без категории")}</td>
      <td>${escapeHtml(item.type || "Без типа")}</td>
      <td>${formatMoney(item.revenue)}</td>
      <td>${formatMoney(-Number(item.commission || 0))}</td>
      ${renderServiceProfitCells(item)}
      <td>${formatMoney(-Math.abs(Number(item.returns || 0)))}</td>
      <td>${formatMoney(-Math.abs(Number(item.paid_storage || 0)))}</td>
      <td class="${profit < 0 ? "negativeMoney" : "positiveMoney"}">${formatMoney(profit)}</td>
      <td>${formatMoney(-Math.abs(buyoutCost))}</td>
      <td class="${netProfit < 0 ? "negativeMoney" : "positiveMoney"}">${formatMoney(netProfit)}</td>
    `;
    tbody.appendChild(tr);
  });

  const totalRow = document.createElement("tr");
  totalRow.className = "categoryTotalRow";
  totalRow.innerHTML = `
    <td><strong>Итого</strong></td>
    <td></td>
    <td></td>
    <td></td>
    <td>${formatMoney(totals.revenue)}</td>
    <td>${formatMoney(-totals.commission)}</td>
    ${renderServiceProfitCells(totals)}
    <td>${formatMoney(-Math.abs(totals.returns))}</td>
    <td>${formatMoney(-Math.abs(totals.paid_storage))}</td>
    <td class="${totals.profit_before_cost < 0 ? "negativeMoney" : "positiveMoney"}">${formatMoney(totals.profit_before_cost)}</td>
    <td>${formatMoney(-Math.abs(totals.buyout_cost))}</td>
    <td class="${totals.net_profit < 0 ? "negativeMoney" : "positiveMoney"}">${formatMoney(totals.net_profit)}</td>
  `;
  tbody.appendChild(totalRow);
}

function renderUsers(users) {
  usersList.innerHTML = "";
  users.forEach((user) => {
    const row = document.createElement("div");
    row.className = "userRow";
    row.innerHTML = `
      <strong>${escapeHtml(user.login)}</strong>
      <button type="button" ${currentUser && user.login === currentUser.login ? "disabled" : ""}>Удалить</button>
    `;
    row.querySelector("button").addEventListener("click", async () => {
      try {
        const data = await api(`/api/admin/users?login=${encodeURIComponent(user.login)}`, {
          method: "DELETE",
        });
        renderUsers(data.users);
        setStatus("Пользователь удален.");
      } catch (error) {
        setStatus(error.message, true);
      }
    });
    usersList.appendChild(row);
  });
}

function applyAdminConfig(data) {
  document.querySelector("#adminAccountName").value = data.name || "";
  document.querySelector("#adminClientId").value = data.client_id || "";
  const adminAccountLabel = [
    data.name || "",
    data.client_id ? `ID ${data.client_id}` : "",
  ].filter(Boolean).join(" · ");
  document.querySelector("#adminAccountNameHint").textContent = data.name
    ? data.name
    : "Название не настроено";
  document.querySelector("#adminClientIdHint").textContent = data.client_id
    ? `Client ID ${data.client_id}`
    : "Client ID не настроен";
  document.querySelector("#adminApiKey").placeholder = data.api_key_mask && adminAccountLabel
    ? `ключ ${data.api_key_mask}`
    : data.api_key_mask
    ? `Сейчас сохранен ключ ${data.api_key_mask}`
    : "API Key не настроен";
  document.querySelector("#performanceClientId").placeholder = data.performance_client_id_mask || "Client ID не настроен";
  document.querySelector("#performanceClientSecret").placeholder = data.performance_client_secret_mask || "Client Secret не настроен";
}

async function refreshAdminConfig() {
  const data = await api("/api/admin/config");
  applyAdminConfig(data);
  return data;
}

async function loadAdmin() {
  setStatus(comparisonHidden()
    ? "Загружаю основной период из Ozon..."
    : "Загружаю основной период и сравнение из Ozon...");
  try {
    setStatus("Загружаю настройки админ панели...");
    const data = await refreshAdminConfig();
    renderUsers(data.users || []);
    await loadAccounts();
  } catch (error) {
    setStatus(error.message, true);
  }
}

function summaryMetrics(data) {
  const finance = data.finance || {};
  const orders = data.orders || {};
  const revenue = Number(finance.revenue || 0);
  const salesBreakdown = finance.sales_breakdown || {};
  const salesRevenue = Number(salesBreakdown.sales || revenue);
  const partnerPrograms = Number(salesBreakdown.partner_programs || 0);
  const discountPoints = Number(salesBreakdown.discount_points || 0);
  const hasSalesBreakdown = Boolean(finance.sales_breakdown);
  const salesTotal = hasSalesBreakdown
    ? salesRevenue + partnerPrograms + discountPoints
    : revenue;
  const commission = Number(finance.commission || 0);
  const services = Number(finance.services || 0);
  const ads = Number(finance.ad_expenses || 0);
  const returns = Number(finance.returns || 0);
  const paidStorage = Number(finance.paid_storage || 0);
  const extraCosts = finance.extra_costs || { items: [], total: 0 };
  const extraCostItems = Array.isArray(extraCosts.items) ? extraCosts.items : [];
  const extraCostsTotal = Number(extraCosts.total || 0);
  const crossDockingItem = extraCostItems.find((item) => String(item.name || "").toLowerCase() === "кросс-докинг");
  const crossDocking = Number(crossDockingItem?.amount || 0);
  const otherCostItemsTotal = extraCostItems.reduce((total, item) => {
    if (item === crossDockingItem) {
      return total;
    }
    return total + Number(item.amount || 0);
  }, 0);
  const visibleCostItems = [
    { name: "Платное хранение", amount: paidStorage, className: "blue" },
    ...(crossDocking ? [{ name: "Кросс-докинг", amount: crossDocking, className: "brown" }] : []),
    ...(Math.abs(otherCostItemsTotal) >= 0.01
      ? [{
          name: "Прочие начисления",
          amount: otherCostItemsTotal,
          className: otherCostItemsTotal < 0 ? "teal" : "brown",
        }]
      : []),
  ];
  const expenses = Number(finance.expenses || 0);
  const buyoutCostTotal = (finance.by_article || []).reduce((total, item) => total + Number(item.buyout_cost || 0), 0);
  const servicesTotal = commission + services + ads;
  const costsTotal = paidStorage + extraCostsTotal;
  const tax = calculateTaxAmount({
    salesRevenue,
    partnerPrograms,
    servicesTotal,
    costsTotal,
    buyoutCostTotal,
  });
  const taxAmount = tax.calculated ? tax.amount : 0;
  const visibleCostItemsWithTax = [
    ...visibleCostItems,
    ...(taxAmount >= 0.01 ? [{ name: "Налог по режиму", amount: taxAmount, className: "blue" }] : []),
  ];
  const costsTotalWithTax = costsTotal + taxAmount;
  const profit = salesTotal - servicesTotal - costsTotal;
  const profitBase = servicesTotal + costsTotal;
  const otherServices = Math.max(0, expenses - servicesTotal - returns);
  const margin = salesTotal ? (profit / salesTotal) * 100 : 0;
  const roi = profitBase ? (profit / profitBase) * 100 : 0;
  const drr = salesTotal ? (ads / salesTotal) * 100 : 0;
  const netProfit = profit - buyoutCostTotal - taxAmount;
  const netProfitBase = profitBase + buyoutCostTotal + taxAmount;
  const netMargin = salesTotal ? (netProfit / salesTotal) * 100 : 0;
  const netRoi = netProfitBase ? (netProfit / netProfitBase) * 100 : 0;

  return {
    finance,
    orders,
    salesTotal,
    salesRevenue,
    partnerPrograms,
    discountPoints,
    commission,
    services,
    ads,
    returns,
    paidStorage,
    visibleCostItems: visibleCostItemsWithTax,
    costsTotal,
    costsTotalWithTax,
    servicesTotal,
    otherServices,
    buyoutCostTotal,
    tax,
    taxAmount,
    profit,
    margin,
    roi,
    drr,
    netProfit,
    netMargin,
    netRoi,
    ordersCount: Number(orders.orders_count || 0),
    fboOrdered: Number(orders.fbo_ordered || 0),
    fboDelivered: Number(orders.fbo_delivered || 0),
    fboReturns: Number(orders.fbo_returns || 0),
    fboCancelled: Number(orders.fbo_cancelled || 0),
    fbsOrdered: Number(orders.fbs_ordered || 0),
    fbsDelivered: Number(orders.fbs_delivered || 0),
    fbsReturns: Number(orders.fbs_returns || 0),
    fbsCancelled: Number(orders.fbs_cancelled || 0),
  };
}

function renderCostsList(items) {
  const costsList = document.querySelector("#costsList");
  if (!costsList) {
    return;
  }

  costsList.innerHTML = "";
  items.forEach((item) => {
    const row = document.createElement("div");
    row.innerHTML = `
      <span class="dot ${item.className || "brown"}"></span>
      <span>${escapeHtml(item.name)}</span>
      <strong>${formatMoney(item.amount)}</strong>
    `;
    costsList.appendChild(row);
  });
}

function ensureNetProfitTaxRow() {
  const rows = document.querySelector(".netProfitBlock .profitRows");
  if (!rows) {
    return null;
  }
  let value = document.querySelector("#netProfitTax");
  if (value) {
    return value;
  }
  const row = document.createElement("div");
  row.innerHTML = "<span>Налог</span><strong id=\"netProfitTax\">-</strong>";
  rows.insertAdjacentElement("afterbegin", row);
  return row.querySelector("#netProfitTax");
}

const DAILY_COMPARISON_METRICS = [
  { id: "orders", key: "ordersCount", type: "number" },
  { id: "salesCardAmount", key: "salesTotal", type: "money" },
  { id: "logisticsCardAmount", key: "services", type: "money" },
  { id: "ads", key: "ads", type: "money" },
  { id: "commission", key: "commission", type: "money" },
  { id: "allServicesCardAmount", key: "servicesTotal", type: "money" },
  { id: "fboOrdered", key: "fboOrdered", type: "number" },
  { id: "fboDelivered", key: "fboDelivered", type: "number" },
  { id: "fboReturns", key: "fboReturns", type: "number" },
  { id: "fboCancelled", key: "fboCancelled", type: "number" },
  { id: "fbsOrdered", key: "fbsOrdered", type: "number" },
  { id: "fbsDelivered", key: "fbsDelivered", type: "number" },
  { id: "fbsReturns", key: "fbsReturns", type: "number" },
  { id: "fbsCancelled", key: "fbsCancelled", type: "number" },
  { id: "paidStorageCardAmount", key: "paidStorage", type: "money" },
];

function formatSignedMoney(value) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${rub.format(Math.abs(Number(value || 0)))}`;
}

function formatSignedNumber(value) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatNumber(Math.abs(Number(value || 0)))}`;
}

function formatSignedPercent(value) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(Number(value || 0)).toFixed(1).replace(".", ",")}%`;
}

function comparisonPeriodLabel(data) {
  if (!data?.period) {
    return "";
  }
  return data.period.label || `${data.period.from} - ${data.period.to}`;
}

function renderCardComparison(valueId, currentValue, compareValue, type, compareLabel) {
  const valueElement = document.querySelector(`#${valueId}`);
  const card = valueElement?.closest(".dailyCard");
  if (!valueElement || !card) {
    return;
  }

  let deltaElement = card.querySelector(".comparisonDelta");
  if (!deltaElement) {
    deltaElement = document.createElement("div");
    deltaElement.className = "comparisonDelta";
    valueElement.insertAdjacentElement("afterend", deltaElement);
  }

  const current = Number(currentValue || 0);
  const compare = Number(compareValue || 0);
  const delta = current - compare;
  const percent = Math.abs(compare) >= 0.005
    ? (delta / Math.abs(compare)) * 100
    : delta === 0
      ? 0
      : delta > 0
        ? 100
        : -100;
  const formattedDelta = type === "money" ? formatSignedMoney(delta) : formatSignedNumber(delta);
  deltaElement.className = `comparisonDelta ${delta > 0 ? "up" : delta < 0 ? "down" : "neutral"}`;
  deltaElement.textContent = `${formattedDelta} · ${formatSignedPercent(percent)}`;
  deltaElement.title = `Сравнение с периодом ${compareLabel}: ${type === "money" ? formatMoney(compare) : formatNumber(compare)}`;
}

function clearCardComparisons() {
  document.querySelectorAll(".comparisonDelta").forEach((element) => element.remove());
}

function comparisonHidden() {
  return Boolean(hideComparisonInput?.checked);
}

function syncComparisonVisibility() {
  const hidden = comparisonHidden();
  document.querySelector(".comparisonGroup")?.classList.toggle("comparisonHidden", hidden);
  compareDateFromInput.disabled = hidden;
  compareDateToInput.disabled = hidden;
  if (hidden) {
    clearCardComparisons();
  } else {
    setDefaultComparePeriod();
    if (lastSummaryData && lastCompareData) {
      renderDailyComparisons(lastSummaryData, lastCompareData);
    }
  }
}

function renderDailyComparisons(data, compareData) {
  if (comparisonHidden() || !compareData) {
    clearCardComparisons();
    return;
  }
  const currentMetrics = summaryMetrics(data);
  const compareMetrics = summaryMetrics(compareData);
  const compareLabel = comparisonPeriodLabel(compareData);
  DAILY_COMPARISON_METRICS.forEach((metric) => {
    renderCardComparison(
      metric.id,
      currentMetrics[metric.key],
      compareMetrics[metric.key],
      metric.type,
      compareLabel
    );
  });
}

function render(data, compareData = null) {
  lastSummaryData = data;
  lastCompareData = compareData;
  const {
    finance,
    orders,
    salesTotal,
    salesRevenue,
    partnerPrograms,
    discountPoints,
    commission,
    services,
    ads,
    returns,
    paidStorage,
    visibleCostItems,
    costsTotal,
    costsTotalWithTax,
    servicesTotal,
    otherServices,
    buyoutCostTotal,
    taxAmount,
    profit,
    margin,
    roi,
    drr,
    netProfit,
    netMargin,
    netRoi,
  } = summaryMetrics(data);

  setText("revenue", formatMoney(salesTotal));
  setText("orders", formatNumber(orders.orders_count));
  setText("expenses", formatMoney(costsTotalWithTax));
  setText("ads", formatMoney(ads));
  setText("commission", formatMoney(commission));
  setText("profit", formatMoney(profit));
  setOptionalText("netProfit", formatMoney(netProfit));
  const netProfitTaxElement = ensureNetProfitTaxRow();
  if (netProfitTaxElement) {
    netProfitTaxElement.textContent = taxAmount >= 0.01 ? formatMoney(taxAmount) : "-";
  }

  setOptionalText("fboOrders", formatNumber(orders.fbo_orders));
  setOptionalText("fbsOrders", formatNumber(orders.fbs_orders));
  setOptionalText("units", formatNumber(orders.ordered_units));
  setOptionalText("revenueSales", formatMoney(salesRevenue));
  setOptionalText("partnerProgramsValue", formatMoney(partnerPrograms));
  setOptionalText("discountPointsValue", formatMoney(discountPoints));
  setOptionalText("returnsValue", formatMoney(returns));
  setOptionalText("servicesTotal", formatMoney(servicesTotal));
  setOptionalText("commissionValue", formatMoney(commission));
  setOptionalText("logisticsValue", formatMoney(services));
  setOptionalText("adsValue", formatMoney(ads));
  setOptionalText("otherServicesValue", formatMoney(otherServices));
  setOptionalText("costCommissionValue", formatMoney(commission));
  setOptionalText("costServicesValue", formatMoney(services));
  setOptionalText("returnsCostValue", formatMoney(returns));
  setOptionalText("paidStorageCostValue", formatMoney(paidStorage));
  setOptionalText("profitMargin", formatPercent(margin));
  setOptionalText("profitRoi", formatPercent(roi));
  setOptionalText("profitDrr", formatPercent(drr));
  setOptionalText("netProfitMargin", formatPercent(netMargin));
  setOptionalText("netProfitRoi", formatPercent(netRoi));
  setOptionalText("netProfitDrr", formatPercent(drr));
  setOptionalText("salesCardAmount", formatMoney(salesTotal));
  setOptionalText("logisticsCardAmount", formatMoney(services));
  setOptionalText("allServicesCardAmount", formatMoney(servicesTotal));
  setOptionalText("fboOrdered", formatNumber(orders.fbo_ordered));
  setOptionalText("fboDelivered", formatNumber(orders.fbo_delivered));
  setOptionalText("fboReturns", formatNumber(orders.fbo_returns));
  setOptionalText("fboCancelled", formatNumber(orders.fbo_cancelled));
  setOptionalText("fbsOrdered", formatNumber(orders.fbs_ordered));
  setOptionalText("fbsDelivered", formatNumber(orders.fbs_delivered));
  setOptionalText("fbsReturns", formatNumber(orders.fbs_returns));
  setOptionalText("fbsCancelled", formatNumber(orders.fbs_cancelled));
  setOptionalText("paidStorageCardAmount", formatMoney(paidStorage));
  setOptionalText("ordersNote", `${formatNumber(orders.ordered_units)} шт. заказано`);
  setPeriodCaptions(data.period);
  renderSegments("salesTrack", [
    { value: salesRevenue, className: "green" },
    { value: partnerPrograms, className: "teal" },
    { value: discountPoints, className: "mint" },
  ]);
  renderSegments("servicesTrack", [
    { value: commission, className: "yellow" },
    { value: services, className: "sky" },
    { value: ads, className: "purple" },
    { value: otherServices, className: "teal" },
  ]);
  renderSegments("costsTrack", [
    ...visibleCostItems.map((item) => ({
      value: item.amount,
      className: item.className,
    })),
  ]);
  renderCostsList(visibleCostItems);
  renderDailyComparisons(data, compareData);
  applyDailyCardsVisibility();

  if (document.querySelector("#financeBars")) {
    renderBars("financeBars", [
      { name: "Выручка", amount: salesTotal },
      { name: "Комиссии", amount: -commission },
      { name: "Услуги и доставка", amount: -services },
      { name: "Реклама", amount: -ads },
      ...visibleCostItems.map((item) => ({ name: item.name, amount: -Number(item.amount || 0) })),
      { name: "Себестоимость выкупленных", amount: -buyoutCostTotal },
      { name: "Итого до себестоимости", amount: profit },
      { name: "Чистая прибыль", amount: netProfit },
    ]);
  }
  if (document.querySelector("#statusBars")) {
    renderBars("statusBars", orders.status_counts, "count");
  }
  renderOperations(finance.all_operations || finance.by_type);
  renderProfitTables();

  const visibleErrors = visibleDashboardErrors(data.errors);
  const visibleCompareErrors = visibleDashboardErrors(compareData?.errors);
  const warning = visibleErrors.length ? ` Есть предупреждения: ${visibleErrors.join(" | ")}` : "";
  const compareWarning = visibleCompareErrors.length ? ` Предупреждения сравнения: ${visibleCompareErrors.join(" | ")}` : "";
  const compareText = compareData ? ` Сравнение: ${comparisonPeriodLabel(compareData)}.` : "";
  setStatus(
    `Готово. Период: ${data.period.label || `${data.period.from} - ${data.period.to}`}.${compareText}${warning}${compareWarning}`,
    Boolean(visibleErrors.length || visibleCompareErrors.length)
  );
}

function startTnvedAutoRefresh() {
  stopTnvedAutoRefresh();
  tnvedTimer = window.setInterval(() => {
    loadTnvedProducts({ silent: true });
    if (!cacheView.classList.contains("hidden")) {
      loadCacheStatus({ silent: true });
    }
  }, 5 * 60 * 1000);
}

function stopTnvedAutoRefresh() {
  if (tnvedTimer) {
    window.clearInterval(tnvedTimer);
    tnvedTimer = null;
  }
}

async function loadTnvedProducts(options = {}) {
  if (!options.silent) {
    tnvedMeta.textContent = "Загружаю товары Ozon...";
  }
  tnvedRefresh.disabled = true;
  const started = performance.now();
  try {
    const data = await api(`/api/tnved${options.force ? "?refresh=1" : ""}`);
    tnvedItems = data.items || [];
    tnvedLoadedOnce = true;
    tnvedLastDuration = data.duration_sec || ((performance.now() - started) / 1000);
    renderTnved();
    renderTnvedMeta(data);
    if (data.cache?.loading || data.cache?.refresh_started) {
      window.setTimeout(() => {
        loadTnvedProducts({ silent: true });
        if (!cacheView.classList.contains("hidden")) {
          loadCacheStatus({ silent: true });
        }
      }, 15000);
    }
  } catch (error) {
    tnvedMeta.textContent = error.message;
    tnvedMeta.classList.add("errorText");
  } finally {
    tnvedRefresh.disabled = false;
  }
}

function renderTnvedMeta(data = null) {
  const updatedAt = data?.updated_at ? formatDateTime(data.updated_at) : formatDateTime(new Date().toISOString());
  const nextAt = data?.next_update_at ? formatDateTime(data.next_update_at) : formatDateTime(new Date(Date.now() + 5 * 60 * 1000).toISOString());
  const duration = data?.duration_sec ?? tnvedLastDuration ?? 0;
  const cache = data?.cache || {};
  const cacheNote = cache.loading
    ? " Кэша еще нет, первая загрузка идет фоном."
    : cache.refresh_started
      ? " Показан сохраненный кэш, обновление Ozon идет фоном."
      : cache.persisted
        ? " Показан сохраненный кэш."
        : "";
  tnvedMeta.classList.remove("errorText");
  tnvedMeta.textContent = `${tnvedItems.length} товаров Ozon, обновлено: ${updatedAt}, длительность: ${duration} сек., следующее: ${nextAt}.${cacheNote}`;
}

async function loadCacheStatus(options = {}) {
  if (!options.silent) {
    cacheStatus.textContent = "Проверяю кэш по товарам...";
  }
  try {
    const data = await api("/api/cache");
    cacheLoadedOnce = true;
    const productMinutes = Math.round((data.ttl_seconds || 300) / 60);
    const reportMinutes = Math.round((data.report_ttl_seconds || 1800) / 60);
    cacheStatus.textContent = `Кэш по товарам хранится отдельно для каждого Client ID. Кэш отчетов за вчера обновляется каждые ${reportMinutes} мин. Период 06.07 хранится отдельно для каждого ID и обновляется по расписанию.`;
    cacheRows.innerHTML = "";
    const productTitle = document.createElement("div");
    productTitle.className = "cacheSectionTitle";
    productTitle.textContent = `Кэш по товарам, обновление каждые ${productMinutes} мин.`;
    cacheRows.appendChild(productTitle);
    (data.items || []).forEach((item) => {
      const row = document.createElement("div");
      row.className = "cacheRow";
      const state = item.refreshing
        ? "Обновляется"
        : !item.has_cache
          ? "Кэша еще нет"
          : item.stale
            ? "Ожидает обновления"
            : "Свежий";
      row.innerHTML = `
        <div>
          <strong>${escapeHtml(item.name || "Ozon аккаунт")}</strong>
          <span>ID ${escapeHtml(item.client_id)}</span>
        </div>
        <div>
          <span class="small">Товаров</span>
          <strong>${formatNumber(item.items_count || 0)}</strong>
        </div>
        <div>
          <span class="small">Обновлено</span>
          <strong>${item.updated_at ? formatDateTime(item.updated_at) : "-"}</strong>
        </div>
        <div>
          <span class="small">Следующее</span>
          <strong>${item.expires_at ? formatDateTime(item.expires_at) : "-"}</strong>
        </div>
        <div class="cacheState ${item.refreshing ? "loading" : item.stale ? "stale" : item.has_cache ? "fresh" : ""}">${state}</div>
      `;
      cacheRows.appendChild(row);
    });
    const reportTitle = document.createElement("div");
    reportTitle.className = "cacheSectionTitle";
    reportTitle.textContent = `Кэш отчетов, обновление каждые ${reportMinutes} мин.`;
    cacheRows.appendChild(reportTitle);
    (data.report_items || []).forEach((item) => {
      const row = document.createElement("div");
      row.className = "cacheRow reportCacheRow";
      const current = item.current_period || {};
      const compare = item.compare_period || {};
      const state = item.stopped
        ? "На стопе"
        : item.refreshing
          ? "Обновляется"
          : !item.has_cache
            ? "Кэша еще нет"
            : item.stale
              ? "Ожидает обновления"
              : "Свежий";
      const nextUpdateAt = item.stopped ? "" : (item.expires_at || item.next_attempt_at || "");
      const cacheKind = item.cache_kind === "period" ? "Выбранный период" : "Вчерашний отчет";
      row.innerHTML = `
        <div>
          <strong>${escapeHtml(item.name || "Ozon аккаунт")}</strong>
          <span>ID ${escapeHtml(item.client_id)} · ${cacheKind}</span>
        </div>
        <div>
          <span class="small">Период</span>
          <strong>${escapeHtml(formatShortRange(current))}</strong>
        </div>
        <div>
          <span class="small">Сравнение</span>
          <strong>${escapeHtml(formatShortRange(compare))}</strong>
        </div>
        <div>
          <span class="small">Обновлено</span>
          <strong>${item.updated_at ? formatDateTime(item.updated_at) : "-"}</strong>
        </div>
        <div>
          <span class="small">Следующее</span>
          <strong>${nextUpdateAt ? formatDateTime(nextUpdateAt) : "-"}</strong>
        </div>
        <div class="cacheState ${item.stopped ? "stale" : item.refreshing ? "loading" : item.stale ? "stale" : item.has_cache ? "fresh" : ""}">${state}</div>
      `;
      cacheRows.appendChild(row);
    });
    if (!(data.items || []).length && !(data.report_items || []).length) {
      cacheRows.innerHTML = '<div class="small">Нет доступных аккаунтов для кэша.</div>';
    }
  } catch (error) {
    cacheStatus.textContent = error.message;
    cacheStatus.classList.add("errorText");
  }
}

function explainApiMessage(item) {
  const text = `${item.message || ""}`.toLowerCase();
  if (String(item.status || "") === "429" || text.includes("requests limit exceeded") || text.includes("parallel requests")) {
    return "Ozon временно ограничил запросы: для этого Seller ID нельзя запускать параллельные запросы. Нужна последовательная очередь, пауза 2-5 секунд между тяжелыми запросами и без пачки месячных обновлений одновременно.";
  }
  if (text.includes("max_offset_exceeded")) {
    return "Слишком большой объем выдачи для одного запроса. Период нужно дробить на меньшие части.";
  }
  if (String(item.status || "") === "400") {
    return "Ozon отклонил параметры запроса. Обычно это слишком длинный период или неверный формат фильтра.";
  }
  return item.hint || "";
}

async function loadApiStatus(options = {}) {
  if (!apiStatus || !apiRows) {
    return;
  }
  if (!options.silent) {
    apiStatus.textContent = "Проверяю статусы Ozon API...";
  }
  try {
    const data = await api("/api/ozon-endpoints");
    apiLoadedOnce = true;
    const items = data.items || [];
    const errorCount = items.filter((item) => item.ok === false).length;
    apiStatus.textContent = errorCount
      ? `Найдено ошибок: ${errorCount}. При 429 запросы надо выполнять по одному для каждого Seller ID.`
      : "Ошибок по последним обращениям не найдено.";
    apiRows.innerHTML = `
      <div class="apiTableWrap">
        <table class="apiTable">
          <thead>
            <tr>
              <th>Аккаунт</th>
              <th>Endpoint</th>
              <th>Статус</th>
              <th>Последний ответ</th>
              <th>Когда</th>
              <th>Что значит</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item) => {
              const stateClass = item.ok === true ? "fresh" : item.ok === false ? "stale" : "";
              const state = item.ok === true ? "OK" : item.ok === false ? `Ошибка ${item.status || ""}`.trim() : "Нет данных";
              const message = item.message || (item.ok === true ? "OK" : "-");
              return `
                <tr>
                  <td>
                    <strong>${escapeHtml(item.account_name || "Ozon аккаунт")}</strong>
                    <span>ID ${escapeHtml(item.client_id || "")}</span>
                  </td>
                  <td>
                    <strong>${escapeHtml(item.name || item.path || "")}</strong>
                    <code>${escapeHtml(item.path || "")}</code>
                  </td>
                  <td><span class="cacheState ${stateClass}">${escapeHtml(state)}</span></td>
                  <td class="apiMessage">${escapeHtml(message)}</td>
                  <td>${item.updated_at ? formatDateTime(item.updated_at) : "-"}</td>
                  <td class="apiHint">${escapeHtml(explainApiMessage(item))}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
    if (!items.length) {
      apiRows.innerHTML = '<div class="small">Нет доступных аккаунтов для проверки API.</div>';
    }
  } catch (error) {
    apiStatus.textContent = error.message;
    apiStatus.classList.add("errorText");
  }
}

function renderTnved() {
  renderColumnsDropdown();
  renderTnvedHead();
  renderTnvedRows();
}

function allTnvedColumns() {
  if (!isUnitProductsTab(activeProductsTab)) {
    return TNVED_COLUMNS;
  }
  return TNVED_COLUMNS.flatMap((column) => (
    column.key === "cost_price"
      ? [column, UNIT_COMMISSION_PERCENT_COLUMN, UNIT_COMMISSION_RUB_COLUMN, TNVED_COLUMNS.find((item) => item.key === "volume_liters"), UNIT_PROFIT_COLUMN]
      : column.key === "volume_liters" ? [] : [column]
  ));
}

function visibleColumns() {
  return allTnvedColumns().filter((column) => {
    if (isUnitProductsTab(activeProductsTab) && column.key === "tnved") {
      return false;
    }
    return tnvedState.visible[column.key] !== false;
  });
}

function tnvedCellValue(item, key) {
  if (key === "unit_profit") {
    const sellPrice = Number(item.discount_price || item.price || 0);
    const costPrice = Number(item.cost_price || 0);
    const commissionRub = Number(tnvedCellValue(item, "commission_rub") || 0);
    return sellPrice - costPrice - commissionRub;
  }
  if (key === "commission_rub") {
    const commissionPercent = tnvedCellValue(item, "commission_percent");
    const sellPrice = Number(item.discount_price || item.price || 0);
    if (commissionPercent === "" || commissionPercent === null || commissionPercent === undefined || !sellPrice) {
      return null;
    }
    return sellPrice * Number(commissionPercent || 0) / 100;
  }
  if (key === "commission_percent") {
    const modeValue = activeProductsTab === "unit-fbs"
      ? item.fbs_commission_percent
      : item.fbo_commission_percent;
    const rawValue = modeValue
      ?? item.commission_percent
      ?? item.commission_rate
      ?? item.sale_commission_percent
      ?? item.ozon_commission_percent
      ?? item.commissionPercent
      ?? item.commissionRate
      ?? null;
    if (rawValue === "" || rawValue === null || rawValue === undefined) {
      return null;
    }
    const numberValue = Number(rawValue);
    return Math.abs(numberValue) <= 1 ? numberValue * 100 : numberValue;
  }
  return item[key];
}

function tnvedColumnWidth(column) {
  const width = Number(tnvedState.widths?.[column.key] || 0);
  return width >= MIN_TNVED_COLUMN_WIDTH ? width : null;
}

function applyTnvedColumnWidth(cell, column) {
  const width = tnvedColumnWidth(column);
  if (!width) {
    return;
  }
  cell.style.width = `${width}px`;
  cell.style.minWidth = `${width}px`;
  cell.style.maxWidth = `${width}px`;
}

function applyTnvedColumnWidthByKey(key) {
  const column = allTnvedColumns().find((item) => item.key === key);
  if (!column) {
    return;
  }
  document.querySelectorAll(`.tnvedCol-${key}`).forEach((cell) => applyTnvedColumnWidth(cell, column));
}

function startTnvedColumnResize(event, column, th) {
  if (event.button !== 0) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  closeFilterMenu();

  const startX = event.clientX;
  const startWidth = th.getBoundingClientRect().width;
  document.body.classList.add("columnResizing");

  const onPointerMove = (moveEvent) => {
    const nextWidth = Math.max(MIN_TNVED_COLUMN_WIDTH, Math.round(startWidth + moveEvent.clientX - startX));
    tnvedState.widths[column.key] = nextWidth;
    applyTnvedColumnWidthByKey(column.key);
  };

  const onPointerUp = () => {
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.body.classList.remove("columnResizing");
    saveTnvedColumns();
  };

  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
}

function renderColumnsDropdown() {
  columnsDropdown.innerHTML = "";
  allTnvedColumns()
    .filter((column) => !(isUnitProductsTab(activeProductsTab) && column.key === "tnved"))
    .forEach((column) => {
    const label = document.createElement("label");
    label.className = "columnOption";
    label.innerHTML = `
      <input type="checkbox" ${tnvedState.visible[column.key] !== false ? "checked" : ""} />
      <span>${column.title}</span>
    `;
    label.querySelector("input").addEventListener("change", (event) => {
      tnvedState.visible[column.key] = event.target.checked;
      saveTnvedColumns();
      renderTnved();
    });
    columnsDropdown.appendChild(label);
  });
}

function renderTnvedHead() {
  const tr = document.createElement("tr");
  visibleColumns().forEach((column) => {
    const th = document.createElement("th");
    th.className = `tnvedCol-${column.key}`;
    applyTnvedColumnWidth(th, column);
    th.innerHTML = `
      <div class="thInner">
        <span>${column.title}</span>
        <button class="filterButton ${tnvedState.filters[column.key] ? "active" : ""}" type="button">▾</button>
      </div>
      <span class="columnResizeHandle" title="Потянуть, чтобы изменить ширину столбца"></span>
    `;
    const filterButton = th.querySelector(".filterButton");
    filterButton.addEventListener("click", (event) => {
      event.stopPropagation();
      openFilterMenu(column, filterButton);
    });
    th.querySelector(".columnResizeHandle").addEventListener("pointerdown", (event) => {
      startTnvedColumnResize(event, column, th);
    });
    tr.appendChild(th);
  });
  tnvedHead.innerHTML = "";
  tnvedHead.appendChild(tr);
}

function openFilterMenu(column, anchor) {
  closeFilterMenu();
  const menu = document.createElement("div");
  menu.className = "filterMenu";
  const currentFilter = tnvedState.filters[column.key] || "";
  menu.innerHTML = `
    <button type="button" data-sort="asc">Сортировать от А к Я / 0-9</button>
    <button type="button" data-sort="desc">Сортировать от Я к А / 9-0</button>
    <strong>Фильтр</strong>
    <input value="${escapeAttr(currentFilter)}" placeholder="Найти товар" />
    <button type="button" data-reset="1">Сбросить</button>
  `;
  document.body.appendChild(menu);
  const rect = anchor.getBoundingClientRect();
  menu.style.left = `${Math.min(rect.left, window.innerWidth - 260)}px`;
  menu.style.top = `${rect.bottom + 6}px`;
  menu.querySelectorAll("[data-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      tnvedState.sort = { key: column.key, direction: button.dataset.sort };
      closeFilterMenu();
      renderTnved();
    });
  });
  const input = menu.querySelector("input");
  input.focus();
  input.addEventListener("input", () => {
    const value = input.value.trim();
    if (value) {
      tnvedState.filters[column.key] = value;
    } else {
      delete tnvedState.filters[column.key];
    }
    renderTnvedRows();
    renderTnvedHead();
  });
  menu.querySelector("[data-reset]").addEventListener("click", () => {
    delete tnvedState.filters[column.key];
    closeFilterMenu();
    renderTnved();
  });
}

function closeFilterMenu() {
  document.querySelectorAll(".filterMenu").forEach((menu) => menu.remove());
}

function filteredTnvedItems() {
  const search = tnvedState.search.toLowerCase();
  let items = [...tnvedItems];
  if (search) {
    items = items.filter((item) => {
      const haystack = [item.offer_id, item.sku, item.product_id, item.name, item.category, item.type, item.tnved]
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });
  }
  if (tnvedState.onlyStock) {
    items = items.filter((item) => Number(item.fbo || 0) + Number(item.fbs || 0) > 0);
  }
  Object.entries(tnvedState.filters).forEach(([key, value]) => {
    const query = String(value).toLowerCase();
    items = items.filter((item) => String(tnvedCellValue(item, key) ?? "").toLowerCase().includes(query));
  });
  const sortColumn = allTnvedColumns().find((column) => column.key === tnvedState.sort.key);
  if (sortColumn || tnvedState.sort.key === "product_id") {
    const direction = tnvedState.sort.direction === "desc" ? -1 : 1;
    const sortType = sortColumn?.type || "number";
    const sortKey = sortColumn?.key || "product_id";
    items.sort((a, b) => compareValues(tnvedCellValue(a, sortKey), tnvedCellValue(b, sortKey), sortType) * direction);
  }
  return items;
}

function compareValues(a, b, type) {
  if (type === "number") {
    return Number(a || 0) - Number(b || 0);
  }
  if (type === "article") {
    return compareArticleValues(a, b);
  }
  return String(a ?? "").localeCompare(String(b ?? ""), "ru", { numeric: true, sensitivity: "base" });
}

function compareArticleValues(a, b) {
  const left = String(a ?? "");
  const right = String(b ?? "");
  const leftIsLatin = /^[A-Za-z0-9]/.test(left);
  const rightIsLatin = /^[A-Za-z0-9]/.test(right);
  if (leftIsLatin !== rightIsLatin) {
    return leftIsLatin ? 1 : -1;
  }
  return left.localeCompare(right, "en", { numeric: true, sensitivity: "base" });
}

function renderTnvedRows() {
  const columns = visibleColumns();
  const items = filteredTnvedItems();
  const fragment = document.createDocumentFragment();
  items.forEach((item) => {
    const tr = document.createElement("tr");
    columns.forEach((column) => {
      const td = document.createElement("td");
      td.className = `tnvedCol-${column.key}`;
      applyTnvedColumnWidth(td, column);
      td.innerHTML = renderTnvedCell(column, item);
      tr.appendChild(td);
    });
    fragment.appendChild(tr);
  });
  tnvedBody.innerHTML = "";
  tnvedBody.appendChild(fragment);
}

function renderTnvedCell(column, item) {
  if (column.type === "image") {
    return item.photo ? `<img class="productPhoto" src="${escapeAttr(item.photo)}" alt="">` : '<div class="photoPlaceholder">-</div>';
  }
  if (column.type === "article") {
    return `<div class="articleCell"><strong>${escapeHtml(item.offer_id || "")}</strong><span>${escapeHtml(item.sku || "")}</span></div>`;
  }
  if (column.type === "number") {
    if (column.key === "cost_price" && (item[column.key] === "" || item[column.key] === null || item[column.key] === undefined)) {
      return "";
    }
    if (column.key === "unit_profit" && (item.cost_price === "" || item.cost_price === null || item.cost_price === undefined)) {
      return "";
    }
    if (column.key === "commission_rub" && tnvedCellValue(item, column.key) === null) {
      return "";
    }
    if (column.key === "volume_liters") {
      return `<span class="numberCell">${formatVolumeLiters(tnvedCellValue(item, column.key))}</span>`;
    }
    return `<span class="numberCell">${formatPlainNumber(tnvedCellValue(item, column.key))}</span>`;
  }
  if (column.type === "percent") {
    const value = tnvedCellValue(item, column.key);
    if (value === "" || value === null || value === undefined) {
      return "";
    }
    return `<span class="numberCell">${formatPercent(value)}</span>`;
  }
  return escapeHtml(item[column.key] || "");
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function xmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function columnName(index) {
  let numberValue = index + 1;
  let name = "";
  while (numberValue > 0) {
    const remainder = (numberValue - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    numberValue = Math.floor((numberValue - 1) / 26);
  }
  return name;
}

function sheetXml(rows) {
  const sheetRows = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, columnIndex) => {
          const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
          return `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`;
}

function crc32(bytes) {
  let crc = -1;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function writeUint16(buffer, offset, value) {
  buffer[offset] = value & 0xff;
  buffer[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32(buffer, offset, value) {
  buffer[offset] = value & 0xff;
  buffer[offset + 1] = (value >>> 8) & 0xff;
  buffer[offset + 2] = (value >>> 16) & 0xff;
  buffer[offset + 3] = (value >>> 24) & 0xff;
}

function zipDateTime(dateValue = new Date()) {
  return {
    dosTime: (dateValue.getHours() << 11) | (dateValue.getMinutes() << 5) | Math.floor(dateValue.getSeconds() / 2),
    dosDate: ((dateValue.getFullYear() - 1980) << 9) | ((dateValue.getMonth() + 1) << 5) | dateValue.getDate(),
  };
}

function createZip(files) {
  const encoder = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;
  const { dosTime, dosDate } = zipDateTime();

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const contentBytes = encoder.encode(file.content);
    const checksum = crc32(contentBytes);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    writeUint32(localHeader, 0, 0x04034b50);
    writeUint16(localHeader, 4, 20);
    writeUint16(localHeader, 6, 0x0800);
    writeUint16(localHeader, 8, 0);
    writeUint16(localHeader, 10, dosTime);
    writeUint16(localHeader, 12, dosDate);
    writeUint32(localHeader, 14, checksum);
    writeUint32(localHeader, 18, contentBytes.length);
    writeUint32(localHeader, 22, contentBytes.length);
    writeUint16(localHeader, 26, nameBytes.length);
    localHeader.set(nameBytes, 30);
    chunks.push(localHeader, contentBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    writeUint32(centralHeader, 0, 0x02014b50);
    writeUint16(centralHeader, 4, 20);
    writeUint16(centralHeader, 6, 20);
    writeUint16(centralHeader, 8, 0x0800);
    writeUint16(centralHeader, 10, 0);
    writeUint16(centralHeader, 12, dosTime);
    writeUint16(centralHeader, 14, dosDate);
    writeUint32(centralHeader, 16, checksum);
    writeUint32(centralHeader, 20, contentBytes.length);
    writeUint32(centralHeader, 24, contentBytes.length);
    writeUint16(centralHeader, 28, nameBytes.length);
    writeUint32(centralHeader, 42, offset);
    centralHeader.set(nameBytes, 46);
    central.push(centralHeader);
    offset += localHeader.length + contentBytes.length;
  });

  const centralSize = central.reduce((sum, chunk) => sum + chunk.length, 0);
  const end = new Uint8Array(22);
  writeUint32(end, 0, 0x06054b50);
  writeUint16(end, 8, files.length);
  writeUint16(end, 10, files.length);
  writeUint32(end, 12, centralSize);
  writeUint32(end, 16, offset);
  return new Blob([...chunks, ...central, end], { type: XLSX_CONTENT_TYPE });
}

function createXlsxBlob(rows) {
  return createZip([
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Себестоимость" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    },
    { name: "xl/worksheets/sheet1.xml", content: sheetXml(rows) },
  ]);
}

function downloadCostTemplate() {
  if (!tnvedItems.length) {
    alert("Сначала откройте вкладку «Товары» и загрузите товары Ozon.");
    return;
  }
  const rows = [
    ["Название товара", "Артикул", "SKU", "Категория", "Тип", "", "Себестоимость"],
    ...tnvedItems.map((item) => [
      item.name || "",
      item.offer_id || "",
      item.sku || "",
      item.category || "",
      item.type || "",
      "",
      item.cost_price ?? "",
    ]),
  ];
  const blob = createXlsxBlob(rows);
  const link = document.createElement("a");
  const clientId = currentAccount?.client_id || "ozon";
  link.href = URL.createObjectURL(blob);
  link.download = `cost_template_${clientId}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function detectCsvDelimiter(line) {
  const delimiters = [";", "\t", ","];
  return delimiters
    .map((delimiter) => ({ delimiter, count: line.split(delimiter).length }))
    .sort((a, b) => b.count - a.count)[0].delimiter;
}

function parseCsv(text) {
  const normalized = text.replace(/^\uFEFF/, "").replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  const delimiter = detectCsvDelimiter(normalized.split("\n")[0] || ";");
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value.trim())) {
    rows.push(row);
  }
  return rows;
}

function costRowsFromCsv(text) {
  const rows = parseCsv(text);
  return rows
    .slice(1)
    .map((row) => ({
      sku: String(row[2] || "").trim(),
      cost_price: String(row[6] ?? "").trim(),
    }))
    .filter((row) => row.sku && row.cost_price !== "");
}

async function uploadCostTemplate(file) {
  const isCsv = file.name.toLowerCase().endsWith(".csv") || file.type.includes("csv");
  const rows = isCsv ? costRowsFromCsv(await file.text()) : [];
  if (!rows.length && isCsv) {
    alert("В файле не найдено заполненных себестоимостей в столбце G.");
    return;
  }
  if (!isCsv && !file.name.toLowerCase().endsWith(".xlsx")) {
    alert("Загрузите файл шаблона в формате Excel .xlsx.");
    return;
  }
  let fileData = "";
  if (!isCsv) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    fileData = btoa(binary);
  }
  uploadCostTemplateButton.disabled = true;
  try {
    const data = await api("/api/costs/upload", {
      method: "POST",
      body: JSON.stringify({ items: rows, file_name: file.name, file_data: fileData }),
    });
    const uploadedRows = Array.isArray(data.items) && data.items.length ? data.items : rows;
    if (!uploadedRows.length) {
      throw new Error("В файле не найдено заполненных себестоимостей в столбце G.");
    }
    const costsBySku = Object.fromEntries(
      uploadedRows.map((row) => [String(row.sku || "").trim(), String(row.cost_price ?? "").trim()])
    );
    let appliedCount = 0;
    tnvedItems = tnvedItems.map((item) => {
      const sku = String(item.sku || "").trim();
      if (sku && Object.prototype.hasOwnProperty.call(costsBySku, sku)) {
        appliedCount += 1;
        return { ...item, cost_price: costsBySku[sku] };
      }
      return item;
    });
    renderTnved();
    alert(`Себестоимость загружена. Сохранено строк: ${uploadedRows.length}. Проставлено в товарах: ${appliedCount}.`);
  } catch (error) {
    alert(error.message);
  } finally {
    uploadCostTemplateButton.disabled = false;
    costTemplateFileInput.value = "";
  }
}

async function fileToBase64(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function renderTariffsStatus(data = null) {
  const file = data?.file || null;
  if (!tariffsStatus) {
    return;
  }
  if (!file) {
    tariffsStatus.textContent = "Файл тарифов еще не загружен.";
    return;
  }
  const sizeKb = Number(file.size || 0) ? `, ${Math.round(Number(file.size || 0) / 1024)} КБ` : "";
  const uploadedAt = file.uploaded_at ? `, загружен: ${formatDateTime(file.uploaded_at)}` : "";
  tariffsStatus.textContent = `Активный файл: ${file.name || "тарифы"}${sizeKb}${uploadedAt}. Применяется ко всем аккаунтам.`;
}

async function loadTariffsStatus() {
  if (!tariffsStatus) {
    return;
  }
  try {
    renderTariffsStatus(await api("/api/tariffs"));
  } catch (error) {
    tariffsStatus.textContent = error.message;
  }
}

async function uploadTariffsFile(file) {
  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx") && !name.endsWith(".csv")) {
    alert("Загрузите файл тарифов в формате Excel .xlsx или CSV.");
    return;
  }
  uploadTariffsFileButton.disabled = true;
  tariffsStatus.textContent = "Загружаю файл тарифов...";
  try {
    const data = await api("/api/tariffs/upload", {
      method: "POST",
      body: JSON.stringify({
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_data: await fileToBase64(file),
      }),
    });
    renderTariffsStatus(data);
    alert("Файл тарифов загружен. Он будет применяться для всех подключенных аккаунтов.");
  } catch (error) {
    tariffsStatus.textContent = error.message;
    alert(error.message);
  } finally {
    uploadTariffsFileButton.disabled = false;
    tariffsFileInput.value = "";
  }
}

function renderTariffsPreview(data = null) {
  if (!tariffsPreview) {
    return;
  }
  const file = data?.file || null;
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  if (!file) {
    tariffsPreview.classList.remove("hidden");
    tariffsPreview.innerHTML = `<div class="emptyState">Файл тарифов еще не загружен.</div>`;
    return;
  }
  if (!rows.length) {
    tariffsPreview.classList.remove("hidden");
    const errorText = data?.error ? `<p>${escapeHtml(data.error)}</p>` : "";
    tariffsPreview.innerHTML = `<div class="emptyState"><b>${escapeHtml(file.name || "Файл тарифов")}</b>${errorText}<p>В файле не найдено строк для просмотра.</p></div>`;
    return;
  }
  const excelColumnName = (index) => {
    let number = index + 1;
    let name = "";
    while (number > 0) {
      const remainder = (number - 1) % 26;
      name = String.fromCharCode(65 + remainder) + name;
      number = Math.floor((number - 1) / 26);
    }
    return name;
  };
  const maxColumns = Math.max(...rows.map((row) => Array.isArray(row) ? row.length : 0));
  const headerRows = rows.slice(0, 3);
  const bodyRows = rows.slice(3);
  const columnLetters = Array.from({ length: maxColumns }, (_, index) => `<th class="sheetColumnName">${excelColumnName(index)}</th>`).join("");
  const buildCells = (row, tag) => Array.from({ length: maxColumns }, (_, index) => {
    const value = Array.isArray(row) ? row[index] : "";
    return `<${tag}>${escapeHtml(value)}</${tag}>`;
  }).join("");
  const headerHtml = headerRows.map((row, index) => `<tr><th class="sheetRowName">${index + 1}</th>${buildCells(row, "th")}</tr>`).join("");
  const bodyHtml = bodyRows.map((row, index) => `<tr><th class="sheetRowName">${index + 1 + headerRows.length}</th>${buildCells(row, "td")}</tr>`).join("");
  const limitedText = data?.limited ? "Показаны первые 200 строк." : `Показано строк: ${rows.length}.`;
  tariffsPreview.classList.remove("hidden");
  tariffsPreview.innerHTML = `
    <div class="tariffsPreviewHeader">
      <div>
        <b>${escapeHtml(file.name || "Файл тарифов")}</b>
        <span>${limitedText}</span>
      </div>
    </div>
    <div class="tariffsTableWrap">
      <table class="tariffsTable">
        <thead><tr><th class="sheetCorner"></th>${columnLetters}</tr>${headerHtml}</thead>
        <tbody>${bodyHtml}</tbody>
      </table>
    </div>
  `;
}

async function loadTariffsPreview() {
  if (!tariffsPreview || !viewTariffsFileButton) {
    return;
  }
  viewTariffsFileButton.disabled = true;
  tariffsPreview.classList.remove("hidden");
  tariffsPreview.innerHTML = `<div class="emptyState">Загружаю таблицу тарифов...</div>`;
  try {
    renderTariffsPreview(await api("/api/tariffs/preview"));
  } catch (error) {
    tariffsPreview.innerHTML = `<div class="emptyState">${escapeHtml(error.message)}</div>`;
  } finally {
    viewTariffsFileButton.disabled = false;
  }
}

function formatPlainNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return "-";
  }
  return number.format(Number(value || 0));
}

function formatVolumeLiters(value) {
  if (value === "" || value === null || value === undefined) {
    return "";
  }
  return Number(value || 0).toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = loginForm.querySelector("button");
  button.disabled = true;
  try {
    const data = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({
        login: document.querySelector("#login").value,
        password: document.querySelector("#password").value,
      }),
    });
    loginForm.reset();
    showApp(data.user);
  } catch (error) {
    alert(error.message);
  } finally {
    button.disabled = false;
  }
});

function loadSummaryRange(dateFrom, dateTo, mode = "custom") {
  return api("/api/summary", {
    method: "POST",
    body: JSON.stringify({
      date_from: dateFrom,
      date_to: dateTo,
      period_mode: mode,
    }),
  });
}

function loadCachedSummaryPair(dateFrom, dateTo, compareDateFrom = "", compareDateTo = "") {
  return api("/api/summary-cached", {
    method: "POST",
    body: JSON.stringify({
      date_from: dateFrom,
      date_to: dateTo,
      compare_date_from: compareDateFrom,
      compare_date_to: compareDateTo,
    }),
  });
}

async function loadSelectedMonthFromCache() {
  if (!currentUser || periodMode.value !== "month") {
    return;
  }
  const token = ++monthCacheLoadToken;
  const button = summaryForm.querySelector('button[type="submit"]');
  if (button) {
    button.disabled = true;
  }
  try {
    setStatus("Проверяю кэш выбранного месяца...");
    const data = await loadCachedSummaryPair(
      dateFromInput.value,
      dateToInput.value,
      comparisonHidden() ? "" : compareDateFromInput.value,
      comparisonHidden() ? "" : compareDateToInput.value,
    );
    if (token !== monthCacheLoadToken) {
      return;
    }
    render(data.current, data.compare);
    const cache = data.cache || {};
    const suffix = cache.hit ? "из кэша" : "обновлен из Ozon и сохранен в кэш";
    const current = data.periods?.current || {};
    const compare = data.periods?.compare || {};
    const compareText = comparisonHidden() ? "" : ` Сравнение: ${formatShortRange(compare)}.`;
    setStatus(`Готово. Период: ${formatShortRange(current)}.${compareText} Отчет ${suffix}.`);
  } catch (error) {
    if (token === monthCacheLoadToken) {
      setStatus(error.message || "Не удалось загрузить выбранный месяц.", true);
    }
  } finally {
    if (token === monthCacheLoadToken && button) {
      button.disabled = false;
    }
  }
}

function applyDefaultSummaryPeriods(periods) {
  const current = periods?.current;
  const compare = periods?.compare;
  if (current?.from && current?.to) {
    periodMode.value = "custom";
    dateFromInput.value = current.from;
    dateToInput.value = current.to;
    syncPeriodButton();
  }
  if (compare?.from && compare?.to) {
    compareDateFromInput.value = compare.from;
    compareDateToInput.value = compare.to;
    comparePeriodTouched = false;
    if (hideComparisonInput) {
      hideComparisonInput.checked = false;
      syncComparisonVisibility();
    }
  }
}

async function loadDefaultDashboardSummary() {
  if (!currentUser) {
    return;
  }
  try {
    setStatus("Загружаю вчерашний отчет из кэша...");
    const data = await api("/api/default-summary");
    applyDefaultSummaryPeriods(data.periods);
    render(data.current, data.compare);
    const cache = data.cache || {};
    const suffix = cache.hit ? "из кэша" : "обновлен из Ozon и сохранен в кэш";
    const current = data.periods?.current || {};
    const compare = data.periods?.compare || {};
    setStatus(`Готово. Период: ${formatShortRange(current)}. Сравнение: ${formatShortRange(compare)}. Отчет ${suffix}.`);
  } catch (error) {
    setStatus(error.message || "Не удалось загрузить вчерашний отчет.", true);
  }
}

periodButton.addEventListener("click", (event) => {
  event.stopPropagation();
  if (periodMenu.classList.contains("hidden")) {
    openPeriodMenu();
  } else {
    closePeriodMenu();
  }
});

periodPicker.addEventListener("mouseenter", () => {
  if (periodCloseTimer) {
    clearTimeout(periodCloseTimer);
    periodCloseTimer = null;
  }
});

periodPicker.addEventListener("mouseleave", () => {
  periodCloseTimer = setTimeout(() => {
    closePeriodMenu();
  }, 220);
});

periodMenu.addEventListener("mouseover", (event) => {
  const option = event.target.closest(".periodOption");
  if (!option) {
    return;
  }
  if (option.dataset.mode === "month") {
    openMonthMenu();
  } else {
    monthMenu.classList.add("hidden");
  }
});

periodMenu.addEventListener("click", (event) => {
  const option = event.target.closest(".periodOption");
  if (!option) {
    return;
  }
  if (option.dataset.mode === "month") {
    openMonthMenu();
    const month = latestClosedMonth();
    if (month) {
      selectMonthPeriod(month.from, month.to);
    }
    return;
  }
  setPeriodMode(option.dataset.mode);
  closePeriodMenu();
});

monthTrigger.addEventListener("mouseenter", () => {
  openMonthMenu();
});

monthMenu.addEventListener("click", (event) => {
  const option = event.target.closest(".monthOption");
  if (!option) {
    return;
  }
  selectMonthPeriod(option.dataset.from, option.dataset.to);
});

document.addEventListener("click", (event) => {
  if (!periodPicker.contains(event.target)) {
    closePeriodMenu();
  }
});

periodMode.addEventListener("change", () => {
  setPeriodMode(periodMode.value);
});

dateFromInput.addEventListener("change", () => {
  limitDateInputToToday(dateFromInput);
  periodMode.value = "custom";
  syncPeriodButton();
  setDefaultComparePeriod();
});

dateToInput.addEventListener("change", () => {
  limitDateInputToToday(dateToInput);
  periodMode.value = "custom";
  syncPeriodButton();
  setDefaultComparePeriod();
});

compareDateFromInput.addEventListener("change", () => {
  limitDateInputToToday(compareDateFromInput);
  comparePeriodTouched = true;
});

compareDateToInput.addEventListener("change", () => {
  limitDateInputToToday(compareDateToInput);
  comparePeriodTouched = true;
});

hideComparisonInput?.addEventListener("change", () => {
  syncComparisonVisibility();
});
syncComparisonVisibility();
applyDateLimits();
initDailyCardsControl();
initTaxationModeSelect();

summaryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  applyDateLimits();
  const button = summaryForm.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    setStatus(comparisonHidden()
      ? "Загружаю основной период из Ozon..."
      : "Загружаю основной период и сравнение из Ozon...");
    const current = await loadSummaryRange(dateFromInput.value, dateToInput.value, periodMode.value);
    const compare = comparisonHidden()
      ? null
      : await loadSummaryRange(compareDateFromInput.value, compareDateToInput.value, "comparison");
    render(current, compare);
    const compareText = comparisonHidden() ? "" : ` Сравнение: ${formatShortRange(compare?.period)}.`;
    const currentSource = current?.cache?.hit ? "из кэша" : "из Ozon";
    const compareSource = comparisonHidden() ? "" : (compare?.cache?.hit ? ", сравнение из кэша" : ", сравнение из Ozon");
    setStatus(`Готово. Период: ${formatShortRange(current?.period)}.${compareText} Отчет загружен ${currentSource}${compareSource}.`);
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    button.disabled = false;
  }
});

downloadCostTemplateButton.addEventListener("click", downloadCostTemplate);

uploadCostTemplateButton.addEventListener("click", () => {
  costTemplateFileInput.click();
});

costTemplateFileInput.addEventListener("change", () => {
  const file = costTemplateFileInput.files?.[0];
  if (file) {
    uploadCostTemplate(file);
  }
});

logoutButton.addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" });
  showLogin();
});

accountButton.addEventListener("click", (event) => {
  event.stopPropagation();
  accountDropdown.classList.toggle("hidden");
});

ozonConfigForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const data = await api("/api/admin/config", {
      method: "POST",
      body: JSON.stringify({
        name: document.querySelector("#adminAccountName").value,
        client_id: document.querySelector("#adminClientId").value,
        api_key: document.querySelector("#adminApiKey").value,
      }),
    });
    if (data.user) {
      currentUser = data.user;
    }
    document.querySelector("#adminApiKey").value = "";
    await loadAdmin();
    setStatus("Ключ Ozon сохранен.");
  } catch (error) {
    setStatus(error.message, true);
  }
});

clearOzonKey.addEventListener("click", async () => {
  try {
    await api("/api/admin/config/clear", { method: "POST" });
    document.querySelector("#adminApiKey").value = "";
    await loadAdmin();
    setStatus("Ключ Ozon очищен.");
  } catch (error) {
    setStatus(error.message, true);
  }
});

performanceConfigForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/admin/performance", {
      method: "POST",
      body: JSON.stringify({
        client_id: document.querySelector("#performanceClientId").value,
        client_secret: document.querySelector("#performanceClientSecret").value,
      }),
    });
    document.querySelector("#performanceClientId").value = "";
    document.querySelector("#performanceClientSecret").value = "";
    await loadAdmin();
    setStatus("Ключи Ozon Performance API сохранены.");
  } catch (error) {
    setStatus(error.message, true);
  }
});

clearPerformanceKey.addEventListener("click", async () => {
  try {
    await api("/api/admin/performance/clear", { method: "POST" });
    document.querySelector("#performanceClientId").value = "";
    document.querySelector("#performanceClientSecret").value = "";
    await loadAdmin();
    setStatus("Ключи Ozon Performance API очищены.");
  } catch (error) {
    setStatus(error.message, true);
  }
});

accountForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const data = await api("/api/accounts", {
      method: "POST",
      body: JSON.stringify({
        login: document.querySelector("#accountLogin").value,
        password: document.querySelector("#accountPassword").value,
        client_id: document.querySelector("#accountClientId").value,
      }),
    });
    accountForm.reset();
    ozonAccounts = data.accounts || [];
    setAccountHeader(data.active_account);
    renderAccountList(data.active_client_id);
    await switchAccount(data.active_client_id);
  } catch (error) {
    setStatus(error.message, true);
  }
});

userForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const data = await api("/api/admin/users", {
      method: "POST",
      body: JSON.stringify({
        login: document.querySelector("#newUserLogin").value,
        password: document.querySelector("#newUserPassword").value,
      }),
    });
    userForm.reset();
    renderUsers(data.users);
    setStatus("Пользователь сохранен.");
  } catch (error) {
    setStatus(error.message, true);
  }
});

dashboardTab.addEventListener("click", () => switchTab("dashboard"));
tnvedTab.addEventListener("click", () => switchTab("tnved"));
unitTab.addEventListener("click", (event) => {
  event.stopPropagation();
  const isOpen = unitDropdown && !unitDropdown.classList.contains("hidden");
  unitDropdown?.classList.toggle("hidden", isOpen);
  unitTab.setAttribute("aria-expanded", String(!isOpen));
});
unitTabMenu?.addEventListener("mouseenter", () => {
  unitDropdown?.classList.remove("hidden");
  unitTab?.setAttribute("aria-expanded", "true");
});
unitTabMenu?.addEventListener("mouseleave", closeUnitDropdown);
unitFboTab?.addEventListener("click", () => switchTab("unit-fbo"));
unitFbsTab?.addEventListener("click", () => switchTab("unit-fbs"));
document.addEventListener("click", (event) => {
  if (!unitTabMenu?.contains(event.target)) {
    closeUnitDropdown();
  }
});
cacheTab.addEventListener("click", () => switchTab("cache"));
tariffsTab.addEventListener("click", () => switchTab("tariffs"));
apiTab.addEventListener("click", () => switchTab("api"));
adminTab.addEventListener("click", () => switchTab("admin"));

uploadTariffsFileButton?.addEventListener("click", () => {
  tariffsFileInput.click();
});

viewTariffsFileButton?.addEventListener("click", () => {
  loadTariffsPreview();
});

tariffsFileInput?.addEventListener("change", () => {
  const file = tariffsFileInput.files?.[0];
  if (file) {
    uploadTariffsFile(file);
  }
});

loadTariffsStatus();

tnvedSearch.value = tnvedState.search;
tnvedOnlyStock.checked = tnvedState.onlyStock;
tnvedSearch.addEventListener("input", () => {
  tnvedState.search = tnvedSearch.value;
  renderTnvedRows();
});
tnvedOnlyStock.addEventListener("change", () => {
  tnvedState.onlyStock = tnvedOnlyStock.checked;
  renderTnvedRows();
});
tnvedRefresh.addEventListener("click", () => loadTnvedProducts({ force: true }));
cacheRefresh.addEventListener("click", () => loadCacheStatus());
apiRefresh?.addEventListener("click", () => loadApiStatus());
columnsButton.addEventListener("click", (event) => {
  event.stopPropagation();
  columnsDropdown.classList.toggle("hidden");
});
[
  ["category", "categoryProfitFilter"],
  ["type", "typeProfitFilter"],
  ["article", "articleProfitFilter"],
].forEach(([tableName, inputId]) => {
  const input = document.querySelector(`#${inputId}`);
  if (!input) {
    return;
  }
  input.addEventListener("input", () => {
    profitTableState[tableName].filter = input.value;
    renderProfitTables();
  });
});
[
  ["category", "categoryShowZero"],
  ["type", "typeShowZero"],
].forEach(([tableName, inputId]) => {
  const input = document.querySelector(`#${inputId}`);
  if (!input) {
    return;
  }
  input.checked = Boolean(profitTableState[tableName].showZero);
  input.addEventListener("change", () => {
    profitTableState[tableName].showZero = input.checked;
    renderProfitTables();
  });
});
document.querySelectorAll("[data-profit-table] [data-sort-key]").forEach((button) => {
  button.addEventListener("click", () => {
    const table = button.closest("[data-profit-table]");
    if (!table) {
      return;
    }
    setProfitSort(table.dataset.profitTable, button.dataset.sortKey);
  });
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".accountSwitcher")) {
    accountDropdown.classList.add("hidden");
  }
  if (!columnsDropdown.contains(event.target) && event.target !== columnsButton) {
    columnsDropdown.classList.add("hidden");
  }
  if (!event.target.closest("#dailyCardsControl")) {
    closeDailyCardsDropdown();
  }
  if (!event.target.closest(".filterMenu") && !event.target.closest(".filterButton")) {
    closeFilterMenu();
  }
});

const backToTopButton = document.querySelector("#backToTopButton");
if (backToTopButton) {
  const updateBackToTopButton = () => {
    backToTopButton.classList.toggle("visible", window.scrollY > 280);
  };

  backToTopButton.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("scroll", updateBackToTopButton, { passive: true });
  updateBackToTopButton();
}

api("/api/me")
  .then((data) => {
    if (data.user) {
      showApp(data.user);
    } else {
      showLogin();
    }
  })
  .catch(showLogin);


