import { useEffect, useRef, useState } from 'react'
import { CONNECTIONS } from '../utils/threePhaseExperiment.js'
import SectionCard from './SectionCard.jsx'
import guideConfig from '../aiGuide/aiGuideConfig.json'
import FormattedWalkthroughText from '../walkthrough/components/FormattedWalkthroughText.jsx'
import {
  AddIcon,
  AiGuide,
  AutoConnectIcon,
  ButtonIcon,
  CheckIcon,
  CloseIcon,
  PrintIcon,
  ResetIcon,
} from './Icons.jsx'

const buttons = [
  {
    id: 'instruction-button',
    label: 'INSTRUCTIONS',
    tone: 'action-button--gold',
    Icon: ButtonIcon,
    opensInstructions: true,
  },
  {
    id: 'ai-guide-button',
    label: 'AI GUIDE',
    tone: 'action-button--cyan',
    Icon: AiGuide,
    handlerName: 'onAiGuide',
  },
  {
    id: 'check-button',
    label: 'CHECK',
    tone: 'action-button--green',
    Icon: CheckIcon,
    handlerName: 'onCheck',
  },
  {
    id: 'auto-connect-button',
    label: 'AUTO CONNECT',
    tone: 'action-button--teal',
    Icon: AutoConnectIcon,
    handlerName: 'onAutoConnect',
  },
  {
    id: 'add-reading-button',
    label: 'ADD',
    tone: 'action-button--blue',
    Icon: AddIcon,
    handlerName: 'onAdd',
  },
  {
    id: 'reset-button',
    label: 'RESET',
    tone: 'action-button--red',
    Icon: ResetIcon,
    handlerName: 'onReset',
  },
  {
    id: 'print-button',
    label: 'PRINT',
    tone: 'action-button--purple',
    Icon: PrintIcon,
    handlerName: 'onPrint',
  },
  
 
]

const getInstructionSteps = configuration => [
  { id: 'ai-guide', title: 'AI Guide', content: guideConfig.description },
  ...guideConfig.steps.flatMap(step => {
    const item = { ...step }
    if (step.id === 'connections') {
      return [
        { ...item, groups: CONNECTIONS[configuration].map(([first, second], index) => ({
          id: `connection-${first}-${second}`, label: `Connection ${index + 1}`,
          pairs: [`${first}-${second}`],
        })) },
        { id: 'note', title: 'NOTE', content: guideConfig.note },
      ]
    }
    if (step.id === 'repeat') {
      return [item, { id: 'brightness', title: 'OBSERVE', content: guideConfig.observe }]
    }
    return [item]
  }),
]

const ActionButtons = ({
  configuration,
  activeConnectionPair,
  activeButtons = {},
  activeInstructionStepId = 'connections',
  disabledButtons = {},
  onAdd,
  onAiGuide,
  onCheck,
  onPrint,
  onReset,
  onAutoConnect,
}) => {
  const instructionSteps = getInstructionSteps(configuration)
  const [instructionsOpen, setInstructionsOpen] = useState(false)
  const activeInstructionRef = useRef(null)
  const handlers = {
    onAdd,
    onCheck,
    onPrint,
    onReset,
    onAutoConnect,
    onAiGuide,
  }

  useEffect(() => {
    if (!instructionsOpen || !activeInstructionRef.current) {
      return
    }

    activeInstructionRef.current.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth',
    })
  }, [activeConnectionPair, activeInstructionStepId, instructionsOpen])

  return (
    <SectionCard className="action-buttons-card h-[204px]" icon="buttons" id="action-buttons-panel" title="ACTION BUTTONS">
      <div className="action-buttons__grid">
        {buttons.map(({ id, label, tone, Icon, handlerName, opensInstructions }) => {
          const handler = handlers[handlerName]
          const isActive = !opensInstructions && Boolean(activeButtons[handlerName])
          const isDisabled = !opensInstructions && (!handler || disabledButtons[handlerName])
          const buttonProps = opensInstructions
            ? {
                'aria-controls': 'experiment-instructions-panel',
                'aria-expanded': instructionsOpen,
                onClick: () => {
                  setInstructionsOpen(!instructionsOpen)
                },
              }
            : {
                'aria-pressed': handlerName === 'onAiGuide' ? isActive : undefined,
                onClick: handler,
              }

          return (
            <button
              id={id}
              key={label}
              type="button"
              className={`action-button ${tone} ${isActive ? 'action-button--active' : ''}`}
              disabled={isDisabled}
              {...buttonProps}
            >
              <Icon />
              <span>{label}</span>
            </button>
          )
        })}
      </div>

      {instructionsOpen ? (
        <div
          className="action-instructions-panel"
          id="experiment-instructions-panel"
          role="region"
          aria-labelledby="experiment-instructions-title"
        >
          <div className="action-instructions-panel__header">
            <h3 id="experiment-instructions-title">Instructions</h3>
            <button
              type="button"
              className="action-instructions-panel__close"
              aria-label="Close instructions"
              onClick={() => setInstructionsOpen(false)}
            >
              <CloseIcon />
            </button>
          </div>

          <div className="action-instructions-panel__body">
            <ol className="action-instructions-panel__steps">
              {instructionSteps.map((step) => {
                const isActiveStep = step.id === activeInstructionStepId
                const hasActiveSubstep = Boolean(
                  step.groups?.some((group) => (
                    isActiveStep
                    && group.pairs.includes(activeConnectionPair)
                  )),
                )

                return (
                  <li
                    aria-current={isActiveStep ? 'step' : undefined}
                    className={`action-instructions-panel__step ${isActiveStep && !hasActiveSubstep ? 'action-instructions-panel__step--active' : ''}`}
                    key={step.id}
                    ref={isActiveStep && !hasActiveSubstep ? activeInstructionRef : undefined}
                  >
                    <strong>{step.title}</strong> <FormattedWalkthroughText>{step.content}</FormattedWalkthroughText>
                    {step.groups ? (
                      <ul className="action-instructions-panel__substeps">
                        {step.groups.map((group) => {
                          const isActiveSubstep = (
                            isActiveStep
                            && group.pairs.includes(activeConnectionPair)
                          )

                          return (
                            <li
                              aria-current={isActiveSubstep ? 'step' : undefined}
                              className={`action-instructions-panel__substep ${isActiveSubstep ? 'action-instructions-panel__substep--active' : ''}`}
                              key={group.id}
                              ref={isActiveSubstep ? activeInstructionRef : undefined}
                            >
                              <strong>{group.label}</strong>{' '}
                              <code>({group.pairs.join(', ')})</code>
                            </li>
                          )
                        })}
                      </ul>
                    ) : null}
                  </li>
                )
              })}
             
            </ol>
          </div>
        </div>
      ) : null}
    </SectionCard>
  )
}

export default ActionButtons
