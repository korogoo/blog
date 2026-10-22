// @ts-ignore
import clipboardScript from "./scripts/clipboard.inline"
import clipboardStyle from "./styles/clipboard.scss"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const Body: QuartzComponent = ({ children, fileData }: QuartzComponentProps) => {
  const landingSlugs = ["index", "소프트-스킬", "하드-스킬"]
  const shellClass = landingSlugs.includes(fileData.slug ?? "") ? "home-shell" : "article-shell"
  return (
    <div id="quartz-body" class={shellClass}>
      {children}
    </div>
  )
}

Body.afterDOMLoaded = clipboardScript
Body.css = clipboardStyle

export default (() => Body) satisfies QuartzComponentConstructor
