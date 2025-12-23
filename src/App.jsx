import { useState, useRef, useEffect } from 'react'
import { GoogleGenerativeAI } from '@google/generative-ai'

function App() {
  const [inputText, setInputText] = useState('')
  const [tone, setTone] = useState('Smart')
  const [language, setLanguage] = useState('English')
  const [isGenerating, setIsGenerating] = useState(false)
  const [reply, setReply] = useState('')
  const [copied, setCopied] = useState(false)

  // New State for Model Discovery
  const [activeModel, setActiveModel] = useState(null)
  const [modelStatus, setModelStatus] = useState('Checking compatible models...')

  const tones = ['Professional', 'Polite', 'Smart', 'Savage']
  const outputRef = useRef(null)

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  // Auto-Discovery on Mount
  useEffect(() => {
    checkModels()
  }, [])

  const checkModels = async () => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) {
      setModelStatus('API Key missing in .env')
      return
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    // List of models to probe (in priority order)
    const modelsToCheck = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash-exp", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"]

    for (const modelName of modelsToCheck) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        // Try a dummy generation (minimal token usage) to verify access
        // We use a very short prompt "Hi"
        const result = await model.generateContent("Hi")
        await result.response

        // If we reach here, the model works!
        setActiveModel(modelName)
        setModelStatus(`Connected to: ${modelName}`)
        return
      } catch (e) {
        // Log locally, but continue checking
        console.warn(`${modelName} check failed:`, e.message)
      }
    }
    setModelStatus('No compatible models found. Check API Key quota.')
  }

  const handleGenerate = async () => {
    if (!inputText.trim()) return

    // Pre-flight check
    if (!activeModel) {
      setReply("Error: Still checking for models or no working model found. Please wait a moment or check your key.")
      // Try discovering again if user clicks generate
      checkModels()
      return
    }

    setIsGenerating(true)
    setReply('')

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: activeModel })

      const prompt = `
        You are Reply AI, a helpful assistant.
        Task: Generate a ${tone} reply to the following message.
        Original Message: "${inputText}"
        Language: The reply must be in ${language === 'Hinglish' ? 'Hinglish (Mix of Hindi and English)' : 'English'}.
        Constraint: Keep it short, human-like, and relevant. Do not include quotes or "Here is a reply". Just the reply text.
      `

      // Retry logic for the ACTIVE model (in case of transient 429 during usage)
      const makeRequest = async (retries = 2) => {
        try {
          const result = await model.generateContent(prompt)
          const response = await result.response
          return response.text()
        } catch (error) {
          if (error.message.includes("429") && retries > 0) {
            setReply(`High traffic on ${activeModel}, retrying... (${retries})`)
            await delay(3000)
            return makeRequest(retries - 1)
          }
          throw error
        }
      }

      const text = await makeRequest()
      setReply(text.trim())

    } catch (error) {
      console.error("Error generating reply:", error)
      setReply(`Error: ${error.message}`)
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
          <h1>Reply AI</h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 500, marginTop: '-2px', opacity: 0.8 }}>
            {modelStatus}
          </p>
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
