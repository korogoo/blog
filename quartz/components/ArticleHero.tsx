import { QuartzComponent, QuartzComponentConstructor } from "./types"
import { ArticleHeaderView } from "./ArticleHeaderView"
import style from "./styles/articleHero.scss"

const ArticleHero: QuartzComponent = (props) => <ArticleHeaderView {...props} />

ArticleHero.css = style

export default (() => ArticleHero) satisfies QuartzComponentConstructor
