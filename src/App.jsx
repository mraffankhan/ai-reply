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

  const handleGenerate = async () => {
    if (!inputText.trim()) return

    setIsGenerating(true)
    setReply('')

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) {
        setReply("Error: API Key missing in .env")
        setIsGenerating(false)
        return
      }

      // STRICT RULE: Only use one model. No discovery. No probes.
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

      const prompt = `
        You are Reply AI, a helpful assistant.
        Task: Generate a ${tone} reply to the following message.
        Original Message: "${inputText}"
        Language: The reply must be in ${language === 'Hinglish' ? 'Hinglish' : 'English'}.
        Constraint: Keep it short, human-like, and relevant. Do not include quotes. Just the reply text.
      `

      // Simple request. No fallback.
      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      setReply(text.trim())

    } catch (error) {
      console.error("Generation error:", error)

      // STRICT RULE: Simple user-facing message for busy server.
      if (error.message.includes("429") || error.message.includes("503")) {
        setReply("Server is busy, please try again in a moment.")
      } else {
        setReply(`Error: ${error.message}`)
      }

    } finally {
      setIsGenerating(false)
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
        <div>
          <h1>AI REPLY - PROJECT 01</h1>
        </div>
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
