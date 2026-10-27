// @ts-ignore
import script from "./scripts/homeLanding.inline"
import { QuartzPluginData } from "../plugins/vfile"
import { FullSlug, resolveRelative } from "../util/path"
import { formatDate } from "./Date"
import { EditorialArtwork, artworkVariant } from "./EditorialArtwork"
import { PrimaryNav } from "./PrimaryNav"
import {
  getHomePostDate,
  getHomePostMeta,
  homeCategories,
  homeProjects,
  selectHomePosts,
  summarizePostDescription,
} from "./homeLandingData"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import style from "./styles/homeLanding.scss"
import navStyle from "./styles/siteHeader.scss"

function postTitle(page: QuartzPluginData): string {
  return page.frontmatter?.title ?? page.slug?.split("/").at(-1) ?? "제목 없는 글"
}

function postDescription(page: QuartzPluginData): string {
  const description = page.frontmatter?.description ?? page.description ?? ""
  return summarizePostDescription(description)
}

function PostVisual({ slug, index }: { slug: string; index: number }) {
  const variant = artworkVariant(slug)
  return (
    <div class={`post-visual post-visual-${variant}`} aria-hidden="true">
      <span class="post-visual-index">{String(index + 1).padStart(2, "0")}</span>
      <EditorialArtwork variant={variant} />
    </div>
  )
}

export function PostCard({
  page,
  index,
  currentSlug,
  headingLevel,
  filterable = false,
}: {
  page: QuartzPluginData
  index: number
  currentSlug: FullSlug
  headingLevel: 2 | 3
  filterable?: boolean
}) {
  const date = getHomePostDate(page)
  const meta = getHomePostMeta(page)
  const postHref = resolveRelative(currentSlug, page.slug!)

  return (
    <article
      class="recent-post-card"
      data-home-area={filterable ? meta.area : undefined}
      data-home-category={filterable ? meta.categoryKey : undefined}
      data-home-project={filterable ? meta.projectKey : undefined}
    >
      <PostVisual slug={page.slug!} index={index} />
      <div class="recent-post-copy">
        <p class="post-project">
          {meta.categoryLabel}
          {meta.project ? ` · ${meta.project}` : ""}
        </p>
        {headingLevel === 2 ? (
          <h2>
            <a class="post-title-link" href={postHref}>
              {postTitle(page)}
            </a>
          </h2>
        ) : (
          <h3>
            <a class="post-title-link" href={postHref}>
              {postTitle(page)}
            </a>
          </h3>
        )}
        {postDescription(page) && <p class="post-description">{postDescription(page)}</p>}
        {date && (
          <div class="post-footer">
            <time datetime={date.toISOString()}>{formatDate(date, "ko-KR")}</time>
          </div>
        )}
      </div>
    </article>
  )
}

export function HomeNav({ currentSlug }: { currentSlug: FullSlug }) {
  return <PrimaryNav currentSlug={currentSlug} />
}

const HomeLanding: QuartzComponent = ({ allFiles, cfg, fileData }: QuartzComponentProps) => {
  const posts = selectHomePosts(allFiles, cfg)

  return (
    <main id="about" class="home-landing">
      <HomeNav currentSlug={fileData.slug!} />

      {posts.length > 0 && (
        <section id="browse-posts" class="home-browse" aria-labelledby="browse-heading">
          <div class="home-section-heading">
            <p class="post-kicker">BROWSE NOTES</p>
            <h1 id="browse-heading">글 찾아보기</h1>
            <p>실무 역량과 프로젝트를 기준으로 글을 찾을 수 있습니다.</p>
          </div>

          <div class="home-filter-controls" aria-label="글 필터">
            <label class="home-filter-label">
              <span>카테고리</span>
              <select class="home-category-filter">
                <option value="">전체 카테고리</option>
                {homeCategories.map((category) => (
                  <option value={category.value}>{category.label}</option>
                ))}
              </select>
            </label>
            <label class="home-filter-label">
              <span>프로젝트</span>
              <select class="home-project-filter">
                <option value="">전체 프로젝트</option>
                <option value="none">프로젝트 없음</option>
                {homeProjects.map((project) => (
                  <option value={project.value}>{project.label}</option>
                ))}
              </select>
            </label>
          </div>

          <p class="home-filter-status" aria-live="polite" />

          <div class="browse-post-grid">
            {posts.map((post, index) => (
              <PostCard
                page={post}
                index={index}
                currentSlug={fileData.slug!}
                headingLevel={2}
                filterable
              />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

HomeLanding.css = style + navStyle
HomeLanding.afterDOMLoaded = script

export default (() => HomeLanding) satisfies QuartzComponentConstructor
