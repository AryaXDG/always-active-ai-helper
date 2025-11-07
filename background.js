/**
 * Calls the Gemini API, streaming the response.
 * 
 * @param {string} question The user's highlighted question.
 * @param {string} context The full text content of the page.
 * @param {string} apiKey The user's secure Gemini API Key.
 * @param {function(string): void} onChunk A callback function to update the UI with each new chunk of text.
 * @returns {Promise<void>}
 */
async function streamGemmaResponse(question, context, apiKey, onChunk) {
  const modelName = 'gemini-2.0-flash-exp';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`;

  // Construct the prompt with context and question
  const promptText = `Based on the following page content, please answer this question concisely:

Question: ${question}

Page Context:
${context.substring(0, 8000)}`;

  // Construct the Request Body
  const requestBody = {
    contents: [{
      role: 'user',
      parts: [{ text: promptText }]
    }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048
    },
    systemInstruction: {
      parts: [{
        text: "You are a helpful AI assistant. Answer questions concisely based on the provided context. If the answer isn't in the context, say so briefly."
      }]
    }
  };

  try {
    // Fetch the Streaming Response
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    // Error handling for 4xx/5xx responses
    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `API call failed with status ${response.status}`;
      try {
        const errorBody = JSON.parse(errorText);
        console.error("API Error Response (JSON):", JSON.stringify(errorBody, null, 2));
        if (errorBody && errorBody.error && errorBody.error.message) {
          errorMsg += `: ${errorBody.error.message}`;
        }
      } catch (e) {
        console.error("API Error Response (Text):", errorText);
        errorMsg += `: ${errorText.substring(0, 100)}...`;
      }
      throw new Error(errorMsg); 
    }

    // Read and Process the SSE Stream
    const reader = response.body
      .pipeThrough(new TextDecoderStream())
      .getReader();

    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += value;
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; 

      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data: ')) continue;
        
        const jsonStr = line.substring(6); // Remove 'data: ' prefix
        
        if (jsonStr === '[DONE]') continue;

        try {
          const jsonChunk = JSON.parse(jsonStr);
          const chunkText = jsonChunk.candidates?.[0]?.content?.parts?.[0]?.text;
          
          if (chunkText) {
            onChunk(chunkText);
          }
          
        } catch (e) {
          console.warn("Could not parse JSON chunk:", jsonStr, e);
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim() && buffer.startsWith('data: ')) {
      const jsonStr = buffer.substring(6);
      if (jsonStr !== '[DONE]') {
        try {
          const jsonChunk = JSON.parse(jsonStr);
          const chunkText = jsonChunk.candidates?.[0]?.content?.parts?.[0]?.text;
          if (chunkText) {
            onChunk(chunkText); 
          }
        } catch (e) {
          console.error("Final buffer could not be parsed:", buffer);
        }
      }
    }
    
  } catch (error) {
    console.error("Fatal Streaming Error:", error);
    const errorMsg = (error instanceof Error) ? error.message : String(error);
    onChunk(`\n\n**Error:** ${errorMsg}`);
  }
}

// -----------------------------------------------------------------------------
// EXTENSION LOGIC
// -----------------------------------------------------------------------------

// Handle First-Time Installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.sync.set({
      bgColor: '#282a36',
      textColor: '#f8f8f2',
      transparency: 0.95
    });
    chrome.runtime.openOptionsPage();
  }
});

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_AI_ANSWER') {
    
    chrome.storage.sync.get(['geminiApiKey'], (data) => {
      const apiKey = data.geminiApiKey;

      if (!apiKey) {
        chrome.tabs.sendMessage(sender.tab.id, {
          type: 'AI_CHUNK',
          text: 'Error: API Key not set. Please set it in the extension options.'
        });
        return;
      }

      const onChunkCallback = (chunk) => {
        console.log("Sending chunk:", chunk);
        chrome.tabs.sendMessage(sender.tab.id, {
          type: 'AI_CHUNK',
          text: chunk
        });
      };

      console.log("Calling streamGemmaResponse...");
      
      streamGemmaResponse(request.question, request.context, apiKey, onChunkCallback)
        .then(() => {
          console.log("Stream finished.");
          chrome.tabs.sendMessage(sender.tab.id, {
            type: 'AI_STREAM_END'
          });
        })
        .catch((error) => {
          console.error("Error in streamGemmaResponse promise:", error);
          const errorMsg = (error instanceof Error) ? error.message : String(error);
          onChunkCallback(`\n\n**Error:** ${errorMsg}`);
        });
    });
    
    return true; 
  }
});