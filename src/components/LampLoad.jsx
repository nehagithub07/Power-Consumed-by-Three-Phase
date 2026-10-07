import lampOffImg from '../assets/lampoff.png'
import lampDimImg from '../assets/lampdim.png'
import lampBrightImg from '../assets/lampbright.png'
import ApparatusTerminal from './ApparatusTerminal.jsx'

const LampLoad = ({ configuration, powerOn }) => {
  const brightness = powerOn ? (configuration === 'Star' ? 'dim' : 'bright') : 'off'
  const image = powerOn ? (configuration === 'Star' ? lampDimImg : lampBrightImg) : lampOffImg
  return (
    <article className="lamp-load" id="lamp-load" aria-label={`Lamp load: ${brightness}`} data-brightness={brightness}>
      <img alt={`Three-phase lamp load, lamps ${brightness}`} className="lamp-load__image" src={image} />
      {[16, 17, 18, 19, 20, 21].map((number, index) => (
        <ApparatusTerminal key={number} number={number} owner="Lamp load" variant="lamp-load"
          polarity={index % 2 === 0 ? 'plus' : 'minus'}
          x={index % 2 === 0 ? '13%' : '86.8%'} y={`${33.4 + Math.floor(index / 2) * 21.7}%`}
          labelX={index % 2 === 0 ? '4%' : '95.5%'} />
      ))}
      <p className="lamp-load__caption">{configuration} connection · {powerOn ? (configuration === 'Star' ? 'Lower brightness' : 'Higher brightness') : 'Lamps off'}</p>
    </article>
  )
}
export default LampLoad
