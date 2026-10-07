import mcbOffImg from '../assets/PowerSupply_Off.png'
import mcbOnImg from '../assets/PowerSupply_ON.png'
import ApparatusTerminal from './ApparatusTerminal.jsx'

const PowerSupply = ({ onTogglePower, powerOn }) => (
  <article className="mcb-device" id="power-supply" aria-label="Three-phase MCB">
    <img alt={powerOn ? 'MCB on' : 'MCB off'} className="mcb-device__image" src={powerOn ? mcbOnImg : mcbOffImg} />
    <div className="mcb-device__terminal-strip">
      {[1, 2, 3].map((number) => (
        <ApparatusTerminal key={number} number={number} owner="MCB" polarity={number === 1 ? 'plus' : 'minus'}
          variant="mcb" x={`${20 + (number - 1) * 30}%`} y="45%" labelY="92%" />
      ))}
    </div>
    <button id="power-toggle-button" aria-label={`Switch MCB ${powerOn ? 'off' : 'on'}`}
      aria-pressed={powerOn} className="mcb-device__button" onClick={onTogglePower} type="button" />
    <span className="mcb-device__state">{powerOn ? 'ON' : 'OFF'} · 3 PHASE</span>
  </article>
)
export default PowerSupply
