const el = (id) => document.getElementById(id);

const HISTORY_KEY = "fca_calculation_history_v1";
const MAX_HISTORY = 10;

const fields = [
  "iep",
  "lastPrice",
  "iev",
  "bidNow",
  "bidPrev",
  "offerNow",
  "offerPrev",
  "lotToday",
];

const extraFields = ["lotPrev"];
const allFields = [...fields, ...extraFields];

const unitFields = [
  "iev",
  "bidNow",
  "bidPrev",
  "offerNow",
  "offerPrev",
  "lotToday",
  "lotPrev",
];

const labels = {
  iep: "IEP",
  lastPrice: "Last Price",
  iev: "IEV",
  bidNow: "Bid_now",
  bidPrev: "Bid_prev",
  offerNow: "Offer_now",
  offerPrev: "Offer_prev",
  lotToday: "Lot_today",
  lotPrev: "Lot_prev total",
};

const SCORE_WEIGHTS = {
  A: 1.5,
  S: 1.5,
  B: 2.5,
  R: 2.5,
  G: 2.0,
};

const MAX_SCORE = 10;
const EARLY_SCORE_KEYS = ["A", "S", "B"];
const FULL_SCORE_KEYS = ["A", "S", "B", "R", "G"];

const unitMultipliers = {
  "": 1,
  K: 1000,
  M: 1000000,
  B: 1000000000,
  T: 1000000000000,
};

let history = [];

const parseRawNumber = (rawValue) => {
  const raw = String(rawValue || "").trim();
  if (!raw) return null;
  let cleaned = raw.replace(/[^0-9,.]/g, "");
  if (!cleaned) return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const hasComma = lastComma !== -1;
  const hasDot = lastDot !== -1;

  if (hasComma && hasDot) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const thousandSeparator = decimalSeparator === "," ? "." : ",";
    cleaned = cleaned
      .replace(new RegExp(`\\${thousandSeparator}`, "g"), "")
      .replace(decimalSeparator, ".");
  } else if (hasComma) {
    const parts = cleaned.split(",");
    cleaned =
      parts.length === 2 && parts[1].length !== 3
        ? parts.join(".")
        : cleaned.replace(/,/g, "");
  } else if (hasDot) {
    const parts = cleaned.split(".");
    cleaned =
      parts.length === 2 && parts[1].length !== 3
        ? cleaned
        : cleaned.replace(/\./g, "");
  }

  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
};

const parseInput = (id) => parseRawNumber(el(id).value);

const getUnitMultiplier = (id) => {
  if (!unitFields.includes(id)) return 1;
  return unitMultipliers[el(`${id}Unit`).value] || 1;
};

const readValue = (id) => {
  const value = parseInput(id);
  if (value === null) return null;
  return value * getUnitMultiplier(id);
};

const format2 = (value) => (Number.isFinite(value) ? value.toFixed(2) : "-");

const formatInputNumber = (value) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);

const formatPct = (value) =>
  Number.isFinite(value) ? `${value > 0 ? "+" : ""}${format2(value)}%` : "-";

const formatTime = (isoString) =>
  new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(isoString));

const showError = (message) => {
  el("errorBox").textContent = message;
  el("errorBox").style.display = "block";
  el("resultBox").style.display = "none";
};

const clearError = () => {
  el("errorBox").textContent = "";
  el("errorBox").style.display = "none";
};

const setFieldError = (id, hasError) => {
  const field = document.querySelector(`[data-field="${id}"]`);
  if (field) field.classList.toggle("field-error", hasError);
};

const clearFieldErrors = () => {
  allFields.forEach((id) => setFieldError(id, false));
};

const getMode = () =>
  document.querySelector('input[name="fcaMode"]:checked')?.value || "full";

const setDecisionClass = (decision) => {
  const resultBox = el("resultBox");
  const decisionValue = el("decisionValue");
  resultBox.classList.remove("buy", "hold", "sell");
  decisionValue.classList.remove("buy", "hold", "sell");

  const className = decision.toLowerCase();
  resultBox.classList.add(className);
  decisionValue.classList.add(className);
};

const getDecisionHint = (decision) => {
  if (decision === "BUY") return "Demand kuat";
  if (decision === "HOLD") return "Transisi / pantau";
  return "Risk-off";
};

const getTrend = (now, prev, type) => {
  const pct = prev ? ((now - prev) / prev) * 100 : null;
  const direction = now > prev ? "INCREASE" : now < prev ? "DECREASE" : "FLAT";
  const className =
    type === "bid"
      ? now > prev
        ? "bid-up"
        : now < prev
          ? "bid-down"
          : "flat"
      : now > prev
        ? "offer-up"
        : now < prev
          ? "offer-down"
          : "flat";

  return { direction, pct, className };
};

const setTrendCard = (cardId, valueId, detailId, trend) => {
  const card = el(cardId);
  card.classList.remove("bid-up", "bid-down", "offer-up", "offer-down", "flat", "up", "down");
  card.classList.add(trend.className);
  el(valueId).textContent = trend.direction;
  el(detailId).textContent = formatPct(trend.pct);
};

const validate = (values) => {
  clearFieldErrors();
  const requiredFields =
    getMode() === "early"
      ? ["iep", "lastPrice", "iev", "bidNow", "offerNow"]
      : ["iep", "lastPrice", "iev", "bidNow", "bidPrev", "offerNow", "offerPrev"];
  const emptyFields = requiredFields.filter((id) => values[id] === null);
  emptyFields.forEach((id) => setFieldError(id, true));

  if (emptyFields.length) {
    return `Input belum lengkap atau tidak valid: ${emptyFields
      .map((id) => labels[id])
      .join(", ")}.`;
  }

  return "";
};

const safeDivide = (numerator, denominator) => {
  if (numerator === null || denominator === null || denominator === 0) return null;
  return numerator / denominator;
};

const pass = (value, test) => Number.isFinite(value) && test(value);

const getSoMeaning = (value) => {
  if (!Number.isFinite(value)) return "Meaning: Isi Bid_now dan Offer_now untuk baca buangan";
  if (value < 0.5) return "Meaning: Buangan tipis, offer masih jauh lebih kecil dari bid";
  if (value <= 1) return "Meaning: Buangan normal, offer mulai mengejar bid";
  return "Meaning: Buangan berat, offer sudah besar atau dominan";
};

const getBsrMeaning = (value, deltaLot) => {
  if (deltaLot === null) return "Meaning: Isi Lot_prev total untuk mengaktifkan BSR";
  if (!Number.isFinite(deltaLot) || deltaLot <= 0) {
    return "Meaning: Delta lot <= 0, cek urutan snapshot Lot_today dan Lot_prev";
  }
  if (!Number.isFinite(value)) return "Meaning: BSR belum bisa dihitung";
  if (value <= 1.5) return "Meaning: Bid masih didukung aktivitas baru";
  if (value <= 3) return "Meaning: Bid mulai lebih besar dari flow baru";
  return "Meaning: Bid rawan bias atau fake, flow baru terlalu kecil";
};

const calculate = (values) => {
  const mode = getMode();
  const activeScoreKeys = mode === "early" ? EARLY_SCORE_KEYS : FULL_SCORE_KEYS;
  const A = safeDivide(values.iep, values.lastPrice);
  const S = safeDivide(values.offerNow, values.iev);
  const B = safeDivide(values.bidNow, values.offerNow);
  const R = safeDivide(values.bidNow, values.bidPrev);
  const G = safeDivide(values.offerNow, values.offerPrev);
  const SO = safeDivide(values.offerNow, values.bidNow);
  const deltaLot =
    values.lotToday !== null && values.lotPrev !== null
      ? values.lotToday - values.lotPrev
      : null;
  const BSR = deltaLot !== null && deltaLot > 0 ? safeDivide(values.bidNow, deltaLot) : null;

  let score = 0;
  if (activeScoreKeys.includes("A") && pass(A, (value) => value >= 1)) score += SCORE_WEIGHTS.A;
  if (activeScoreKeys.includes("S") && pass(S, (value) => value <= 0.3)) score += SCORE_WEIGHTS.S;
  if (activeScoreKeys.includes("B") && pass(B, (value) => value >= 2)) score += SCORE_WEIGHTS.B;
  if (activeScoreKeys.includes("R") && pass(R, (value) => value >= 0.7)) score += SCORE_WEIGHTS.R;
  if (activeScoreKeys.includes("G") && pass(G, (value) => value <= 1.3)) score += SCORE_WEIGHTS.G;

  const maxScore = activeScoreKeys.reduce((total, key) => total + SCORE_WEIGHTS[key], 0);
  const buyThreshold = maxScore * 0.8;
  const holdThreshold = maxScore * 0.5;
  const decision = score >= buyThreshold ? "BUY" : score >= holdThreshold ? "HOLD" : "SELL";
  const F = safeDivide(values.bidNow, values.iev);
  const fakeBid =
    mode === "full" && pass(F, (value) => value > 3) && pass(R, (value) => value < 0.7);
  const earlySell =
    mode === "full" && pass(R, (value) => value < 0.7) && pass(G, (value) => value > 1.5);
  const bidTrend = getTrend(values.bidNow, values.bidPrev, "bid");
  const offerTrend = getTrend(values.offerNow, values.offerPrev, "offer");

  return {
    mode,
    A,
    S,
    B,
    R,
    G,
    SO,
    BSR,
    deltaLot,
    score,
    maxScore,
    decision,
    fakeBid,
    earlySell,
    bidTrend,
    offerTrend,
  };
};

const renderResult = (result) => {
  el("metricA").textContent = format2(result.A);
  el("metricS").textContent = format2(result.S);
  el("metricB").textContent = format2(result.B);
  el("metricR").textContent = format2(result.R);
  el("metricG").textContent = format2(result.G);
  el("metricSO").textContent = format2(result.SO);
  el("metricBSR").textContent = format2(result.BSR);
  el("metricSOMeaning").textContent = getSoMeaning(result.SO);
  el("metricBSRMeaning").textContent = getBsrMeaning(result.BSR, result.deltaLot);
  el("scoreValue").textContent = `${format2(result.score)} / ${format2(result.maxScore)}`;
  el("decisionValue").textContent = result.decision;
  el("decisionHint").textContent = getDecisionHint(result.decision);
  el("warningBox").style.display = result.fakeBid ? "block" : "none";
  el("earlySellBox").style.display = result.earlySell ? "block" : "none";
  setTrendCard("bidTrendCard", "bidTrendValue", "bidTrendDetail", result.bidTrend);
  setTrendCard("offerTrendCard", "offerTrendValue", "offerTrendDetail", result.offerTrend);

  setDecisionClass(result.decision);
  el("resultBox").style.display = "block";
};

const loadHistory = () => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    history = raw ? JSON.parse(raw) : [];
  } catch {
    history = [];
  }
};

const saveHistory = () => {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
};

const warningText = (item) => {
  const warnings = [];
  if (item.fakeBid) warnings.push("Fake Bid");
  if (item.earlySell) warnings.push("Early Sell");
  return warnings.join(", ");
};

const trendBadge = (trend, type) => {
  const isGood =
    trend.direction === "FLAT" ||
    (type === "bid" && trend.direction === "INCREASE") ||
    (type === "offer" && trend.direction === "DECREASE");
  const badgeClass = trend.direction === "FLAT" ? "neutral" : isGood ? "buy" : "sell";
  return `<span class="badge ${badgeClass}">${trend.direction}</span> ${formatPct(trend.pct)}`;
};

const renderHistory = () => {
  const body = el("historyBody");
  const empty = el("historyEmpty");
  body.innerHTML = "";

  if (!history.length) {
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";
  history.forEach((item) => {
    const warning = warningText(item);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatTime(item.createdAt)}</td>
      <td>${item.mode === "early" ? "Early" : "Full"}</td>
      <td><span class="badge ${item.decision.toLowerCase()}">${item.decision}</span></td>
      <td>${format2(item.score)}/${format2(item.maxScore || MAX_SCORE)}</td>
      <td>${trendBadge(item.bidTrend, "bid")}</td>
      <td>${trendBadge(item.offerTrend, "offer")}</td>
      <td>${format2(item.A)}</td>
      <td>${format2(item.S)}</td>
      <td>${format2(item.B)}</td>
      <td>${format2(item.R)}</td>
      <td>${format2(item.G)}</td>
      <td>${format2(item.SO)}</td>
      <td>${format2(item.BSR)}</td>
      <td>${warning ? `<span class="badge warn">${warning}</span>` : "-"}</td>
    `;
    body.appendChild(tr);
  });
};

const addHistory = (result) => {
  history.unshift({
    createdAt: new Date().toISOString(),
    A: result.A,
    S: result.S,
    B: result.B,
    R: result.R,
    G: result.G,
    SO: result.SO,
    BSR: result.BSR,
    score: result.score,
    maxScore: result.maxScore,
    mode: result.mode,
    decision: result.decision,
    fakeBid: result.fakeBid,
    earlySell: result.earlySell,
    bidTrend: result.bidTrend,
    offerTrend: result.offerTrend,
  });
  history = history.slice(0, MAX_HISTORY);
  saveHistory();
  renderHistory();
};

const clearHistory = () => {
  history = [];
  saveHistory();
  renderHistory();
};

const applyMode = () => {
  const modeHint =
    getMode() === "early"
      ? "Early session mode memakai A, S, dan B saja. Data prev belum wajib."
      : "Full mode memakai A, S, B, R, dan G. Bid_prev dan Offer_prev wajib untuk pembacaan lengkap.";
  el("modeHint").textContent = modeHint;
  clearFieldErrors();
};

const handleCalculate = () => {
  const values = Object.fromEntries(allFields.map((id) => [id, readValue(id)]));
  const error = validate(values);

  if (error) {
    showError(error);
    return;
  }

  clearError();
  const result = calculate(values);
  renderResult(result);
  addHistory(result);
};

const formatInput = (id) => {
  const value = parseInput(id);
  el(id).value = value === null ? "" : formatInputNumber(value);
};

const sanitizeInput = (id) => {
  const input = el(id);
  const sanitized = input.value.replace(/[^0-9,.]/g, "");
  if (input.value !== sanitized) input.value = sanitized;
};

const init = () => {
  loadHistory();
  renderHistory();
  applyMode();

  el("fcaForm").addEventListener("submit", (event) => {
    event.preventDefault();
    allFields.forEach(formatInput);
    handleCalculate();
  });

  el("clearHistoryBtn").addEventListener("click", clearHistory);

  allFields.forEach((id) => {
    el(id).addEventListener("input", () => sanitizeInput(id));
    el(id).addEventListener("blur", () => formatInput(id));
  });

  document.querySelectorAll('input[name="fcaMode"]').forEach((radio) => {
    radio.addEventListener("change", applyMode);
  });
};

init();
