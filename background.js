chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ enabled: true });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'state-request') {
    chrome.storage.sync.get(['enabled'], (result) => {
      sendResponse({ enabled: result.enabled !== false });
    });
    return true;
  }

  if (message && message.type === 'save-state') {
    chrome.storage.sync.set({ enabled: message.enabled });
    sendResponse({ ok: true });
  }
});
