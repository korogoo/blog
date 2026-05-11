import { QuartzComponentConstructor } from "./types"

function ResizableSidebar() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(function() {
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

    let handle = document.querySelector('.sidebar-resize-handle');
    if (!handle) {
      handle = document.createElement('div');
      handle.className = 'sidebar-resize-handle';
      document.body.appendChild(handle);
    }

    function updateHandlePosition() {
      const rect = sidebar.getBoundingClientRect();
      handle.style.left = (rect.right) + 'px';
    }
    updateHandlePosition();

    handle.addEventListener('mousedown', function(e) {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = sidebar.getBoundingClientRect().width;
      function onMove(e) {
        const w = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + e.clientX - startX));
        applyWidth(w);
        updateHandlePosition();
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
