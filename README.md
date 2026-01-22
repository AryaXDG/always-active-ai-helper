# Active, AI Helper & Second Brain

A Chrome extension built to solve three problems:
1.  **Websites that pause** or log you out when you switch tabs.
2.  **Needing quick AI explanations** without leaving your current context.
3.  **Forgetting what you read**—this extension lets you save snippets to a local "Second Brain" that the AI references later.

This extension provides an advanced "Always Active" spoofer, an on-demand AI assistant powered by **Gemini 3 Flash**, and a local Vector Database for long-term memory.

---

## 🚀 Key Features

### 🧠 Second Brain (New!)
* **Save to Memory:** Highlight any text and click **"Save to Brain"** on the floating toolbar.
* **Context-Aware Recall:** When you ask a question later, the AI automatically searches your saved notes for relevant information and uses it to answer you.
* **Privacy First:** All your notes are stored locally in your browser (IndexedDB) and are never sent to a cloud server (except briefly to Google for embedding generation).

### 🤖 Advanced AI Helper
* **Floating Toolbar:** Automatically appears when you select text, giving you quick options to **Ask AI** or **Save**.
* **Multi-Turn Chat:** Don't just get one answer—ask follow-up questions in the input box at the bottom of the window.
* **Markdown Support:** Responses are beautifully formatted with bold text, code blocks, and lists.
* **Smart Context:** Sends the page content + your relevant saved memories to the AI for the best possible answer.

### 👁️ "Always Active" Pro
* **Visibility Spoofing:** Overrides `document.visibilityState` and `document.hidden`.
* **Focus Guard:** Now intercepts `window.onblur` events, making websites think the window is *always* focused, even when you are using a different app.

### ⚙️ Full Customization
* **Memory Manager:** View and delete your saved notes in the Options page.
* **Theming:** Customize the AI window's background color, text color, and transparency.
* **Resizing:** Set default window dimensions or resize the floating window on the fly.

---

## 📥 Installation

Since this extension is a developer preview, you must install it manually:

1.  **Download** or clone this repository to your local machine.
2.  Open Google Chrome and navigate to `chrome://extensions`.
3.  Enable **"Developer mode"** (toggle in top-right).
4.  Click **"Load unpacked"**.
5.  Select the folder containing this project.

---

## 📖 How to Use

### 1. Set Your API Key (Required)
The AI features require a Google Gemini API Key.
1.  Click the extension icon -> **"Open Settings"**.
2.  Enter your key in the **Gemini API Key** field. (Get one for free at [Google AI Studio](https://aistudio.google.com/)).
3.  Click **"Save"**.

### 2. The Floating Toolbar
1.  Highlight text on any webpage.
2.  A small toolbar will appear above your selection:
    * 🤖 **Ask AI:** Opens the chat window with your question.
    * 🧠 **Save to Brain:** Saves the snippet to your local database.

### 3. Chatting & Follow-up
* After the AI answers, type in the input box at the bottom to ask a follow-up question.
* The AI remembers the conversation context within that window session.

### 4. Managing Your "Second Brain"
1.  Go to the **Options Page**.
2.  Scroll down to **"Second Brain Memory"**.
3.  You will see a list of all saved snippets.
4.  Click the **Delete (🗑️)** button to remove old notes.

---

## 🛠️ Built With

* **Google Gemini 3 Flash Preview** (Generation)
* **Text-Embedding-004** (Vector Embeddings)
* **IndexedDB** (Local Vector Database)
* **Cosine Similarity** (Custom Vector Search Algorithm)
* **Chrome Extension Manifest V3**
