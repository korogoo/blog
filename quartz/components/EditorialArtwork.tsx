import { JSX } from "preact"

export type EditorialArtworkVariant = "relation" | "sequence" | "path"

export function artworkVariant(key: string): EditorialArtworkVariant {
  const variants: EditorialArtworkVariant[] = ["relation", "sequence", "path"]
  const total = [...key].reduce((sum, character) => sum + character.codePointAt(0)!, 0)
  return variants[total % variants.length]
}

export function EditorialArtwork({
  variant,
  class: className,
}: {
  variant: EditorialArtworkVariant
  class?: string
}): JSX.Element {
  const classes = ["editorial-artwork", `editorial-artwork-${variant}`, className]
    .filter(Boolean)
    .join(" ")

  if (variant === "sequence") {
    return (
      <svg class={classes} viewBox="0 0 640 360" aria-hidden="true" focusable="false">
        <path class="artwork-line artwork-line-offset" d="M82 178 C198 170 344 187 554 176" />
        <path class="artwork-line" d="M78 172 C198 179 360 168 560 174" />
        {[156, 320, 484].map((x, index) => (
          <g>
            <path
              class="artwork-shape"
              d={`M ${x - 48} 158 C ${x - 50} 111, ${x - 22} 88, ${x + 12} 92 C ${x + 52} 96, ${x + 60} 132, ${x + 50} 169 C ${x + 42} 210, ${x + 12} 225, ${x - 20} 216 C ${x - 50} 207, ${x - 59} 187, ${x - 48} 158 Z`}
            />
            <path
              class="artwork-tick"
              d={`M ${x - 8} 110 C ${x - 12} 90, ${x - 4} 77, ${x + 13} 70`}
            />
            <text class="artwork-index" x={x - 6} y="283">
              0{index + 1}
            </text>
          </g>
        ))}
        <path class="artwork-accent" d="M112 270 C238 322 402 322 528 272" />
      </svg>
    )
  }

  if (variant === "path") {
    return (
      <svg class={classes} viewBox="0 0 640 360" aria-hidden="true" focusable="false">
        <path
          class="artwork-line artwork-line-offset"
          d="M78 235 C136 92 225 94 283 207 C346 326 429 291 554 82"
        />
        <path class="artwork-line" d="M82 238 C140 103 222 88 290 210 C355 318 434 278 557 78" />
        <g class="artwork-nodes">
          <circle cx="82" cy="238" r="25" />
          <circle cx="290" cy="210" r="25" />
          <circle cx="557" cy="78" r="25" />
        </g>
        <path class="artwork-accent" d="M67 252 l22 -32 M275 226 l28 -34 M542 94 l29 -37" />
      </svg>
    )
  }

  return (
    <svg class={classes} viewBox="0 0 640 360" aria-hidden="true" focusable="false">
      <path class="artwork-line artwork-line-offset" d="M233 153 C333 65 430 70 535 106" />
      <path class="artwork-line" d="M225 157 C326 70 432 66 540 110" />
      <path class="artwork-line artwork-line-offset" d="M225 203 C350 222 437 268 545 276" />
      <path class="artwork-line" d="M220 198 C350 220 440 264 550 270" />
      <path class="artwork-line" d="M218 220 C326 310 440 322 545 289" />
      <path
        class="artwork-shape artwork-shape-primary"
        d="M77 108 C81 76 104 59 142 59 L210 61 C251 64 271 84 269 124 L266 226 C264 266 241 286 201 286 L129 284 C91 282 70 259 72 221 Z"
      />
      <path
        class="artwork-shape"
        d="M430 66 C465 61 512 61 542 70 C566 78 578 98 574 127 L568 163 C564 193 543 207 512 204 L456 200 C426 197 410 178 412 150 L415 99 C416 81 421 72 430 66 Z"
      />
      <path
        class="artwork-shape"
        d="M450 222 C483 218 530 221 552 236 C569 247 573 268 565 292 C558 315 540 326 511 324 L460 321 C432 319 417 304 418 279 L420 252 C422 237 431 227 450 222 Z"
      />
      <circle class="artwork-node" cx="171" cy="173" r="37" />
      <circle class="artwork-node artwork-node-small" cx="500" cy="134" r="18" />
      <circle class="artwork-node artwork-node-small" cx="498" cy="272" r="18" />
      <path class="artwork-accent" d="M92 90 C126 67 182 68 226 81" />
    </svg>
  )
}
