import React, { useState } from 'react';
import { 
  Award, 
  MessageSquare, 
  BarChart2, 
  Cpu, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Sparkles, 
  Lightbulb, 
  HelpCircle, 
  FileText, 
  ArrowRight,
  Info,
  ShieldCheck,
  Check
} from 'lucide-react';

export default function MockInterviewAiReport({ report, questionsAndAnswers, sessionConfig }) {
  const [activeTab, setActiveTab] = useState('strengths');

  if (!report) {
    return (
      <div className="report-empty-box">
        <Info size={24} color="#64748b" />
        <p>No AI performance evaluation data available for this session.</p>
      </div>
    );
  }

  const {
    overallScore = 75,
    scoreExplanation,
    categories = {},
    strengths = [],
    areasToImprove = [],
    missedOpportunities = [],
    improvedAnswers = [],
    recommendedNextSteps = [],
    unsupportedAssessmentsDisclaimer
  } = report;

  const getScoreBadgeClass = (score) => {
    if (score >= 85) return 'score-excellent';
    if (score >= 70) return 'score-good';
    if (score >= 55) return 'score-average';
    return 'score-needs-work';
  };

  const getScoreLabel = (score) => {
    if (score >= 85) return 'Strong Candidate';
    if (score >= 70) return 'Competent';
    if (score >= 55) return 'Foundational';
    return 'Needs Improvement';
  };

  return (
    <div className="ai-report-container">
      {/* 1. Overall Score Hero Card */}
      <div className="ai-report-hero">
        <div className="hero-score-badge-box">
          <div className={`hero-score-circle ${getScoreBadgeClass(overallScore)}`}>
            <span className="hero-score-number">{overallScore}</span>
            <span className="hero-score-denom">/ 100</span>
          </div>
          <span className={`hero-rating-pill ${getScoreBadgeClass(overallScore)}`}>
            {getScoreLabel(overallScore)}
          </span>
        </div>

        <div className="hero-summary-content">
          <div className="hero-badge-tag">
            <Sparkles size={14} color="#0066ff" />
            <span>AI PERFORMANCE EVALUATION</span>
          </div>
          <h2 className="hero-report-title">
            {sessionConfig?.jobRole || sessionConfig?.interviewType || 'Interview'} Performance Summary
          </h2>
          <p className="hero-report-explanation">
            {scoreExplanation || 'Evaluation derived from transcript evidence across communication, answer depth, and technical reasoning.'}
          </p>
        </div>
      </div>

      {/* 2. Core Competencies Grid */}
      <div className="report-categories-grid">
        {/* Communication */}
        <div className="competency-card">
          <div className="competency-header">
            <div className="competency-icon-box blue">
              <MessageSquare size={18} />
            </div>
            <div className="competency-meta">
              <span className="competency-title">Communication</span>
              <span className="competency-score">
                {categories.communication?.score !== null && categories.communication?.score !== undefined 
                  ? `${categories.communication.score}%` 
                  : '—'}
              </span>
            </div>
          </div>
          <p className="competency-feedback">
            {categories.communication?.feedback || 'Clarity, conciseness, and structure of answers.'}
          </p>
        </div>

        {/* Answer Quality */}
        <div className="competency-card">
          <div className="competency-header">
            <div className="competency-icon-box purple">
              <BarChart2 size={18} />
            </div>
            <div className="competency-meta">
              <span className="competency-title">Answer Quality</span>
              <span className="competency-score">
                {categories.answerQuality?.score !== null && categories.answerQuality?.score !== undefined 
                  ? `${categories.answerQuality.score}%` 
                  : '—'}
              </span>
            </div>
          </div>
          <p className="competency-feedback">
            {categories.answerQuality?.feedback || 'Relevance, completeness, and substance.'}
          </p>
        </div>

        {/* Technical Knowledge */}
        <div className="competency-card">
          <div className="competency-header">
            <div className="competency-icon-box amber">
              <Cpu size={18} />
            </div>
            <div className="competency-meta">
              <span className="competency-title">Domain Knowledge</span>
              <span className="competency-score">
                {categories.technicalKnowledge?.score !== null && categories.technicalKnowledge?.score !== undefined 
                  ? `${categories.technicalKnowledge.score}%` 
                  : 'General'}
              </span>
            </div>
          </div>
          <p className="competency-feedback">
            {categories.technicalKnowledge?.feedback || 'Understanding of tools, concepts, and frameworks.'}
          </p>
        </div>

        {/* Problem Solving */}
        <div className="competency-card">
          <div className="competency-header">
            <div className="competency-icon-box emerald">
              <Zap size={18} />
            </div>
            <div className="competency-meta">
              <span className="competency-title">Problem Solving</span>
              <span className="competency-score">
                {categories.problemSolving?.score !== null && categories.problemSolving?.score !== undefined 
                  ? `${categories.problemSolving.score}%` 
                  : '—'}
              </span>
            </div>
          </div>
          <p className="competency-feedback">
            {categories.problemSolving?.feedback || 'Reasoning, trade-offs, and pragmatic decisions.'}
          </p>
        </div>
      </div>

      {/* 3. Interactive Detail Tabs */}
      <div className="report-tabs-bar">
        <button
          className={`report-tab-btn ${activeTab === 'strengths' ? 'active' : ''}`}
          onClick={() => setActiveTab('strengths')}
        >
          <CheckCircle2 size={15} />
          <span>Strengths & Growth Areas</span>
        </button>

        <button
          className={`report-tab-btn ${activeTab === 'improved' ? 'active' : ''}`}
          onClick={() => setActiveTab('improved')}
        >
          <Sparkles size={15} />
          <span>Improved Answers ({improvedAnswers.length})</span>
        </button>

        <button
          className={`report-tab-btn ${activeTab === 'transcript' ? 'active' : ''}`}
          onClick={() => setActiveTab('transcript')}
        >
          <FileText size={15} />
          <span>Full Q&A Transcript ({questionsAndAnswers?.length || 0})</span>
        </button>

        <button
          className={`report-tab-btn ${activeTab === 'next_steps' ? 'active' : ''}`}
          onClick={() => setActiveTab('next_steps')}
        >
          <TrendingUp size={15} />
          <span>Recommended Next Steps</span>
        </button>
      </div>

      {/* 4. Tab Content Sections */}
      <div className="report-tab-content">
        {/* TAB 1: Strengths & Growth Areas */}
        {activeTab === 'strengths' && (
          <div className="strengths-tab-layout">
            {/* Strengths Column */}
            <div className="report-col-card">
              <div className="col-card-header green">
                <CheckCircle2 size={18} color="#10b981" />
                <h3 className="col-card-title">Key Strengths Demonstrated</h3>
              </div>
              <div className="evidence-items-list">
                {strengths.map((s, idx) => (
                  <div key={idx} className="evidence-item strength">
                    <h4 className="evidence-point">{s.point}</h4>
                    {s.evidence && (
                      <p className="evidence-quote">
                        <span className="quote-mark">“</span>
                        {s.evidence}
                        <span className="quote-mark">”</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Areas to Improve Column */}
            <div className="report-col-card">
              <div className="col-card-header amber">
                <AlertTriangle size={18} color="#f59e0b" />
                <h3 className="col-card-title">Areas for Improvement</h3>
              </div>
              <div className="evidence-items-list">
                {areasToImprove.map((a, idx) => (
                  <div key={idx} className="evidence-item improvement">
                    <h4 className="evidence-point">{a.point}</h4>
                    {a.evidence && (
                      <p className="evidence-quote">
                        <span className="quote-mark">“</span>
                        {a.evidence}
                        <span className="quote-mark">”</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Missed Opportunities Box */}
            {missedOpportunities.length > 0 && (
              <div className="missed-opportunities-card">
                <div className="missed-header">
                  <Lightbulb size={18} color="#0066ff" />
                  <h4 className="missed-title">Strategic Missed Opportunities</h4>
                </div>
                <ul className="missed-list">
                  {missedOpportunities.map((m, idx) => (
                    <li key={idx} className="missed-item">
                      <ArrowRight size={14} color="#0066ff" style={{ flexShrink: 0, marginTop: '3px' }} />
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Improved Model Answers */}
        {activeTab === 'improved' && (
          <div className="improved-answers-tab">
            {improvedAnswers.length === 0 ? (
              <div className="empty-subtab-card">
                <CheckCircle2 size={28} color="#10b981" />
                <p>Your responses were concise and structured appropriately throughout the session.</p>
              </div>
            ) : (
              improvedAnswers.map((item, idx) => (
                <div key={idx} className="improved-answer-card">
                  <div className="improved-q-header">
                    <span className="improved-q-number">Question {idx + 1}</span>
                    <h3 className="improved-q-title">"{item.question}"</h3>
                  </div>

                  {item.originalAnswer && (
                    <div className="original-answer-box">
                      <span className="diff-label original">What You Said:</span>
                      <p className="original-answer-text">"{item.originalAnswer}"</p>
                    </div>
                  )}

                  {item.critique && (
                    <div className="critique-box">
                      <span className="diff-label critique">Interviewer Feedback:</span>
                      <p className="critique-text">{item.critique}</p>
                    </div>
                  )}

                  {item.strongerAnswer && (
                    <div className="model-answer-box">
                      <div className="model-badge">
                        <Sparkles size={13} color="#10b981" />
                        <span>Recommended Model Answer</span>
                      </div>
                      <p className="model-answer-text">{item.strongerAnswer}</p>
                    </div>
                  )}

                  {item.whyStronger && (
                    <div className="why-stronger-box">
                      <span className="diff-label why">Why This Answer Succeeds:</span>
                      <p className="why-stronger-text">{item.whyStronger}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: Full Q&A Transcript */}
        {activeTab === 'transcript' && (
          <div className="transcript-tab-layout">
            {(!questionsAndAnswers || questionsAndAnswers.length === 0) ? (
              <div className="empty-subtab-card">
                <FileText size={24} color="#94a3b8" />
                <p>No questions recorded during this session.</p>
              </div>
            ) : (
              questionsAndAnswers.map((turn, idx) => (
                <div key={idx} className="qa-turn-card">
                  <div className="qa-turn-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="qa-turn-badge">Turn {idx + 1}</span>
                      {turn.isFollowUp && (
                        <span className="qa-followup-badge">
                          <Sparkles size={11} />
                          <span>Follow-up</span>
                        </span>
                      )}
                    </div>
                    <span className="qa-cat-tag">{turn.category || 'Interview'}</span>
                  </div>

                  <div className="qa-question-content">
                    <span className="speaker-label ai">AI Interviewer:</span>
                    <p className="speech-text ai">"{turn.text || turn.question}"</p>
                  </div>

                  <div className="qa-answer-content">
                    <span className="speaker-label user">You (Transcribed):</span>
                    <p className="speech-text user">
                      {turn.answer ? `"${turn.answer}"` : <em style={{ color: '#94a3b8' }}>(No verbal response recorded)</em>}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: Recommended Next Steps */}
        {activeTab === 'next_steps' && (
          <div className="next-steps-tab-layout">
            <div className="next-steps-card">
              <div className="next-steps-header">
                <TrendingUp size={20} color="#0066ff" />
                <h3 className="next-steps-title">Recommended Practice & Learning Drills</h3>
              </div>
              <div className="next-steps-list">
                {recommendedNextSteps.map((step, idx) => (
                  <div key={idx} className="next-step-item">
                    <div className="step-num-circle">{idx + 1}</div>
                    <div className="step-content">
                      <p className="step-text">{step}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Scientific Disclaimer for Unsupported Assessments */}
      <div className="unsupported-disclaimer-box">
        <ShieldCheck size={18} color="#0066ff" style={{ flexShrink: 0 }} />
        <p className="disclaimer-text">
          <strong>Scientific Integrity Notice: </strong>
          {unsupportedAssessmentsDisclaimer || 
            'Facial expressions, vocal emotional tone, and body language are not scored as they cannot be reliably measured from audio/transcripts. PrepPilot evaluates strictly based on verifiable speech content, clarity, structure, and problem-solving reasoning.'}
        </p>
      </div>
    </div>
  );
}
