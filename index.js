const el = (id) => document.getElementById(id);

const state = {
  history: [],
};

const HISTORY_KEY = "stock_trade_history_v1";

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
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value);

const readNumber = (id, formatted = false) => {
  const raw = el(id).value;
  if (formatted) return parseIDR(raw);
  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
};

const calcTrade = () => {
  const buyPrice = readNumber("buyPrice", true);
  const sellPrice = readNumber("sellPrice", true);
  const lot = readNumber("lot");
  const buyFeePct = readNumber("buyFee");
  const sellFeePct = readNumber("sellFee");

  const shares = lot * 100;
  const grossBuy = buyPrice * shares;
  const grossSell = sellPrice * shares;
  const buyFee = (buyFeePct / 100) * grossBuy;
  const sellFee = (sellFeePct / 100) * grossSell;
  const totalBuy = grossBuy + buyFee;
  const totalSell = grossSell - sellFee;
  const profit = totalSell - totalBuy;
  const profitPct = totalBuy > 0 ? (profit / totalBuy) * 100 : 0;

  return {
    buyPrice,
    sellPrice,
    lot,
    buyFeePct,
    sellFeePct,
    shares,
    totalBuy,
    totalSell,
    profit,
    profitPct,
  };
};

const renderResult = (data) => {
  const resultBox = el("resultBox");
  resultBox.classList.remove("profit", "loss");
  if (!data.totalBuy && !data.totalSell) {
    resultBox.textContent = "Isi data lalu perhitungan akan otomatis muncul.";
    return;
  }
  if (data.profit > 0) resultBox.classList.add("profit");
  if (data.profit < 0) resultBox.classList.add("loss");
  resultBox.innerHTML = `
    <div><strong>Total beli:</strong> ${formatIDR(data.totalBuy)}</div>
    <div><strong>Total jual:</strong> ${formatIDR(data.totalSell)}</div>
    <div><strong>Untung/Rugi:</strong> ${formatIDR(data.profit)} (${formatNumber(
      data.profitPct
    )}%)</div>
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
      <td style="padding:8px; border-bottom:1px solid var(--border);">${formatNumber(
        item.buyPrice
      )}</td>
      <td style="padding:8px; border-bottom:1px solid var(--border);">${formatNumber(
        item.sellPrice
      )}</td>
      <td style="padding:8px; border-bottom:1px solid var(--border);">${formatNumber(
        item.lot
      )}</td>
      <td style="padding:8px; border-bottom:1px solid var(--border);">${formatIDR(
        item.totalBuy
      )}</td>
      <td style="padding:8px; border-bottom:1px solid var(--border);">${formatIDR(
        item.totalSell
      )}</td>
      <td style="padding:8px; border-bottom:1px solid var(--border);">${formatIDR(
        item.profit
      )} (${formatNumber(item.profitPct)}%)</td>
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
      `Harga beli: ${formatNumber(item.buyPrice)}`,
      `Harga jual: ${formatNumber(item.sellPrice)}`,
      `Lot: ${formatNumber(item.lot)}`,
      `Total beli: ${formatIDR(item.totalBuy)}`,
      `Total jual: ${formatIDR(item.totalSell)}`,
      `Untung/Rugi: ${formatIDR(item.profit)} (${formatNumber(
        item.profitPct
      )}%)`,
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

  setupRupiahInput("buyPrice");
  setupRupiahInput("sellPrice");

  const autoInputs = [
    "buyPrice",
    "sellPrice",
    "lot",
    "buyFee",
    "sellFee",
  ];
  autoInputs.forEach((id) => {
    el(id).addEventListener("input", () => renderResult(calcTrade()));
    el(id).addEventListener("blur", () => renderResult(calcTrade()));
  });

  el("addHistoryBtn").addEventListener("click", () => {
    const data = calcTrade();
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
  renderResult(calcTrade());
};

init();
