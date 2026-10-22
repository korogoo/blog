function setupHomeFilters(root: HTMLElement) {
  if (root.dataset.filtersReady === "true") return
  root.dataset.filtersReady = "true"

  const cards = [...root.querySelectorAll<HTMLElement>(".browse-post-grid .recent-post-card")]
  const categorySelect = root.querySelector<HTMLSelectElement>(".home-category-filter")
  const projectSelect = root.querySelector<HTMLSelectElement>(".home-project-filter")
  const status = root.querySelector<HTMLElement>(".home-filter-status")
  const url = new URL(window.location.href)
  let selectedCategory = url.searchParams.get("category") ?? ""
  let selectedProject = url.searchParams.get("project") ?? ""
  let selectedArea = url.searchParams.get("area") ?? ""

  const hasOption = (select: HTMLSelectElement | null, value: string) =>
    select ? [...select.options].some((option) => option.value === value) : value === ""

  if (!hasOption(categorySelect, selectedCategory)) selectedCategory = ""
  if (!hasOption(projectSelect, selectedProject)) selectedProject = ""
  if (selectedArea !== "soft-skill" && selectedArea !== "hard-skill") selectedArea = ""

  const updateUrl = () => {
    const next = new URL(window.location.href)
    const setOrDelete = (key: string, value: string) =>
      value ? next.searchParams.set(key, value) : next.searchParams.delete(key)
    setOrDelete("category", selectedCategory)
    setOrDelete("project", selectedProject)
    setOrDelete("area", selectedArea)
    window.history.replaceState(window.history.state, "", next)
  }

  const applyFilters = () => {
    let visible = 0
    for (const card of cards) {
      const project = card.dataset.homeProject ?? ""
      const matchesProject =
        !selectedProject ||
        (selectedProject === "none" ? project === "" : project === selectedProject)
      const matches =
        (!selectedCategory || card.dataset.homeCategory === selectedCategory) &&
        matchesProject &&
        (!selectedArea || card.dataset.homeArea === selectedArea)
      card.hidden = !matches
      if (matches) visible += 1
    }

    if (categorySelect) categorySelect.value = selectedCategory
    if (projectSelect) projectSelect.value = selectedProject
    if (status)
      status.textContent =
        visible === 0 ? "조건에 맞는 글이 없습니다." : `조건에 맞는 글 ${visible}개`
  }

  if (categorySelect) {
    const onChange = () => {
      selectedCategory = categorySelect.value
      updateUrl()
      applyFilters()
    }
    categorySelect.addEventListener("change", onChange)
    window.addCleanup(() => categorySelect.removeEventListener("change", onChange))
  }

  if (projectSelect) {
    const onChange = () => {
      selectedProject = projectSelect.value
      updateUrl()
      applyFilters()
    }
    projectSelect.addEventListener("change", onChange)
    window.addCleanup(() => projectSelect.removeEventListener("change", onChange))
  }

  applyFilters()
}

document.addEventListener("nav", () => {
  const root = document.querySelector<HTMLElement>(".home-landing")
  if (!root) return
  setupHomeFilters(root)
})
