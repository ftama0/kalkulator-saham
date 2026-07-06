const el = (id) => document.getElementById(id);

const LEVEL_COUNT = 10;
const SHARES_PER_LOT = 100;

// ── Parsing ──────────────────────────────────────────

const parseIDR = (value) => {
  const numeric = String(value || "").replace(/[^0-9]/g, "");
  return numeric ? Number(numeric) : 0;
};

const parseLots = () => {
  const raw = el("lotCount").value || "";
  const num = raw.replace(/[^0-9]/g, "");
  return num ? Number(num) : 0;
};

// ── Formatting ───────────────────────────────────────

const formatRupiahInput = (value) =>
  value ? `Rp ${new Intl.NumberFormat("id-ID").format(value)}` : "";

const formatNumber = (value) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value);

const formatRupiah = (value) =>
  `Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value)}`;

// ── Rules ────────────────────────────────────────────

const getAraPct = (price) => {
  if (price <= 200) return 35;
  if (price <= 5000) return 25;
  return 20;
};

const getArbPct = () => 15;

const getTickSize = (price) => {
  if (price < 200) return 1;
  if (price < 500) return 2;
  if (price < 2000) return 5;
  if (price < 5000) return 10;
  return 25;
};

const roundDownToTick = (value) => {
  const rounded = Math.floor(value);
  const tick = getTickSize(rounded);
  return rounded - (rounded % tick);
};

const roundUpToTick = (value) => {
  let rounded = Math.ceil(value);
  while (true) {
    const tick = getTickSize(rounded);
    const remainder = rounded % tick;
    if (remainder === 0) return rounded;
    rounded += tick - remainder;
  }
};

// ── Build levels ─────────────────────────────────────

const buildLevels = (startPrice, direction) => {
  const items = [];
  let referencePrice = startPrice;

  for (let level = 1; level <= LEVEL_COUNT; level += 1) {
    const pct = direction === "up" ? getAraPct(referencePrice) : getArbPct();
    const rawPrice =
      direction === "up"
        ? referencePrice * (1 + pct / 100)
        : referencePrice * (1 - pct / 100);
    const price =
      direction === "up" ? roundDownToTick(rawPrice) : roundUpToTick(rawPrice);

    const perLot = price * SHARES_PER_LOT;

    items.push({
      level,
      pct,
      price,
      tick: getTickSize(price),
      perLot,
    });

    referencePrice = price;
    if (referencePrice <= 0) break;
  }

  return items;
};

// ── Render center summary ────────────────────────────

const renderCenter = (price, lots) => {
  const centerCard = el("centerCard");
  if (!price) {
    centerCard.innerHTML = `
      <div class="center-note">Harga Saat Ini</div>
      <div class="center-price">-</div>
      <div class="center-meta">Menunggu input harga</div>
    `;
    return;
  }

  const modalPerLot = price * SHARES_PER_LOT;

  let info = `
    <div class="center-nominal">
      <div class="center-nominal-item">
        <div class="cn-label">Modal / lot</div>
        <div class="cn-value">${formatRupiah(modalPerLot)}</div>
      </div>`;

  if (lots > 0) {
    info += `
      <div class="center-nominal-item">
        <div class="cn-label">Modal ${formatNumber(lots)} lot</div>
        <div class="cn-value">${formatRupiah(modalPerLot * lots)}</div>
      </div>`;
  }

  info += `</div>`;

  centerCard.innerHTML = `
    <div class="center-note">Harga Saat Ini (Modal Awal)</div>
    <div class="center-price">${formatNumber(price)}</div>
    <div class="center-meta">
      Tier ARA ${getAraPct(price)}% &middot; ARB ${getArbPct()}% &middot;
      Tick Rp${formatNumber(getTickSize(price))}
    </div>
    ${info}
  `;
};

// ── Render table ─────────────────────────────────────

const renderTable = (containerId, items, type, lots, startPrice) => {
  const container = el(containerId);

  if (!items.length) {
    container.innerHTML = `
      <div class="empty">Masukkan current price untuk melihat level ${type === "up" ? "ARA" : "ARB"}.</div>
    `;
    return;
  }

  const label = type === "up" ? "ARA" : "ARB";
  const cls = type === "up" ? "ara-table" : "arb-table";
  const gainSign = type === "up" ? "+" : "\u2212";

  const rows = items
    .map((item) => {
      const diffPerLot = (item.price - startPrice) * SHARES_PER_LOT;
      const diffClass = type === "up" ? "gain" : "loss";
      const diffLabel = type === "up" ? "Untung" : "Rugi";

      let totalDiffHtml = "";
      if (lots > 0) {
        totalDiffHtml = `<td class="${diffClass}">${gainSign}${formatRupiah(diffPerLot * lots)}</td>`;
      }

      return `
        <tr>
          <td>${label} ${item.level}</td>
          <td>${item.pct}%</td>
          <td>${formatNumber(item.price)}</td>
          <td class="${diffClass}">${gainSign}${formatRupiah(Math.abs(diffPerLot))}</td>
          <td>${formatRupiah(item.perLot)}</td>
          ${lots > 0 ? `<td>${formatRupiah(item.perLot * lots)}</td>` : ""}
          ${totalDiffHtml}
          <td>${formatNumber(item.tick)}</td>
        </tr>`;
    })
    .join("");

  const hasLots = lots > 0;
  const diffLabel = type === "up" ? "Untung" : "Rugi";
  const lotLabel = hasLots ? `(${formatNumber(lots)} lot)` : "";

  container.innerHTML = `
    <table class="${cls}">
      <thead>
        <tr>
          <th class="col-level">Level</th>
          <th class="col-pct">%</th>
          <th class="col-price">Harga</th>
          <th class="col-diff">${diffLabel} / lot</th>
          <th class="col-nom">Nilai / lot</th>
          ${hasLots ? `<th class="col-total-val">Nilai ${lotLabel}</th>` : ""}
          ${hasLots ? `<th class="col-total-diff">${diffLabel} ${lotLabel}</th>` : ""}
          <th class="col-tick">Tick</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
};

// ── Main render ──────────────────────────────────────

const renderAll = () => {
  const currentPrice = parseIDR(el("currentPrice").value);
  const lots = parseLots();

  if (currentPrice < 50) {
    renderCenter(currentPrice, lots);
    el("araWrap").innerHTML =
      '<div class="empty">Masukkan current price minimal Rp50.</div>';
    el("arbWrap").innerHTML =
      '<div class="empty">Masukkan current price minimal Rp50.</div>';
    return;
  }

  renderCenter(currentPrice, lots);
  renderTable("araWrap", buildLevels(currentPrice, "up"), "up", lots, currentPrice);
  renderTable("arbWrap", buildLevels(currentPrice, "down"), "down", lots, currentPrice);
};

// ── Input setup ──────────────────────────────────────

const setupRupiahInput = () => {
  const input = el("currentPrice");
  input.addEventListener("focus", () => {
    const value = parseIDR(input.value);
    input.value = value ? String(value) : "";
  });
  input.addEventListener("blur", () => {
    const value = parseIDR(input.value);
    input.value = value ? formatRupiahInput(value) : "";
    renderAll();
  });
  input.addEventListener("input", renderAll);
};

const setupLotInput = () => {
  const input = el("lotCount");
  input.addEventListener("input", renderAll);
};

// ── Init ─────────────────────────────────────────────

const init = () => {
  setupRupiahInput();
  setupLotInput();
  renderAll();
};

init();
