const inputText = document.getElementById("inputText");
const splitBtn = document.getElementById("splitBtn");
const clearBtn = document.getElementById("clearBtn");
const copyAllBtn = document.getElementById("copyAllBtn");
const outputGrid = document.getElementById("outputGrid");

function chunkLines(lines, size) {
  const clean = lines.filter((line) => line.trim() !== "");
  const result = [];
  for (let i = 0; i < clean.length; i += size) {
    result.push(clean.slice(i, i + size).join("\n"));
  }
  return result;
}

function renderParagraphs(paragraphs) {
  outputGrid.innerHTML = "";
  if (paragraphs.length === 0) return;

  paragraphs.forEach((text, idx) => {
    const box = document.createElement("div");
    box.className = "box";

    const title = document.createElement("h3");
    title.textContent = `Paragraf ${idx + 1}`;

    const area = document.createElement("textarea");
    area.readOnly = true;
    area.value = text;
    const btn = document.createElement("button");
    btn.className = "copy";
    btn.textContent = "Copy";
    btn.dataset.copy = `${idx + 1}`;

    box.appendChild(title);
    box.appendChild(area);
    box.appendChild(btn);
    outputGrid.appendChild(box);
  });
}

function splitText() {
  const lines = inputText.value.split(/\r?\n/);
  const paragraphs = chunkLines(lines, 5);
  renderParagraphs(paragraphs);
}

async function copyText(text) {
  if (!text) return;
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
}

splitBtn.addEventListener("click", splitText);
clearBtn.addEventListener("click", () => {
  inputText.value = "";
  renderParagraphs([]);
});

copyAllBtn.addEventListener("click", () => {
  const areas = outputGrid.querySelectorAll("textarea");
  const all = Array.from(areas).map((area) => area.value).join("\n\n");
  copyText(all.trim());
});

outputGrid.addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-copy]");
  if (!btn) return;
  const box = btn.closest(".box");
  const area = box ? box.querySelector("textarea") : null;
  if (!area) return;
  copyText(area.value);
});
