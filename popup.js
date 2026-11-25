const toggle = document.getElementById('enable-toggle');
const refreshBtn = document.getElementById('refresh-btn');

async function loadState() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'state-request' });
    if (toggle) {
      toggle.checked = response && response.enabled !== false;
    }
  } catch (e) {}
}

if (toggle) {
  toggle.addEventListener('change', async () => {
    const enabled = toggle.checked;
    try {
      await chrome.runtime.sendMessage({ type: 'save-state', enabled });
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, { type: 'toggle-enabled', enabled });
      }
    } catch (e) {}
  });
}

if (refreshBtn) {
  refreshBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.reload(tab.id);
      }
    } catch (e) {}
  });
}

loadState();
