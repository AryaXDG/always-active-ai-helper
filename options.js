// --- Global Elements ---
const saveButton = document.getElementById('save');
const statusEl = document.getElementById('status');
const apiKeyInput = document.getElementById('api-key');
const bgColorInput = document.getElementById('bg-color');
const textColorInput = document.getElementById('text-color');
const transparencyInput = document.getElementById('transparency');
const widthInput = document.getElementById('window-width');
const heightInput = document.getElementById('window-height');

// Labels for real-time value display
const transparencyLabel = document.getElementById('transparency-label');
const widthLabel = document.getElementById('width-label');
const heightLabel = document.getElementById('height-label');

// Preview window elements
const previewWindow = document.getElementById('preview-window');
const previewContent = document.getElementById('preview-content');

// --- Default Settings ---
const defaults = {
  geminiApiKey: '',
  bgColor: '#282a36',
  textColor: '#f8f8f2',
  transparency: 0.95,
  windowWidth: 300,
  windowHeight: 200
};

// --- Functions ---

/**
 * Saves options to chrome.storage
 */
function save_options() {
  const settings = {
    geminiApiKey: apiKeyInput.value,
    bgColor: bgColorInput.value,
    textColor: textColorInput.value,
    transparency: parseFloat(transparencyInput.value),
    windowWidth: parseInt(widthInput.value, 10),
    windowHeight: parseInt(heightInput.value, 10)
  };

  chrome.storage.sync.set(settings, () => {
    // Update status to let user know options were saved.
    statusEl.textContent = 'Options saved.';
    setTimeout(() => {
      statusEl.textContent = '';
    }, 1500);
  });
}

/**
 * Restores preferences from chrome.storage
 */
function restore_options() {
  chrome.storage.sync.get(defaults, (items) => {
    apiKeyInput.value = items.geminiApiKey;
    bgColorInput.value = items.bgColor;
    textColorInput.value = items.textColor;
    transparencyInput.value = items.transparency;
    widthInput.value = items.windowWidth;
    heightInput.value = items.windowHeight;
    
    // Update the preview and labels to match the restored settings
    update_preview();
  });
}

/**
 * Updates the live preview window based on current form values.
 */
function update_preview() {
  // 1. Get current values
  const bgColor = bgColorInput.value;
  const textColor = textColorInput.value;
  const transparency = parseFloat(transparencyInput.value);
  const width = parseInt(widthInput.value, 10);
  const height = parseInt(heightInput.value, 10);

  // 2. Convert transparency (0-1) to hex (00-FF)
  const alpha = Math.round(transparency * 255).toString(16).padStart(2, '0');
  
  // 3. Apply styles to the preview window
  previewWindow.style.backgroundColor = `${bgColor}${alpha}`;
  previewWindow.style.color = textColor;
  previewWindow.style.width = `${width}px`;
  previewWindow.style.height = `${height}px`;

  // 4. Update labels
  transparencyLabel.textContent = `Transparency (${transparency.toFixed(2)}):`;
  widthLabel.textContent = `Default Width (${width}px):`;
  heightLabel.textContent = `Default Height (${height}px):`;
}

// --- Event Listeners ---

// Restore options on load
document.addEventListener('DOMContentLoaded', restore_options);

// Save button
saveButton.addEventListener('click', save_options);

// Add real-time listeners for the live preview
// 'input' event fires immediately on any change.
[bgColorInput, textColorInput, transparencyInput, widthInput, heightInput].forEach(input => {
  input.addEventListener('input', update_preview);
});