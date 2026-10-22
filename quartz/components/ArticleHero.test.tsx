import assert from "node:assert/strict"
import test from "node:test"
import { h } from "preact"
import renderToString from "preact-render-to-string"
import { ArticleHeaderView } from "./ArticleHeaderView"
import { QuartzComponentProps } from "./types"

test("article header renders metadata without a card thumbnail", () => {
  const html = renderToString(
    h(ArticleHeaderView, {
      cfg: { defaultDateType: "published", locale: "ko-KR" },
      fileData: {
        slug: "성능·확장성/eager",
        dates: { published: new Date("2026-06-19T00:00:00.000Z") },
        frontmatter: {
          title: "EAGER 로딩과 N+1",
          description: "실제 SQL을 기준으로 정리했습니다.",
          category: "성능·확장성",
          tags: ["JPA", "DB"],
        },
      },
    } as QuartzComponentProps),
  )

  assert.match(html, /class="article-header"/)
  assert.match(html, /EAGER 로딩과 N\+1/)
  assert.match(html, /실제 SQL을 기준으로 정리했습니다\./)
  assert.match(html, /<time/)
  assert.match(html, /JPA/)
  assert.doesNotMatch(html, /article-hero-visual/)
  assert.doesNotMatch(html, /editorial-artwork/)
  assert.doesNotMatch(html, /<svg/)
})
