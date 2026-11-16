const renderSymbols = (text) => text.split(/\b(VL|IL|W1|W2)\b/g).map((part, index) => (
  /^(VL|IL|W1|W2)$/.test(part)
    ? <span key={index}>{part[0]}<sub>{part[1]}</sub></span>
    : part
))

const FormattedWalkthroughText = ({ children }) => String(children).split(/(\*\*.*?\*\*)/g).map((part, index) => (
  part.startsWith('**') && part.endsWith('**')
    ? <strong key={index}>{renderSymbols(part.slice(2, -2))}</strong>
    : <span key={index}>{renderSymbols(part)}</span>
))

export default FormattedWalkthroughText
