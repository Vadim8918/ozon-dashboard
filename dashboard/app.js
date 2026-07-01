const loginView = document.querySelector("#loginView");
const appView = document.querySelector("#appView");
const loginForm = document.querySelector("#loginForm");
const summaryForm = document.querySelector("#summaryForm");
const statusBox = document.querySelector("#status");
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
const cacheTab = document.querySelector("#cacheTab");
const adminTab = document.querySelector("#adminTab");
const dashboardView = document.querySelector("#dashboardView");
const tnvedView = document.querySelector("#tnvedView");
const cacheView = document.querySelector("#cacheView");
const adminView = document.querySelector("#adminView");
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

let currentUser = null;
let currentAccount = null;
let ozonAccounts = [];
let tnvedItems = [];
let tnvedLoadedOnce = false;
let tnvedTimer = null;
let tnvedLastDuration = null;
let cacheLoadedOnce = false;
let lastSummaryData = null;
let lastCompareData = null;
let comparePeriodTouched = false;
let periodCloseTimer = null;
const TNVED_STATE_KEY = "ozonTnvedStateV4";
const DAILY_CARD_STATE_KEY = "ozonDailyCardsHiddenV1";
const DAILY_CARD_ORDER_KEY = "ozonDailyCardsOrderV1";

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

const profitTableState = {
  category: { filter: "", sortKey: "profit_before_cost", sortDirection: "desc", showZero: false },
  type: { filter: "", sortKey: "profit_before_cost", sortDirection: "desc", showZero: false },
  article: { filter: "", sortKey: "profit_before_cost", sortDirection: "desc" },
};

const PROFIT_ZERO_FIELDS = [
  "revenue",
  "commission",
  "services",
  "returns",
  "paid_storage",
  "profit_before_cost",
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
];

const DEFAULT_TNVED_STATE = {
  search: "",
  onlyStock: false,
  sort: { key: "product_id", direction: "desc" },
  status: "all",
  filters: {},
  visible: Object.fromEntries(TNVED_COLUMNS.map((column) => [column.key, column.defaultVisible])),
};

let tnvedState = loadTnvedState();

const ROLE_TITLES = {
  owner: "Филькина Грамота а",
  viewer: "Филькина Грамота",
};

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
    };
  } catch {
    return structuredClone(DEFAULT_TNVED_STATE);
  }
}

function saveTnvedColumns() {
  localStorage.setItem(TNVED_STATE_KEY, JSON.stringify({ visible: tnvedState.visible }));
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
    dateToInput.value = formatDateInput(end);
  } else if (mode === "month") {
    const month = selectedMonth || latestClosedMonth();
    if (month) {
      dateFromInput.value = month.from;
      dateToInput.value = month.to;
    }
  }
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
  syncPeriodButton();
  setDefaultComparePeriod(true);
  closePeriodMenu();
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
  statusBox.textContent = message;
  statusBox.classList.toggle("error", isError);
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
  adminTab.classList.toggle("hidden", currentUser.role !== "owner");
  if (currentUser.role !== "owner" && !adminView.classList.contains("hidden")) {
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
  tnvedMeta.textContent = "Товары еще не загружены.";
  if (!tnvedView.classList.contains("hidden")) {
    loadTnvedProducts();
  }
}

function switchTab(tab) {
  if (tab === "admin" && (!currentUser || currentUser.role !== "owner")) {
    tab = "dashboard";
  }
  const isTnved = tab === "tnved";
  const isCache = tab === "cache";
  const isAdmin = tab === "admin";
  dashboardTab.classList.toggle("active", tab === "dashboard");
  tnvedTab.classList.toggle("active", isTnved);
  cacheTab.classList.toggle("active", isCache);
  adminTab.classList.toggle("active", isAdmin);
  dashboardView.classList.toggle("hidden", tab !== "dashboard");
  tnvedView.classList.toggle("hidden", !isTnved);
  cacheView.classList.toggle("hidden", !isCache);
  adminView.classList.toggle("hidden", !isAdmin);
  localStorage.setItem("ozonActiveTab", tab);
  if (isTnved && !tnvedLoadedOnce) {
    loadTnvedProducts();
  }
  if (isCache && !cacheLoadedOnce) {
    loadCacheStatus();
  }
}

async function showApp(user) {
  currentUser = user;
  loginView.classList.add("hidden");
  appView.classList.remove("hidden");
  loadAccounts().catch(() => setAccountHeader(null));
  updateUserChrome();
  setStatus("Выберите период и нажмите “Показать”.");
  if (user.role === "owner") {
    loadAdmin();
  }
  switchTab(localStorage.getItem("ozonActiveTab") || "dashboard");
  loadTnvedProducts({ silent: true });
  startTnvedAutoRefresh();
}

function showLogin() {
  currentUser = null;
  currentAccount = null;
  ozonAccounts = [];
  cacheLoadedOnce = false;
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

function renderCategoryProfit(items) {
  const tbody = document.querySelector("#categoryProfitRows");
  if (!tbody) {
    return;
  }
  tbody.innerHTML = "";
  const rows = getProfitRows("category", items || [], [
    "category",
    "items_count",
    "revenue",
    "commission",
    "services",
    "returns",
    "paid_storage",
    "profit_before_cost",
  ]);

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="8">Нет данных по категориям за выбранный период.</td></tr>';
    return;
  }

  const totals = {
    items_count: 0,
    revenue: 0,
    commission: 0,
    services: 0,
    returns: 0,
    paid_storage: 0,
    profit_before_cost: 0,
  };

  rows.forEach((item) => {
    totals.items_count += Number(item.items_count || 0);
    totals.revenue += Number(item.revenue || 0);
    totals.commission += Number(item.commission || 0);
    totals.services += Number(item.services || 0);
    totals.returns += Number(item.returns || 0);
    totals.paid_storage += Number(item.paid_storage || 0);
    totals.profit_before_cost += Number(item.profit_before_cost || 0);

    const profit = Number(item.profit_before_cost || 0);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <strong>${escapeHtml(item.category || "Без категории")}</strong>
        <span>${formatNumber(item.types_count || 0)} типов</span>
      </td>
      <td>${formatNumber(item.items_count || 0)}</td>
      <td>${formatMoney(item.revenue)}</td>
      <td>${formatMoney(-Number(item.commission || 0))}</td>
      <td>${formatMoney(-Math.abs(Number(item.services || 0)))}</td>
      <td>${formatMoney(-Math.abs(Number(item.returns || 0)))}</td>
      <td>${formatMoney(-Math.abs(Number(item.paid_storage || 0)))}</td>
      <td class="${profit < 0 ? "negativeMoney" : "positiveMoney"}">${formatMoney(profit)}</td>
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
    <td>${formatMoney(-Math.abs(totals.services))}</td>
    <td>${formatMoney(-Math.abs(totals.returns))}</td>
    <td>${formatMoney(-Math.abs(totals.paid_storage))}</td>
    <td class="${totals.profit_before_cost < 0 ? "negativeMoney" : "positiveMoney"}">${formatMoney(totals.profit_before_cost)}</td>
  `;
  tbody.appendChild(totalRow);
}

function renderTypeProfit(items) {
  const tbody = document.querySelector("#typeProfitRows");
  if (!tbody) {
    return;
  }
  tbody.innerHTML = "";
  const rows = getProfitRows("type", items || [], [
    "type",
    "items_count",
    "revenue",
    "commission",
    "services",
    "returns",
    "paid_storage",
    "profit_before_cost",
  ]);

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="8">Нет данных по типам за выбранный период.</td></tr>';
    return;
  }

  const totals = {
    items_count: 0,
    revenue: 0,
    commission: 0,
    services: 0,
    returns: 0,
    paid_storage: 0,
    profit_before_cost: 0,
  };

  rows.forEach((item) => {
    totals.items_count += Number(item.items_count || 0);
    totals.revenue += Number(item.revenue || 0);
    totals.commission += Number(item.commission || 0);
    totals.services += Number(item.services || 0);
    totals.returns += Number(item.returns || 0);
    totals.paid_storage += Number(item.paid_storage || 0);
    totals.profit_before_cost += Number(item.profit_before_cost || 0);

    const profit = Number(item.profit_before_cost || 0);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <strong>${escapeHtml(item.type || "Без типа")}</strong>
      </td>
      <td>${formatNumber(item.items_count || 0)}</td>
      <td>${formatMoney(item.revenue)}</td>
      <td>${formatMoney(-Number(item.commission || 0))}</td>
      <td>${formatMoney(-Math.abs(Number(item.services || 0)))}</td>
      <td>${formatMoney(-Math.abs(Number(item.returns || 0)))}</td>
      <td>${formatMoney(-Math.abs(Number(item.paid_storage || 0)))}</td>
      <td class="${profit < 0 ? "negativeMoney" : "positiveMoney"}">${formatMoney(profit)}</td>
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
    <td>${formatMoney(-Math.abs(totals.services))}</td>
    <td>${formatMoney(-Math.abs(totals.returns))}</td>
    <td>${formatMoney(-Math.abs(totals.paid_storage))}</td>
    <td class="${totals.profit_before_cost < 0 ? "negativeMoney" : "positiveMoney"}">${formatMoney(totals.profit_before_cost)}</td>
  `;
  tbody.appendChild(totalRow);
}

function renderArticleProfit(items) {
  const tbody = document.querySelector("#articleProfitRows");
  if (!tbody) {
    return;
  }
  tbody.innerHTML = "";
  const rows = getProfitRows("article", items || [], [
    "article",
    "sku",
    "name",
    "category",
    "type",
    "revenue",
    "commission",
    "services",
    "returns",
    "paid_storage",
    "profit_before_cost",
  ]);

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="10">Нет данных по артикулам за выбранный период.</td></tr>';
    return;
  }

  const totals = {
    revenue: 0,
    commission: 0,
    services: 0,
    returns: 0,
    paid_storage: 0,
    profit_before_cost: 0,
  };

  rows.forEach((item) => {
    totals.revenue += Number(item.revenue || 0);
    totals.commission += Number(item.commission || 0);
    totals.services += Number(item.services || 0);
    totals.returns += Number(item.returns || 0);
    totals.paid_storage += Number(item.paid_storage || 0);
    totals.profit_before_cost += Number(item.profit_before_cost || 0);

    const profit = Number(item.profit_before_cost || 0);
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
      <td>${formatMoney(-Math.abs(Number(item.services || 0)))}</td>
      <td>${formatMoney(-Math.abs(Number(item.returns || 0)))}</td>
      <td>${formatMoney(-Math.abs(Number(item.paid_storage || 0)))}</td>
      <td class="${profit < 0 ? "negativeMoney" : "positiveMoney"}">${formatMoney(profit)}</td>
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
    <td>${formatMoney(-Math.abs(totals.services))}</td>
    <td>${formatMoney(-Math.abs(totals.returns))}</td>
    <td>${formatMoney(-Math.abs(totals.paid_storage))}</td>
    <td class="${totals.profit_before_cost < 0 ? "negativeMoney" : "positiveMoney"}">${formatMoney(totals.profit_before_cost)}</td>
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

async function loadAdmin() {
  setStatus(comparisonHidden()
    ? "Загружаю основной период из Ozon..."
    : "Загружаю основной период и сравнение из Ozon...");
  try {
    setStatus("Загружаю настройки админ панели...");
    const data = await api("/api/admin/config");
    document.querySelector("#adminAccountName").value = data.name || "";
    document.querySelector("#adminClientId").value = data.client_id || "";
    document.querySelector("#adminApiKey").placeholder = data.api_key_mask
      ? `Сейчас сохранен ключ ${data.api_key_mask}`
      : "API Key не настроен";
    document.querySelector("#performanceClientId").placeholder = data.performance_client_id_mask || "Client ID не настроен";
    document.querySelector("#performanceClientSecret").placeholder = data.performance_client_secret_mask || "Client Secret не настроен";
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
  const costsTotal = paidStorage + extraCostsTotal;
  const servicesTotal = commission + services + ads;
  const profit = salesTotal - servicesTotal - costsTotal;
  const profitBase = servicesTotal + costsTotal;
  const otherServices = Math.max(0, expenses - servicesTotal - returns);
  const margin = salesTotal ? (profit / salesTotal) * 100 : 0;
  const roi = profitBase ? (profit / profitBase) * 100 : 0;
  const drr = salesTotal ? (ads / salesTotal) * 100 : 0;

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
    visibleCostItems,
    costsTotal,
    servicesTotal,
    otherServices,
    profit,
    margin,
    roi,
    drr,
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
    servicesTotal,
    otherServices,
    profit,
    margin,
    roi,
    drr,
  } = summaryMetrics(data);

  setText("revenue", formatMoney(salesTotal));
  setText("orders", formatNumber(orders.orders_count));
  setText("expenses", formatMoney(costsTotal));
  setText("ads", formatMoney(ads));
  setText("commission", formatMoney(commission));
  setText("profit", formatMoney(profit));

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
      { name: "Итого до себестоимости", amount: profit },
    ]);
  }
  if (document.querySelector("#statusBars")) {
    renderBars("statusBars", orders.status_counts, "count");
  }
  renderOperations(finance.all_operations || finance.by_type);
  renderProfitTables();

  const warning = data.errors.length ? ` Есть предупреждения: ${data.errors.join(" | ")}` : "";
  const compareWarning = compareData?.errors?.length ? ` Предупреждения сравнения: ${compareData.errors.join(" | ")}` : "";
  const compareText = compareData ? ` Сравнение: ${comparisonPeriodLabel(compareData)}.` : "";
  setStatus(
    `Готово. Период: ${data.period.label || `${data.period.from} - ${data.period.to}`}.${compareText}${warning}${compareWarning}`,
    Boolean(data.errors.length || compareData?.errors?.length)
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
    cacheStatus.textContent = "Проверяю кэш...";
  }
  try {
    const data = await api("/api/cache");
    cacheLoadedOnce = true;
    cacheStatus.textContent = `Кэш товаров хранится отдельно для каждого Client ID. Обновление: каждые ${Math.round((data.ttl_seconds || 300) / 60)} мин.`;
    cacheRows.innerHTML = "";
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
    if (!cacheRows.children.length) {
      cacheRows.innerHTML = '<div class="small">Нет доступных аккаунтов для кэша.</div>';
    }
  } catch (error) {
    cacheStatus.textContent = error.message;
    cacheStatus.classList.add("errorText");
  }
}

function renderTnved() {
  renderColumnsDropdown();
  renderTnvedHead();
  renderTnvedRows();
}

function visibleColumns() {
  return TNVED_COLUMNS.filter((column) => tnvedState.visible[column.key] !== false);
}

function renderColumnsDropdown() {
  columnsDropdown.innerHTML = "";
  TNVED_COLUMNS.forEach((column) => {
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
    th.innerHTML = `
      <div class="thInner">
        <span>${column.title}</span>
        <button class="filterButton ${tnvedState.filters[column.key] ? "active" : ""}" type="button">▾</button>
      </div>
    `;
    const filterButton = th.querySelector(".filterButton");
    filterButton.addEventListener("click", (event) => {
      event.stopPropagation();
      openFilterMenu(column, filterButton);
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
    items = items.filter((item) => String(item[key] ?? "").toLowerCase().includes(query));
  });
  const sortColumn = TNVED_COLUMNS.find((column) => column.key === tnvedState.sort.key);
  if (sortColumn || tnvedState.sort.key === "product_id") {
    const direction = tnvedState.sort.direction === "desc" ? -1 : 1;
    const sortType = sortColumn?.type || "number";
    const sortKey = sortColumn?.key || "product_id";
    items.sort((a, b) => compareValues(a[sortKey], b[sortKey], sortType) * direction);
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
    return `<span class="numberCell">${formatPlainNumber(item[column.key])}</span>`;
  }
  return escapeHtml(item[column.key] || "");
}

function formatPlainNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return "-";
  }
  return number.format(Number(value || 0));
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
  periodMode.value = "custom";
  syncPeriodButton();
  setDefaultComparePeriod();
});

dateToInput.addEventListener("change", () => {
  periodMode.value = "custom";
  syncPeriodButton();
  setDefaultComparePeriod();
});

compareDateFromInput.addEventListener("change", () => {
  comparePeriodTouched = true;
});

compareDateToInput.addEventListener("change", () => {
  comparePeriodTouched = true;
});

hideComparisonInput?.addEventListener("change", () => {
  syncComparisonVisibility();
});
syncComparisonVisibility();
initDailyCardsControl();

summaryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = summaryForm.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    setStatus(comparisonHidden()
      ? "Загружаю основной период из Ozon..."
      : "Загружаю основной период и сравнение из Ozon...");
    const dataPromise = loadSummaryRange(dateFromInput.value, dateToInput.value, periodMode.value);
    const comparePromise = comparisonHidden()
      ? Promise.resolve(null)
      : loadSummaryRange(compareDateFromInput.value, compareDateToInput.value, "custom");
    const [data, compareData] = await Promise.all([dataPromise, comparePromise]);
    render(data, compareData);
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    button.disabled = false;
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
cacheTab.addEventListener("click", () => switchTab("cache"));
adminTab.addEventListener("click", () => switchTab("admin"));

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

api("/api/me")
  .then((data) => {
    if (data.user) {
      showApp(data.user);
    } else {
      showLogin();
    }
  })
  .catch(showLogin);
