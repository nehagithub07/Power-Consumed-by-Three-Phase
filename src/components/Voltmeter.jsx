import voltmeterImg from '../assets/V.png'
import { voltmeterNeedleRotation } from '../config/meterNeedleRotations.js'
import useMeterDisplay from '../hooks/useMeterDisplay.js'
import ApparatusTerminal from './ApparatusTerminal.jsx'
import MeterNeedle from './MeterNeedle.jsx'

const Voltmeter = ({ value = 0 }) => {
  const meterDisplay = useMeterDisplay(value, voltmeterNeedleRotation)
  return (
    <article className="lab-meter lab-meter--image lab-meter--voltmeter" id="voltmeter-meter" aria-label={`Line voltmeter: ${value} V`}>
      <span className="lab-meter__image-frame"><img alt="Voltmeter" className="lab-meter__image" src={voltmeterImg} /></span>
      <MeterNeedle className="meter-needle--voltmeter" rotation={meterDisplay.rotation} />
      <ApparatusTerminal number={4} owner="Voltmeter" polarity="plus" variant="voltmeter" x="22.71%" y="78.6%" labelY="104%" />
      <ApparatusTerminal number={5} owner="Voltmeter" polarity="minus" variant="voltmeter" x="73.39%" y="78.6%" labelY="104%" />
    </article>
  )
}
export default Voltmeter
