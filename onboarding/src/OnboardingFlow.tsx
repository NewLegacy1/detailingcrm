import { useState, useMemo } from 'react'
import type { OnboardingData } from './types'
import type { OnboardingVariant } from './SplitLayout'
import { SplitLayout } from './SplitLayout'
import { StepProgress } from './StepProgress'
import { BenefitsList } from './BenefitsList'
import { StepWelcome } from './steps/StepWelcome'
import { StepBusinessBasics } from './steps/StepBusinessBasics'
import { StepOperatingDetails } from './steps/StepOperatingDetails'
import { StepBookingCustomization } from './steps/StepBookingCustomization'
import { StepIntegrations } from './steps/StepIntegrations'
import { StepCustomerImport } from './steps/StepCustomerImport'
import { StepCompletion } from './steps/StepCompletion'
import './OnboardingFlow.css'

const STEPS = [
  'Welcome',
  'Business',
  'Services',
  'Booking',
  'Integrations',
  'Import',
  'Complete',
] as const

/** Default redirect when not passed via props or window.__CRM_REDIRECT_URL__ */
export const DEFAULT_CRM_REDIRECT_URL = '/dashboard'

function getDefaultRedirectUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_CRM_REDIRECT_URL
  const w = window as unknown as { __CRM_REDIRECT_URL__?: string }
  return w.__CRM_REDIRECT_URL__ ?? DEFAULT_CRM_REDIRECT_URL
}

const getInitialData = (userName?: string): OnboardingData => ({
  businessName: '',
  logoFile: null,
  brandColor: '',
  services: [],
  operatingHours: '',
  bookingPreviewAccepted: false,
  stripeConnected: false,
  googleCalendarConnected: false,
  importCustomers: null,
  importFile: null,
  userName: userName ?? 'Nathan',
})

function getVariant(): OnboardingVariant {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const v = params.get('variant')?.toLowerCase()
  if (v === 'b' || v === 'c') return v
  return 'a'
}

const STEP_LEFT_CONFIG: Record<
  number,
  { headline?: string; subline?: string; leftContent?: React.ReactNode }
> = {
  0: {
    headline: "Welcome, Nathan! Let's set up your detailing business.",
    subline: undefined,
    leftContent: <BenefitsList />,
  },
  1: {
    headline: 'See your brand come to life instantly',
    subline: 'Your booking page will use your name, logo, and colors.',
  },
  2: {
    headline: 'Operating details',
    subline: 'Choose the services you offer. You can edit times and prices anytime.',
  },
  3: {
    headline: 'Your clients will book here!',
    subline: 'This preview updates as you customize.',
  },
  4: {
    headline: 'Secure payments, no manual checks needed',
    subline: 'Connect Stripe and Google Calendar to get paid and stay organized.',
  },
  5: {
    headline: 'Bring your client list',
    subline: 'Optional. Upload a CSV or add customers later.',
  },
  6: {
    headline: "You're all set",
    subline: 'Your booking page is live. Share it and start taking bookings.',
  },
}

export interface OnboardingFlowProps {
  /** Where to send the user after they finish (e.g. /dashboard or your CRM app URL). */
  redirectUrl?: string
  /** Pre-fill the welcome step with the user's name. */
  userName?: string
  /** Called when user clicks "View & share booking page". Return a Promise to delay redirect (e.g. save to your API). */
  onComplete?: (data: OnboardingData) => void | Promise<void>
}

export function OnboardingFlow({ redirectUrl, userName: initialUserName, onComplete: onCompleteCallback }: OnboardingFlowProps = {}) {
  const variant = useMemo(getVariant, [])
  const [stepIndex, setStepIndex] = useState(0)
  const [data, setData] = useState<OnboardingData>(() => getInitialData(initialUserName))

  const stepId = STEPS[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === STEPS.length - 1
  const progressPercent = ((stepIndex + 1) / STEPS.length) * 100
  const leftConfig = STEP_LEFT_CONFIG[stepIndex] ?? {}
  const leftHeadline =
    stepIndex === 0
      ? `Welcome, ${data.userName}! Let's set up your detailing business.`
      : leftConfig.headline

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }

  const next = () => {
    if (!isLast) setStepIndex((i) => i + 1)
  }

  const back = () => {
    if (!isFirst) setStepIndex((i) => i - 1)
  }

  const onComplete = async () => {
    if (onCompleteCallback) {
      await Promise.resolve(onCompleteCallback(data))
    }
    const url = redirectUrl ?? getDefaultRedirectUrl()
    window.location.href = url
  }

  const rightContent = (
    <>
      <StepProgress steps={STEPS} currentIndex={stepIndex} />
      {stepId === 'Welcome' && (
        <StepWelcome userName={data.userName} onNext={next} />
      )}
      {stepId === 'Business' && (
        <StepBusinessBasics data={data} updateData={updateData} onNext={next} onBack={back} />
      )}
      {stepId === 'Services' && (
        <StepOperatingDetails data={data} updateData={updateData} onNext={next} onBack={back} />
      )}
      {stepId === 'Booking' && (
        <StepBookingCustomization data={data} updateData={updateData} onNext={next} onBack={back} />
      )}
      {stepId === 'Integrations' && (
        <StepIntegrations variant={variant} data={data} updateData={updateData} onNext={next} onBack={back} />
      )}
      {stepId === 'Import' && (
        <StepCustomerImport data={data} updateData={updateData} onNext={next} onBack={back} />
      )}
      {stepId === 'Complete' && (
        <StepCompletion data={data} onFinish={onComplete} />
      )}
    </>
  )

  return (
    <SplitLayout
      variant={variant}
      leftContent={leftConfig.leftContent}
      rightContent={rightContent}
      progressPercent={progressPercent}
      stepLabel={stepId}
      leftHeadline={leftHeadline}
      leftSubline={leftConfig.subline}
    />
  )
}
