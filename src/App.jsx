import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import HeroBanner from './components/HeroBanner';
import PracticeModes from './components/PracticeModes';
import ProgressSidebarWidget from './components/ProgressSidebarWidget';
import ContinueJourney from './components/ContinueJourney';
import PracticeModal from './components/PracticeModal';
import AuthPage from './components/AuthPage';
import MockInterviewView from './components/mock-interview/MockInterviewView';
import SpeakingChallengeView from './components/speaking-challenge/SpeakingChallengeView';
import { MediaStreamProvider } from './hooks/useMediaStream';
import './components/mock-interview/MockInterview.css';
import { supabase, isSupabaseConfigured, getRegisteringFlag } from './supabaseClient';
import { ensureUserProfile } from './utils/profileService';

import { LogOut } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState({ name: 'User', email: '', avatar_url: '' });
  const [activeTab, setActiveTab] = useState(() => {
    const path = window.location.pathname;
    if (path.startsWith('/mock-interview')) return 'mock';
    if (path.startsWith('/speaking')) return 'speaking';
    if (path.startsWith('/contests')) return 'contests';
    if (path.startsWith('/progress')) return 'progress';
    if (path.startsWith('/settings')) return 'settings';
    return 'home';
  });
  const [searchQuery, setSearchQuery] = useState('');

  const [isSpeakingSessionActive, setIsSpeakingSessionActive] = useState(() => {
    return window.location.pathname === '/speaking-challenge/session';
  });

  // Synchronize URL path when activeTab changes
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    let path = '/';
    if (tabId === 'mock') path = '/mock-interview';
    else if (tabId === 'speaking') path = '/speaking-challenge';
    else if (tabId === 'contests') path = '/contests';
    else if (tabId === 'progress') path = '/progress';
    else if (tabId === 'settings') path = '/settings';

    if (window.location.pathname !== path && !window.location.pathname.startsWith(path)) {
      window.history.pushState(null, '', path);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      setIsSpeakingSessionActive(path === '/speaking-challenge/session');
      if (path.startsWith('/mock-interview')) setActiveTab('mock');
      else if (path.startsWith('/speaking')) setActiveTab('speaking');
      else if (path.startsWith('/contests')) setActiveTab('contests');
      else if (path.startsWith('/progress')) setActiveTab('progress');
      else if (path.startsWith('/settings')) setActiveTab('settings');
      else setActiveTab('home');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Interactive Practice Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('mock'); // 'mock' | 'speaking'
  const [selectedTopic, setSelectedTopic] = useState('');

  useEffect(() => {
    let subscription = null;

    const initAuthSession = async () => {
      if (!isSupabaseConfigured()) {
        setAuthLoading(false);
        return;
      }

      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error fetching initial auth session:', error);
        }

        if (initialSession?.user && !getRegisteringFlag()) {
          setSession(initialSession);
          await syncUserProfile(initialSession.user);
        }

        const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
          if (getRegisteringFlag()) {
            console.log('[App] Auth state listener suppressed event during registration flow');
            return;
          }
          setSession(currentSession);
          if (currentSession?.user) {
            await syncUserProfile(currentSession.user);
          } else {
            setUser({ name: 'User', email: '', avatar_url: '' });
          }
          setAuthLoading(false);
        });

        subscription = authSub;
      } catch (err) {
        console.error('Session initialization error:', err);
      } finally {
        setAuthLoading(false);
      }
    };

    initAuthSession();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const syncUserProfile = async (authUser) => {
    if (!authUser) return;
    try {
      const { profile, error: profileErr } = await ensureUserProfile(authUser);
      if (profileErr) {
        console.error('App Profile Sync Error:', profileErr);
      }
      const name = profile?.name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User';
      const avatar_url = profile?.avatar_url || authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || '';
      setUser({
        name,
        email: authUser.email || '',
        avatar_url,
        id: authUser.id,
      });
    } catch (e) {
      console.error('Profile sync exception:', e);
      setUser({
        name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
        email: authUser.email || '',
        avatar_url: '',
        id: authUser.id,
      });
    }
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setSession(null);
      setUser({ name: 'User', email: '', avatar_url: '' });
    }
  };

  const [initialSpeakingTopic, setInitialSpeakingTopic] = useState('');

  const handleOpenMock = () => {
    handleTabChange('mock');
  };

  const handleOpenSpeaking = (topic) => {
    if (topic && typeof topic === 'string') {
      setInitialSpeakingTopic(topic);
    }
    handleTabChange('speaking');
  };

  // Show loading spinner during session initialization
  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#070d19',
        color: '#fff',
        fontFamily: 'Poppins, sans-serif'
      }}>
        <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <i className="bx bxs-paper-plane" style={{ fontSize: '48px', color: '#0066ff' }}></i>
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Prep<span>Pilot</span></h2>
        <p style={{ fontSize: '13px', color: '#94a3b8' }}>Initializing authentication session...</p>
      </div>
    );
  }

  // If not authenticated, render the AuthPage
  if (isSupabaseConfigured() && !session) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  const renderContent = () => {
    if (activeTab === 'home') {
      return (
        <div className="page-content">
          <div className="home-desktop-grid">
            {/* Left Primary Content Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <HeroBanner onStartPractice={handleOpenMock} />
              
              <PracticeModes 
                onStartMock={handleOpenMock} 
                onStartSpeaking={() => handleOpenSpeaking()} 
              />
              
              <ContinueJourney 
                onSelectTopic={(topic) => handleOpenSpeaking(topic)} 
              />
            </div>

            {/* Right Desktop Widgets Column */}
            <ProgressSidebarWidget onViewAll={() => setActiveTab('progress')} />
          </div>
        </div>
      );
    }

    if (activeTab === 'mock') {
      return (
        <div className="page-content">
          <MockInterviewView user={user} />
        </div>
      );
    }

    if (activeTab === 'speaking') {
      return (
        <div 
          className={isSpeakingSessionActive ? 'session-fullscreen-page-content' : 'page-content'}
          style={isSpeakingSessionActive ? { padding: 0, margin: 0, width: '100vw', height: '100vh', maxWidth: '100vw' } : {}}
        >
          <SpeakingChallengeView 
            user={user} 
            onGoHome={() => handleTabChange('home')} 
            onSessionStateChange={setIsSpeakingSessionActive}
            initialTopic={initialSpeakingTopic}
          />
        </div>
      );
    }

    if (activeTab === 'progress') {
      return (
        <div className="page-content">
          <div className="section-header">
            <h2 className="section-title">Your Progress & Analytics</h2>
            <p className="section-subtitle">Track your fluency, clarity, confidence and vocabulary over time.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '28px' }}>
            <div className="widget-card">
              <h3 className="widget-title" style={{ marginBottom: '20px' }}>Comprehensive Performance Metrics</h3>
              <ProgressSidebarWidget onViewAll={() => {}} />
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'settings') {
      return (
        <div className="page-content">
          <div className="section-header">
            <h2 className="section-title">Account Settings</h2>
            <p className="section-subtitle">Manage your profile, preferences, and session security.</p>
          </div>
          <div className="widget-card" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0052cc, #00c6ff)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: 'bold'
                }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{user.name}</h3>
                <p style={{ fontSize: '13px', color: '#64748b' }}>{user.email || 'Authenticated User'}</p>
              </div>
            </div>

            <button 
              className="btn-primary" 
              style={{ background: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              onClick={handleLogout}
            >
              <LogOut size={16} />
              <span>Sign Out & Back to Login Page</span>
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="page-content">
        <div className="section-header">
          <h2 className="section-title" style={{ textTransform: 'capitalize' }}>{activeTab} Page</h2>
          <p className="section-subtitle">Module view active.</p>
        </div>
        <div className="widget-card" style={{ padding: '48px', textAlign: 'center' }}>
          <h3>{activeTab.toUpperCase()} Module</h3>
          <p style={{ color: '#64748b', marginTop: '10px' }}>Select "Home" on the sidebar to return to your practice dashboard.</p>
          <button className="btn-primary" style={{ marginTop: '20px' }} onClick={() => setActiveTab('home')}>
            Back to Home
          </button>
        </div>
      </div>
    );
  };

  return (
    <MediaStreamProvider>
      <div className={`app-desktop-shell ${isSpeakingSessionActive ? 'session-fullscreen-shell' : ''}`}>
        {/* Desktop Left Sidebar (hidden during session) */}
        {!isSpeakingSessionActive && (
          <Sidebar 
            activeTab={activeTab} 
            setActiveTab={handleTabChange} 
            onOpenPro={handleOpenMock}
          />
        )}

        {/* Main Widescreen Desktop Content Area */}
        <div 
          className="main-wrapper"
          style={isSpeakingSessionActive ? { padding: 0, margin: 0, width: '100vw', height: '100vh', maxWidth: '100vw', overflow: 'hidden' } : {}}
        >
          {!isSpeakingSessionActive && (
            <TopHeader 
              searchQuery={searchQuery} 
              setSearchQuery={setSearchQuery} 
              isMobileView={false}
              user={user}
              onLogout={handleLogout}
            />
          )}
          {renderContent()}
        </div>

        {/* Interactive Modal Launcher */}
        {!isSpeakingSessionActive && (
          <PracticeModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            mode={modalMode}
            initialTopic={selectedTopic}
          />
        )}
      </div>
    </MediaStreamProvider>
  );
}
