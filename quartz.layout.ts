import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [],
  footer: Component.Footer({
    links: {
      GitHub: "https://github.com/jackyzha0/quartz",
      "Discord Community": "https://discord.gg/cRFFHYye7t",
    },
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.HomeLanding(),
      condition: (page) => page.fileData.slug === "index",
    }),
    Component.ConditionalRender({
      component: Component.AreaLanding({
        area: "soft-skill",
        eyebrow: "SOFT SKILLS",
        title: "소프트 스킬",
        description: "협업 과정에서 배운 소통 방식과 판단 기준을 정리합니다.",
      }),
      condition: (page) => page.fileData.slug === "소프트-스킬",
    }),
    Component.ConditionalRender({
      component: Component.AreaLanding({
        area: "hard-skill",
        eyebrow: "HARD SKILLS",
        title: "하드 스킬",
        description: "설계, 데이터, 테스트와 운영에서 확인한 기술적 판단을 정리합니다.",
      }),
      condition: (page) => page.fileData.slug === "하드-스킬",
    }),
    Component.ConditionalRender({
      component: Component.Search(),
      condition: (page) => ["index", "소프트-스킬", "하드-스킬"].includes(page.fileData.slug ?? ""),
    }),
    Component.ConditionalRender({
      component: Component.SiteHeader(),
      condition: (page) =>
        !["index", "소프트-스킬", "하드-스킬"].includes(page.fileData.slug ?? ""),
    }),
    Component.ConditionalRender({
      component: Component.Search(),
      condition: (page) =>
        !["index", "소프트-스킬", "하드-스킬"].includes(page.fileData.slug ?? ""),
    }),
    Component.ConditionalRender({
      component: Component.ArticleHero(),
      condition: (page) =>
        !["index", "소개", "소프트-스킬", "하드-스킬"].includes(page.fileData.slug ?? ""),
    }),
  ],
  left: [],
  right: [
    Component.ConditionalRender({
      component: Component.DesktopOnly(Component.TableOfContents({ collapsible: false })),
      condition: (page) =>
        !["index", "소프트-스킬", "하드-스킬"].includes(page.fileData.slug ?? ""),
    }),
  ],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.SiteHeader(), Component.Search(), Component.ArticleTitle()],
  left: [],
  right: [],
}
