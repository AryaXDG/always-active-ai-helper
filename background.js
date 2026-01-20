const log = (msg) => console.log(`[Background] ${msg}`);
const errorLog = (msg, err) => console.error(`[Background ERROR] ${msg}`, err);


function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("AI_SecondBrain", 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("vectors")) {
        db.createObjectStore("vectors", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e);
  });
}


async function performSave(text, apiKey, url) {
  log(`Saving: "${text.substring(0, 15)}..."`);
  try {
    const embedding = await getEmbedding(text, apiKey);
    
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction("vectors", "readwrite");
      const store = tx.objectStore("vectors");
      
      const request = store.add({
        id: Date.now(),
        text: text,
        embedding: embedding,
        url: url,
        date: new Date().toISOString()
      });
      
      tx.oncomplete = () => {
        log("Save successful.");
        resolve({ success: true });
      };
      
      tx.onerror = (e) => {
        const msg = e.target.error ? e.target.error.message : "Unknown DB Error";
        errorLog("DB Save Failed", e.target.error);
        resolve({ success: false, error: "Database Error: " + msg });
      };
    });
  } catch (e) {
    errorLog("performSave failed", e);

    return { success: false, error: e.message };
  }
}

function cosineSimilarity(vecA, vecB) {
  let dot = 0, mA = 0, mB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    mA += vecA[i] * vecA[i];
    mB += vecB[i] * vecB[i];
  }
  return dot / (Math.sqrt(mA) * Math.sqrt(mB));
}

async function searchMemories(queryEmbedding) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction("vectors", "readonly");
      const store = tx.objectStore("vectors");
      const request = store.getAll();
      request.onsuccess = () => {
        const memories = request.result || [];
        const scored = memories.map(mem => ({
          ...mem,
          score: cosineSimilarity(queryEmbedding, mem.embedding)
        }));
        scored.sort((a, b) => b.score - a.score);
        resolve(scored.slice(0, 3).filter(m => m.score > 0.6));
      };
      request.onerror = () => resolve([]);
    });
  } catch (e) { return []; }
}


async function getEmbedding(text, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: "models/text-embedding-004",
      content: { parts: [{ text: text }] }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Embedding API Error (${response.status}): ${errText}`);
  }

  const json = await response.json();
  return json.embedding.values;
}

async function streamGemmaResponse(question, pageContext, apiKey, onChunk, history = []) {
  let memoryContext = "";
  try {
    const queryVector = await getEmbedding(question, apiKey);
    const memories = await searchMemories(queryVector);
    if (memories.length > 0) {
      memoryContext = `\n\n[Relevant Personal Notes]:\n${memories.map(m => `- ${m.text}`).join('\n')}\n`;
      onChunk(`*(Used ${memories.length} personal notes)*\n\n`);
    }
  } catch (e) { console.warn("Memory search skipped", e); }

  const modelName = 'gemini-3-flash-preview'; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const contents = history.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] }));
  const finalPrompt = history.length === 0 
    ? `Context: ${pageContext.substring(0, 4000)} ${memoryContext} Question: ${question}`
    : question;
  
  contents.push({ role: 'user', parts: [{ text: finalPrompt }] });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents,
        systemInstruction: { parts: [{ text: "You are a helpful AI assistant." }] }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err);
    }

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = value.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.substring(6);
          if (jsonStr === '[DONE]') continue;
          try {
            const json = JSON.parse(jsonStr);
            const chunk = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (chunk) onChunk(chunk);
          } catch (e) {}
        }
      }
    }
  } catch (e) {
    onChunk(`\n**Error:** ${e.message}`);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "ask-ai", title: "Ask AI", contexts: ["selection"] });
  chrome.contextMenus.create({ id: "save-brain", title: "Save to Brain", contexts: ["selection"] });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "ask-ai") {
    chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_AI_FROM_MENU', text: info.selectionText });
  } else if (info.menuItemId === "save-brain") {
    chrome.storage.sync.get(['geminiApiKey'], async (data) => {
      if (!data.geminiApiKey) {
        chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => alert("Set API Key first!") });
        return;
      }
      const result = await performSave(info.selectionText, data.geminiApiKey, tab.url);
      const msg = result.success ? "Saved!" : `Failed: ${result.error}`;
      chrome.scripting.executeScript({ target: { tabId: tab.id }, func: (m) => alert(m), args: [msg] });
    });
  }
});

let chatHistories = {};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SAVE_TO_BRAIN') {
    chrome.storage.sync.get(['geminiApiKey'], async (data) => {
      if (!data.geminiApiKey) {
        sendResponse({ success: false, error: "No API Key found" });
        return;
      }
      const result = await performSave(request.text, data.geminiApiKey, request.url);
      sendResponse(result);
    });
    return true;
  }

  if (request.type === 'GET_AI_ANSWER') {
    const tabId = sender.tab.id;
    if (!chatHistories[tabId] || request.isNewSearch) chatHistories[tabId] = [];
    chrome.storage.sync.get(['geminiApiKey'], async (data) => {
      await streamGemmaResponse(
        request.question, request.context, data.geminiApiKey, 
        (chunk) => chrome.tabs.sendMessage(tabId, { type: 'AI_CHUNK', text: chunk }),
        chatHistories[tabId]
      );
      chatHistories[tabId].push({ role: 'user', text: request.question });
    });
    return true;
  }
});