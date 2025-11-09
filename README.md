# Active & AI Helper

A Chrome extension built to solve two problems:
1.  Websites that pause, stop, or log you out when you switch tabs.
2.  Needing a quick, in-context AI explanation without leaving the page.

This extension provides an "Always Active" feature to spoof page visibility and an on-demand, pop-up AI helper powered by the Gemini API.

## Features

### 🤖 On-Demand AI Helper
* **Highlight to Ask:** Simply highlight any text on a webpage to get an instant AI-powered explanation.
* **Draggable & Resizable Window:** The AI response streams into a floating window that you can drag and resize to fit your workflow.
* **Context-Aware:** The extension sends your highlighted question *along with* the page's text as context to the AI, ensuring more relevant answers.
* **Fully Customizable:** From the options page, you can set the helper window's:
    * Background Color
    * Text Color
    * Transparency
    * Default Width and Height
* **Live Preview:** Test your style changes in a live preview window directly on the settings page.

### 👁️ "Always Active" Page Visibility
* **Never "Hidden":** This feature automatically forces any webpage to believe it is always "visible" and "active".
* **Prevents Inactivity:** Stops websites from pausing videos, stopping tasks, or logging you out just because you switched to another tab.
* **How it Works:** It injects a script on page load that overrides the `document.visibilityState` and `document.hidden` properties, fooling the page's "inactivity" checks.

---

## Installation (from Source)

Since this extension is not on the Chrome Web Store, you must install it manually in developer mode.

1.  Download or clone this repository to your local machine.
2.  Open Google Chrome and navigate to `chrome://extensions`.
3.  Enable **"Developer mode"** using the toggle in the top-right corner.
4.  Click the **"Load unpacked"** button.
5.  Select the folder where you downloaded the repository. The extension will now be installed and active.

---

## How to Use

### 1. Set Your API Key (Required)

The AI helper **will not work** until you set your API key.

1.  Click the extension's icon in your Chrome toolbar and select "Open Settings".
2.  This will open the "AI Helper Settings" page.
3.  Enter your **Gemini API Key** in the first field. (You can get a key from Google AI Studio).
4.  Click **"Save"**.

### 2. Using the AI Helper

1.  Go to any webpage.
2.  Find a piece of text you want to know more about.
3.  Click and drag to **highlight the text**.
4.  Release the mouse button. The AI helper window will appear and start streaming an answer.
5.  You can drag the window by its header or resize it from the bottom-right corner.

### 3. Using the "Always Active" Feature

This feature is **enabled automatically** upon installation. There is nothing you need to do. It will work on all new pages you load.

---

## Built With

* **Chrome Extension Manifest V3**
* **JavaScript (ES6+)**
* **HTML5 / CSS3**
* **Google Gemini API** (Streaming)