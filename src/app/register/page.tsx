'use client'
import RegisterForm from '@/components/RegisterForm'
import Welcome from '@/components/Welcome'
import React from 'react'

function Register() {
  const [step, setStep] = React.useState(1)

  return (
    <div>
      {step === 1 ? (
        <Welcome nextStep={setStep} />
      ) : (
        <RegisterForm priviousStep={(s: number) => setStep(s)} />
      )}
    </div>
  )
}

export default Register
