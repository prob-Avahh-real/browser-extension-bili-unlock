const toggle = document.getElementById('enable-toggle');
const refreshBtn = document.getElementById('refresh-btn');

async function loadState() {
  const response = await chrome.runtime.sendMessage({ type: 'state-request' });
  if (toggle) {
    toggle.checked = response && response.enabled !== false;
  }
}

if (toggle) {
  toggle.addEventListener('change', async () => {
    const enabled = toggle.checked;
    await chrome.runtime.sendMessage({ type: 'save-state', enabled });
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, { type: 'toggle-enabled', enabled });
    }
  });
}

if (refreshBtn) {
  refreshBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.reload(tab.id);
    }
  });
}

loadState();
