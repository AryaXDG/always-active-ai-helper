const log = (msg) => console.log(`[AI Content] ${msg}`);
const errorLog = (msg, e) => console.error(`[AI Content ERROR] ${msg}`, e);

function injectVisibilityScript() {
  try {
    log("Injecting visibility override...");
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('visibility-override.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  } catch (e) { errorLog("Injection failed", e); }
}
injectVisibilityScript();


let aiWindow = null;
let aiToolbar = null;
let contentDiv = null;


function createToolbar(x, y, selection) {
  if (aiToolbar) aiToolbar.remove();

  log(`Creating toolbar at (${x}, ${y}) for selection: "${selection.substring(0, 15)}..."`);

  aiToolbar = document.createElement('div');
  aiToolbar.className = 'ai-toolbar';
  aiToolbar.style.left = `${x}px`;
  aiToolbar.style.top = `${y - 40}px`; 

  aiToolbar.innerHTML = `
    <button id="tb-ask">🤖 Ask AI</button>
    <div class="tb-divider"></div>
    <button id="tb-save">🧠 Save to Brain</button>
  `;

  document.body.appendChild(aiToolbar);

  document.getElementById('tb-ask').addEventListener('mousedown', (e) => {
    e.preventDefault(); 
    log("Toolbar action: Ask AI");
    triggerAskAI(selection);
    removeToolbar();
  });

  document.getElementById('tb-save').addEventListener('mousedown', (e) => {
    e.preventDefault();
    log("Toolbar action: Save to Brain");
    triggerSaveToBrain(selection, document.getElementById('tb-save'));
  });
}

function removeToolbar() {
  if (aiToolbar) {
    aiToolbar.remove();
    aiToolbar = null;
  }
}

document.addEventListener('mouseup', (e) => {
  if (e.target.closest('.ai-toolbar') || e.target.closest('.ai-helper-window')) return;

  const selection = window.getSelection();
  const text = selection.toString().trim();

  if (text.length > 0) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const x = rect.left + window.scrollX;
    const y = rect.top + window.scrollY;
    createToolbar(x, y, text);
  } else {
    removeToolbar();
  }
});


function triggerAskAI(text) {
  createAiWindow();
  contentDiv.textContent = 'Thinking...';
  log("Sending GET_AI_ANSWER message...");
  chrome.runtime.sendMessage({
    type: 'GET_AI_ANSWER',
    question: text,
    context: document.body.innerText,
    isNewSearch: true
  });
}


function triggerSaveToBrain(text, btnElement) {
  const originalText = btnElement.textContent;
  btnElement.textContent = "Saving...";
  
  chrome.runtime.sendMessage({
    type: 'SAVE_TO_BRAIN',
    text: text,
    url: window.location.href
  }, (response) => {

    if (chrome.runtime.lastError) {
      console.error("Runtime Error:", chrome.runtime.lastError);
      btnElement.textContent = "❌ Err (Reload Page)";
      return;
    }

    console.log("[AI Content] Save response:", response);

    if (response && response.success) {
      btnElement.textContent = "✅ Saved!";
      btnElement.style.color = "#50fa7b";
      setTimeout(removeToolbar, 1000);
    } else {

      btnElement.textContent = "❌ Failed";
      console.error("SAVE FAILED DETAILS:", response.error);
      alert(`Save Failed:\n${response.error}`); 
    }
  });
}


function renderMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

function createAiWindow() {
  if (aiWindow) return;
  log("Opening AI Window");

  aiWindow = document.createElement('div');
  aiWindow.className = 'ai-helper-window';
  aiWindow.innerHTML = `
    <div class="ai-header">AI Helper <span id="ai-close">X</span></div>
    <div id="ai-content">Thinking...</div>
    <div class="ai-input-area">
      <input type="text" id="ai-query" placeholder="Ask a follow-up...">
      <button id="ai-send">Send</button>
    </div>
  `;
  document.body.appendChild(aiWindow);

  contentDiv = document.getElementById('ai-content');
  document.getElementById('ai-close').onclick = () => { aiWindow.remove(); aiWindow = null; };
  document.getElementById('ai-send').onclick = sendFollowUp;
  document.getElementById('ai-query').onkeypress = (e) => { if(e.key === 'Enter') sendFollowUp(); };

  makeDraggable(aiWindow, aiWindow.querySelector('.ai-header'));
  applyWindowStyles();
}

function sendFollowUp() {
  const input = document.getElementById('ai-query');
  const text = input.value.trim();
  if (!text) return;
  
  log(`Sending follow-up: "${text}"`);
  contentDiv.innerHTML += `<div class="user-msg"><strong>You:</strong> ${text}</div>`;
  input.value = '';
  contentDiv.scrollTop = contentDiv.scrollHeight;
  chrome.runtime.sendMessage({ type: 'GET_AI_ANSWER', question: text, isNewSearch: false });
}

function applyWindowStyles() {
  if (!aiWindow) return;
  chrome.storage.sync.get({
    bgColor: '#282a36', textColor: '#f8f8f2', transparency: 0.95,
    windowWidth: 350, windowHeight: 450
  }, (settings) => {
    const alpha = Math.round(settings.transparency * 255).toString(16).padStart(2, '0');
    aiWindow.style.backgroundColor = `${settings.bgColor}${alpha}`;
    aiWindow.style.color = settings.textColor;
    aiWindow.style.width = `${settings.windowWidth}px`;
    aiWindow.style.height = `${settings.windowHeight}px`;
  });
}

chrome.runtime.onMessage.addListener((request) => {
  if (request.type === 'AI_CHUNK') {
    if (contentDiv.textContent === 'Thinking...') contentDiv.innerHTML = '';
    contentDiv.innerHTML += renderMarkdown(request.text);
    contentDiv.scrollTop = contentDiv.scrollHeight;
  }
});

function makeDraggable(element, dragHandle) {
  let pos1=0, pos2=0, pos3=0, pos4=0;
  dragHandle.onmousedown = (e) => {
    e.preventDefault(); pos3 = e.clientX; pos4 = e.clientY;
    document.onmouseup = () => { document.onmouseup = null; document.onmousemove = null; };
    document.onmousemove = (e) => {
      e.preventDefault(); pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
      pos3 = e.clientX; pos4 = e.clientY;
      element.style.top = (element.offsetTop - pos2) + "px";
      element.style.left = (element.offsetLeft - pos1) + "px";
    };
  };
}