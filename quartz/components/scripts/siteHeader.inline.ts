document.addEventListener("nav", () => {
  if (!window.matchMedia("(max-width: 960px)").matches) return

  for (const toc of document.querySelectorAll<HTMLElement>(".mobile-only.toc")) {
    const header = toc.querySelector<HTMLButtonElement>(".toc-header")
    const content = toc.querySelector<HTMLElement>(".toc-content")
    if (!header || !content) continue

    header.classList.add("collapsed")
    header.setAttribute("aria-expanded", "false")
    content.classList.add("collapsed")
  }
})

document.addEventListener("click", (event) => {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return
  }

  const target = event.target
  if (!(target instanceof Element)) return

  const link = target.closest<HTMLAnchorElement>(".site-nav-links a[data-nav-area]")
  const nav = link?.closest<HTMLElement>(".site-nav-links")
  if (!link || !nav || link.target === "_blank" || link.hasAttribute("download")) return

  const nextArea = link.dataset.navArea
  if (!nextArea || nav.dataset.active === nextArea) return

  event.preventDefault()
  event.stopPropagation()
  if (nav.dataset.transitioning === "true") return

  nav.dataset.transitioning = "true"
  nav.dataset.active = nextArea
  window.setTimeout(() => window.spaNavigate(new URL(link.href)), 280)
})
