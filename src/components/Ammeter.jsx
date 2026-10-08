import ammeterImg from '../assets/A.png'
import { ammeterNeedleRotation } from '../config/meterNeedleRotations.js'
import useMeterDisplay from '../hooks/useMeterDisplay.js'
import ApparatusTerminal from './ApparatusTerminal.jsx'
import MeterNeedle from './MeterNeedle.jsx'

const Ammeter = ({ value = 0 }) => {
  const meterDisplay = useMeterDisplay(value, ammeterNeedleRotation)
  return (
    <article className="lab-meter lab-meter--image lab-meter--ammeter" id="ammeter-meter" aria-label={`Line ammeter: ${value} A`}>
      <span className="lab-meter__image-frame"><img alt="Ammeter" className="lab-meter__image" src={ammeterImg} /></span>
      <MeterNeedle className="meter-needle--ammeter" rotation={meterDisplay.rotation} />
      <ApparatusTerminal number={6} owner="Ammeter" polarity="plus" variant="ammeter" x="27%" y="80%" labelY="104%" />
      <ApparatusTerminal number={7} owner="Ammeter" polarity="minus" variant="ammeter" x="75%" y="80%" labelY="104%" />
    </article>
  )
}
export default Ammeter
