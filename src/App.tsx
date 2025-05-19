import React, { useState } from 'react';
import './App.css';

function App() {
  const [resume, setResume] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState<File | null>(null);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewEnded, setInterviewEnded] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [messages, setMessages] = useState<Array<{ text: string; sender: 'AI' | 'User' }>>([]);
  const [userInput, setUserInput] = useState('');
  const [currentQuestionId, setCurrentQuestionId] = useState(0);

  const handleResumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setResume(event.target.files[0]);
    }
  };

  const handleJobDescriptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setJobDescription(event.target.files[0]);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!resume || !jobDescription) {
      console.error('Please upload both resume and job description');
      return;
    }

    const formData = new FormData();
    formData.append('resume', resume);
    formData.append('jobDescription', jobDescription);

    try {
      const response = await fetch('https://ai-interview-backend-5tfz.onrender.com/api/start-interview', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to start interview');
      }

      const data = await response.json();
      console.log('Interview started:', data);
      
      setInterviewStarted(true);
      window.localStorage.setItem('interviewId', data.interviewId);
      setCurrentQuestionId(0);
      setMessages([{ text: data.current_question, sender: 'AI' }]);
    } catch (error) {
      console.error('Error starting interview:', error);
    }
  };

  const handleUserInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(event.target.value);
  };

  const handleUserInputSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (userInput.trim()) {
      setMessages([...messages, { text: userInput, sender: 'User' }]);
      setUserInput('');

      try {
        const response = await fetch('https://ai-interview-backend-5tfz.onrender.com/api/get-next-question', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            response: userInput,
            interviewId: window.localStorage.getItem('interviewId'),
            current_question_id: currentQuestionId
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get AI response');
        }

        const data = await response.json();
        setCurrentQuestionId(data.current_question_id);
        if(!data.question) {
          setMessages(prev => [...prev, { text: "Your interview has ended. Thank you for your time.", sender: 'AI' }]);
          setInterviewEnded(true); // Add state to control button visibility
        } else {
          setMessages(prev => [...prev, { text: data.question, sender: 'AI' }]);
        }
      } catch (error) {
        console.error('Error getting AI response:', error);
      }
    }
  };

  const handleEndInterview = async () => {
    try {
      const response = await fetch('https://ai-interview-backend-5tfz.onrender.com/api/end-interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interviewId: window.localStorage.getItem('interviewId'),
        }),
      });

      const data = await response.json();
      console.log("FEEDBACK", data);
      setFeedback(data.feedback);
      setShowFeedback(true);
    } catch (error) {
      console.error('Error ending interview:', error);
    }
  };

  const renderFeedback = () => (
    <div className="feedback-container">
      <h2>Feedback for your interview</h2>
      <div className="feedback-content">
        {feedback.split('\n').map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
      <button onClick={() => {
        setShowFeedback(false);
        setInterviewStarted(false);
        setInterviewEnded(false);
        setMessages([]);
        setFeedback('');
      }}>Start New Interview</button>
    </div>
  );

  return (
    <div className="App">
      <header className="App-header">
        {showFeedback ? (
          <div>
            <h1>Interview Feedback</h1>
            <p>{feedback}</p>
          </div>
        ) : !interviewStarted ? (
          <>
            <h1>Upload Your Resume and Job Description</h1>
            <form onSubmit={handleSubmit}>
              <div>
                <label htmlFor="resume">Resume:</label>
                <input type="file" id="resume" onChange={handleResumeChange} accept=".pdf,.docx" />
              </div>
              <div>
                <label htmlFor="jobDescription">Job Description:</label>
                <input type="file" id="jobDescription" onChange={handleJobDescriptionChange} accept=".pdf,.docx" />
              </div>
              <button type="submit">Start Interview</button>
            </form>
          </>
        ) : (
          <>
            <h1>AI Interview in Progress</h1>
            <div className="chat-interface">
              <div className="messages">
                {messages.map((msg, index) => (
                  <div key={index} className={`message ${msg.sender.toLowerCase()}`}>
                    {msg.text}
                  </div>
                ))}
              </div>
              {!interviewEnded ? (
                <form onSubmit={handleUserInputSubmit}>
                  <input
                    type="text"
                    value={userInput}
                    onChange={handleUserInputChange}
                    placeholder="Type your answer..."
                  />
                  <button type="submit">Send</button>
                </form>
              ) : (
                <button onClick={handleEndInterview}>End Interview</button>
              )}
            </div>
          </>
        )}
      </header>
    </div>
  );
}

export default App;
