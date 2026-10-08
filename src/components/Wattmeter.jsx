import wattmeterOneImg from '../assets/W1.png'
import wattmeterTwoImg from '../assets/W2.png'
import { wattmeterNeedleRotation } from '../config/meterNeedleRotations.js'
import useMeterDisplay from '../hooks/useMeterDisplay.js'
import ApparatusTerminal from './ApparatusTerminal.jsx'
import MeterNeedle from './MeterNeedle.jsx'

const Wattmeter = ({ number, value = 0 }) => {
  const meterDisplay = useMeterDisplay(value, wattmeterNeedleRotation)
  const firstTerminal = number === 1 ? 8 : 12
  return (
    <article className="lab-meter lab-meter--wattmeter" id={`wattmeter-${number}`} aria-label={`Wattmeter W${number}: ${value} W`}>
      <span className="lab-meter__image-frame">
        <img alt={`Wattmeter W${number}`} className="lab-meter__image" src={number === 1 ? wattmeterOneImg : wattmeterTwoImg} />
      </span>
      <MeterNeedle className="meter-needle--wattmeter" rotation={meterDisplay.rotation} />
      {[0, 1, 2, 3].map((offset) => (
        <ApparatusTerminal key={offset} number={firstTerminal + offset} owner={`Wattmeter W${number}`}
          polarity={offset === 0 ? 'plus' : 'minus'} variant="wattmeter"
          x={`${16.5 + offset * 22}%`} y="81%" labelY="104%" />
      ))}
    </article>
  )
}
export default Wattmeter
