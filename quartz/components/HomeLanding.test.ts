import assert from "node:assert/strict"
import test from "node:test"
import { QuartzPluginData } from "../plugins/vfile"
import { artworkVariant } from "./EditorialArtwork"
import {
  displayTag,
  getHomePostDate,
  getHomePostMeta,
  homeCategories,
  homeProjects,
  matchesHomeFilters,
  selectHomePosts,
  summarizePostDescription,
} from "./homeLandingData"

function post(slug: string, frontmatter: QuartzPluginData["frontmatter"]): QuartzPluginData {
  return { slug, frontmatter } as QuartzPluginData
}

test("home categories describe practical engineering competencies in display order", () => {
  assert.deepEqual(
    homeCategories.map((category) => category.label),
    [
      "설계 의사결정",
      "데이터 정합성",
      "성능·확장성",
      "테스트·품질",
      "보안·인증",
      "장애 대응·운영",
      "협업·성장",
    ],
  )
})

test("project choices are limited to Koroglish and Salmonbus", () => {
  assert.deepEqual(homeProjects, [
    { value: "koroglish", label: "Koroglish" },
    { value: "salmonbus", label: "Salmonbus" },
  ])
})

test("getHomePostMeta normalizes a known project and category", () => {
  const meta = getHomePostMeta(
    post("성능·확장성/eager", {
      title: "EAGER",
      area: "hard-skill",
      category: "성능·확장성",
      project: "SALMONBUS",
      tags: ["db", "jpa"],
    }),
  )

  assert.deepEqual(meta, {
    area: "hard-skill",
    categoryKey: "performance-scalability",
    categoryLabel: "성능·확장성",
    project: "Salmonbus",
    projectKey: "salmonbus",
    tags: ["db", "jpa"],
  })
})

test("unknown projects behave as projectless posts", () => {
  const meta = getHomePostMeta(
    post("설계 의사결정/optional", {
      title: "Optional",
      category: "설계 의사결정",
      project: "SBI",
    }),
  )

  assert.equal(meta.project, undefined)
  assert.equal(meta.projectKey, "")
  assert.equal(matchesHomeFilters(meta, "design-decisions", "none"), true)
  assert.equal(matchesHomeFilters(meta, "design-decisions", "salmonbus"), false)
})

test("category and project filters are combined", () => {
  const meta = getHomePostMeta(
    post("데이터 정합성/reservation", {
      title: "중복 예약",
      category: "데이터 정합성",
      project: "Koroglish",
    }),
  )

  assert.equal(matchesHomeFilters(meta, "data-integrity", "koroglish"), true)
  assert.equal(matchesHomeFilters(meta, "testing-quality", "koroglish"), false)
  assert.equal(matchesHomeFilters(meta, "data-integrity", "salmonbus"), false)
})

test("standalone navigation pages do not appear in post listings", () => {
  const pages = [
    post("소개", { title: "소개" }),
    post("소프트-스킬", { title: "소프트 스킬" }),
    post("하드-스킬", { title: "하드 스킬" }),
    post("협업·성장/피드백", { title: "좋은 피드백" }),
  ]

  assert.deepEqual(
    selectHomePosts(pages, { locale: "ko-KR" } as never).map((page) => page.slug),
    ["협업·성장/피드백"],
  )
})

test("home cards and ordering use publication dates, not modification dates", () => {
  const olderPublished = {
    ...post("salmonbus-s3-migration-verification-recovery", { title: "S3 이관" }),
    dates: {
      published: new Date("2026-10-16T00:00:00+09:00"),
      modified: new Date("2026-10-22T00:00:00+09:00"),
    },
  } as QuartzPluginData
  const newerPublished = {
    ...post("salmonbus-db-storage-page-io", { title: "DB 저장" }),
    dates: {
      published: new Date("2026-10-20T00:00:00+09:00"),
      modified: new Date("2026-10-20T00:00:00+09:00"),
    },
  } as QuartzPluginData

  assert.equal(getHomePostDate(olderPublished), olderPublished.dates?.published)
  assert.deepEqual(
    selectHomePosts([olderPublished, newerPublished], { locale: "ko-KR" } as never).map(
      (page) => page.slug,
    ),
    ["salmonbus-db-storage-page-io", "salmonbus-s3-migration-verification-recovery"],
  )
})

test("displayTag restores common technology labels", () => {
  assert.equal(displayTag("spring-boot"), "Spring Boot")
  assert.equal(displayTag("jpa"), "JPA")
  assert.equal(displayTag("postgresql"), "PostgreSQL")
})

test("post summaries stay compact and normalize whitespace", () => {
  assert.equal(summarizePostDescription("  짧은\n요약입니다.  "), "짧은 요약입니다.")

  const longDescription = "가".repeat(80)
  const summary = summarizePostDescription(longDescription)
  assert.equal(Array.from(summary).length, 72)
  assert.equal(summary.endsWith("…"), true)
})

test("artworkVariant keeps home card artwork stable", () => {
  const slug = "성능·확장성/lazy-vs-eager"
  assert.equal(artworkVariant(slug), artworkVariant(slug))
  assert.match(artworkVariant(slug), /^(relation|sequence|path)$/)
})
