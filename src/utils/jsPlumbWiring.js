import { CONNECTIONS, connectionKey, validateConnections } from './threePhaseExperiment.js'

const terminalIds = Array.from({ length: 21 }, (_, index) => `${index + 1}-endpoint`)
const terminalNumber = (id) => Number(id.replace('-endpoint', ''))
const connections = (instance) => instance?.getAllConnections() ?? []
const connector = ['Bezier', { curviness: 48, margin: 0 }]
const wireColors = {
  plus: { stroke: '#b91c1c', outlineStroke: '#65100e', hoverStroke: '#dc2626' },
  minus: { stroke: '#171717', outlineStroke: '#000000', hoverStroke: '#262626' },
}

const getWireStyles = (terminalId) => {
  const polarity = globalThis.document?.querySelector(
    `.connection-terminal[data-terminal-id="${terminalId}"]`,
  )?.dataset.polarity ?? 'minus'
  const colors = wireColors[polarity]
  const paint = { stroke: colors.stroke, strokeWidth: 3.5, outlineStroke: colors.outlineStroke, outlineWidth: 0.6 }
  return { paint, hoverPaint: { ...paint, stroke: colors.hoverStroke, strokeWidth: 4.5 } }
}

export const resolveJsPlumb = (module) => module?.jsPlumb || module?.default?.jsPlumb || module?.default

export const readConnectionPairs = (instance) => connections(instance).map(({ sourceId, targetId }) => [
  terminalNumber(sourceId), terminalNumber(targetId),
])

export const validateCircuit = (instance, configuration) => validateConnections(readConnectionPairs(instance), configuration)

export const syncWireAnchors = (container, instance) => {
  let layer = container.querySelector('.wire-anchor-layer')
  if (!layer) {
    layer = document.createElement('div')
    layer.className = 'wire-anchor-layer'
    layer.setAttribute('aria-hidden', 'true')
    container.appendChild(layer)
  }
  const rect = container.getBoundingClientRect()
  const scaleX = rect.width / container.offsetWidth || 1
  const scaleY = rect.height / container.offsetHeight || 1
  terminalIds.forEach((id) => {
    const visual = container.querySelector(`.connection-terminal[data-terminal-id="${id}"]`)
    if (!visual) return
    let anchor = layer.querySelector(`[id="${id}"]`)
    if (!anchor) {
      anchor = document.createElement('span')
      anchor.id = id
      anchor.className = 'wire-anchor'
      layer.appendChild(anchor)
    }
    const bounds = visual.getBoundingClientRect()
    anchor.style.left = `${(bounds.left + bounds.width / 2 - rect.left) / scaleX - 14}px`
    anchor.style.top = `${(bounds.top + bounds.height / 2 - rect.top) / scaleY - 14}px`
    instance?.revalidate(anchor)
  })
}

export const addAllEndpoints = (instance) => {
  terminalIds.forEach((id) => {
    const { paint, hoverPaint } = getWireStyles(id)
    instance.addEndpoint(id, {
      uuid: id, endpoint: ['Dot', { radius: 12 }], anchor: [0.5, 0.5, 0, 1],
      cssClass: 'jtk-endpoint--terminal', isSource: true, isTarget: true,
      connector, connectorStyle: paint, connectorHoverStyle: hoverPaint,
      paintStyle: { fill: paint.stroke, stroke: paint.outlineStroke },
      hoverPaintStyle: { fill: hoverPaint.stroke, stroke: hoverPaint.outlineStroke },
      maxConnections: -1, connectionsDetachable: true,
    })
  })
}

export const updateTerminalConnectionStates = (instance, container) => {
  connections(instance).forEach((connection) => {
    const { paint, hoverPaint } = getWireStyles(connection.sourceId)
    connection.setPaintStyle(paint)
    connection.setHoverPaintStyle(hoverPaint)
  })
  const connected = new Set(connections(instance).flatMap(({ sourceId, targetId }) => [sourceId, targetId]))
  container.querySelectorAll('.connection-terminal').forEach((element) => {
    element.classList.toggle('jtk-connected', connected.has(element.dataset.terminalId))
  })
}

export const deleteConnectionsForTerminal = (instance, terminalId) => {
  connections(instance).filter(({ sourceId, targetId }) => sourceId === terminalId || targetId === terminalId)
    .forEach((connection) => instance.deleteConnection(connection))
}

export const autoConnectCircuit = (instance, configuration) => {
  const required = CONNECTIONS[configuration]
  const requiredKeys = new Set(required.map(([first, second]) => connectionKey(first, second)))
  const kept = new Set()
  // Preserve common supply/meter wires when converting between Star and Delta.
  ;[...connections(instance)].forEach((connection) => {
    const key = connectionKey(terminalNumber(connection.sourceId), terminalNumber(connection.targetId))
    if (!requiredKeys.has(key) || kept.has(key)) {
      instance.deleteConnection(connection, { force: true, fireEvent: false })
    } else {
      kept.add(key)
    }
  })
  required.forEach(([first, second]) => {
    if (kept.has(connectionKey(first, second))) return
    const { paint, hoverPaint } = getWireStyles(`${first}-endpoint`)
    instance.connect({
      uuids: [`${first}-endpoint`, `${second}-endpoint`],
      connector, paintStyle: paint, hoverPaintStyle: hoverPaint, fireEvent: false,
    })
  })
}
