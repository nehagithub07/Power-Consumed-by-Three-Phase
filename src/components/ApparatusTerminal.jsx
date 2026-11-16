import { TERMINAL_COLORS } from '../config/terminalColors.js'

const ApparatusTerminal = ({ number, owner, polarity, color = polarity === 'plus' ? 'red' : 'black', variant, x, y, labelX = x, labelY = y }) => {
  const terminalId = `${number}-endpoint`
  const palette = TERMINAL_COLORS[color]
  const colorStyle = {
    '--terminal-color': palette.fill,
    '--terminal-color-rgb': palette.rgb,
    '--terminal-color-dark': palette.dark,
    '--terminal-color-bright': palette.bright,
    '--terminal-label-color': palette.label,
  }
  return (
    <>
      <span className={`connection-terminal connection-terminal--apparatus connection-terminal--${variant} endpoint-${number}`}
        style={{ ...colorStyle, left: x, top: y }} data-polarity={polarity} data-terminal-color={color} data-terminal-id={terminalId}
        aria-label={`${owner} terminal ${number}`} />
      <span id={`label-${number}`} className="terminal-number-label"
        style={{ ...colorStyle, left: labelX, top: labelY }} data-terminal-color={color} data-terminal-id={terminalId}
        role="button" tabIndex={0} aria-label={`Remove wires at terminal ${number}`}>
        {number}
      </span>
    </>
  )
}
export default ApparatusTerminal
