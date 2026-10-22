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
