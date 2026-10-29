document.addEventListener("nav", () => {
  for (const image of document.querySelectorAll<HTMLImageElement>(
    "#quartz-body:not(.home-shell) article img",
  )) {
    const classify = () => {
      if (!image.naturalWidth || !image.naturalHeight) return
      image.dataset.orientation =
        image.naturalHeight > image.naturalWidth ? "portrait" : "landscape"
    }

    if (image.complete) classify()
    else {
      image.addEventListener("load", classify, { once: true })
      window.addCleanup(() => image.removeEventListener("load", classify))
    }
  }
})
