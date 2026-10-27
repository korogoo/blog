import { formatDate, getDate } from "./Date"
import { getHomePostMeta } from "./homeLandingData"
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
    </header>
  )
}
