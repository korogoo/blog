import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * Quartz 4 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "Korogoo",
    pageTitleSuffix: "",
    enableSPA: true,
    enablePopovers: true,
    analytics: {
      provider: "plausible",
    },
    locale: "ko-KR",
    baseUrl: "korogoo.site",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "local",
      cdnCaching: false,
      typography: {
        header: "SchoolSafeDictation",
        body: "SchoolSafeDictation",
        code: "JetBrains Mono",
      },
      colors: {
        lightMode: {
          light: "#fbfaf7",
          lightgray: "#dbe7ef",
          gray: "#8796a3",
          darkgray: "#40596b",
          dark: "#17324a",
          secondary: "#4c83ad",
          tertiary: "#6e9fc3",
          highlight: "rgba(147, 199, 245, 0.16)",
          textHighlight: "rgba(184, 217, 255, 0.34)",
        },
        darkMode: {
          light: "#111214",
          lightgray: "#2d2f34",
          gray: "#747880",
          darkgray: "#c7cad0",
          dark: "#f1f2ed",
          secondary: "#8fcbd1",
          tertiary: "#83dce4",
          highlight: "rgba(131, 220, 228, 0.11)",
          textHighlight: "rgba(245, 165, 108, 0.24)",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents({ maxDepth: 2, collapseByDefault: false }),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
      // Plugin.CustomOgImages(),
    ],
  },
}

export default config
