export const AiAssistantHeader = () => {
  return (
    <div className="text-center mb-12">
      <div className="inline-flex items-center space-x-2 bg-maxfit-darker-grey/60 backdrop-blur-sm border border-maxfit-neon-green/20 rounded-full px-6 py-2 mb-6">
        <div className="w-2 h-2 bg-maxfit-neon-green rounded-full animate-pulse"></div>
        <span className="text-maxfit-neon-green text-sm font-medium">AI-Powered Fitness Coach</span>
      </div>

      <h1 className="text-5xl font-bold mb-4">
        <span className="text-maxfit-white">Generate Your </span>
        <span className="text-glow bg-accent-gradient bg-clip-text text-transparent">
          Fitness Program
        </span>
      </h1>

      <p className="text-maxfit-medium-grey text-lg max-w-2xl mx-auto leading-relaxed">
        Have a voice conversation with our AI assistant to create your personalized workout and
        nutrition plan
      </p>
    </div>
  )
}
