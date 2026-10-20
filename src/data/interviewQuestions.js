/**
 * PrepPilot Interviewer Question Bank
 * Curated realistic interview questions organized by Interview Type, Difficulty, and Experience Level.
 */

export const interviewQuestionsBank = {
  Technical: {
    Easy: [
      {
        id: 'tech_easy_1',
        text: 'Can you explain the difference between synchronous and asynchronous code execution?',
        category: 'Core Concepts',
        tip: 'Mention the event loop, callbacks, promises, and async/await with a brief real-world example.'
      },
      {
        id: 'tech_easy_2',
        text: 'What is the purpose of version control like Git, and how do you resolve merge conflicts?',
        category: 'Development Workflow',
        tip: 'Explain staging, commits, branches, and the systematic approach to conflict resolution.'
      },
      {
        id: 'tech_easy_3',
        text: 'How does state management work in modern frontend applications, and why is it important?',
        category: 'Architecture',
        tip: 'Contrast local component state with global or server state management.'
      },
      {
        id: 'tech_easy_4',
        text: 'Can you describe the difference between HTTP GET and POST requests, and when each should be used?',
        category: 'Networking & APIs',
        tip: 'Discuss idempotency, URL query parameters, request bodies, and caching.'
      },
      {
        id: 'tech_easy_5',
        text: 'What are database indexes, and how do they impact query read versus write performance?',
        category: 'Databases',
        tip: 'Explain B-trees, lookups speedups, and the overhead on insert/update operations.'
      }
    ],
    Medium: [
      {
        id: 'tech_med_1',
        text: 'How would you optimize the performance of a web application experiencing slow initial load times?',
        category: 'Performance Optimization',
        tip: 'Discuss bundle splitting, lazy loading, asset compression, caching, and server-side rendering.'
      },
      {
        id: 'tech_med_2',
        text: 'Explain the principles of RESTful API design. What makes an API truly RESTful?',
        category: 'API Architecture',
        tip: 'Mention resource URIs, standard HTTP methods, status codes, statelessness, and JSON payloads.'
      },
      {
        id: 'tech_med_3',
        text: 'How do you handle error boundaries and unhandled exceptions in client-side and server-side applications?',
        category: 'Reliability',
        tip: 'Cover try-catch blocks, centralized middleware, user-friendly fallback UIs, and error tracking tools.'
      },
      {
        id: 'tech_med_4',
        text: 'Compare SQL relational databases with NoSQL document stores. When would you choose one over the other?',
        category: 'Database Architecture',
        tip: 'Discuss ACID transactions, schema rigidity, horizontal scaling, and query complexity.'
      },
      {
        id: 'tech_med_5',
        text: 'What security best practices do you follow to protect web applications against XSS, CSRF, and SQL Injection?',
        category: 'Application Security',
        tip: 'Highlight input validation, sanitized output, prepared statements, and HTTP-only cookies.'
      }
    ],
    Hard: [
      {
        id: 'tech_hard_1',
        text: 'How would you architect a distributed, fault-tolerant system capable of processing 100,000 real-time events per second?',
        category: 'System Design',
        tip: 'Break down message queues like Kafka, partitioning, horizontal consumer scaling, and idempotency.'
      },
      {
        id: 'tech_hard_2',
        text: 'Explain how you diagnose and resolve memory leaks in a production Node.js or browser environment.',
        category: 'Debugging & Profiling',
        tip: 'Discuss heap snapshots, event listener leaks, circular references, and monitoring tools.'
      },
      {
        id: 'tech_hard_3',
        text: 'How would you implement a robust caching strategy that balances data freshness with high availability across multiple regions?',
        category: 'Distributed Systems',
        tip: 'Cover cache invalidation (TTL, write-through, write-behind), cache stampede mitigation, and CDN edge caching.'
      },
      {
        id: 'tech_hard_4',
        text: 'Walk me through how you would refactor a monolithic legacy codebase into microservices or modular monolith architecture without downtime.',
        category: 'Software Architecture',
        tip: 'Explain the Strangler Fig pattern, domain-driven design, API gateways, and canary deployments.'
      }
    ]
  },

  'HR / Behavioral': {
    Easy: [
      {
        id: 'hr_easy_1',
        text: 'Tell me about yourself, your educational or career background, and what drives your passion in this field.',
        category: 'Introduction',
        tip: 'Keep it to 2 minutes. Structure as Present, Past, and Future goals.'
      },
      {
        id: 'hr_easy_2',
        text: 'Why are you interested in joining our team, and what caught your attention about this role?',
        category: 'Company Fit',
        tip: 'Connect your personal career aspirations with the company mission and product.'
      },
      {
        id: 'hr_easy_3',
        text: 'What are your greatest professional strengths, and can you share an example of how you used them?',
        category: 'Self-Awareness',
        tip: 'Pick 2 tangible strengths backed by a concrete accomplishment.'
      },
      {
        id: 'hr_easy_4',
        text: 'Can you describe an area you consider a weakness, and what active steps you are taking to improve it?',
        category: 'Self-Awareness',
        tip: 'Choose a genuine developmental area and explain the proactive system you use to improve.'
      },
      {
        id: 'hr_easy_5',
        text: 'Where do you see your career heading in the next three to five years?',
        category: 'Career Vision',
        tip: 'Highlight skill growth, leadership impact, and commitment to continuous learning.'
      }
    ],
    Medium: [
      {
        id: 'hr_med_1',
        text: 'Describe a situation where you had a disagreement with a colleague or manager. How did you handle it and what was the outcome?',
        category: 'Conflict Resolution',
        tip: 'Use the STAR method: Situation, Task, Action, Result. Focus on respectful dialogue and finding common ground.'
      },
      {
        id: 'hr_med_2',
        text: 'Tell me about a time you made a significant mistake at work. How did you communicate it and what did you learn?',
        category: 'Accountability',
        tip: 'Demonstrate prompt ownership, calm mitigation, transparent communication, and preventive measures.'
      },
      {
        id: 'hr_med_3',
        text: 'How do you handle working with a team member who is struggling to meet their deadlines or quality standards?',
        category: 'Team Collaboration',
        tip: 'Show empathy, active listening, offering support without micromanaging, and collaborative problem-solving.'
      },
      {
        id: 'hr_med_4',
        text: 'Can you share an experience where you received critical or unexpected feedback? How did you respond?',
        category: 'Receptiveness',
        tip: 'Emphasize listening without defensiveness, asking clarifying questions, and implementing actionable changes.'
      }
    ],
    Hard: [
      {
        id: 'hr_hard_1',
        text: 'Tell me about a time when you had to advocate for a technical or product decision that went against senior consensus. How did you build support?',
        category: 'Influence & Persuasion',
        tip: 'Focus on data-driven arguments, stakeholder empathy, risk analysis, and finding compromises.'
      },
      {
        id: 'hr_hard_2',
        text: 'Describe a situation where team morale was low or burnout was imminent during a critical project. How did you help lead the team through it?',
        category: 'Resilience & Culture',
        tip: 'Highlight transparent prioritization, scope reduction, celebrating small wins, and emotional intelligence.'
      },
      {
        id: 'hr_hard_3',
        text: 'Can you give an example of navigating an ethical dilemma or a situation where business pressure clashed with technical integrity or customer privacy?',
        category: 'Integrity',
        tip: 'Demonstrate long-term thinking, principles over shortcuts, and constructive escalation.'
      }
    ]
  },

  Situational: {
    Easy: [
      {
        id: 'sit_easy_1',
        text: 'Imagine you are given a project task with incomplete or ambiguous requirements. What immediate steps do you take?',
        category: 'Ambiguity',
        tip: 'Explain requirement gathering, identifying stakeholders, drafting assumptions, and confirming acceptance criteria.'
      },
      {
        id: 'sit_easy_2',
        text: 'You have multiple urgent tasks assigned by different stakeholders for the same deadline. How do you prioritize them?',
        category: 'Time Management',
        tip: 'Discuss impact vs effort assessment, proactive communication with stakeholders, and resetting expectations.'
      },
      {
        id: 'sit_easy_3',
        text: 'A critical bug is reported in production thirty minutes before the end of your shift. How do you respond?',
        category: 'Incident Response',
        tip: 'Outline triage, rollback/hotfix assessment, customer communication, and post-incident review.'
      }
    ],
    Medium: [
      {
        id: 'sit_med_1',
        text: 'If a client or product manager demands a feature deadline that your team knows is technically impossible without cutting corners, how do you manage the conversation?',
        category: 'Stakeholder Negotiation',
        tip: 'Avoid a flat "no". Offer phased delivery, MVP scope trade-offs, and transparent risk explanations.'
      },
      {
        id: 'sit_med_2',
        text: 'Halfway through building a major feature, new company priorities render the work obsolete. How do you handle this pivot?',
        category: 'Adaptability',
        tip: 'Discuss emotional maturity, documenting work for potential future reuse, and quickly realigning with new goals.'
      },
      {
        id: 'sit_med_3',
        text: 'You notice that a standard team process or codebase architecture is causing repeated friction and delays. How do you propose and drive the change?',
        category: 'Initiative',
        tip: 'Highlight metrics gathering, writing a lightweight proposal or RFC, and piloting the change iteratively.'
      }
    ],
    Hard: [
      {
        id: 'sit_hard_1',
        text: 'Your production system suffers a major data corruption or security breach. Walk me through your hour-by-hour response from discovery to post-mortem.',
        category: 'Crisis Management',
        tip: 'Cover containment, forensic logging, emergency escalation, customer notification, and root-cause post-mortem.'
      },
      {
        id: 'sit_hard_2',
        text: 'You inherit a mission-critical project that is already two months behind schedule with an exhausted, disengaged team. What is your plan for the first two weeks?',
        category: 'Project Rescue',
        tip: 'Focus on 1-on-1 discovery, ruthlessly cutting scope to core value, unblocking team members, and establishing predictable cadences.'
      }
    ]
  },

  General: {
    Easy: [
      {
        id: 'gen_easy_1',
        text: 'Can you walk me through your typical approach when starting a brand new project from scratch?',
        category: 'Methodology',
        tip: 'Cover discovery, planning, tool selection, rapid prototyping, and iterative delivery.'
      },
      {
        id: 'gen_easy_2',
        text: 'How do you keep yourself up to date with rapid technological advancements and emerging industry trends?',
        category: 'Continuous Learning',
        tip: 'Mention specific blogs, open source projects, tech podcasts, documentation, or personal experiments.'
      },
      {
        id: 'gen_easy_3',
        text: 'What do you consider your greatest professional achievement so far, and why does it stand out to you?',
        category: 'Impact',
        tip: 'Quantify the outcome (time saved, revenue generated, bugs reduced) and your unique contribution.'
      }
    ],
    Medium: [
      {
        id: 'gen_med_1',
        text: 'How do you balance the trade-off between writing clean, scalable code and shipping features quickly to meet business demands?',
        category: 'Pragmatism',
        tip: 'Discuss technical debt management, modular design that permits future refactoring, and automated testing.'
      },
      {
        id: 'gen_med_2',
        text: 'Tell me about a complex technical concept or process you had to explain to a non-technical stakeholder or client. How did you do it?',
        category: 'Communication',
        tip: 'Use relatable analogies, avoid excessive jargon, and tie technical benefits directly to business goals.'
      }
    ],
    Hard: [
      {
        id: 'gen_hard_1',
        text: 'What is a strongly held technical or product opinion you had that you later completely changed your mind about? What caused the shift?',
        category: 'Intellectual Humility',
        tip: 'Show that you prioritize empirical evidence and pragmatic outcomes over dogmatism.'
      }
    ]
  }
};

/**
 * Get a set of relevant interview questions based on user setup configuration.
 * 
 * @param {Object} config
 * @param {string} [config.interviewType]
 * @param {string} [config.difficulty]
 * @param {string} [config.experienceLevel]
 * @param {number} [count=5]
 * @returns {Array<{ id: string, text: string, category: string, tip: string }>}
 */
export function getQuestionsForInterview(config = {}, count = 5) {
  const typeKey = config.interviewType && interviewQuestionsBank[config.interviewType]
    ? config.interviewType
    : 'HR / Behavioral';

  const diffKey = config.difficulty && ['Easy', 'Medium', 'Hard'].includes(config.difficulty)
    ? config.difficulty
    : 'Medium';

  const pool = interviewQuestionsBank[typeKey]?.[diffKey] || 
               interviewQuestionsBank[typeKey]?.['Easy'] || 
               interviewQuestionsBank['HR / Behavioral']['Easy'];

  // Shuffle and pick requested number of questions
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, count);

  // If pool has fewer than count, borrow from General or Easy tier of same type
  if (selected.length < count) {
    const backup = (interviewQuestionsBank[typeKey]?.['Easy'] || interviewQuestionsBank['General']['Easy'])
      .filter(q => !selected.some(s => s.id === q.id));
    selected.push(...backup.slice(0, count - selected.length));
  }

  return selected;
}
