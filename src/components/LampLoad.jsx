import lampOffImg from '../assets/lampoff.png'
import lampDimImg from '../assets/lampdim.png'
import lampBrightImg from '../assets/lampbright.png'
import ApparatusTerminal from './ApparatusTerminal.jsx'

// Socket centers in the lamp images; the three rows are not evenly spaced.
const terminalRows = ['33.35%', '55.3%', '76.5%']

const LampLoad = ({ configuration, powerOn }) => {
  const brightness = powerOn ? (configuration === 'Star' ? 'dim' : 'bright') : 'off'
  const image = powerOn ? (configuration === 'Star' ? lampDimImg : lampBrightImg) : lampOffImg
  return (
    <article className="lamp-load" id="lamp-load" aria-label={`Lamp load: ${brightness}`} data-brightness={brightness}>
      <img alt={`Three-phase lamp load, lamps ${brightness}`} className="lamp-load__image" src={image} />
      {[16, 17, 18, 19, 20, 21].map((number, index) => (
        <ApparatusTerminal key={number} number={number} owner="Lamp load" variant="lamp-load"
          polarity={index % 2 === 0 ? 'plus' : 'minus'}
          x={index % 2 === 0 ? '12.95%' : '86.6%'} y={terminalRows[Math.floor(index / 2)]}
          labelX={index % 2 === 0 ? '4%' : '95.5%'} />
      ))}
    </article>
  )
}
export default LampLoad
