import React, { useState, useEffect } from 'react';
import MockInterviewMain from './MockInterviewMain';
import MockInterviewSetup from './MockInterviewSetup';
import MockInterviewSession from './MockInterviewSession';
import MockInterviewResult from './MockInterviewResult';

export default function MockInterviewView({ user }) {
  const [subView, setSubView] = useState(() => {
    const path = window.location.pathname;
    if (path.endsWith('/setup')) return 'setup';
    if (path.endsWith('/session')) return 'session';
    if (path.endsWith('/result')) return 'result';
    return 'main';
  });

  const [config, setConfig] = useState({
    interviewType: '',
    experienceLevel: '',
    difficulty: '',
    duration: '',
  });

  const [activeMediaStream, setActiveMediaStream] = useState(null);

  // Sync state with URL history
  const navigateSubView = (newSubView, path) => {
    setSubView(newSubView);
    if (path && window.location.pathname !== path) {
      window.history.pushState({ subView: newSubView }, '', path);
    }
  };

  // Listen for browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.endsWith('/setup')) setSubView('setup');
      else if (path.endsWith('/session')) setSubView('session');
      else if (path.endsWith('/result')) setSubView('result');
      else if (path.startsWith('/mock-interview')) setSubView('main');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [lastCompletedRecord, setLastCompletedRecord] = useState(() => {
    try {
      const cached = localStorage.getItem('preppilot_last_mock_interview');
      return cached ? JSON.parse(cached) : null;
    } catch (_e) {
      return null;
    }
  });

  const handleStartInterview = () => {
    navigateSubView('setup', '/mock-interview/setup');
  };

  const handleBackToMain = () => {
    navigateSubView('main', '/mock-interview');
  };

  const handleStartSession = (stream) => {
    setActiveMediaStream(stream);
    navigateSubView('session', '/mock-interview/session');
  };

  const handleEndSession = (record) => {
    setLastCompletedRecord(record);
    navigateSubView('result', '/mock-interview/result');
  };

  const handleStartAnother = () => {
    setConfig({
      interviewType: '',
      experienceLevel: '',
      difficulty: '',
      duration: '',
    });
    setLastCompletedRecord(null);
    navigateSubView('setup', '/mock-interview/setup');
  };

  const handleViewResultFromHistory = (record) => {
    if (record) {
      setConfig({
        interviewType: record.interview_type,
        experienceLevel: record.experience_level,
        difficulty: record.difficulty,
        duration: record.duration,
      });
      setLastCompletedRecord(record);
    }
    navigateSubView('result', '/mock-interview/result');
  };

  if (subView === 'setup') {
    return (
      <MockInterviewSetup
        config={config}
        setConfig={setConfig}
        onBackToMain={handleBackToMain}
        onStartSession={handleStartSession}
      />
    );
  }

  if (subView === 'session') {
    return (
      <MockInterviewSession
        config={config}
        mediaStream={activeMediaStream}
        user={user}
        onEndSession={handleEndSession}
      />
    );
  }

  if (subView === 'result') {
    return (
      <MockInterviewResult
        config={config}
        sessionData={lastCompletedRecord}
        onBackToMain={handleBackToMain}
        onStartAnother={handleStartAnother}
      />
    );
  }

  return (
    <MockInterviewMain
      user={user}
      onStartInterview={handleStartInterview}
      onViewResult={handleViewResultFromHistory}
    />
  );
}
