const el = (id) => document.getElementById(id);

const LEVEL_COUNT = 10;

const parseIDR = (value) => {
  const numeric = String(value || "").replace(/[^0-9]/g, "");
  return numeric ? Number(numeric) : 0;
};

const formatRupiahInput = (value) =>
  value ? `Rp ${new Intl.NumberFormat("id-ID").format(value)}` : "";

const formatNumber = (value) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value);

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

    items.push({
      level,
      pct,
      price,
      tick: getTickSize(price),
    });

    referencePrice = price;
    if (referencePrice <= 0) break;
  }

  return items;
};

const renderCenter = (price) => {
  const centerCard = el("centerCard");
  if (!price) {
    centerCard.innerHTML = `
      <div class="center-note">Current Price</div>
      <div class="center-price">-</div>
      <div class="center-note">Menunggu input harga</div>
    `;
    return;
  }

  centerCard.innerHTML = `
    <div class="center-note">Current Price</div>
    <div class="center-price">${formatNumber(price)}</div>
    <div class="center-note">
      Tier aktif: ARA ${getAraPct(price)}% | ARB ${getArbPct()}%<br />
      Tick size: Rp${formatNumber(getTickSize(price))}
    </div>
  `;
};

const renderList = (id, items, type) => {
  const container = el(id);
  if (!items.length) {
    container.innerHTML = `
      <div class="empty">Isi current price untuk menampilkan level ${
        type === "up" ? "ARA" : "ARB"
      }.</div>
    `;
    return;
  }

  const displayItems = type === "up" ? [...items].reverse() : items;

  container.innerHTML = displayItems
    .map(
      (item) => `
        <div class="price-card ${type === "up" ? "up" : "down"}">
          <div class="price-meta">
            <span>${type === "up" ? "Batas atas" : "Batas bawah"}</span>
            <strong>${formatNumber(item.price)}</strong>
            <span>${item.pct}% | Tick Rp${formatNumber(item.tick)}</span>
          </div>
          <div class="level-tag">${type === "up" ? "ARA" : "ARB"} ${
        item.level
      }</div>
        </div>
      `
    )
    .join("");
};

const renderAll = () => {
  const currentPrice = parseIDR(el("currentPrice").value);

  if (currentPrice < 50) {
    renderCenter(currentPrice);
    el("araList").innerHTML =
      '<div class="empty">Masukkan current price minimal Rp50.</div>';
    el("arbList").innerHTML =
      '<div class="empty">Masukkan current price minimal Rp50.</div>';
    return;
  }

  renderCenter(currentPrice);
  renderList("araList", buildLevels(currentPrice, "up"), "up");
  renderList("arbList", buildLevels(currentPrice, "down"), "down");
};

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

const init = () => {
  setupRupiahInput();
  renderAll();
};

init();
