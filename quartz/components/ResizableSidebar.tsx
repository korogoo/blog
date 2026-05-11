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
  const WIDTH_KEY = 'sidebar-width';
  const COLLAPSED_KEY = 'sidebar-collapsed';
  const MIN_WIDTH = 180;
  const MAX_WIDTH = 560;
  const OVERLAY_BREAKPOINT = 1200;

  function isOverlayMode() {
    return window.innerWidth <= OVERLAY_BREAKPOINT;
  }

  function applyWidth(width) {
    document.documentElement.style.setProperty('--sidebar-width', width + 'px');
  }

  function setCollapsed(collapsed) {
    if (isOverlayMode()) return;
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

  function closeMobileSidebar() {
    const body = document.getElementById('quartz-body');
    if (!body) return;
    body.classList.remove('mobile-sidebar-open');
    const btn = document.querySelector('.sidebar-toggle-btn');
    if (btn) btn.textContent = '☰';
  }

  function init() {
    if (!document.querySelector('.sidebar.left')) return;

    // 데스크탑에서만 저장된 너비 적용
    if (!isOverlayMode()) {
      const savedWidth = localStorage.getItem(WIDTH_KEY);
      if (savedWidth) applyWidth(parseInt(savedWidth));
    }

    // 토글 버튼 생성 (1회)
    let btn = document.querySelector('.sidebar-toggle-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.className = 'sidebar-toggle-btn';
      btn.textContent = '☰';
      btn.setAttribute('aria-label', '사이드바 열기/닫기');
      document.body.appendChild(btn);
    }
    btn.onclick = function() {
      const body = document.getElementById('quartz-body');
      if (isOverlayMode()) {
        const isOpen = body.classList.contains('mobile-sidebar-open');
        body.classList.toggle('mobile-sidebar-open');
        btn.textContent = isOpen ? '☰' : '✕';
      } else {
        body.classList.remove('mobile-sidebar-open');
        const collapsed = body.classList.contains('sidebar-collapsed');
        setCollapsed(!collapsed);
      }
    };

    // 백드롭 생성 (1회) - #quartz-body 자식으로 추가해야 CSS 셀렉터 매칭됨
    const quartzBody = document.getElementById('quartz-body');
    if (quartzBody && !quartzBody.querySelector('.mobile-sidebar-backdrop')) {
      const backdrop = document.createElement('div');
      backdrop.className = 'mobile-sidebar-backdrop';
      backdrop.onclick = closeMobileSidebar;
      quartzBody.appendChild(backdrop);
    }

    // Escape 키 (중복 방지)
    if (!document._sidebarEscAdded) {
      document._sidebarEscAdded = true;
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeMobileSidebar();
      });
    }

    // 데스크탑: 접힘 상태 복원
    if (!isOverlayMode()) {
      const isCollapsed = localStorage.getItem(COLLAPSED_KEY) === '1';
      setCollapsed(isCollapsed);
    }

    document.documentElement.classList.remove('sidebar-pre-collapsed');

    // 리사이즈 핸들 생성 (1회)
    let handle = document.querySelector('.sidebar-resize-handle');
    if (!handle) {
      handle = document.createElement('div');
      handle.className = 'sidebar-resize-handle';
      document.body.appendChild(handle);
    }

    handle.addEventListener('mousedown', function(e) {
      if (isOverlayMode()) return;
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
