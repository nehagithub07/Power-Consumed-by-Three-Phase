const toFiniteNumber = (value) => {
  const number = Number(value)

  return Number.isFinite(number) ? number : 0
}

export const getMeterNeedleRotation = (reading, rotationByReading) => {
  const value = toFiniteNumber(reading)
  const points = Object.entries(rotationByReading ?? {})
    .map(([position, rotation]) => [Number(position), rotation])
    .filter(([position, rotation]) => Number.isFinite(position) && Number.isFinite(rotation))
    .sort(([first], [second]) => first - second)
  if (!points.length) return -90
  if (value <= points[0][0]) return points[0][1]
  for (let index = 1; index < points.length; index += 1) {
    const [end, endRotation] = points[index]
    if (value <= end) {
      const [start, startRotation] = points[index - 1]
      return startRotation + (value - start) / (end - start) * (endRotation - startRotation)
    }
  }
  return points.at(-1)[1]
}
