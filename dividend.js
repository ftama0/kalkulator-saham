const el = (id) => document.getElementById(id);

const state = {
  history: [],
  mode: "dps",
};

const HISTORY_KEY = "stock_dividend_history_v1";

const parseIDR = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return 0;
  let cleaned = raw.replace(/[^0-9,.\-]/g, "");
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  if (hasComma && hasDot) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    cleaned = cleaned.replace(",", ".");
  } else if (hasDot) {
    // Treat dot as thousands separator when it matches id-ID grouping.
    if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
      cleaned = cleaned.replace(/\./g, "");
    }
  }
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatRupiahInput = (value) => {
  if (!Number.isFinite(value) || value === 0) return "";
  return `Rp ${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value)}`;
};

const formatIDR = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);

const formatNumber0 = (value) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value);

const formatNumber2 = (value) =>
  new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);

const readNumber = (id, formatted = false) => {
  const raw = el(id).value;
  if (formatted) return parseIDR(raw);
  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
};

const calcDividend = () => {
  if (state.mode === "dps") {
    const dps = readNumber("dps", true);
    const lot = readNumber("lot");
    const taxPct = readNumber("taxDps");
    const shares = lot * 100;
    const gross = dps * shares;
    const tax = (taxPct / 100) * gross;
    const net = gross - tax;
    return {
      mode: "DPS",
      dps,
      lot,
      taxPct,
      shares,
      gross,
      tax,
      net,
    };
  }

  const investment = readNumber("investment", true);
  const yieldPct = readNumber("yieldPct");
  const taxPct = readNumber("taxYield");
  const gross = (yieldPct / 100) * investment;
  const tax = (taxPct / 100) * gross;
  const net = gross - tax;
  return {
    mode: "Yield",
    investment,
    yieldPct,
    taxPct,
    gross,
    tax,
    net,
  };
};

const renderResult = (data) => {
  const resultBox = el("resultBox");
  resultBox.classList.remove("empty");
  if (!data.gross) {
    resultBox.classList.add("empty");
    resultBox.innerHTML = `
      <div class="result-title">Ringkasan</div>
      <div>Isi data lalu perhitungan akan otomatis muncul.</div>
    `;
    return;
  }
  resultBox.innerHTML = `
    <div class="result-title">Ringkasan</div>
    <div class="result-grid">
      <div class="result-row">
        <span>Dividen bruto</span>
        <strong>${formatIDR(data.gross)}</strong>
      </div>
      <div class="result-row">
        <span>Pajak (${formatNumber2(data.taxPct)}%)</span>
        <strong>${formatIDR(data.tax)}</strong>
      </div>
      <div class="result-row">
        <span>Dividen bersih</span>
        <strong>${formatIDR(data.net)}</strong>
      </div>
    </div>
  `;
};

const setupRupiahInput = (id) => {
  const input = el(id);
  input.addEventListener("focus", () => {
    const num = parseIDR(input.value);
    input.value = Number.isFinite(num) && num !== 0 ? String(num) : "";
  });
  input.addEventListener("blur", () => {
    const num = parseIDR(input.value);
    input.value = formatRupiahInput(num);
  });
};

const loadHistory = () => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    state.history = raw ? JSON.parse(raw) : [];
  } catch {
    state.history = [];
  }
};

const saveHistory = () => {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history));
};

const renderHistory = () => {
  const empty = el("historyEmpty");
  const body = el("historyBody");
  body.innerHTML = "";

  if (!state.history.length) {
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";
  state.history.forEach((item, idx) => {
    const tr = document.createElement("tr");
    const inputCell =
      item.mode === "DPS"
        ? `
          <div class="history-cell">
            <strong>DPS ${formatIDR(item.dps)}</strong>
            <span>Lot ${formatNumber0(item.lot)} (${formatNumber0(
            item.shares
          )} saham)</span>
            <span>Pajak ${formatNumber2(item.taxPct)}%</span>
          </div>
        `
        : `
          <div class="history-cell">
            <strong>Investasi ${formatIDR(item.investment)}</strong>
            <span>Yield ${formatNumber2(item.yieldPct)}%</span>
            <span>Pajak ${formatNumber2(item.taxPct)}%</span>
          </div>
        `;

    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${item.mode}</td>
      <td>${inputCell}</td>
      <td>
        <div class="history-cell">
          <strong>Net ${formatIDR(item.net)}</strong>
          <span>Bruto ${formatIDR(item.gross)}</span>
          <span>Pajak ${formatIDR(item.tax)}</span>
        </div>
      </td>
      <td class="history-actions">
        <button class="btn danger" data-del-index="${idx}" type="button">Hapus</button>
      </td>
    `;
    body.appendChild(tr);
  });

  body.querySelectorAll("[data-del-index]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.delIndex);
      if (!Number.isFinite(index)) return;
      state.history.splice(index, 1);
      saveHistory();
      renderHistory();
    });
  });
};

const copyHistory = async () => {
  if (!state.history.length) return;
  const lines = state.history.map((item, idx) => {
    if (item.mode === "DPS") {
      return [
        `#${idx + 1}`,
        `Mode: DPS`,
        `DPS: ${formatIDR(item.dps)}`,
        `Lot: ${formatNumber0(item.lot)} (${formatNumber0(item.shares)} saham)`,
        `Pajak: ${formatNumber2(item.taxPct)}%`,
        `Bruto: ${formatIDR(item.gross)}`,
        `Pajak: ${formatIDR(item.tax)}`,
        `Bersih: ${formatIDR(item.net)}`,
      ].join(" | ");
    }
    return [
      `#${idx + 1}`,
      `Mode: Yield`,
      `Investasi: ${formatIDR(item.investment)}`,
      `Yield: ${formatNumber2(item.yieldPct)}%`,
      `Pajak: ${formatNumber2(item.taxPct)}%`,
      `Bruto: ${formatIDR(item.gross)}`,
      `Pajak: ${formatIDR(item.tax)}`,
      `Bersih: ${formatIDR(item.net)}`,
    ].join(" | ");
  });
  const text = lines.join("\n");
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const temp = document.createElement("textarea");
    temp.value = text;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    temp.remove();
  }
};

const setTab = (name) => {
  document.querySelectorAll(".tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.tab === name);
  });
  el("tab-calc").style.display = name === "calc" ? "block" : "none";
  el("tab-history").style.display = name === "history" ? "block" : "none";
};

const setMode = (mode) => {
  state.mode = mode;
  document.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });
  el("mode-dps").style.display = mode === "dps" ? "grid" : "none";
  el("mode-yield").style.display = mode === "yield" ? "grid" : "none";
  renderResult(calcDividend());
};

const init = () => {
  loadHistory();
  renderHistory();

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => setTab(tab.dataset.tab));
  });

  document.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });

  setupRupiahInput("dps");
  setupRupiahInput("investment");

  const autoInputs = [
    "dps",
    "lot",
    "taxDps",
    "investment",
    "yieldPct",
    "taxYield",
  ];
  autoInputs.forEach((id) => {
    el(id).addEventListener("input", () => renderResult(calcDividend()));
    el(id).addEventListener("blur", () => renderResult(calcDividend()));
  });

  el("addHistoryBtn").addEventListener("click", () => {
    const data = calcDividend();
    renderResult(data);
    if (!data.gross) return;
    state.history.unshift({
      ...data,
      createdAt: new Date().toISOString(),
    });
    saveHistory();
    renderHistory();
    setTab("history");
  });

  el("clearHistoryBtn").addEventListener("click", () => {
    state.history = [];
    saveHistory();
    renderHistory();
  });

  el("copyHistoryBtn").addEventListener("click", copyHistory);
  renderResult(calcDividend());
};

init();
