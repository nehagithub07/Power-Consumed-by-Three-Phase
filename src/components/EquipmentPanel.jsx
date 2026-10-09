import Ammeter from './Ammeter.jsx'
import LampLoad from './LampLoad.jsx'
import PowerSupply from './PowerSupply.jsx'
import Voltmeter from './Voltmeter.jsx'
import Wattmeter from './Wattmeter.jsx'

const EquipmentPanel = ({ configuration, onTogglePower, powerOn, readings }) => (
  <section className="equipment-panel" id="equipment-panel">
    <div className="equipment-panel__top-row">
      <PowerSupply onTogglePower={onTogglePower} powerOn={powerOn} />
      <Voltmeter value={readings.lineVoltage} />
      <Ammeter value={readings.lineCurrent} />
      <Wattmeter number={1} value={readings.w1} />
      <Wattmeter number={2} value={readings.w2} />
    </div>
    <LampLoad configuration={configuration} powerOn={powerOn} />
  </section>
)
export default EquipmentPanel
