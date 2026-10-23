import { getHomePostMeta, HomeArea, selectHomePosts } from "./homeLandingData"
import { HomeNav, PostCard } from "./HomeLanding"
import { QuartzComponent, QuartzComponentConstructor } from "./types"
import style from "./styles/homeLanding.scss"
import navStyle from "./styles/siteHeader.scss"

interface AreaLandingOptions {
  area: HomeArea
  eyebrow: string
  title: string
  description: string
}

export default ((options: AreaLandingOptions) => {
  const AreaLanding: QuartzComponent = ({ allFiles, cfg, fileData }) => {
    const posts = selectHomePosts(allFiles, cfg).filter(
      (page) => getHomePostMeta(page).area === options.area,
    )

    return (
      <main class="home-landing area-landing">
        <HomeNav currentSlug={fileData.slug!} />

        <header class="area-page-intro">
          <p class="post-kicker">{options.eyebrow}</p>
          <h1>{options.title}</h1>
          <p>{options.description}</p>
          <span>{posts.length}개의 글</span>
        </header>

        <section class="area-posts" aria-label={`${options.title} 글 목록`}>
          {posts.length > 0 ? (
            <div class="browse-post-grid">
              {posts.map((post, index) => (
                <PostCard page={post} index={index} currentSlug={fileData.slug!} headingLevel={2} />
              ))}
            </div>
          ) : (
            <p class="area-empty">아직 공개된 글이 없습니다.</p>
          )}
        </section>
      </main>
    )
  }

  AreaLanding.css = style + navStyle
  return AreaLanding
}) satisfies QuartzComponentConstructor<AreaLandingOptions>
