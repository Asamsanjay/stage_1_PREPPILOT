// Test conversational multi-turn loop with live Gemini API
import { getFirstInterviewQuestion, getNextInterviewQuestion } from '../src/utils/aiInterviewerService.js';

async function testFullConversationLoop() {
  console.log('Testing Automated Multi-Turn Conversation Loop with live Gemini Flash...\n');

  const config = {
    interviewType: 'Technical Interview',
    jobRole: 'Full Stack Engineer',
    experienceLevel: 'Intermediate',
    difficulty: 'Medium',
    duration: '10 minutes'
  };

  // Step 1: First question
  console.log('--- TURN 1: Opening Question ---');
  const q1 = await getFirstInterviewQuestion(config);
  console.log('AI Asked:', q1.question);
  console.log('Category:', q1.category);
  console.log('Tip:', q1.tip);

  // Step 2: User answers Turn 1 verbally (e.g. speech recognized)
  const answer1 = "In my previous project, we migrated our REST APIs to GraphQL using Apollo Server. We had complex nested relational queries and needed to eliminate over-fetching on mobile devices. For caching, we implemented Redis to store query response fragments.";
  console.log('\nUser Spoke Answer 1:', answer1);

  // Step 3: AI processes Answer 1 and responds
  console.log('\n--- TURN 2: AI Conversational Reaction & Follow-up ---');
  const history = [
    { question: q1.question, answer: answer1 }
  ];

  const q2 = await getNextInterviewQuestion({
    config,
    history,
    latestAnswer: answer1,
    remainingMinutes: 8
  });

  console.log('AI Conversational Transition:', q2.conversationalTransition);
  console.log('AI Question / Follow-up:', q2.question);
  console.log('AI Full Spoken Response:', q2.spokenResponse);
  console.log('Is Follow-up:', q2.isFollowUp);
  console.log('Follow-up Reason:', q2.followUpReason);

  // Step 4: User answers Turn 2
  const answer2 = "To handle cache invalidation in Redis, we tied invalidations to mutation events. Whenever a user published an update mutation, our resolver emitted a cache bust key pattern in Redis, and we set a strict TTL of 15 minutes as a fallback.";
  console.log('\nUser Spoke Answer 2:', answer2);

  // Step 5: AI processes Answer 2
  console.log('\n--- TURN 3: AI Reaction & Next Question ---');
  const history2 = [
    { question: q1.question, answer: answer1 },
    { question: q2.question, answer: answer2 }
  ];

  const q3 = await getNextInterviewQuestion({
    config,
    history: history2,
    latestAnswer: answer2,
    remainingMinutes: 6
  });

  console.log('AI Full Spoken Response:', q3.spokenResponse);
  console.log('Category:', q3.category);

  console.log('\nMULTI-TURN CONVERSATION LOOP VERIFIED SUCCESSFULLY!');
}

testFullConversationLoop().catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});
