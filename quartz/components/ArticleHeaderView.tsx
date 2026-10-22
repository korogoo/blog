import { formatDate, getDate } from "./Date"
import { displayTag, getHomePostMeta } from "./homeLandingData"
import { FullSlug, resolveRelative } from "../util/path"
import { QuartzComponent } from "./types"

export const ArticleHeaderView: QuartzComponent = ({ cfg, fileData }) => {
  const title = fileData.frontmatter?.title
  if (!title) return null

  const date = getDate(cfg, fileData)
  const meta = getHomePostMeta(fileData)
  const description = (fileData.frontmatter?.description ?? fileData.description ?? "")
    .replace(/\s+/g, " ")
    .trim()

  return (
    <header class="article-header">
      <p class="article-kicker">
        {meta.project ? `${meta.project} · ` : ""}
        {meta.categoryLabel}
      </p>
      <h1 class="article-title">{title}</h1>
      {description && <p class="article-description">{description}</p>}
      {date && <time datetime={date.toISOString()}>{formatDate(date, "ko-KR")}</time>}
      {meta.tags.length > 0 && (
        <ul class="article-tags" aria-label="태그">
          {meta.tags.map((tag) => (
            <li>
              <a href={resolveRelative(fileData.slug!, `tags/${tag}` as FullSlug)}>
                {displayTag(tag)}
              </a>
            </li>
          ))}
        </ul>
      )}
    </header>
  )
}
