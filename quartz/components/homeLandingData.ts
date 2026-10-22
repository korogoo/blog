import { GlobalConfiguration } from "../cfg"
import { QuartzPluginData } from "../plugins/vfile"
import { slugTag } from "../util/path"
import { getDate } from "./Date"

export type HomeArea = "soft-skill" | "hard-skill"

export interface HomePostMeta {
  area: HomeArea
  categoryKey: string
  categoryLabel: string
  project?: string
  projectKey: string
  tags: string[]
}

export interface HomeFilterOption {
  label: string
  value: string
}

const postDescriptionMaxLength = 72

export const homeCategories: readonly HomeFilterOption[] = [
  { value: "design-decisions", label: "설계 의사결정" },
  { value: "data-integrity", label: "데이터 정합성" },
  { value: "performance-scalability", label: "성능·확장성" },
  { value: "testing-quality", label: "테스트·품질" },
  { value: "security-auth", label: "보안·인증" },
  { value: "incident-operations", label: "장애 대응·운영" },
  { value: "collaboration-growth", label: "협업·성장" },
]

export const homeProjects: readonly HomeFilterOption[] = [
  { value: "koroglish", label: "Koroglish" },
  { value: "salmonbus", label: "Salmonbus" },
]

const categoryKeys = new Map(homeCategories.map((category) => [category.label, category.value]))
const projectLabels = new Map(homeProjects.map((project) => [project.value, project.label]))

const tagLabels: Record<string, string> = {
  db: "DB",
  jpa: "JPA",
  oauth2: "OAuth2",
  oidc: "OIDC",
  postgresql: "PostgreSQL",
  redis: "Redis",
  "spring-boot": "Spring Boot",
  "spring-data-jpa": "Spring Data JPA",
}

export function filterKey(value: string): string {
  return slugTag(value.trim()).toLowerCase()
}

export function displayTag(tag: string): string {
  const key = filterKey(tag)
  return (
    tagLabels[key] ??
    key
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  )
}

export function summarizePostDescription(description: string | undefined): string {
  const singleLine = (description ?? "").replace(/\s+/g, " ").trim()
  const characters = Array.from(singleLine)

  if (characters.length <= postDescriptionMaxLength) return singleLine
  return `${characters
    .slice(0, postDescriptionMaxLength - 1)
    .join("")
    .trimEnd()}…`
}

export function getHomePostMeta(page: QuartzPluginData): HomePostMeta {
  const rawArea = page.frontmatter?.area?.trim().toLowerCase()
  const firstSegment = page.slug?.split("/")[0] ?? ""
  const area: HomeArea =
    rawArea === "soft-skill" || rawArea === "soft" || firstSegment.includes("소프트-스킬")
      ? "soft-skill"
      : "hard-skill"

  const rawCategory = page.frontmatter?.category?.trim() ?? ""
  const categoryKey = categoryKeys.get(rawCategory) ?? ""
  const rawProject = page.frontmatter?.project?.trim() ?? ""
  const projectKey = filterKey(rawProject)
  const project = projectLabels.get(projectKey)
  const tags = [...new Set(page.frontmatter?.tags?.map(filterKey).filter(Boolean) ?? [])]

  return {
    area,
    categoryKey,
    categoryLabel: categoryKey ? rawCategory : "분류 없음",
    project,
    projectKey: project ? projectKey : "",
    tags,
  }
}

export function matchesHomeFilters(
  meta: HomePostMeta,
  selectedCategory: string,
  selectedProject: string,
): boolean {
  const matchesCategory = !selectedCategory || meta.categoryKey === selectedCategory
  const matchesProject =
    !selectedProject ||
    (selectedProject === "none" ? meta.projectKey === "" : meta.projectKey === selectedProject)
  return matchesCategory && matchesProject
}

export function selectHomePosts(
  allFiles: QuartzPluginData[],
  cfg: GlobalConfiguration,
): QuartzPluginData[] {
  return allFiles
    .filter((page) => {
      const slug = page.slug
      return (
        slug !== undefined &&
        !["index", "소개", "소프트-스킬", "하드-스킬"].includes(slug) &&
        !slug.startsWith("tags/")
      )
    })
    .toSorted((left, right) => {
      const leftDate = getDate(cfg, left)?.getTime() ?? 0
      const rightDate = getDate(cfg, right)?.getTime() ?? 0
      if (leftDate !== rightDate) return rightDate - leftDate

      const leftTitle = left.frontmatter?.title ?? left.slug ?? ""
      const rightTitle = right.frontmatter?.title ?? right.slug ?? ""
      return leftTitle.localeCompare(rightTitle, cfg.locale, {
        numeric: true,
        sensitivity: "base",
      })
    })
}
