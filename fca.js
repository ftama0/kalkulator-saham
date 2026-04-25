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
  "lotAvg",
];

const unitFields = [
  "iev",
  "bidNow",
  "bidPrev",
  "offerNow",
  "offerPrev",
  "lotToday",
  "lotAvg",
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
  lotAvg: "Lot_avg",
};

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
  fields.forEach((id) => setFieldError(id, false));
};

const setDecisionClass = (decision) => {
  const resultBox = el("resultBox");
  const decisionValue = el("decisionValue");
  resultBox.classList.remove("buy", "hold", "sell");
  decisionValue.classList.remove("buy", "hold", "sell");

  const className = decision.toLowerCase();
  resultBox.classList.add(className);
  decisionValue.classList.add(className);
};

const getPositionMode = () =>
  document.querySelector('input[name="positionMode"]:checked')?.value || "noPosition";

const hasPosition = () => getPositionMode() === "hasPosition";

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
  const requiredFields = hasPosition() ? fields.filter((id) => id !== "lotAvg") : fields;
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

const calculate = (values) => {
  const positionHasLot = hasPosition();
  const A = safeDivide(values.iep, values.lastPrice);
  const S = safeDivide(values.offerNow, values.iev);
  const B = safeDivide(values.bidNow, values.offerNow);
  const R = safeDivide(values.bidNow, values.bidPrev);
  const G = safeDivide(values.offerNow, values.offerPrev);
  const L = positionHasLot ? null : safeDivide(values.lotToday, values.lotAvg);
  const maxScore = positionHasLot ? 5 : 6;

  let score = 0;
  if (pass(A, (value) => value >= 1)) score++;
  if (pass(S, (value) => value <= 0.3)) score++;
  if (pass(B, (value) => value >= 2)) score++;
  if (pass(R, (value) => value >= 0.7)) score++;
  if (pass(G, (value) => value <= 1.3)) score++;
  if (!positionHasLot && pass(L, (value) => value <= 1.5)) score++;

  const decision = score >= 5 ? "BUY" : score >= 3 ? "HOLD" : "SELL";
  const F = safeDivide(values.bidNow, values.iev);
  const fakeBid = pass(F, (value) => value > 3) && pass(R, (value) => value < 0.7);
  const earlySell = pass(R, (value) => value < 0.7) && pass(G, (value) => value > 1.5);
  const bidTrend = getTrend(values.bidNow, values.bidPrev, "bid");
  const offerTrend = getTrend(values.offerNow, values.offerPrev, "offer");

  return { A, S, B, R, G, L, score, maxScore, decision, fakeBid, earlySell, bidTrend, offerTrend };
};

const renderResult = (result) => {
  el("metricA").textContent = format2(result.A);
  el("metricS").textContent = format2(result.S);
  el("metricB").textContent = format2(result.B);
  el("metricR").textContent = format2(result.R);
  el("metricG").textContent = format2(result.G);
  el("metricL").textContent = format2(result.L);
  el("scoreValue").textContent = `${result.score} / ${result.maxScore}`;
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
      <td><span class="badge ${item.decision.toLowerCase()}">${item.decision}</span></td>
      <td>${item.score}/${item.maxScore || 6}</td>
      <td>${trendBadge(item.bidTrend, "bid")}</td>
      <td>${trendBadge(item.offerTrend, "offer")}</td>
      <td>${format2(item.A)}</td>
      <td>${format2(item.S)}</td>
      <td>${format2(item.B)}</td>
      <td>${format2(item.R)}</td>
      <td>${format2(item.G)}</td>
      <td>${format2(item.L)}</td>
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
    L: result.L,
    score: result.score,
    maxScore: result.maxScore,
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

const handleCalculate = () => {
  const values = Object.fromEntries(fields.map((id) => [id, readValue(id)]));
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

const applyPositionMode = () => {
  const lotAvgField = document.querySelector('[data-field="lotAvg"]');
  lotAvgField.classList.toggle("optional", hasPosition());
  if (hasPosition()) setFieldError("lotAvg", false);
};

const init = () => {
  loadHistory();
  renderHistory();
  applyPositionMode();

  el("fcaForm").addEventListener("submit", (event) => {
    event.preventDefault();
    fields.forEach(formatInput);
    handleCalculate();
  });

  el("clearHistoryBtn").addEventListener("click", clearHistory);

  fields.forEach((id) => {
    el(id).addEventListener("input", () => sanitizeInput(id));
    el(id).addEventListener("blur", () => formatInput(id));
  });

  document.querySelectorAll('input[name="positionMode"]').forEach((radio) => {
    radio.addEventListener("change", applyPositionMode);
  });
};

init();
