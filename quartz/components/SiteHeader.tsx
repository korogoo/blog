// @ts-ignore
import script from "./scripts/siteHeader.inline"
import { PrimaryNav } from "./PrimaryNav"
import { QuartzComponent, QuartzComponentConstructor } from "./types"
import style from "./styles/siteHeader.scss"

const SiteHeader: QuartzComponent = ({ fileData }) => {
  return <PrimaryNav currentSlug={fileData.slug!} />
}

SiteHeader.css = style
SiteHeader.afterDOMLoaded = script

export default (() => SiteHeader) satisfies QuartzComponentConstructor
