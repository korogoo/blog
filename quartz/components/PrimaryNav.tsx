import { FullSlug, resolveRelative } from "../util/path"

export function PrimaryNav({ currentSlug }: { currentSlug: FullSlug }) {
  const homeHref = resolveRelative(currentSlug, "index" as FullSlug)
  const aboutHref = resolveRelative(currentSlug, "소개" as FullSlug)
  const softSkillHref = resolveRelative(currentSlug, "소프트-스킬" as FullSlug)
  const hardSkillHref = resolveRelative(currentSlug, "하드-스킬" as FullSlug)

  return (
    <nav class="primary-nav site-header home-nav" aria-label="주요 탐색">
      <a class="primary-nav-wordmark site-wordmark home-wordmark" href={homeHref}>
        Korogoo
      </a>
      <div class="primary-nav-links site-nav-links home-nav-links">
        <a href={aboutHref}>소개</a>
        <a href={softSkillHref}>소프트 스킬</a>
        <a href={hardSkillHref}>하드 스킬</a>
      </div>
    </nav>
  )
}
