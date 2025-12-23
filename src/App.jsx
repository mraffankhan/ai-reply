import { useState, useRef, useEffect } from 'react'
import { GoogleGenerativeAI } from '@google/generative-ai'

function App() {
  const [inputText, setInputText] = useState('')
  const [tone, setTone] = useState('Smart')
  const [language, setLanguage] = useState('English')
  const [isGenerating, setIsGenerating] = useState(false)
  const [reply, setReply] = useState('')
  const [copied, setCopied] = useState(false)

  const tones = ['Professional', 'Polite', 'Smart', 'Savage']
  const outputRef = useRef(null)

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  const handleGenerate = async () => {
    if (!inputText.trim()) return

    setIsGenerating(true)
    setReply('')

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) {
        setReply("Error: API Key missing. Please add VITE_GEMINI_API_KEY to your .env file.")
        setIsGenerating(false)
        return
      }

      const genAI = new GoogleGenerativeAI(apiKey)

      const prompt = `
        You are Reply AI, a helpful assistant.
        Task: Generate a ${tone} reply to the following message.
        Original Message: "${inputText}"
        Language: The reply must be in ${language === 'Hinglish' ? 'Hinglish (Mix of Hindi and English)' : 'English'}.
        Constraint: Keep it short, human-like, and relevant. Do not include quotes or "Here is a reply". Just the reply text.
      `

      // Recursive function to handle model fallback and retries
      const makeRequest = async (modelName, retries = 2) => {
        try {
          const currentModel = genAI.getGenerativeModel({ model: modelName })
          const result = await currentModel.generateContent(prompt)
          const response = await result.response
          return response.text()
        } catch (error) {
          console.warn(`Request failed for ${modelName}:`, error.message)

          const isQuotaError = error.message.includes("429")
          const isNotFoundError = error.message.includes("404")

          // Fallback Strategy: If 2.0-flash-exp fails (Quota or 404), switch to 1.5-flash
          if ((isQuotaError || isNotFoundError) && modelName === "gemini-2.0-flash-exp") {
            setReply("Experimental model overloaded. Switching to stable Gemini 1.5 Flash...")
            await delay(1500)
            return makeRequest("gemini-1.5-flash", 2) // Reset retries for new model
          }

          // Retry Strategy: If 1.5-flash fails with Quota, retry
          if (isQuotaError && retries > 0) {
            setReply(`High traffic, retrying in 3 seconds... (${retries} attempts left)`)
            await delay(3000)
            return makeRequest(modelName, retries - 1)
          }
          throw error
        }
      }

      // Start with the user's requested "2.5" (mapped to 2.0-flash-exp)
      const text = await makeRequest("gemini-2.0-flash-exp")
      setReply(text.trim())

    } catch (error) {
      console.error("Error generating reply:", error)
      let errorMessage = "Error: Failed to generate reply."

      if (error.message.includes("429")) {
        errorMessage = "Error: System currently overloaded (Rate Limit). Please try again later."
      } else if (error.message.includes("404")) {
        errorMessage = "Error: AI Model not available. Please check your API key permissions."
      } else {
        errorMessage = `Error: ${error.message}`
      }

      setReply(errorMessage)
    } finally {
      setIsGenerating(false)
      // Scroll to output
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }

  const handleCopy = () => {
    if (!reply) return
    navigator.clipboard.writeText(reply)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="app-container">
      <header className="header">
        <h1>Reply AI</h1>
        <div className="lang-toggle">
          <button
            className={language === 'English' ? 'active' : ''}
            onClick={() => setLanguage('English')}
          >Eng</button>
          <button
            className={language === 'Hinglish' ? 'active' : ''}
            onClick={() => setLanguage('Hinglish')}
          >Hin</button>
        </div>
      </header>

      <main className="main-content">
        {/* Input Area */}
        <div className="input-group">
          <textarea
            className="main-input glass"
            placeholder="Paste or type the message you want to reply to..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
        </div>

        {/* Tone Selector */}
        <div className="tone-selector">
          <p className="label">Select Tone</p>
          <div className="pills">
            {tones.map((t) => (
              <button
                key={t}
                className={`pill ${tone === t ? 'active' : ''} ${t.toLowerCase()}`}
                onClick={() => setTone(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <button
          className="generate-btn"
          disabled={!inputText.trim() || isGenerating}
          onClick={handleGenerate}
        >
          {isGenerating ? 'Generating...' : 'Generate Reply'}
        </button>

        {/* Output Area */}
        {(reply || isGenerating) && (
          <div className="output-area" ref={outputRef}>
            {isGenerating && !reply ? (
              <div className="skeleton-loader">
                <div className="line" style={{ width: '80%' }}></div>
                <div className="line" style={{ width: '60%' }}></div>
              </div>
            ) : (
              <div className="chat-bubble">
                <p>{reply}</p>
                <div className="actions">
                  <button className="action-btn" onClick={handleCopy}>
                    {copied ? 'Copied!' : 'Copy Reply'}
                  </button>
                  <button className="action-btn secondary" onClick={handleGenerate}>
                    Regenerate
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default App
