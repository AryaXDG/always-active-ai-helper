const log = (msg) => console.log(`[Options] ${msg}`);
const errorLog = (msg, e) => console.error(`[Options ERROR] ${msg}`, e);

const saveButton = document.getElementById('save');
const statusEl = document.getElementById('status');
const apiKeyInput = document.getElementById('api-key');
const bgColorInput = document.getElementById('bg-color');
const textColorInput = document.getElementById('text-color');
const transparencyInput = document.getElementById('transparency');
const widthInput = document.getElementById('window-width');
const heightInput = document.getElementById('window-height');

const previewWindow = document.getElementById('preview-window');
const transparencyLabel = document.getElementById('transparency-label');
const widthLabel = document.getElementById('width-label');
const heightLabel = document.getElementById('height-label');

const memoryListContainer = document.getElementById('memory-list-container');
const refreshMemoriesBtn = document.getElementById('refresh-memories');

const defaults = {
  geminiApiKey: '',
  bgColor: '#282a36',
  textColor: '#f8f8f2',
  transparency: 0.95,
  windowWidth: 350,
  windowHeight: 450
};


function save_options() {
  log("Saving options...");
  const settings = {
    geminiApiKey: apiKeyInput.value,
    bgColor: bgColorInput.value,
    textColor: textColorInput.value,
    transparency: parseFloat(transparencyInput.value),
    windowWidth: parseInt(widthInput.value, 10),
    windowHeight: parseInt(heightInput.value, 10)
  };

  chrome.storage.sync.set(settings, () => {
    log("Options saved to storage.");
    statusEl.textContent = 'Options saved. Check your active tab!';
    setTimeout(() => { statusEl.textContent = ''; }, 2000);
  });
}

function restore_options() {
  log("Restoring options...");
  chrome.storage.sync.get(defaults, (items) => {
    log("Loaded settings:", items);
    apiKeyInput.value = items.geminiApiKey;
    bgColorInput.value = items.bgColor;
    textColorInput.value = items.textColor;
    transparencyInput.value = items.transparency;
    widthInput.value = items.windowWidth;
    heightInput.value = items.windowHeight;
    update_preview();
  });
}

function update_preview() {
  const bgColor = bgColorInput.value;
  const textColor = textColorInput.value;
  const transparency = parseFloat(transparencyInput.value);
  const width = parseInt(widthInput.value, 10);
  const height = parseInt(heightInput.value, 10);
  const alpha = Math.round(transparency * 255).toString(16).padStart(2, '0');
  
  previewWindow.style.backgroundColor = `${bgColor}${alpha}`;
  previewWindow.style.color = textColor;
  previewWindow.style.width = `${width}px`;
  previewWindow.style.height = `${height}px`;

  transparencyLabel.textContent = `Transparency (${transparency.toFixed(2)}):`;
  widthLabel.textContent = `Default Width (${width}px):`;
  heightLabel.textContent = `Default Height (${height}px):`;
}


function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("AI_SecondBrain", 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e);
  });
}

async function loadMemories() {
  log("Loading memories from DB...");
  try {
    const db = await openDB();
    const tx = db.transaction("vectors", "readonly");
    const store = tx.objectStore("vectors");
    const request = store.getAll();

    request.onsuccess = () => {
      const memories = request.result;
      log(`Loaded ${memories.length} memories.`);
      renderMemoryList(memories);
    };
    request.onerror = (e) => {
      errorLog("Failed to fetch memories", e.target.error);
      memoryListContainer.innerHTML = '<p>Error loading memories.</p>';
    };
  } catch (e) {
    errorLog("DB Open failed in Options", e);
    memoryListContainer.innerHTML = '<p>No database found yet. Save something first!</p>';
  }
}

function renderMemoryList(memories) {
  if (!memories || memories.length === 0) {
    memoryListContainer.innerHTML = '<p>No memories saved yet. Highlight text and right-click "Save to Brain".</p>';
    return;
  }

  memories.sort((a, b) => b.id - a.id);

  let html = '';
  memories.forEach(mem => {
    const date = new Date(mem.date || mem.id).toLocaleString();
    html += `
      <div class="memory-item" id="mem-${mem.id}">
        <div class="mem-content">
          <div class="mem-text">"${escapeHtml(mem.text)}"</div>
          <div class="mem-meta">
            <span class="mem-date">📅 ${date}</span>
            <a href="${mem.url}" target="_blank" class="mem-link">🔗 Source</a>
          </div>
        </div>
        <button class="delete-btn" data-id="${mem.id}">🗑️</button>
      </div>
    `;
  });

  memoryListContainer.innerHTML = html;

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.target.dataset.id);
      deleteMemory(id);
    });
  });
}

async function deleteMemory(id) {
  if (!confirm("Are you sure you want to delete this memory?")) return;

  log(`Deleting memory ID: ${id}`);
  const db = await openDB();
  const tx = db.transaction("vectors", "readwrite");
  const store = tx.objectStore("vectors");
  
  store.delete(id);
  
  tx.oncomplete = () => {
    log("Memory deleted.");
    const el = document.getElementById(`mem-${id}`);
    if (el) el.remove();
    if (document.querySelectorAll('.memory-item').length === 0) {
      loadMemories();
    }
  };
}

function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

document.addEventListener('DOMContentLoaded', () => {
  restore_options();
  loadMemories();
});

saveButton.addEventListener('click', save_options);

if(refreshMemoriesBtn) {
  refreshMemoriesBtn.addEventListener('click', () => {
    log("Refreshing memory list manually...");
    loadMemories();
  });
}

[bgColorInput, textColorInput, transparencyInput, widthInput, heightInput].forEach(input => {
  input.addEventListener('input', update_preview);
});