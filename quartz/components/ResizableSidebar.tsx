import { QuartzComponentConstructor } from "./types"

function ResizableSidebar() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(function() {
  // ── 커스텀 체크박스 아이콘 ──────────────────────────────────────────
  const TASK_ICONS = {
    '!': { symbol: '⚠', color: '#e5a00d' },
    'I': { symbol: 'ℹ', color: '#4a9eff' },
    'i': { symbol: 'ℹ', color: '#4a9eff' },
    '>': { symbol: '→', color: '#a78bfa' },
    '"': { symbol: '❝', color: '#94a3b8' },
    '?': { symbol: '？', color: '#f472b6' },
    'p': { symbol: '＋', color: '#4ade80' },
    'c': { symbol: '✗', color: '#f87171' },
    '*': { symbol: '★', color: '#fbbf24' },
  };

  function processTaskIcons() {
    document.querySelectorAll('.page article li').forEach(function(li) {
      if (li.dataset.taskProcessed) return;
      const first = li.firstChild;
      if (!first || first.nodeType !== Node.TEXT_NODE) return;
      const match = first.textContent.match(/^\\[([!Ii>"?pc*])\\]\\s?/);
      if (!match) return;
      const icon = TASK_ICONS[match[1]];
      if (!icon) return;
      li.dataset.taskProcessed = '1';
      li.style.listStyle = 'none';
      first.textContent = first.textContent.slice(match[0].length);
      const span = document.createElement('span');
      span.style.cssText = 'color:' + icon.color + ';margin-right:0.4em;';
      span.textContent = icon.symbol;
      li.insertBefore(span, li.firstChild);
    });
  }

  // ── 사이드바 리사이즈 & 토글 ───────────────────────────────────────
  const WIDTH_KEY = 'sidebar-width';
  const COLLAPSED_KEY = 'sidebar-collapsed';
  const MIN_WIDTH = 180;
  const MAX_WIDTH = 560;

  function applyWidth(width) {
    document.documentElement.style.setProperty('--sidebar-width', width + 'px');
  }

  function setCollapsed(collapsed) {
    const body = document.getElementById('quartz-body');
    const btn = document.querySelector('.sidebar-toggle-btn');
    if (!body || !btn) return;
    if (collapsed) {
      body.classList.add('sidebar-collapsed');
      btn.textContent = '▶';
      btn.style.left = '0.5rem';
    } else {
      body.classList.remove('sidebar-collapsed');
      btn.textContent = '☰';
      btn.style.left = '1rem';
    }
    localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
  }

  function init() {
    processTaskIcons();

    const sidebar = document.querySelector('.sidebar.left');
    if (!sidebar) return;

    const savedWidth = localStorage.getItem(WIDTH_KEY);
    if (savedWidth) applyWidth(parseInt(savedWidth));

    if (!document.querySelector('.sidebar-toggle-btn')) {
      const btn = document.createElement('button');
      btn.className = 'sidebar-toggle-btn';
      btn.textContent = '☰';
      btn.setAttribute('aria-label', '사이드바 열기/닫기');
      btn.addEventListener('click', function() {
        const collapsed = document.getElementById('quartz-body').classList.contains('sidebar-collapsed');
        setCollapsed(!collapsed);
      });
      document.body.appendChild(btn);
    }

    setCollapsed(localStorage.getItem(COLLAPSED_KEY) === '1');

    if (sidebar.querySelector('.sidebar-resize-handle')) return;
    const handle = document.createElement('div');
    handle.className = 'sidebar-resize-handle';
    sidebar.appendChild(handle);

    handle.addEventListener('mousedown', function(e) {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = sidebar.getBoundingClientRect().width;
      function onMove(e) {
        const w = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + e.clientX - startX));
        applyWidth(w);
      }
      function onUp() {
        const w = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width'));
        localStorage.setItem(WIDTH_KEY, w);
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('nav', init);
})();
        `,
      }}
    />
  )
}

export default (() => ResizableSidebar) satisfies QuartzComponentConstructor
