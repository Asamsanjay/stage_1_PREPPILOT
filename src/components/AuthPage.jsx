import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, setRegisteringFlag } from '../supabaseClient';
import { ensureUserProfile } from '../utils/profileService';

export default function AuthPage({ onLoginSuccess }) {
  const [showSplash, setShowSplash] = useState(true);
  const [isActiveForm, setIsActiveForm] = useState(false); // false = Login, true = Registration
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState({ text: '', type: '' });

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Registration Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const email = loginEmail.trim();
    if (!email || !loginPassword) {
      setMessage({ text: 'Please fill in all required fields.', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage({ text: '', type: '' });

    if (!isSupabaseConfigured()) {
      setMessage({
        text: 'Supabase credentials missing in .env! Please configure VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY.',
        type: 'error',
      });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: loginPassword,
      });

      if (error) {
        console.error('Supabase Auth Error:', error);
        setMessage({ text: error.message, type: 'error' });
        return;
      }

      if (data?.user) {
        const { profile, error: profileErr } = await ensureUserProfile(data.user);
        
        if (profileErr) {
          console.error('Database Profile Error:', profileErr);
          if (profileErr.code === 'PGRST205') {
            setMessage({
              text: "Database error: Table 'profiles' does not exist in your Supabase project. Please execute the SQL setup script from SUPABASE_SETUP.md in your Supabase SQL Editor!",
              type: 'error',
            });
          } else {
            setMessage({
              text: `Profile database error: ${profileErr.message}`,
              type: 'error',
            });
          }
          return;
        }

        const userName = profile?.name || data.user.user_metadata?.full_name || email.split('@')[0] || 'User';
        setMessage({ text: 'Successfully logged in!', type: 'success' });
        onLoginSuccess({ name: userName, email: data.user.email, id: data.user.id });
      }
    } catch (err) {
      console.error('Login Exception:', err);
      setMessage({ text: err.message || 'Unable to connect right now. Please check your connection.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const name = regName.trim();
    const email = regEmail.trim();

    if (!name || !email || !regPassword) {
      setMessage({ text: 'Please complete all fields to create your account.', type: 'error' });
      return;
    }

    if (regPassword.length < 6) {
      setMessage({ text: 'Password should be at least 6 characters long.', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage({ text: '', type: '' });

    if (!isSupabaseConfigured()) {
      setMessage({
        text: 'Supabase credentials missing in .env! Please configure VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY.',
        type: 'error',
      });
      setLoading(false);
      return;
    }

    // Flag registration flow as active so App.jsx's onAuthStateChange ignores the automatic sign-in event
    setRegisteringFlag(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: regPassword,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) {
        console.error('Supabase Auth Error:', error);
        setMessage({ text: error.message, type: 'error' });
        return;
      }

      if (data?.user && data.user.identities && data.user.identities.length === 0) {
        setMessage({
          text: 'You are already registered, please login.',
          type: 'error',
        });
        if (data.session) {
          await supabase.auth.signOut();
        }
        return;
      }

      if (data?.user) {
        // Ensure profile row exists in 'profiles' table while user object is available
        const { error: profileErr } = await ensureUserProfile(data.user);
        
        if (profileErr) {
          console.error('Database Profile Error during Registration:', profileErr);
          if (data.session) {
            await supabase.auth.signOut();
          }
          if (profileErr.code === 'PGRST205') {
            setMessage({
              text: "Database error: Table 'profiles' does not exist in your Supabase project. Please execute the SQL setup script from SUPABASE_SETUP.md in your Supabase SQL Editor!",
              type: 'error',
            });
          } else {
            setMessage({
              text: `Profile creation database error: ${profileErr.message}`,
              type: 'error',
            });
          }
          return;
        }

        // Always sign out any session created automatically by Supabase during registration
        await supabase.auth.signOut();

        // Clear registration input fields
        setRegName('');
        setRegEmail('');
        setRegPassword('');

        // Pre-fill login email field for convenience
        setLoginEmail(email);

        // Switch AuthPage view to Login mode
        setIsActiveForm(false);

        // Display exact requested success message
        setMessage({
          text: 'Registration successful! Please login with your new account.',
          type: 'success',
        });
      }
    } catch (err) {
      console.error('Register Exception:', err);
      setMessage({ text: err.message || 'Registration failed. Please try again.', type: 'error' });
    } finally {
      setRegisteringFlag(false);
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    const email = forgotEmail.trim();
    if (!email) {
      setForgotMessage({ text: 'Please enter your email address.', type: 'error' });
      return;
    }

    setLoading(true);
    setForgotMessage({ text: '', type: '' });

    if (!isSupabaseConfigured()) {
      setForgotMessage({
        text: 'Supabase credentials missing in .env!',
        type: 'error',
      });
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });

      if (error) {
        console.error('Supabase Auth Error:', error);
        setForgotMessage({ text: error.message, type: 'error' });
      } else {
        setForgotMessage({
          text: 'Password reset link sent! Check your email inbox.',
          type: 'success',
        });
      }
    } catch (err) {
      console.error('Reset Password Exception:', err);
      setForgotMessage({ text: err.message || 'Unable to send password reset email.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    if (!isSupabaseConfigured()) {
      setMessage({
        text: 'Supabase credentials missing in .env!',
        type: 'error',
      });
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        console.error(`Supabase Auth Error (${provider}):`, error);
        setMessage({ text: `Unable to sign in with ${provider}: ${error.message}`, type: 'error' });
      }
    } catch (err) {
      console.error('Social Login Exception:', err);
      setMessage({ text: `Social login with ${provider} failed.`, type: 'error' });
    }
  };

  return (
    <div className="auth-page-wrapper">
      {/* Splash Screen */}
      <div id="splash-screen" className={`splash-screen ${!showSplash ? 'fade-out' : ''}`}>
        <div className="splash-background-glow"></div>
        <div className="splash-content">
          <div className="logo-wrapper">
            <div className="glow-ring"></div>
            <div className="splash-logo-box" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="bx bxs-paper-plane" style={{ fontSize: '56px', color: '#0066ff' }}></i>
            </div>
          </div>
          <div className="splash-text">
            <h1 className="brand-title">Prep<span>Pilot</span></h1>
            <p className="brand-tagline">AI COMMUNICATION & MOCK INTERVIEW PLATFORM</p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="modal-overlay" onClick={() => setShowForgotModal(false)} style={{ zIndex: 10000 }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', padding: '32px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>Reset Password</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              Enter your email address to receive a password reset link.
            </p>

            {forgotMessage.text && (
              <div className={`form-message ${forgotMessage.type} show`} style={{ marginBottom: '16px' }}>
                <i className={`bx ${forgotMessage.type === 'success' ? 'bx-check-circle' : 'bx-error-circle'}`}></i>
                <span>{forgotMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleForgotPasswordSubmit}>
              <div className="input-box" style={{ margin: '0 0 20px 0' }}>
                <input
                  type="email"
                  placeholder="Your Email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  disabled={loading}
                />
                <i className="bx bxs-envelope"></i>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ background: '#e2e8f0', color: '#475569', boxShadow: 'none' }}
                  onClick={() => { setShowForgotModal(false); setForgotMessage({ text: '', type: '' }); }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className={`container ${!showSplash ? 'show' : ''} ${isActiveForm ? 'active' : ''}`}>
        {/* Registration Form Box */}
        <div className="form-box register">
          <form className="auth-form" onSubmit={handleRegisterSubmit}>
            <h1>Registration</h1>

            <div className={`form-message ${message.type} ${message.text && isActiveForm ? 'show' : ''}`}>
              <i className={`bx ${message.type === 'success' ? 'bx-check-circle' : 'bx-error-circle'}`}></i>
              <span>{message.text}</span>
            </div>

            <div className="input-box">
              <input
                type="text"
                placeholder="Username"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                disabled={loading}
              />
              <i className="bx bxs-user"></i>
            </div>

            <div className="input-box">
              <input
                type="email"
                placeholder="Email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                disabled={loading}
              />
              <i className="bx bxs-envelope"></i>
            </div>

            <div className="input-box">
              <input
                type="password"
                placeholder="Password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                disabled={loading}
              />
              <i className="bx bxs-lock-alt"></i>
            </div>

            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </button>

            <p className="social-text">or register with social platforms</p>

            <div className="social-icons">
              <a href="#" onClick={(e) => { e.preventDefault(); handleSocialLogin('google'); }} title="Register with Google"><i className="bx bxl-google"></i></a>
              <a href="#" onClick={(e) => { e.preventDefault(); handleSocialLogin('facebook'); }} title="Register with Facebook"><i className="bx bxl-facebook"></i></a>
              <a href="#" onClick={(e) => { e.preventDefault(); handleSocialLogin('github'); }} title="Register with GitHub"><i className="bx bxl-github"></i></a>
              <a href="#" title="Register with LinkedIn"><i className="bx bxl-linkedin"></i></a>
            </div>
          </form>
        </div>

        {/* Login Form Box */}
        <div className="form-box login">
          <form className="auth-form" onSubmit={handleLoginSubmit}>
            <h1>Login</h1>

            <div className={`form-message ${message.type} ${message.text && !isActiveForm ? 'show' : ''}`}>
              <i className={`bx ${message.type === 'success' ? 'bx-check-circle' : 'bx-error-circle'}`}></i>
              <span>{message.text}</span>
            </div>

            <div className="input-box">
              <input
                type="email"
                placeholder="Email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                disabled={loading}
              />
              <i className="bx bxs-envelope"></i>
            </div>

            <div className="input-box">
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                disabled={loading}
              />
              <i className="bx bxs-lock-alt"></i>
            </div>

            <div className="forgot-link">
              <a href="#" onClick={(e) => { e.preventDefault(); setShowForgotModal(true); setForgotEmail(loginEmail); }}>
                Forgot Password?
              </a>
            </div>

            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>

            <p className="social-text">or login with social platforms</p>

            <div className="social-icons">
              <a href="#" onClick={(e) => { e.preventDefault(); handleSocialLogin('google'); }} title="Login with Google"><i className="bx bxl-google"></i></a>
              <a href="#" onClick={(e) => { e.preventDefault(); handleSocialLogin('facebook'); }} title="Login with Facebook"><i className="bx bxl-facebook"></i></a>
              <a href="#" onClick={(e) => { e.preventDefault(); handleSocialLogin('github'); }} title="Login with GitHub"><i className="bx bxl-github"></i></a>
              <a href="#" title="Login with LinkedIn"><i className="bx bxl-linkedin"></i></a>
            </div>
          </form>
        </div>

        {/* Sliding Toggle Box */}
        <div className="toggle-box">
          <div className="toggle-panel toggle-left">
            <h1>Hello, Welcome!</h1>
            <p>Don't have an account?</p>
            <button
              type="button"
              className="btn"
              onClick={() => {
                console.log('[AuthPage] Register button clicked -> Setting isActiveForm to true (Register Mode)');
                setIsActiveForm(true);
                setMessage({ text: '', type: '' });
              }}
            >
              Register
            </button>
          </div>

          <div className="toggle-panel toggle-right">
            <h1>Welcome Back!</h1>
            <p>Already have an account?</p>
            <button
              type="button"
              className="btn"
              onClick={() => {
                console.log('[AuthPage] Login button clicked -> Setting isActiveForm to false (Login Mode)');
                setIsActiveForm(false);
                setMessage({ text: '', type: '' });
              }}
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
