export const getTargetRect = (element) => {
  if (!element) return null
  const rect = element.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return null

  // Number labels extend below meters and the MCB; keep them inside the highlight.
  const bounds = [rect, ...Array.from(element.querySelectorAll('.terminal-number-label'),
    (label) => label.getBoundingClientRect()).filter((box) => box.width > 0 || box.height > 0)]
  const left = Math.min(...bounds.map((box) => box.left))
  const top = Math.min(...bounds.map((box) => box.top))
  const right = Math.max(...bounds.map((box) => box.right))
  const bottom = Math.max(...bounds.map((box) => box.bottom))
  return { left, top, right, bottom, width: right - left, height: bottom - top }
}
