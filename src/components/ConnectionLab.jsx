import { useEffect, useRef } from 'react'
import EquipmentPanel from './EquipmentPanel.jsx'
import {
  addAllEndpoints, autoConnectCircuit, deleteConnectionsForTerminal,
  resolveJsPlumb, syncWireAnchors, updateTerminalConnectionStates, validateCircuit,
} from '../utils/jsPlumbWiring.js'

const ConnectionLab = ({ configuration, powerOn, readings, scale, highlightedTerminals = [], onReady, onWiringChange, onTogglePower }) => {
  const labRef = useRef(null)
  const instanceRef = useRef(null)
  const live = useRef({ configuration, powerOn, onReady, onWiringChange })

  useEffect(() => {
    live.current = { configuration, powerOn, onReady, onWiringChange }
  }, [configuration, powerOn, onReady, onWiringChange])

  useEffect(() => {
    let disposed = false
    let instance
    let observer
    const lab = labRef.current
    const refresh = () => {
      if (disposed || !instance) return
      syncWireAnchors(lab, instance)
      instance.repaintEverything()
    }
    const changed = () => {
      if (disposed) return
      updateTerminalConnectionStates(instance, lab)
      live.current.onWiringChange(validateCircuit(instance, live.current.configuration))
    }
    const removeWire = (event) => {
      const label = event.target.closest('.terminal-number-label')
      if (!label || live.current.powerOn) return
      if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return
      event.preventDefault()
      deleteConnectionsForTerminal(instance, label.dataset.terminalId)
    }
    import('jsplumb').then((module) => {
      if (disposed) return
      const jsPlumb = resolveJsPlumb(module)
      jsPlumb.ready(() => {
        if (disposed) return
        instance = jsPlumb.getInstance({ Container: lab, ConnectionsDetachable: true })
        instanceRef.current = instance
        syncWireAnchors(lab)
        addAllEndpoints(instance)
        instance.bind('beforeDrop', ({ sourceId, targetId }) => !live.current.powerOn && sourceId !== targetId)
        instance.bind('beforeDetach', () => !live.current.powerOn)
        instance.bind('connection', changed)
        instance.bind('connectionDetached', changed)
        instance.bind('connectionMoved', changed)
        lab.addEventListener('click', removeWire)
        lab.addEventListener('keydown', removeWire)
        live.current.onReady({
          validate: (selected = live.current.configuration) => validateCircuit(instance, selected),
          autoConnect: () => {
            if (live.current.powerOn) return
            autoConnectCircuit(instance, live.current.configuration)
            refresh()
            changed()
          },
          reset: () => {
            instance.deleteEveryConnection({ force: true })
            changed()
          },
        })
        observer = new ResizeObserver(refresh)
        observer.observe(lab)
        lab.querySelectorAll('img').forEach((image) => image.addEventListener('load', refresh))
        refresh()
      })
    })
    return () => {
      disposed = true
      observer?.disconnect()
      lab.removeEventListener('click', removeWire)
      lab.removeEventListener('keydown', removeWire)
      lab.querySelectorAll('img').forEach((image) => image.removeEventListener('load', refresh))
      instance?.reset()
      instanceRef.current = null
      live.current.onReady(null)
    }
  }, [])

  useEffect(() => {
    if (!instanceRef.current) return
    syncWireAnchors(labRef.current, instanceRef.current)
    instanceRef.current.repaintEverything()
  }, [scale])

  useEffect(() => {
    labRef.current.querySelectorAll('[data-terminal-id]').forEach((element) => {
      element.classList.toggle('simulation-guide-highlight',
        highlightedTerminals.includes(Number(element.dataset.terminalId.replace('-endpoint', ''))))
    })
  }, [highlightedTerminals])

  return (
    <div className={`connection-lab ${powerOn ? 'connection-lab--locked' : ''}`} id="connection-lab" ref={labRef} aria-label="Experiment apparatus area">
      <EquipmentPanel configuration={configuration} powerOn={powerOn} readings={readings} onTogglePower={onTogglePower} />
    </div>
  )
}
export default ConnectionLab
