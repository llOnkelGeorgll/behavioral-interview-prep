import { useState, useMemo, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';
import ReactMarkdown from 'react-markdown';
import { Search, FileText, Settings, Send, Play, RefreshCw, Sparkles, X, HelpCircle, Briefcase, Mic, MicOff } from 'lucide-react';
import storiesData from './data/stories.json';
import companiesData from './data/companies.json';
import './index.css';

// Fallback company data if companies.json is empty
const defaultCompanies = [
  {
    id: 'amazon',
    name: 'Amazon',
    values: [
      { id: 'customer_obsession', title: 'Customer Obsession', description: 'Leaders start with the customer and work backwards. They work vigorously to earn and keep customer trust.' },
      { id: 'ownership', title: 'Ownership', description: 'Leaders are owners. They think long term and don\'t sacrifice long-term value for short-term results.' },
      { id: 'bias_for_action', title: 'Bias for Action', description: 'Speed matters in business. Many decisions and actions are reversible and do not need extensive study.' },
      { id: 'deliver_results', title: 'Deliver Results', description: 'Leaders focus on the key inputs for their businesses and deliver them with the right quality and in a timely fashion.' }
    ]
  }
];

// Helper to convert audio blob to base64
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
};

function App() {
  const [activeTab, setActiveTab] = useState('stories'); // 'stories' | 'practice'
  
  // 1. Stories Search Tab State
  const [query, setQuery] = useState('');
  const [selectedStory, setSelectedStory] = useState(null);

  // 2. Practice Tab State
  const [companies, setCompanies] = useState(() => {
    return companiesData && companiesData.length > 0 ? companiesData : defaultCompanies;
  });
  const [selectedCompanyId, setSelectedCompanyId] = useState('amazon');
  const [isTrainingMode, setIsTrainingMode] = useState(true);
  const [interviewActive, setInterviewActive] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  // API Key State
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('gemini_model') || 'gemini-1.5-flash');
  const [showSettings, setShowSettings] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // New Company Research State
  const [showResearchModal, setShowResearchModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [researchStatus, setResearchStatus] = useState(''); // '', 'submitting', 'running', 'success', 'error'
  const [researchError, setResearchError] = useState('');
  const [researchLogs, setResearchLogs] = useState('');
  const [researchCompanyName, setResearchCompanyName] = useState('');
  const pollingIntervalRef = useRef(null);

  const chatEndRef = useRef(null);
  const logEndRef = useRef(null);

  const selectedCompany = useMemo(() => {
    return companies.find(c => c.id === selectedCompanyId) || companies[0];
  }, [companies, selectedCompanyId]);

  // Initialize Fuse for fuzzy searching of stories
  const fuse = useMemo(() => new Fuse(storiesData, {
    keys: ['title', 'content'],
    threshold: 0.4,
    ignoreLocation: true
  }), []);

  // Filter stories based on search query
  const filteredStories = useMemo(() => {
    if (!query) return storiesData;
    return fuse.search(query).map(result => result.item);
  }, [query, fuse]);

  // Select first story by default
  useEffect(() => {
    if (filteredStories.length > 0 && !selectedStory && !query) {
      setSelectedStory(filteredStories[0]);
    }
  }, [filteredStories, selectedStory, query]);

  // Fetch initial config and companies
  useEffect(() => {
    const initApp = async () => {
      try {
        // Load API config
        const response = await fetch('/api/config');
        if (response.ok) {
          const data = await response.json();
          if (data.apiKey) {
            setApiKey(data.apiKey);
            localStorage.setItem('gemini_api_key', data.apiKey);
          }
          if (data.model) {
            setSelectedModel(data.model);
            localStorage.setItem('gemini_model', data.model);
          }
        }

        // Load active companies list
        const compResponse = await fetch('/api/companies');
        if (compResponse.ok) {
          const compData = await compResponse.json();
          if (compData && compData.length > 0) {
            setCompanies(compData);
          }
        }
      } catch (err) {
        console.error("Initialization error:", err);
      }
    };
    initApp();
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Scroll to bottom of research log console
  useEffect(() => {
    if (researchStatus === 'running' || researchStatus === 'success') {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [researchLogs, researchStatus]);

  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Save API Key
  const handleSaveApiKey = async (key, modelVal = selectedModel) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
    setShowSettings(false);
    setIsDemoMode(false);

    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ apiKey: key, model: modelVal })
      });
    } catch (e) {
      console.error("Failed to save project config file:", e);
    }
  };

  // Demo Mode scripted interview flow
  const demoQuestionIndexRef = useRef(0);
  const demoQuestions = [
    "Tell me about a time you had to negotiate a complex agreement that balanced customer needs with your company's financial health.",
    "Describe a situation where you made a mistake or a decision that negatively impacted the business, and how you handled it.",
    "Tell me about a time you had to learn a completely new skill or technology on the fly to get a project done."
  ];

  // Start Mock Interview
  const startInterview = () => {
    setInterviewActive(true);
    demoQuestionIndexRef.current = 0;
    
    const firstQuestion = isDemoMode || !apiKey
      ? `Hello! I'm a hiring manager conducting your mock interview for ${selectedCompany.name}. Let's begin. ${demoQuestions[0]}`
      : `Hello! I'm a hiring manager conducting your mock interview for ${selectedCompany.name}. I will evaluate you based on our principles. Let's begin. What is a key project you led where you had to drive significant results under tight constraints?`;

    setMessages([
      {
        sender: 'system',
        text: `Starting Mock Interview for ${selectedCompany.name} in ${isTrainingMode ? 'Training Mode (with inline feedback)' : 'Serious Mode (PASS/FAIL at the end)'}.`
      },
      {
        sender: 'interviewer',
        text: firstQuestion
      }
    ]);
  };

  // Reset Mock Interview
  const resetInterview = () => {
    setInterviewActive(false);
    setMessages([]);
    demoQuestionIndexRef.current = 0;
    if (isRecording) {
      stopRecording();
    }
  };

  // Trigger New Company Research and poll progress stdout
  const handleResearchCompany = async (e) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;

    const targetCompany = newCompanyName.trim();
    setResearchStatus('submitting');
    setResearchError('');
    setResearchLogs('');
    setResearchCompanyName(targetCompany);

    try {
      const response = await fetch('/api/research-company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ company: targetCompany }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResearchStatus('running');
        setNewCompanyName('');
        
        // Start polling for stdout logs
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        
        pollingIntervalRef.current = setInterval(async () => {
          try {
            const statusRes = await fetch('/api/research-status');
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              setResearchLogs(statusData.logs || '');
              
              if (statusData.status === 'success') {
                clearInterval(pollingIntervalRef.current);
                setResearchStatus('success');
                
                // Fetch the updated list of companies
                const compRes = await fetch('/api/companies');
                if (compRes.ok) {
                  const compData = await compRes.json();
                  if (compData && compData.length > 0) {
                    setCompanies(compData);
                    
                    // Select the newly researched company automatically
                    const newId = targetCompany.toLowerCase().replace(/\s+/g, '_');
                    const exists = compData.find(c => c.id === newId);
                    if (exists) {
                      setSelectedCompanyId(newId);
                      resetInterview();
                    }
                  }
                }
              } else if (statusData.status === 'error') {
                clearInterval(pollingIntervalRef.current);
                setResearchStatus('error');
                setResearchError(statusData.error || 'Failed to complete research.');
              }
            }
          } catch (pollErr) {
            console.error("Error polling research progress:", pollErr);
          }
        }, 1000);

      } else {
        throw new Error(data.error || 'Failed to trigger agent.');
      }
    } catch (err) {
      setResearchStatus('error');
      setResearchError(err.message || 'Server error. Please verify the backend is running.');
    }
  };

  const handleCloseResearchModal = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    setShowResearchModal(false);
    setResearchStatus('');
    setResearchLogs('');
  };

  // Audio Recording Controls
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let options = {};
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        options.mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options.mimeType = 'audio/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Convert to Base64
        const base64Data = await blobToBase64(audioBlob);

        // Process audio response
        handleAudioMessage(audioBlob, audioUrl, base64Data);

        // Stop micro tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check browser permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  };

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Call Gemini API
  const queryGemini = async (chatHistory) => {
    const systemPrompt = isTrainingMode
      ? `You are an experienced, friendly hiring manager at ${selectedCompany.name} conducting a mock behavioral interview. 
The company's core values and principles are:
${selectedCompany.values.map(v => `- ${v.title}: ${v.description}`).join('\n')}

Instructions:
1. Act as an encouraging mentor.
2. Ask one behavioral question at a time.
3. Once the user answers, provide direct, constructive feedback. Evaluate if they covered the STAR-L components (Situation, Task, Action, Result, Lesson Learned) and how well they aligned with ${selectedCompany.name}'s values. Tell them exactly how to refine it (e.g. adding specific metrics).
4. After providing feedback, ask a follow-up question or transition to the next behavioral question.
5. Keep your tone helpful and conversational.`
      : `You are a strict, professional hiring manager at ${selectedCompany.name} conducting a formal behavioral interview.
The company's core values and principles are:
${selectedCompany.values.map(v => `- ${v.title}: ${v.description}`).join('\n')}

Instructions:
1. Conduct a formal interview. Ask exactly 3 questions, one at a time.
2. Do NOT give any feedback, evaluations, or ratings after each answer. Just say "Thank you. Let's move to the next question." and ask the next question.
3. Once the user answers the 3rd question, conclude the interview.
4. Provide a thorough, critical final evaluation at the end:
   - State whether the candidate would PASS or FAIL the interview based on ${selectedCompany.name}'s high standards.
   - Explain why the pass/fail decision was made, breaking down their performance for each answer.
   - Give constructive advice on how they could improve.`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

    // Format messages for Gemini API roles ('user' or 'model')
    const contents = chatHistory
      .filter(msg => msg.sender === 'interviewer' || msg.sender === 'user')
      .map(msg => {
        const parts = [];
        
        if (msg.audioData) {
          // If there is audio content, send the audio data
          parts.push({
            inlineData: {
              mimeType: msg.audioData.mimeType,
              data: msg.audioData.data
            }
          });
        }
        
        // Add the text part
        parts.push({ text: msg.text || "Listen to this audio response." });

        return {
          role: msg.sender === 'user' ? 'user' : 'model',
          parts
        };
      });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1200
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Error communicating with Gemini');
    }

    const resJson = await response.json();
    return resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
  };

  // Handle Voice Audio Message
  const handleAudioMessage = async (blob, audioUrl, base64Data) => {
    const audioMsg = {
      sender: 'user',
      text: '🎙️ Voice Message',
      audioUrl,
      audioData: {
        mimeType: blob.type || 'audio/webm',
        data: base64Data
      }
    };

    const updatedMessages = [...messages, audioMsg];
    setMessages(updatedMessages);
    setIsTyping(true);

    // Check if we are using Demo Mode (offline mock)
    if (isDemoMode || !apiKey) {
      setTimeout(() => {
        setIsTyping(false);
        const qIndex = demoQuestionIndexRef.current + 1;
        demoQuestionIndexRef.current = qIndex;

        if (isTrainingMode) {
          if (qIndex === 1) {
            setMessages(prev => [
              ...prev,
              {
                sender: 'interviewer',
                text: `**Feedback:** That's a great example! You set up the Situation and Task perfectly. However, the Actions section felt a bit brief—what exactly was your role in analyzing the BOM costs? Also, remember to state the Results with numbers. \n\n**Next Question:** ${demoQuestions[1]}`
              }
            ]);
          } else if (qIndex === 2) {
            setMessages(prev => [
              ...prev,
              {
                sender: 'interviewer',
                text: `**Feedback:** Good ownership here! Admitting a mistake and showing how you fixed it structurally is exactly what we look for under "Insist on High Standards". Next time, explain what the long-term margin savings were. \n\n**Next Question:** ${demoQuestions[2]}`
              }
            ]);
          } else {
            setMessages(prev => [
              ...prev,
              {
                sender: 'interviewer',
                text: `**Feedback:** Excellent transition from IT to engineering and leadership! This displays strong "Learn and Be Curious" values. \n\n**Mock Interview Completed!** You did great. Enter another company or reset to start again.`
              }
            ]);
          }
        } else {
          if (qIndex < demoQuestions.length) {
            setMessages(prev => [
              ...prev,
              {
                sender: 'interviewer',
                text: `Thank you. Let's move to the next question. \n\n${demoQuestions[qIndex]}`
              }
            ]);
          } else {
            setMessages(prev => [
              ...prev,
              {
                sender: 'interviewer',
                text: `Thank you. This concludes the mock interview. Let me evaluate your performance...\n\n---\n\n### 🏁 FINAL EVALUATION: **PASS**\n\n**Why you passed:**\n* **Structure:** Your stories consistently follow the STAR-L model, helping to keep your answers cohesive.\n* **Values Alignment:** You demonstrated high Ownership (by fixing margin structures in the failure story) and Customer Obsession (by adjusting payment structures to enable client scaling).\n* **Metrics:** Quantifying the savings and contract lengths helps validate the results.\n\n**Areas to Improve:**\n* In the negotiation story, explain *how* you influenced the CEO and VP. Adding more focus on your personal negotiation techniques will strengthen your leadership indicators.`
              }
            ]);
          }
        }
      }, 1500);
      return;
    }

    // Call actual Gemini API with audio
    try {
      const responseText = await queryGemini(updatedMessages);
      setIsTyping(false);
      setMessages(prev => [...prev, { sender: 'interviewer', text: responseText }]);
    } catch (err) {
      setIsTyping(false);
      setMessages(prev => [
        ...prev,
        {
          sender: 'system',
          text: `Error calling API: ${err.message}. Switching to local Demo Mode simulation...`
        }
      ]);
      setIsDemoMode(true);
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          {
            sender: 'interviewer',
            text: `[Demo Mode Activated] Thank you for your answer. Let's continue. Here is the next question: ${demoQuestions[0]}`
          }
        ]);
      }, 1000);
    }
  };

  // Send Text Chat Message
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg = { sender: 'user', text: inputValue.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputValue('');
    setIsTyping(true);

    // Check if we are using Demo Mode (offline mock)
    if (isDemoMode || !apiKey) {
      setTimeout(() => {
        setIsTyping(false);
        const qIndex = demoQuestionIndexRef.current + 1;
        demoQuestionIndexRef.current = qIndex;

        if (isTrainingMode) {
          if (qIndex === 1) {
            setMessages(prev => [
              ...prev,
              {
                sender: 'interviewer',
                text: `**Feedback:** That's a great example! You set up the Situation and Task perfectly. However, the Actions section felt a bit brief—what exactly was your role in analyzing the BOM costs? Also, remember to state the Results with numbers. \n\n**Next Question:** ${demoQuestions[1]}`
              }
            ]);
          } else if (qIndex === 2) {
            setMessages(prev => [
              ...prev,
              {
                sender: 'interviewer',
                text: `**Feedback:** Good ownership here! Admitting a mistake and showing how you fixed it structurally is exactly what we look for under "Insist on High Standards". Next time, explain what the long-term margin savings were. \n\n**Next Question:** ${demoQuestions[2]}`
              }
            ]);
          } else {
            setMessages(prev => [
              ...prev,
              {
                sender: 'interviewer',
                text: `**Feedback:** Excellent transition from IT to engineering and leadership! This displays strong "Learn and Be Curious" values. \n\n**Mock Interview Completed!** You did great. Enter another company or reset to start again.`
              }
            ]);
          }
        } else {
          if (qIndex < demoQuestions.length) {
            setMessages(prev => [
              ...prev,
              {
                sender: 'interviewer',
                text: `Thank you. Let's move to the next question. \n\n${demoQuestions[qIndex]}`
              }
            ]);
          } else {
            setMessages(prev => [
              ...prev,
              {
                sender: 'interviewer',
                text: `Thank you. This concludes the mock interview. Let me evaluate your performance...\n\n---\n\n### 🏁 FINAL EVALUATION: **PASS**\n\n**Why you passed:**\n* **Structure:** Your stories consistently follow the STAR-L model, helping to keep your answers cohesive.\n* **Values Alignment:** You demonstrated high Ownership (by fixing margin structures in the failure story) and Customer Obsession (by adjusting payment structures to enable client scaling).\n* **Metrics:** Quantifying the savings and contract lengths helps validate the results.\n\n**Areas to Improve:**\n* In the negotiation story, explain *how* you influenced the CEO and VP. Adding more focus on your personal negotiation techniques will strengthen your leadership indicators.`
              }
            ]);
          }
        }
      }, 1500);
      return;
    }

    // Call actual Gemini API
    try {
      const responseText = await queryGemini(updatedMessages);
      setIsTyping(false);
      setMessages(prev => [...prev, { sender: 'interviewer', text: responseText }]);
    } catch (err) {
      setIsTyping(false);
      setMessages(prev => [
        ...prev,
        {
          sender: 'system',
          text: `Error calling API: ${err.message}. Switching to local Demo Mode simulation...`
        }
      ]);
      setIsDemoMode(true);
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          {
            sender: 'interviewer',
            text: `[Demo Mode Activated] Thank you for your answer. Let's continue. Here is the next question: ${demoQuestions[0]}`
          }
        ]);
      }, 1000);
    }
  };

  return (
    <div className="app-container">
      {/* Sleek Top Navigation Header */}
      <header className="app-header">
        <div className="brand">
          <Briefcase className="logo-icon" size={24} />
          <h1>Behavioral Prep Dashboard</h1>
        </div>
        <nav className="tabs">
          <button 
            className={`tab-btn ${activeTab === 'stories' ? 'active' : ''}`}
            onClick={() => setActiveTab('stories')}
          >
            <FileText size={18} />
            Story Collection
          </button>
          <button 
            className={`tab-btn ${activeTab === 'practice' ? 'active' : ''}`}
            onClick={() => setActiveTab('practice')}
          >
            <Sparkles size={18} />
            Practice Interview
          </button>
        </nav>
        <button 
          className="settings-toggle-btn"
          onClick={() => setShowSettings(true)}
          title="Configure API Key"
        >
          <Settings size={20} />
        </button>
      </header>

      {activeTab === 'stories' ? (
        /* =================== STORIES SEARCH TAB =================== */
        <div className="layout">
          <aside className="sidebar">
            <div className="sidebar-header">
              <h2>My Behavioral Stories</h2>
              <div className="search-container">
                <Search className="search-icon" size={18} />
                <input 
                  type="text" 
                  placeholder="Search keyword or question..." 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>
            
            <div className="story-list">
              {filteredStories.map(story => (
                <div 
                  key={story.id} 
                  className={`story-card ${selectedStory?.id === story.id ? 'active' : ''}`}
                  onClick={() => setSelectedStory(story)}
                >
                  <FileText size={16} className="card-icon" />
                  <div className="card-title">{story.title}</div>
                </div>
              ))}
              {filteredStories.length === 0 && (
                <div className="no-results">No matching stories found.</div>
              )}
            </div>
          </aside>

          <main className="main-content">
            {selectedStory ? (
              <div className="story-viewer">
                <ReactMarkdown>{selectedStory.content}</ReactMarkdown>
              </div>
            ) : (
              <div className="empty-state">
                <FileText size={48} className="empty-icon" />
                <p>Select a story from the sidebar to view it.</p>
              </div>
            )}
          </main>
        </div>
      ) : (
        /* =================== PRACTICE INTERVIEW TAB =================== */
        <div className="layout">
          <aside className="sidebar practice-sidebar">
            <div className="sidebar-header">
              <h2>Mock Setup</h2>
              
              {/* Company Selector Dropdown */}
              <div className="selector-group">
                <label htmlFor="company-select">Target Company</label>
                <select 
                  id="company-select"
                  value={selectedCompanyId} 
                  onChange={(e) => {
                    setSelectedCompanyId(e.target.value);
                    resetInterview();
                  }}
                  className="company-dropdown"
                  disabled={interviewActive}
                >
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Training Mode Switch */}
              <div className="toggle-group">
                <div className="toggle-label-wrap">
                  <span className="toggle-title">Training Mode</span>
                  <span className="toggle-desc">{isTrainingMode ? 'Interactive Feedback' : 'Rigor Evaluation'}</span>
                </div>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={isTrainingMode}
                    onChange={(e) => {
                      setIsTrainingMode(e.target.checked);
                      resetInterview();
                    }}
                    disabled={interviewActive}
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              {/* Research New Company Button */}
              <button 
                className="action-btn research-btn" 
                onClick={() => setShowResearchModal(true)}
                disabled={interviewActive}
              >
                + Research New Company
              </button>
            </div>

            {/* Behavioral Expectations List */}
            <div className="expectations-container">
              <h3>Core Principles & Expectations</h3>
              <div className="values-list">
                {selectedCompany.values.map(val => (
                  <div key={val.id} className="value-item">
                    <h4>{val.title}</h4>
                    <p>{val.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <main className="main-content chat-main">
            {!interviewActive ? (
              <div className="chat-welcome">
                <Sparkles size={64} className="welcome-icon" />
                <h2>Practice Interview Simulator</h2>
                <p>Prepare for your behavioral interview at **{selectedCompany.name}**.</p>
                
                <div className="mode-features">
                  <div className="feature-card">
                    <h4>{isTrainingMode ? '🚀 Training Mode Enabled' : '⚖️ Serious Mode Enabled'}</h4>
                    <p>
                      {isTrainingMode 
                        ? 'The interviewer will analyze your answers in real-time, pointing out missing STAR-L elements and giving suggestions for improvements.'
                        : 'A formal mock interview. Speak freely, and receive a complete evaluation with a final PASS/FAIL judgment at the end.'}
                    </p>
                  </div>
                </div>

                {!apiKey && (
                  <div className="api-notice">
                    <HelpCircle size={20} className="notice-icon" />
                    <span>No Gemini API key configured. We will run in <strong>Offline Demo Mode</strong>. Click the gear icon in the top right to configure a real API key.</span>
                  </div>
                )}

                <button className="start-btn" onClick={startInterview}>
                  <Play size={18} />
                  Start Mock Interview
                </button>
              </div>
            ) : (
              <div className="chat-container">
                <div className="chat-header">
                  <h3>Mock Interview with {selectedCompany.name} Hiring Manager</h3>
                  <div className="header-meta">
                    <span className={`badge ${isTrainingMode ? 'badge-training' : 'badge-serious'}`}>
                      {isTrainingMode ? 'Training Mode' : 'Serious Mode'}
                    </span>
                    <button className="reset-btn" onClick={resetInterview} title="Reset Interview">
                      <RefreshCw size={14} /> Reset
                    </button>
                  </div>
                </div>

                {/* Message Log */}
                <div className="message-log">
                  {messages.map((msg, index) => (
                    <div key={index} className={`message-wrapper ${msg.sender}`}>
                      <div className="message-bubble">
                        {msg.sender === 'system' ? (
                          <div className="system-text">{msg.text}</div>
                        ) : (
                          <>
                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                            {msg.audioUrl && (
                              <div className="voice-message">
                                <audio src={msg.audioUrl} controls className="audio-player" />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="message-wrapper interviewer">
                      <div className="message-bubble typing-bubble">
                        <span className="dot"></span>
                        <span className="dot"></span>
                        <span className="dot"></span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input form */}
                <form className="chat-input-form" onSubmit={sendMessage}>
                  {isRecording ? (
                    <div className="recording-status">
                      <span className="recording-dot"></span>
                      <span className="recording-text">Recording Audio... {formatRecordingTime(recordingTime)}</span>
                    </div>
                  ) : (
                    <textarea
                      placeholder="Type your behavioral answer, or click the mic to speak..."
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage(e);
                        }
                      }}
                      rows={2}
                      disabled={isRecording}
                    />
                  )}

                  <div className="input-actions">
                    {isRecording ? (
                      <button 
                        type="button" 
                        className="mic-btn recording" 
                        onClick={stopRecording}
                        title="Stop Recording and Send"
                      >
                        <MicOff size={18} />
                      </button>
                    ) : (
                      <button 
                        type="button" 
                        className="mic-btn" 
                        onClick={startRecording}
                        disabled={isTyping}
                        title="Start Voice Recording"
                      >
                        <Mic size={18} />
                      </button>
                    )}
                    
                    {!isRecording && (
                      <button 
                        type="submit" 
                        className="send-btn" 
                        disabled={!inputValue.trim() || isTyping}
                        title="Send Text Message"
                      >
                        <Send size={18} />
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}
          </main>
        </div>
      )}

      {/* API KEY SETTINGS MODAL */}
      {showSettings && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Configure Gemini API Key</h3>
              <button onClick={() => setShowSettings(false)} className="close-btn"><X size={20} /></button>
            </div>
            <div className="modal-body">
              <p>Enter your Google Gemini API Key to enable real-time mock interviews with dynamic responses. Your key is stored locally in your browser's memory and is never shared.</p>
              
              <div className="input-group">
                <label htmlFor="api-key-input">Gemini API Key</label>
                <input 
                  type="password" 
                  id="api-key-input"
                  placeholder="AIzaSy..." 
                  defaultValue={apiKey}
                  className="settings-input"
                />
              </div>

              <div className="input-group">
                <label htmlFor="model-select">Gemini Model</label>
                <select 
                  id="model-select"
                  value={selectedModel}
                  onChange={(e) => {
                    setSelectedModel(e.target.value);
                    localStorage.setItem('gemini_model', e.target.value);
                  }}
                  className="settings-input"
                >
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Legacy Default)</option>
                  <option value="gemini-1.5-flash-latest">Gemini 1.5 Flash Latest</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (High Quality)</option>
                </select>
              </div>

              <div className="modal-actions">
                <button className="secondary-btn" onClick={() => handleSaveApiKey('', selectedModel)}>Clear Key</button>
                <button 
                  className="primary-btn"
                  onClick={() => {
                    const keyVal = document.getElementById('api-key-input').value;
                    const modelVal = document.getElementById('model-select').value;
                    handleSaveApiKey(keyVal, modelVal);
                  }}
                >
                  Save Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESEARCH NEW COMPANY MODAL (WITH LIVE PROGRESS LOGGER) */}
      {showResearchModal && (
        <div className="modal-backdrop">
          <div className="modal-content research-modal-content">
            <div className="modal-header">
              <h3>Research New Target Company</h3>
              <button 
                onClick={handleCloseResearchModal} 
                className="close-btn"
                disabled={researchStatus === 'running' || researchStatus === 'submitting'}
              >
                <X size={20} />
              </button>
            </div>
            
            {researchStatus === '' && (
              <form onSubmit={handleResearchCompany} className="modal-body">
                <p>Enter the name of a company you want to prepare for. The AI agent will search the web, download its core principles and behavioral expectations, write them to your database, and load them in the mock setup.</p>
                <div className="input-group">
                  <label htmlFor="company-name-input">Company Name</label>
                  <input 
                    type="text" 
                    id="company-name-input"
                    placeholder="e.g. Netflix, Google, Meta, Microsoft"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    className="settings-input"
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="secondary-btn" onClick={handleCloseResearchModal}>Cancel</button>
                  <button type="submit" className="primary-btn">Submit Request</button>
                </div>
              </form>
            )}

            {researchStatus === 'submitting' && (
              <div className="modal-body">
                <div className="research-loading">
                  <RefreshCw className="spin-icon" size={32} />
                  <p>Spawning headless agent for <strong>{researchCompanyName}</strong>...</p>
                </div>
              </div>
            )}

            {(researchStatus === 'running' || researchStatus === 'success' || researchStatus === 'error') && (
              <div className="modal-body">
                <div className="research-progress-header">
                  {researchStatus === 'running' && (
                    <div className="status-indicator">
                      <RefreshCw className="spin-icon status-spin" size={18} />
                      <span>Agent is researching <strong>{researchCompanyName}</strong>...</span>
                    </div>
                  )}
                  {researchStatus === 'success' && (
                    <div className="status-indicator success-text">
                      <Sparkles size={18} />
                      <span>Research complete! <strong>{researchCompanyName}</strong> is ready.</span>
                    </div>
                  )}
                  {researchStatus === 'error' && (
                    <div className="status-indicator error-text">
                      <X size={18} />
                      <span>Research failed: {researchError}</span>
                    </div>
                  )}
                </div>

                {/* Console Log Terminal */}
                <div className="log-viewer-container">
                  <pre className="log-viewer-text">{researchLogs || '[Waiting for agent stdout...]'}</pre>
                  <div ref={logEndRef} />
                </div>

                <div className="modal-actions">
                  {researchStatus === 'running' ? (
                    <button type="button" className="secondary-btn" disabled>
                      Processing...
                    </button>
                  ) : researchStatus === 'success' ? (
                    <button type="button" className="primary-btn" onClick={handleCloseResearchModal}>
                      Start Mock Interview
                    </button>
                  ) : (
                    <button type="button" className="primary-btn" onClick={() => setResearchStatus('')}>
                      Try Again
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
