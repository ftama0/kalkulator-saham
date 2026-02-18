const el = (id) => document.getElementById(id);

const state = {
  history: [],
};

const HISTORY_KEY = "stock_avg_down_history_v1";

const parseIDR = (value) => {
  const numeric = String(value || "").replace(/[^0-9]/g, "");
  return numeric ? Number(numeric) : 0;
};

const formatRupiahInput = (value) =>
  value ? `Rp ${new Intl.NumberFormat("id-ID").format(value)}` : "";

const formatIDR = (value) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(
    value
  );

const formatNumber = (value) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value);

const readNumber = (id, formatted = false) => {
  const raw = el(id).value;
  if (formatted) return parseIDR(raw);
  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
};

const calcAverageDown = () => {
  const initialPrice = readNumber("initialPrice", true);
  const initialLot = readNumber("initialLot");
  const initialFee = readNumber("initialFee", true);
  const nextPrice = readNumber("nextPrice", true);
  const nextLot = readNumber("nextLot");
  const nextFee = readNumber("nextFee", true);

  const initialShares = initialLot * 100;
  const nextShares = nextLot * 100;

  const initialCost = initialFee;
  const nextCost = nextFee;

  const totalCost = initialCost + nextCost;
  const totalShares = initialShares + nextShares;
  const avgPrice = totalShares > 0 ? totalCost / totalShares : 0;

  return {
    initialPrice,
    initialLot,
    initialFee,
    nextPrice,
    nextLot,
    nextFee,
    totalCost,
    totalShares,
    totalLot: totalShares / 100,
    avgPrice,
  };
};

const renderResult = (data) => {
  const resultBox = el("resultBox");
  if (!data.totalCost || !data.totalShares) {
    resultBox.textContent = "Isi data lalu perhitungan akan otomatis muncul.";
    return;
  }
  resultBox.innerHTML = `
    <div><strong>Average harga:</strong> ${formatNumber(data.avgPrice)}</div>
    <div><strong>Jumlah lot:</strong> ${formatNumber(data.totalLot)}</div>
    <div><strong>Total biaya:</strong> ${formatIDR(data.totalCost)}</div>
  `;
};

const setupRupiahInput = (id) => {
  const input = el(id);
  input.addEventListener("focus", () => {
    const num = parseIDR(input.value);
    input.value = num ? String(num) : "";
  });
  input.addEventListener("blur", () => {
    const num = parseIDR(input.value);
    input.value = num ? formatRupiahInput(num) : "";
  });
  input.addEventListener("input", () => {
    if (!input.value) input.dataset.manual = "0";
  });
};

const autoFillCost = (priceId, lotId, feeId) => {
  const feeInput = el(feeId);
  if (feeInput.dataset.manual === "1") return;
  const price = readNumber(priceId, true);
  const lot = readNumber(lotId);
  if (price > 0 && lot > 0) {
    feeInput.value = formatRupiahInput(price * lot * 100);
  } else {
    feeInput.value = "";
  }
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
    tr.innerHTML = `
      <td style="padding:8px; border-bottom:1px solid var(--border);">${
        idx + 1
      }</td>
      <td style="padding:8px; border-bottom:1px solid var(--border);">
        ${formatNumber(item.initialPrice)} | Lot ${formatNumber(
      item.initialLot
    )} | ${formatIDR(item.initialFee)}
      </td>
      <td style="padding:8px; border-bottom:1px solid var(--border);">
        ${formatNumber(item.nextPrice)} | Lot ${formatNumber(
      item.nextLot
    )} | ${formatIDR(item.nextFee)}
      </td>
      <td style="padding:8px; border-bottom:1px solid var(--border);">${formatNumber(
        item.avgPrice
      )}</td>
      <td style="padding:8px; border-bottom:1px solid var(--border);">${formatNumber(
        item.totalLot
      )}</td>
      <td style="padding:8px; border-bottom:1px solid var(--border);">${formatIDR(
        item.totalCost
      )}</td>
      <td style="padding:8px; border-bottom:1px solid var(--border);">
        <button class="btn secondary" data-del-index="${idx}" type="button">Hapus</button>
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
    return [
      `#${idx + 1}`,
      `Awal: ${formatNumber(item.initialPrice)} | Lot ${formatNumber(
        item.initialLot
      )} | Biaya ${formatIDR(item.initialFee)}`,
      `Next: ${formatNumber(item.nextPrice)} | Lot ${formatNumber(
        item.nextLot
      )} | Biaya ${formatIDR(item.nextFee)}`,
      `Average: ${formatNumber(item.avgPrice)}`,
      `Total lot: ${formatNumber(item.totalLot)}`,
      `Total biaya: ${formatIDR(item.totalCost)}`,
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
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
  el("tab-calc").style.display = name === "calc" ? "block" : "none";
  el("tab-history").style.display = name === "history" ? "block" : "none";
};

const init = () => {
  loadHistory();
  renderHistory();

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => setTab(tab.dataset.tab));
  });

  setupRupiahInput("initialPrice");
  setupRupiahInput("nextPrice");
  setupRupiahInput("initialFee");
  setupRupiahInput("nextFee");

  el("initialFee").addEventListener("input", () => {
    el("initialFee").dataset.manual = "1";
  });
  el("nextFee").addEventListener("input", () => {
    el("nextFee").dataset.manual = "1";
  });

  const autoInputs = [
    "initialPrice",
    "initialLot",
    "initialFee",
    "nextPrice",
    "nextLot",
    "nextFee",
  ];
  autoInputs.forEach((id) => {
    el(id).addEventListener("input", () => {
      autoFillCost("initialPrice", "initialLot", "initialFee");
      autoFillCost("nextPrice", "nextLot", "nextFee");
      renderResult(calcAverageDown());
    });
    el(id).addEventListener("blur", () => renderResult(calcAverageDown()));
  });

  el("addHistoryBtn").addEventListener("click", () => {
    const data = calcAverageDown();
    renderResult(data);
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
  renderResult(calcAverageDown());
};

init();
