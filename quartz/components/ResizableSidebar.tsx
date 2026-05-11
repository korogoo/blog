import { QuartzComponentConstructor } from "./types"

function ResizableSidebar() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(function() {
  const STORAGE_KEY = "sidebar-width";
  const MIN_WIDTH = 180;
  const MAX_WIDTH = 560;

  function applyWidth(width) {
    document.documentElement.style.setProperty("--sidebar-width", width + "px");
  }

  function init() {
    const sidebar = document.querySelector(".sidebar.left");
    if (!sidebar) return;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) applyWidth(parseInt(saved));

    if (sidebar.querySelector(".sidebar-resize-handle")) return;

    const handle = document.createElement("div");
    handle.className = "sidebar-resize-handle";
    sidebar.appendChild(handle);

    handle.addEventListener("mousedown", function(e) {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = sidebar.getBoundingClientRect().width;

      function onMove(e) {
        const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + e.clientX - startX));
        applyWidth(newWidth);
      }

      function onUp() {
        const w = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--sidebar-width"));
        localStorage.setItem(STORAGE_KEY, w);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      }

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("nav", init);
})();
        `,
      }}
    />
  )
}

export default (() => ResizableSidebar) satisfies QuartzComponentConstructor
