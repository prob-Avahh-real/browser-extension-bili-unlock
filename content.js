(() => {
  const PANEL_ID = 'video-unlock-panel';
  const isBilibili = () => /bilibili|b23\.tv/.test(location.hostname);

  const styles = `
    #${PANEL_ID} {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 2147483647;
      background: rgba(16, 16, 24, 0.95);
      color: #fff;
      border: 1px solid rgba(255,255,255,0.14);
      border-radius: 12px;
      padding: 10px 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.35);
      font: 12px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      backdrop-filter: blur(8px);
      min-width: 240px;
      user-select: none;
      pointer-events: auto;
    }
    #${PANEL_ID} .title {
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 8px;
      color: #ffd166;
    }
    #${PANEL_ID} .row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 8px;
    }
    #${PANEL_ID} button {
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      color: #fff;
      border-radius: 999px;
      padding: 5px 8px;
      cursor: pointer;
      transition: background 0.2s ease;
    }
    #${PANEL_ID} button:hover {
      background: rgba(255,255,255,0.24);
    }
    #${PANEL_ID} .small {
      font-size: 11px;
      padding: 4px 7px;
    }
  `;

  let enabled = true;
  let panel = null;
  let observer = null;
  let selectedSpeed = 1;
  let selectedQuality = 'auto';

  function injectStyles() {
    if (document.getElementById('video-unlock-style')) return;
    const style = document.createElement('style');
    style.id = 'video-unlock-style';
    style.textContent = styles;
    document.head.appendChild(style);
  }

  function getMainVideo() {
    const videos = Array.from(document.querySelectorAll('video'));
    return videos.find((video) => video.readyState >= 2) || videos[0] || null;
  }

  function setPlaybackRate(rate) {
    const video = getMainVideo();
    if (!video) return false;
    video.playbackRate = rate;
    video.defaultPlaybackRate = rate;
    selectedSpeed = rate;
    saveState();
    return true;
  }

  function seekBySeconds(seconds) {
    const video = getMainVideo();
    if (!video) return false;
    video.currentTime = Math.min(video.duration || 0, Math.max(0, video.currentTime + seconds));
    return true;
  }

  function clickElement(el) {
    if (!el || !el.isConnected) return false;
    try {
      el.click();
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      return true;
    } catch (e) {
      return false;
    }
  }

  function findTextCandidates(keyword) {
    const root = document.body || document.documentElement;
    const all = Array.from(root.querySelectorAll('button, [role="menuitem"], a, span, div, li'));
    return all.filter((el) => {
      if (!el.isConnected) return false;
      const text = `${el.innerText || el.textContent || ''} ${el.getAttribute('aria-label') || ''} ${el.dataset?.quality || ''}`.toLowerCase();
      return text.includes(keyword);
    });
  }

  function saveState() {
    chrome.storage.local.set({
      videoUnlockSpeed: selectedSpeed,
      videoUnlockQuality: selectedQuality
    });
  }

  function restoreState() {
    chrome.storage.local.get(['videoUnlockSpeed', 'videoUnlockQuality'], (result) => {
      if (typeof result.videoUnlockSpeed === 'number') {
        selectedSpeed = result.videoUnlockSpeed;
      }
      if (typeof result.videoUnlockQuality === 'string' && result.videoUnlockQuality) {
        selectedQuality = result.videoUnlockQuality;
      }
      const video = getMainVideo();
      if (video) {
        video.playbackRate = selectedSpeed;
        video.defaultPlaybackRate = selectedSpeed;
      }
    });
  }

  function clickQualityTarget(targetLabel) {
    const labels = targetLabel.toLowerCase();
    const keywords = labels.split('|');
    const all = findTextCandidates(labels);
    const scored = all
      .map((el) => ({ el, score: scoreCandidate(el, labels) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    for (const item of scored) {
      if (clickElement(item.el)) {
        selectedQuality = targetLabel;
        saveState();
        return true;
      }
    }

    for (const keyword of keywords) {
      const fallback = findTextCandidates(keyword);
      for (const el of fallback) {
        if (clickElement(el)) {
          selectedQuality = targetLabel;
          saveState();
          return true;
        }
      }
    }
    return false;
  }

  function scoreCandidate(el, keyword) {
    const text = `${el.innerText || el.textContent || ''} ${el.getAttribute('aria-label') || ''} ${el.dataset?.quality || ''}`.toLowerCase();
    if (!text) return 0;
    if (keyword === 'auto') {
      if (/(自动|auto|default|原画)/.test(text)) return 24;
      return 0;
    }
    if (keyword === '4k' || keyword === '2160') {
      if (/(4k|2160|超清)/.test(text)) return 24;
      return 0;
    }
    if (keyword === '1080') {
      if (/(1080|fullhd|原画)/.test(text)) return 22;
      return 0;
    }
    if (keyword === '720') {
      if (/(720|hd)/.test(text)) return 20;
      return 0;
    }
    if (keyword === '480') {
      if (/480/.test(text)) return 18;
      return 0;
    }
    if (keyword === '360') {
      if (/360/.test(text)) return 16;
      return 0;
    }
    return 0;
  }

  function clickAutoPlay() {
    const candidates = findTextCandidates('连播');
    for (const el of candidates) {
      if (clickElement(el)) return true;
    }
    const autoWords = findTextCandidates('自动');
    for (const el of autoWords) {
      if (clickElement(el)) return true;
    }
    return false;
  }

  function buildPanel() {
    if (panel) return panel;
    injectStyles();

    const container = document.createElement('div');
    container.id = PANEL_ID;
    container.innerHTML = `
      <div class="title">B 站增强</div>
      <div class="row">
        <button class="small" data-speed="0.75">0.75x</button>
        <button class="small" data-speed="1">1x</button>
        <button class="small" data-speed="1.25">1.25x</button>
        <button class="small" data-speed="1.5">1.5x</button>
        <button class="small" data-speed="2">2x</button>
        <button class="small" data-speed="2.5">2.5x</button>
      </div>
      <div class="row">
        <button class="small" data-quality="4k|2160">4K</button>
        <button class="small" data-quality="1080">1080p</button>
        <button class="small" data-quality="720">720p</button>
        <button class="small" data-quality="480">480p</button>
        <button class="small" data-quality="360">360p</button>
        <button class="small" data-quality="auto">自动</button>
      </div>
      <div class="row">
        <button class="small" data-action="rewind">-30s</button>
        <button class="small" data-action="forward">+30s</button>
        <button class="small" data-action="autoplay">连播</button>
        <button class="small" data-action="hide">收起</button>
      </div>
    `;

    container.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      const speed = button.getAttribute('data-speed');
      const quality = button.getAttribute('data-quality');
      const action = button.getAttribute('data-action');

      if (speed) {
        setPlaybackRate(Number(speed));
        return;
      }

      if (quality) {
        clickQualityTarget(quality);
        return;
      }

      if (action === 'rewind') {
        seekBySeconds(-30);
        return;
      }

      if (action === 'forward') {
        seekBySeconds(30);
        return;
      }

      if (action === 'autoplay') {
        clickAutoPlay();
        return;
      }

      if (action === 'hide') {
        panel.remove();
        panel = null;
      }
    });

    document.body.appendChild(container);
    panel = container;
    return container;
  }

  function removePanel() {
    if (panel && panel.isConnected) {
      panel.remove();
    }
    panel = null;
  }

  function ensureObserver() {
    if (observer) return;
    observer = new MutationObserver(() => {
      if (!enabled || !isBilibili()) return;
      const videos = document.querySelectorAll('video');
      if (videos.length && !panel) {
        buildPanel();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function init() {
    if (!enabled || !isBilibili()) return;
    injectStyles();
    ensureObserver();
    restoreState();
    if (document.querySelector('video') && !panel) {
      buildPanel();
    }
  }

  function destroy() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    removePanel();
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (!message) return;
    if (message.type === 'toggle-enabled') {
      enabled = message.enabled !== false;
      if (enabled) {
        init();
      } else {
        destroy();
      }
    }
  });

  chrome.runtime.sendMessage({ type: 'state-request' }, (response) => {
    enabled = response && response.enabled !== false;
    if (enabled) {
      init();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
