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
    locale: "en-US",
    baseUrl: "quartz.jzhao.xyz",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "hosted",
      cdnCaching: false,
      typography: {
        header: "SchoolSafeDictation",
        body: "SchoolSafeDictation",
        code: "JetBrains Mono",
      },
      colors: {
        lightMode: {
          light: "#22262e",
          lightgray: "#2e3440",
          gray: "#4c566a",
          darkgray: "#c1cbd1",
          dark: "#eceff4",
          secondary: "#c1cbd1",
          tertiary: "#89a0ad",
          highlight: "rgba(193, 203, 209, 0.10)",
          textHighlight: "#c1cbd133",
        },
        darkMode: {
          light: "#22262e",
          lightgray: "#2e3440",
          gray: "#4c566a",
          darkgray: "#c1cbd1",
          dark: "#eceff4",
          secondary: "#c1cbd1",
          tertiary: "#89a0ad",
          highlight: "rgba(193, 203, 209, 0.10)",
          textHighlight: "#c1cbd133",
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
      Plugin.TableOfContents(),
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
