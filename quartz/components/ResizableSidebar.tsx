import { QuartzComponentConstructor } from "./types"

const darkmodeInit = `
localStorage.setItem("theme", "dark");
document.documentElement.setAttribute("saved-theme", "dark");
if (localStorage.getItem("sidebar-collapsed") === "1") {
  document.documentElement.classList.add("sidebar-pre-collapsed");
}
`

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
    const handle = document.querySelector('.sidebar-resize-handle');
    if (!body || !btn) return;
    if (collapsed) {
      body.classList.add('sidebar-collapsed');
      btn.textContent = '▶';
      if (handle) handle.style.display = 'none';
    } else {
      body.classList.remove('sidebar-collapsed');
      btn.textContent = '☰';
      if (handle) handle.style.display = '';
    }
    localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
  }

  function init() {
    if (!document.querySelector('.sidebar.left')) return;

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

    const isCollapsed = localStorage.getItem(COLLAPSED_KEY) === '1';
    setCollapsed(isCollapsed);
    // prescript에서 미리 붙인 클래스 제거 (JS가 이어받음)
    document.documentElement.classList.remove('sidebar-pre-collapsed');

    // 핸들은 CSS에서 left: var(--sidebar-width)로 자동 추적됨
    let handle = document.querySelector('.sidebar-resize-handle');
    if (!handle) {
      handle = document.createElement('div');
      handle.className = 'sidebar-resize-handle';
      document.body.appendChild(handle);
    }

    handle.addEventListener('mousedown', function(e) {
      e.preventDefault();
      handle.classList.add('dragging');
      const startX = e.clientX;
      const startWidth = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width')
      );
      function onMove(e) {
        const w = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + e.clientX - startX));
        applyWidth(w);
      }
      function onUp() {
        handle.classList.remove('dragging');
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

ResizableSidebar.beforeDOMLoaded = darkmodeInit

export default (() => ResizableSidebar) satisfies QuartzComponentConstructor
