'use client'

import { useAuth } from '@/app/(frontend)/context/AuthProvider'
import { useEffect, useState } from 'react'
import { RequirePlanAccess } from '../../lib/RequirePlanAccess'
import { LiveAPIProvider } from '@/contexts/LiveAPIContext'
import { GeminiCallInterface } from './GeminiCallInterface'
import { AiAssistantHeader } from './AiAssistantHeader'

const AiAssistantPage = () => {
  // ✅ KEEP: All your commented call limit state (for future use)
  const [canMakeCall, setCanMakeCall] = useState(true) // Always allow calls for testing
  const [callLimitMessage, setCallLimitMessage] = useState('')

  const { user } = useAuth()

  // ✅ KEEP: All your commented call limit functions (for future use)
  /*
  const checkCallLimit = () => {
    if (!user) {
      setCanMakeCall(false)
      setCallLimitMessage('Please log in to use AI assistant')
      return false
    }

    const currentCalls = user.aiCallsUsed || 0
    const maxCalls = user.maxAiCalls || 1 // Default to 1 for free plan

    if (maxCalls === -1) {
      // Unlimited calls (for maxFlex)
      setCanMakeCall(true)
      setCallLimitMessage('')
      return true
    }

    if (currentCalls >= maxCalls) {
      setCanMakeCall(false)
      const remainingCalls = Math.max(0, maxCalls - currentCalls)
      setCallLimitMessage(
        `You've used ${currentCalls} of ${maxCalls} AI calls. ${
          remainingCalls === 0
            ? 'Please upgrade your plan to get more calls.'
            : `You have ${remainingCalls} calls remaining.`
        }`,
      )
      return false
    }

    setCanMakeCall(true)
    setCallLimitMessage('')
    return true
  }
  */

  // ✅ KEEP: Commented function to increment aiCallsUsed (for future use)
  /*
  const incrementAiCallsUsed = async () => {
    try {
      if (!user?.email) {
        console.error('No user email available to increment AI calls')
        return
      }

      const response = await fetch('/api/users/increment-ai-calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Failed to increment AI calls:', errorData)
      }
    } catch (error) {
      console.error('Error incrementing AI calls:', error)
    }
  }
  */

  // Silence known error
  useEffect(() => {
    const originalError = console.error
    console.error = function (msg, ...args) {
      if (
        msg?.includes?.('Meeting has ended') ||
        args[0]?.toString?.().includes?.('Meeting has ended')
      ) {
        return
      }
      return originalError.call(console, msg, ...args)
    }
    return () => {
      console.error = originalError
    }
  }, [])

  return (
    <RequirePlanAccess>
      <LiveAPIProvider apiKey={process.env.NEXT_PUBLIC_GEMINI_API_KEY!}>
        <div className="bg-hero-gradient min-h-screen relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(circle at 25% 25%, hsl(var(--color-maxfit-neon-green)) 0%, transparent 50%),
                               radial-gradient(circle at 75% 75%, hsl(var(--color-maxfit-neon-green)) 0%, transparent 50%)`,
              }}
            ></div>
          </div>

          <div className="relative container mx-auto px-4 py-12 max-w-6xl">
            <AiAssistantHeader />

            {/* ✅ KEEP: COMMENTED OUT CALL LIMIT MESSAGE (for future use) */}
            {/*
            {!canMakeCall && callLimitMessage && (
              <div className="flex justify-center mb-8">
                <div className="glass-card rounded-2xl p-6 max-w-2xl text-center">
                  <div className="mb-4">
                    <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">⚠️</span>
                    </div>
                    <h3 className="text-xl font-bold text-maxfit-white mb-2">Call Limit Reached</h3>
                    <p className="text-maxfit-medium-grey mb-4">{callLimitMessage}</p>
                    <Button onClick={() => router.push('/#pricing')} className="btn-neon">
                      Upgrade Plan
                    </Button>
                  </div>
                </div>
              </div>
            )}
            */}

            <GeminiCallInterface />
          </div>
        </div>
      </LiveAPIProvider>
    </RequirePlanAccess>
  )
}

export default AiAssistantPage
