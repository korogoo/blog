import assert from "node:assert/strict"
import test from "node:test"
import { h } from "preact"
import renderToString from "preact-render-to-string"
import { PrimaryNav } from "./PrimaryNav"
import { FullSlug } from "../util/path"

test("article header keeps the wordmark without the area menu", () => {
  const html = renderToString(
    h(PrimaryNav, { currentSlug: "sample-post" as FullSlug, showAreaNav: false }),
  )

  assert.match(html, /코로구의 블로그/)
  assert.doesNotMatch(html, /site-nav-links/)
  assert.doesNotMatch(html, /소프트스킬|하드스킬/)
})

test("landing navigation still renders both areas", () => {
  const html = renderToString(h(PrimaryNav, { currentSlug: "index" as FullSlug }))

  assert.match(html, /site-nav-links/)
  assert.match(html, /소프트스킬/)
  assert.match(html, /하드스킬/)
})
