import React, { useRef, useState, useEffect } from 'react';
import './App.css';

function App() {
  const [question, setQuestion] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const fileInputRef = useRef(null);
  const chatBoxRef = useRef(null);

  useEffect(() => {
    chatBoxRef.current?.scrollTo(0, chatBoxRef.current.scrollHeight);
  }, [chatLog, loading]);

  const sendMessage = async () => {
    if (!question.trim()) return;

    const userMessage = { sender: 'user', text: question };
    setChatLog((prevLog) => [...prevLog, userMessage]);
    setQuestion('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("question", question);

      const response = await fetch('http://127.0.0.1:8000/ask', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      const botMessage = { sender: 'bot', text: data.answer || data.error || "No response." };
      setChatLog((prevLog) => [...prevLog, botMessage]);
    } catch (error) {
      setChatLog((prevLog) => [...prevLog, { sender: 'bot', text: 'Something went wrong.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://127.0.0.1:8000/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      const message = data.message
        ? `PDF uploaded: *${file.name}*`
        : `Upload failed: ${data.error || "Unknown error"}`;

      setChatLog((prevLog) => [...prevLog, { sender: 'bot', text: message }]);
    } catch (error) {
      setChatLog((prevLog) => [...prevLog, { sender: 'bot', text: "Failed to upload PDF." }]);
    }
  };



  return (
    <>
      <button className="chat-toggle-btn" onClick={() => setIsChatOpen(!isChatOpen)}>
        💬
      </button>

      <div className={`chat-container-wrapper ${isChatOpen ? 'open' : ''}`}>
        <div className="chat-container">
          <h1>AI Assistant</h1>

          <div className="chat-box" ref={chatBoxRef}>
            {chatLog.map((msg, index) => (
              <div className={`chat-msg ${msg.sender}`} key={index}>
                {msg.sender === 'bot' && (
                  <img className="chat-avatar" src="https://img.icons8.com/?size=100&id=WZolzyWpK1CQ&format=png&color=000000" alt="Bot" />
                )}
                <div className="chat-text">{msg.text}</div>
                {msg.sender === 'user' && (
                  <img className="chat-avatar" src="https://img.icons8.com/?size=100&id=7820&format=png&color=000000" alt="User" />
                )}
              </div>
            ))}
            {loading && (
              <div className="chat-msg bot">
                <img className="chat-avatar" src="https://img.icons8.com/?size=100&id=WZolzyWpK1CQ&format=png&color=000000" alt="Bot" />
                <div className="chat-text">
                  <div className="typing-indicator">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="chat-input">
            <div className="input-group">
              <button className="plus-button" onClick={handleUploadClick}>PDF</button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <input
                type="text"
                placeholder="Ask something..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              />
            </div>
            <button onClick={sendMessage} className="send-btn">Send</button>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
