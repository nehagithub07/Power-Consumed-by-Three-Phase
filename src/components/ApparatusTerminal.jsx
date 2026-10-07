const ApparatusTerminal = ({ number, owner, polarity, variant, x, y, labelX = x, labelY = y }) => {
  const terminalId = `${number}-endpoint`
  return (
    <>
      <span className={`connection-terminal connection-terminal--apparatus connection-terminal--${variant} endpoint-${number}`}
        style={{ left: x, top: y }} data-polarity={polarity} data-terminal-id={terminalId}
        aria-label={`${owner} terminal ${number}`} />
      <span id={`label-${number}`} className="terminal-number-label"
        style={{ left: labelX, top: labelY }} data-terminal-id={terminalId}
        role="button" tabIndex={0} aria-label={`Remove wires at terminal ${number}`}>
        {number}
      </span>
    </>
  )
}
export default ApparatusTerminal
