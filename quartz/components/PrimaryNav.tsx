import { FullSlug, resolveRelative } from "../util/path"

export function PrimaryNav({
  currentSlug,
  showAreaNav = true,
}: {
  currentSlug: FullSlug
  showAreaNav?: boolean
}) {
  const homeHref = resolveRelative(currentSlug, "index" as FullSlug)
  const softSkillHref = resolveRelative(currentSlug, "소프트-스킬" as FullSlug)
  const hardSkillHref = resolveRelative(currentSlug, "하드-스킬" as FullSlug)

  return (
    <header class="site-header">
      <a class="site-wordmark" href={homeHref}>
        코로구의 블로그
      </a>
      {showAreaNav && (
        <nav
          class="site-nav-links"
          aria-label="주요 탐색"
          data-active={
            currentSlug === "index" || currentSlug === "소프트-스킬"
              ? "soft"
              : currentSlug === "하드-스킬"
                ? "hard"
                : "none"
          }
        >
          <a
            href={softSkillHref}
            data-nav-area="soft"
            aria-current={
              currentSlug === "index" || currentSlug === "소프트-스킬" ? "page" : undefined
            }
          >
            소프트스킬
          </a>
          <a
            href={hardSkillHref}
            data-nav-area="hard"
            aria-current={currentSlug === "하드-스킬" ? "page" : undefined}
          >
            하드스킬
          </a>
        </nav>
      )}
    </header>
  )
}
