// @ts-ignore
import script from "./scripts/siteHeader.inline"
import { PrimaryNav } from "./PrimaryNav"
import { QuartzComponent, QuartzComponentConstructor } from "./types"
import style from "./styles/siteHeader.scss"

interface SiteHeaderOptions {
  showAreaNav?: boolean
}

export default ((options: SiteHeaderOptions = {}) => {
  const SiteHeader: QuartzComponent = ({ fileData }) => {
    return <PrimaryNav currentSlug={fileData.slug!} showAreaNav={options.showAreaNav} />
  }

  SiteHeader.css = style
  SiteHeader.afterDOMLoaded = script

  return SiteHeader
}) satisfies QuartzComponentConstructor<SiteHeaderOptions>
