'use client'

import { Button } from '@/app/(frontend)/components/ui/button'
import { useAuth } from '@/app/(frontend)/context/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useMemo } from 'react'
import { useLiveAPIContext } from '@/contexts/LiveAPIContext'
import LogoURL from '@/app/(frontend)/assets/maxfit.svg'
import Image from 'next/image'
import { AudioRecorder } from '@/lib/audio-recorder'
import { SchemaType } from '@google/generative-ai'

interface Message {
  content: string
  role: 'user' | 'assistant'
  isSystemMessage?: boolean
}

interface ConversationData {
  age: string
  weight: string
  height: string
  fitness_goal: string
  injuries: string
  fitness_level: string
  workout_days: string
  dietary_restrictions: string
}

export const GeminiCallInterface = () => {
  const { user } = useAuth()
  const router = useRouter()
  const messageContainerRef = useRef<HTMLDivElement>(null)
  const { client, connected, connect, disconnect, setConfig } = useLiveAPIContext()

  // Use AudioRecorder like the working integration
  const audioRecorder = useMemo(() => new AudioRecorder(16000), [])
  const [muted, setMuted] = useState(false)
  const [inVolume, setInVolume] = useState(0)

  // State management
  const [callActive, setCallActive] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [callEnded, setCallEnded] = useState(false)
  const [greeting, setGreeting] = useState('')
  const [isGeneratingProgram, setIsGeneratingProgram] = useState(false)

  // Configure Gemini with system instructions and tools (from your provided code)
  useEffect(() => {
    const userName = user?.firstName || 'there'

    setConfig({
      model: 'models/gemini-live-2.5-flash-preview',
      generationConfig: {
        responseModalities: 'audio',
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Puck',
            },
          },
        },
      },
      systemInstruction: {
        parts: [
          {
            text: `You are Johns, a supportive fitness trainer at MaxFIT. Your task is to gather the following information from ${userName} in a natural conversation:

- age (in years)
- weight (with units like kg/lbs)
- height (like 5'8" or 175cm)
- fitness_goal (what they want to achieve)
- injuries (any current injuries or limitations)
- fitness_level (beginner/intermediate/advanced)
- workout_days (how many days per week they can workout)
- dietary_restrictions (any allergies or dietary preferences)

Be conversational and encouraging. Ask follow-up questions naturally. 

CRITICAL: When you have collected enough information, you must use the generate_fitness_data function tool. Do NOT generate code or write Python. Use the tool directly by calling it with the collected parameters.

Example: If the user is 25 years old, weighs 70kg, etc., call generate_fitness_data with those exact parameters.`,
          },
        ],
      },

      tools: [
        {
          functionDeclarations: [
            {
              name: 'generate_fitness_data',
              description:
                'Call this function when you have collected enough user fitness information to generate their personalized plan',
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  age: {
                    type: SchemaType.STRING,
                    description: "User's age in years",
                  },
                  weight: {
                    type: SchemaType.STRING,
                    description: "User's weight with units",
                  },
                  height: {
                    type: SchemaType.STRING,
                    description: "User's height",
                  },
                  fitness_goal: {
                    type: SchemaType.STRING,
                    description: "User's fitness objectives",
                  },
                  injuries: {
                    type: SchemaType.STRING,
                    description: 'Any injuries or physical limitations',
                  },
                  fitness_level: {
                    type: SchemaType.STRING,
                    description: 'Current fitness level',
                  },
                  workout_days: {
                    type: SchemaType.STRING,
                    description: 'Available workout days per week',
                  },
                  dietary_restrictions: {
                    type: SchemaType.STRING,
                    description: 'Dietary restrictions or preferences',
                  },
                },
                required: ['age', 'weight', 'height', 'fitness_goal'],
              },
            },
          ],
        },
      ],
    })
  }, [setConfig, user])

  // Stream mic audio to Gemini when connected and not muted (keep existing working logic)
  useEffect(() => {
    const onData = (base64: string) => {
      const rate = Math.round(audioRecorder.sampleRate || 16000)
      client.sendRealtimeInput([
        {
          mimeType: `audio/pcm;rate=${rate}`,
          data: base64,
        },
      ])
    }

    if (connected && callActive && !muted) {
      audioRecorder.on('data', onData).on('volume', setInVolume)
      audioRecorder
        .start()
        .then(() => console.log('🎤 AudioRecorder started'))
        .catch((err) => console.error('❌ AudioRecorder start failed', err))
    } else {
      audioRecorder.stop()
    }

    return () => {
      audioRecorder.off('data', onData).off('volume', setInVolume)
    }
  }, [connected, callActive, muted, client, audioRecorder])

  // Generate fitness program via API (from your provided code)
  const generateFitnessProgram = async (extractedData: ConversationData) => {
    if (isGeneratingProgram) return

    console.log('🎯 Starting fitness program generation with:', extractedData)
    setIsGeneratingProgram(true)

    try {
      const response = await fetch('/api/generate-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
          email: user?.email,
          ...extractedData,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setMessages((prev) => [
          ...prev,
          {
            content:
              'Your personalized fitness plan has been generated successfully and is now available on your dashboard! You should also receive an email with your complete program PDF shortly.',
            role: 'assistant',
            isSystemMessage: true,
          },
        ])
        setTimeout(() => setCallEnded(true), 2000)
      } else {
        console.error('Failed to generate program:', result)
        setMessages((prev) => [
          ...prev,
          {
            content:
              'I apologize, but there was an issue generating your fitness plan. Please try again later or contact support if the problem persists.',
            role: 'assistant',
            isSystemMessage: true,
          },
        ])
      }
    } catch (error) {
      console.error('Error calling generate-program API:', error)
      setMessages((prev) => [
        ...prev,
        {
          content:
            'I encountered a technical issue while creating your plan. Please try again later.',
          role: 'assistant',
          isSystemMessage: true,
        },
      ])
    } finally {
      setIsGeneratingProgram(false)
    }
  }

  // Listen for Gemini responses with tool call handling (integrated approach)
  useEffect(() => {
    const handleContent = (content: any) => {
      console.log('📨 Received content:', content)

      // Handle AI spoken responses
      if (content.modelTurn?.parts) {
        const parts = content.modelTurn.parts

        // Handle regular text responses
        const spoken = parts.find((p: any) => p.text)?.text
        if (spoken) {
          console.log('🤖 AI Message:', spoken)
          setGreeting(spoken)
          setMessages((prev) => [...prev, { content: spoken, role: 'assistant' }])
        }

        // Handle executable code (extract tool call data)
        const executableCode = parts.find((p: any) => p.executableCode)
        if (executableCode) {
          console.log('🔧 Executable code detected:', executableCode.executableCode.code)

          // Parse the executable code to extract parameters
          const code = executableCode.executableCode.code

          // Extract parameters from the code string
          const paramMatch = code.match(/generate_fitness_data\((.*?)\)/)
          if (paramMatch) {
            try {
              // Parse the parameters from the function call
              const paramString = paramMatch[1]
              const params: any = {}

              // Extract each parameter
              const paramRegex = /(\w+)='([^']+)'/g
              let match
              while ((match = paramRegex.exec(paramString)) !== null) {
                params[match[1]] = match[2]
              }

              console.log('✅ Extracted parameters from code:', params)

              if (Object.keys(params).length > 0) {
                generateFitnessProgram(params)
              }
            } catch (error) {
              console.error('❌ Error parsing executable code parameters:', error)
            }
          }
        }
      }

      // Handle direct tool calls (fallback)
      if (content.toolCall) {
        const { name, parameters } = content.toolCall
        console.log('🔧 Direct tool call received:', { name, parameters })

        if (name === 'generate_fitness_data') {
          console.log('✅ Generating fitness program with data:', parameters)
          generateFitnessProgram(parameters)
        }
      }

      // Handle user messages
      if (content.userTurn?.parts) {
        const userMessage = content.userTurn.parts.find((p: any) => p.text)?.text
        if (userMessage) {
          console.log('👤 User Message:', userMessage)
          setMessages((prev) => [...prev, { content: userMessage, role: 'user' }])
        }
      }
    }

    const handleSetupComplete = () => {
      setCallActive(true)
      setConnecting(false)
      console.log('🔗 Gemini call setup complete')
    }

    const handleClose = () => {
      setCallActive(false)
      setConnecting(false)
      setIsSpeaking(false)
      setCallEnded(true)
      console.log('📞 Gemini call ended')
    }

    client.on('content', handleContent)
    client.on('setupcomplete', handleSetupComplete)
    client.on('close', handleClose)

    return () => {
      client.off('content', handleContent)
      client.off('setupcomplete', handleSetupComplete)
      client.off('close', handleClose)
    }
  }, [client])

  // Speaking indicator from AI audio stream (keep existing working logic)
  useEffect(() => {
    const handleAudio = (audioData: ArrayBuffer) => {
      if (audioData.byteLength > 0) {
        setIsSpeaking(true)
        setTimeout(() => setIsSpeaking(false), 800)
      }
    }
    client.on('audio', handleAudio)
    return () => {
      client.off('audio', handleAudio)
    }
  }, [client])

  // Auto-scroll messages (keep existing)
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight
    }
  }, [messages])

  // Redirect after call ends (keep existing)
  useEffect(() => {
    if (callEnded) {
      const redirectTimer = setTimeout(() => router.push('/dashboard'), 3000)
      return () => clearTimeout(redirectTimer)
    }
  }, [callEnded, router])

  // Handle call toggle (keep existing working logic)
  const toggleCall = async () => {
    if (callActive || connected) {
      try {
        await disconnect()
        setCallActive(false)
        setConnecting(false)
        setCallEnded(true)
      } catch (error) {
        console.error('❌ Failed to disconnect:', error)
      }
    } else {
      try {
        setConnecting(true)
        setMessages([])
        setCallEnded(false)
        setGreeting('')
        setIsGeneratingProgram(false)
        await connect()
      } catch (error) {
        console.error('❌ Failed to start Gemini call:', error)
        setConnecting(false)
      }
    }
  }

  const toggleMute = () => setMuted((m) => !m)

  // Helper functions for status display
  const getStatusText = () => {
    if (isGeneratingProgram) return '⚡ Generating Plan...'
    if (isSpeaking) return '🎤 Speaking...'
    if (callActive) return '👂 Listening...'
    if (callEnded) return '✅ Session Complete'
    return '⏳ Ready to Start'
  }

  const getStatusColor = () => {
    if (isGeneratingProgram) return 'bg-yellow-500/20 border-yellow-500/50'
    if (isSpeaking) return 'bg-maxfit-neon-green/20 border-maxfit-neon-green/50'
    if (callActive) return 'bg-blue-500/20 border-blue-500/50'
    if (callEnded) return 'bg-green-500/20 border-green-500/50'
    return 'bg-maxfit-darker-grey/50 border-maxfit-darker-grey'
  }

  const getStatusDot = () => {
    if (isGeneratingProgram) return 'bg-yellow-500'
    if (isSpeaking) return 'bg-maxfit-neon-green animate-pulse'
    if (callActive) return 'bg-blue-500 animate-pulse'
    if (callEnded) return 'bg-green-500'
    return 'bg-maxfit-medium-grey'
  }

  return (
    <>
      {/* DEBUG INFO */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 bg-black/80 text-white p-2 rounded text-xs z-50">
          Messages: {messages.length} | Call: {callActive ? 'Active' : 'Inactive'} | Speaking:{' '}
          {isSpeaking ? 'Yes' : 'No'} | Connected: {connected ? 'Yes' : 'No'} | Muted:{' '}
          {muted ? 'Yes' : 'No'} | Volume: {Math.round(inVolume * 100)}% | Generating:{' '}
          {isGeneratingProgram ? 'Yes' : 'No'}
        </div>
      )}

      {/* AI & USER CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* AI ASSISTANT CARD */}
        <div className="glass-card rounded-2xl p-8 hover-lift relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-maxfit-neon-green/5 to-transparent opacity-50"></div>

          <div className="relative flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div
                className={`absolute inset-0 rounded-full transition-all duration-500 ${
                  isSpeaking
                    ? 'bg-maxfit-neon-green/20 scale-125 animate-pulse'
                    : callActive
                      ? 'bg-maxfit-neon-green/10 scale-110'
                      : 'bg-maxfit-darker-grey/30'
                }`}
                style={{
                  boxShadow: isSpeaking ? 'var(--shadow-glow)' : 'none',
                }}
              ></div>

              <div className="relative w-32 h-32 rounded-full bg-card-gradient border-2 border-maxfit-neon-green/30 flex items-center justify-center overflow-hidden">
                <Image
                  src={LogoURL}
                  alt="MaxFit Logo"
                  width={120}
                  height={120}
                  className="rounded-full"
                />
              </div>

              {isSpeaking && (
                <div className="absolute inset-0 rounded-full border-2 border-maxfit-neon-green animate-ping"></div>
              )}
            </div>

            <h2 className="text-2xl font-bold text-maxfit-white mb-2">
              MaxFIT<span className="text-maxfit-neon-green">AI</span>
            </h2>
            <p className="text-maxfit-medium-grey mb-6">Your Personal Fitness & Diet Coach</p>

            <div
              className={`inline-flex items-center space-x-3 px-4 py-2 rounded-full transition-all duration-300 border ${getStatusColor()}`}
            >
              <div className={`w-3 h-3 rounded-full transition-all ${getStatusDot()}`}></div>
              <span className="text-sm font-medium text-maxfit-white">{getStatusText()}</span>
            </div>
          </div>
        </div>

        {/* USER CARD */}
        <div className="glass-card rounded-2xl p-8 hover-lift relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-50"></div>

          <div className="relative flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div
                className="w-32 h-32 rounded-full bg-card-gradient border-2 border-maxfit-medium-grey/30 flex items-center justify-center overflow-hidden"
                style={{
                  boxShadow:
                    inVolume > 0.1 ? `0 0 ${inVolume * 50}px rgba(34, 197, 94, 0.5)` : 'none',
                }}
              >
                <div className="w-20 h-20 bg-maxfit-neon-green/20 rounded-full flex items-center justify-center">
                  <span className="text-3xl font-bold text-maxfit-neon-green">
                    {user?.firstName?.charAt(0)?.toUpperCase() || '👤'}
                  </span>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-maxfit-white mb-2">You</h2>
            <p className="text-maxfit-medium-grey mb-6">
              {user ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Fitness Enthusiast'}
            </p>

            <div
              className={`inline-flex items-center space-x-3 px-4 py-2 rounded-full border ${
                muted
                  ? 'bg-red-500/20 border-red-500/50'
                  : 'bg-maxfit-darker-grey/50 border-maxfit-darker-grey'
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full ${muted ? 'bg-red-500' : 'bg-green-500'}`}
              ></div>
              <span className="text-sm font-medium text-maxfit-white">
                {muted ? '🔇 Muted' : '💪 Ready to Transform'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mic Control Button */}
      {callActive && (
        <div className="flex justify-center mb-8">
          <Button
            onClick={toggleMute}
            className={`px-6 py-3 rounded-full ${
              muted
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-maxfit-neon-green hover:bg-maxfit-neon-green/80 text-maxfit-black'
            }`}
          >
            {muted ? '🔇 Unmute' : '🎤 Mute'}
          </Button>
        </div>
      )}

      {/* CONVERSATION MESSAGES */}
      {(callActive || messages.length > 0) && (
        <div className="glass-card rounded-2xl p-6 mb-8 max-h-96 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-maxfit-white">Live Conversation</h3>
            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full ${callActive ? 'bg-maxfit-neon-green animate-pulse' : 'bg-gray-500'}`}
              ></div>
              <span className="text-xs text-maxfit-medium-grey">
                {callActive ? 'Live Session' : 'Session Ended'} ({messages.length} messages)
              </span>
            </div>
          </div>

          <div
            ref={messageContainerRef}
            className="space-y-4 overflow-y-auto pr-2 max-h-72"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'hsl(var(--color-maxfit-neon-green)) transparent',
            }}
          >
            {messages.length === 0 && callActive && (
              <div className="text-center py-8">
                <div className="text-maxfit-medium-grey text-sm">
                  Say Hello to start the conversation...
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-2xl ${
                    msg.role === 'assistant'
                      ? msg.isSystemMessage
                        ? 'bg-green-500/20 text-green-400 border-l-4 border-green-500'
                        : 'bg-maxfit-darker-grey/60 text-maxfit-white border-l-4 border-maxfit-neon-green'
                      : 'bg-accent-gradient text-maxfit-black'
                  }`}
                >
                  <div className="text-xs font-semibold mb-2 opacity-70">
                    {msg.role === 'assistant'
                      ? msg.isSystemMessage
                        ? '✅ System'
                        : '🤖 MaxFIT AI'
                      : '👤 You'}
                  </div>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}

            {isGeneratingProgram && (
              <div className="flex justify-center">
                <div className="bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 p-4 rounded-2xl text-center">
                  <div className="text-xs font-semibold mb-2">⚡ System</div>
                  <p className="text-sm">Generating your personalized fitness program...</p>
                  <div className="mt-2">
                    <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </div>
                </div>
              </div>
            )}

            {callEnded && (
              <div className="flex justify-center">
                <div className="bg-green-500/20 border border-green-500/30 text-green-400 p-4 rounded-2xl text-center">
                  <div className="text-xs font-semibold mb-2">✅ System</div>
                  <p className="text-sm">
                    Your fitness program has been created! Redirecting to your dashboard...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CALL ACTION BUTTON */}
      <div className="flex justify-center">
        <div className="relative">
          {(callActive || connecting) && (
            <div className="absolute inset-0 bg-maxfit-neon-green/20 rounded-full blur-xl animate-pulse"></div>
          )}

          <Button
            onClick={toggleCall}
            disabled={connecting || callEnded}
            className={`relative px-12 py-6 text-lg font-bold rounded-full transition-all duration-300 transform hover:scale-105 ${
              callActive
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30'
                : connecting
                  ? 'bg-yellow-600 text-maxfit-black cursor-not-allowed'
                  : callEnded
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'btn-neon'
            }`}
          >
            {connecting && (
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-maxfit-black border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            <span className={connecting ? 'ml-8' : ''}>
              {connecting
                ? 'Connecting...'
                : callActive
                  ? '🛑 End Call'
                  : callEnded
                    ? '📊 View Dashboard'
                    : '🎯 Start Your Journey'}
            </span>
          </Button>
        </div>
      </div>
    </>
  )
}
