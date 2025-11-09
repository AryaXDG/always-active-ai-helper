/* --- FEATURE 1: PAGE VISIBILITY OVERRIDE --- */

// Inject the override script into the page's main world
function injectVisibilityScript() {
  try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('visibility-override.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  } catch (e) {
    console.error('Error injecting visibility script:', e);
  }
}

injectVisibilityScript();

/* --- FEATURE 2: AI HELPER WINDOW --- */

let aiWindow = null;
let contentDiv = null;

// Listen for text selection
document.addEventListener('mouseup', handleTextSelection);

function handleTextSelection(event) {
  // Don't trigger if we're interacting with the AI window itself
  if (event.target.closest && event.target.closest('.ai-helper-window')) {
    return;
  }

  const highlightedText = window.getSelection().toString().trim();

  if (highlightedText.length > 0) {
    // Get page context (limited to avoid too much data)
    const pageContext = document.body.innerText.substring(0, 10000);
    
    // Create the window (or clear the old one)
    createAiWindow();
    
    // Send the data to the background script
    chrome.runtime.sendMessage({
      type: 'GET_AI_ANSWER',
      question: highlightedText,
      context: pageContext
    });
  }
}

function createAiWindow() {
  // Remove existing window if it exists
  if (aiWindow) {
    aiWindow.remove();
  }

  // Create window elements
  aiWindow = document.createElement('div');
  aiWindow.className = 'ai-helper-window';

  const closeButton = document.createElement('button');
  closeButton.className = 'ai-helper-close';
  closeButton.textContent = 'X';
  closeButton.onclick = () => aiWindow.remove();

  contentDiv = document.createElement('div');
  contentDiv.className = 'ai-helper-content';
  contentDiv.textContent = 'Thinking...';

  aiWindow.appendChild(closeButton);
  aiWindow.appendChild(contentDiv);
  document.body.appendChild(aiWindow);

  // Apply user settings (color, transparency, AND NOW SIZE)
  applyWindowStyles();

  // Make entire window draggable
  makeDraggable(aiWindow, aiWindow);
}

/**
 * KEY CHANGE: This function now also fetches and applies
 * the default width and height from user settings.
 */
function applyWindowStyles() {
  chrome.storage.sync.get({
    bgColor: '#282a36',
    textColor: '#f8f8f2',
    transparency: 0.95,
    windowWidth: 300,  // Default width
    windowHeight: 200 // Default height
  }, (settings) => {
    if (aiWindow) {
      // Convert transparency (0-1) to hex (00-FF)
      const alpha = Math.round(settings.transparency * 255).toString(16).padStart(2, '0');
      
      // Apply styles
      aiWindow.style.backgroundColor = `${settings.bgColor}${alpha}`;
      aiWindow.style.color = settings.textColor;
      aiWindow.style.width = `${settings.windowWidth}px`;
      aiWindow.style.height = `${settings.windowHeight}px`;
    }
  });
}

// Listen for AI response chunks from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'AI_CHUNK') {
    if (contentDiv) {
      // Clear "Thinking..." on the first chunk
      if (contentDiv.textContent === 'Thinking...') {
        contentDiv.textContent = '';
      }
      // Append new text (using textContent to prevent HTML injection)
      contentDiv.textContent += request.text;
    }
  } else if (request.type === 'AI_STREAM_END') {
    console.log("AI stream finished.");
  }
});


/* --- DRAGGABLE WINDOW LOGIC --- */

function makeDraggable(element, dragHandle) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

  dragHandle.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    // This lets you select text in the content area or click the close button
    // without triggering a drag.
    if (e.target.closest('.ai-helper-content') || e.target.closest('.ai-helper-close')) {
      return;
    }
    
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}