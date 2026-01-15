/**
 * Quiz Agent
 *
 * Specialized agent for assessment generation and answer evaluation.
 * Integrates with:
 * - BKT for mastery updates after answers
 * - Knowledge Graph for concept-aware question generation
 * - Difficulty adaptation based on student state
 */

import { AgentBase, DEFAULT_AGENT_CONFIGS } from '../shared/AgentBase';
import {
  AgentConfig,
  AgentRequest,
  AgentResponse,
  AgentState,
  StudentState,
  QuizAction,
} from '../types';

/**
 * Quiz question structure
 */
export interface QuizQuestion {
  id: string;
  skillId: string;
  conceptId?: string;
  question: string;
  options: QuizOption[];
  correctAnswer: string; // Option ID
  difficulty: number;
  explanation: string;
  hints: string[];
  tags: string[];
}

/**
 * Quiz option
 */
export interface QuizOption {
  id: string; // A, B, C, D
  text: string;
  isCorrect: boolean;
  misconception?: string; // Why students might pick this wrong answer
}

/**
 * Answer evaluation result
 */
export interface AnswerEvaluation {
  isCorrect: boolean;
  selectedOption: string;
  correctOption: string;
  feedback: string;
  explanation: string;
  masteryUpdate: {
    previousMastery: number;
    newMastery: number;
    delta: number;
  };
  nextSteps: 'continue' | 'remediation' | 'celebrate';
}

/**
 * Quiz Agent - Assessment generation and evaluation
 */
export class QuizAgent extends AgentBase {
  private static instance: QuizAgent | null = null;

  private constructor(config: AgentConfig) {
    super(config);
  }

  /**
   * Get singleton instance
   */
  static getInstance(): QuizAgent {
    if (!QuizAgent.instance) {
      const defaultConfig = DEFAULT_AGENT_CONFIGS.quiz;
      QuizAgent.instance = new QuizAgent({
        id: 'quiz-agent',
        type: 'quiz',
        name: defaultConfig.name || 'Quiz Agent',
        description: defaultConfig.description || 'Assessment generation and evaluation',
        model: defaultConfig.model || 'gemini-flash',
        temperature: defaultConfig.temperature || 0.4,
        maxTokens: defaultConfig.maxTokens || 2000,
        systemPrompt: QUIZ_SYSTEM_PROMPT,
        tools: ['generate_question', 'evaluate_answer', 'update_bkt', 'get_skill_state'],
      });
    }
    return QuizAgent.instance;
  }

  /**
   * Register Quiz-specific tools
   */
  protected registerTools(): void {
    super.registerTools();

    // Question generation tool
    this.registerTool({
      name: 'generate_question',
      description: 'Generate a quiz question for a skill',
      parameters: [
        { name: 'skillId', type: 'string', description: 'Skill ID', required: true },
        { name: 'difficulty', type: 'number', description: 'Target difficulty (0-1)', required: true },
        { name: 'avoidQuestionIds', type: 'array', description: 'Questions to avoid', required: false },
      ],
      handler: async (params) => {
        return this.generateQuestion(
          params.skillId as string,
          params.difficulty as number,
          params.avoidQuestionIds as string[] | undefined
        );
      },
    });

    // Answer evaluation tool
    this.registerTool({
      name: 'evaluate_answer',
      description: 'Evaluate a student answer',
      parameters: [
        { name: 'questionId', type: 'string', description: 'Question ID', required: true },
        { name: 'answer', type: 'string', description: 'Student answer', required: true },
        { name: 'studentState', type: 'object', description: 'Current student state', required: true },
      ],
      handler: async (params, state) => {
        return this.evaluateAnswer(
          params.questionId as string,
          params.answer as string,
          state.studentState
        );
      },
    });

    // BKT update tool
    this.registerTool({
      name: 'update_bkt',
      description: 'Update BKT mastery for a skill',
      parameters: [
        { name: 'skillId', type: 'string', description: 'Skill ID', required: true },
        { name: 'correct', type: 'boolean', description: 'Was answer correct', required: true },
        { name: 'currentMastery', type: 'number', description: 'Current mastery level', required: true },
      ],
      handler: async (params) => {
        return this.calculateBKTUpdate(
          params.skillId as string,
          params.correct as boolean,
          params.currentMastery as number
        );
      },
    });

    // Skill state tool
    this.registerTool({
      name: 'get_skill_state',
      description: 'Get current skill state for a user',
      parameters: [
        { name: 'userId', type: 'string', description: 'User ID', required: true },
        { name: 'skillId', type: 'string', description: 'Skill ID', required: true },
      ],
      handler: async (params) => {
        // Will integrate with BKT service
        return { pMastery: 0.5, attempts: 0, correctCount: 0 };
      },
    });
  }

  /**
   * Main processing method
   */
  async process(request: AgentRequest): Promise<AgentResponse> {
    const startTime = Date.now();
    const { state, context } = request;

    try {
      // Determine if this is an answer or a request for a new question
      const isAnswerAttempt = this.isAnswerAttempt(request.message, context);

      if (isAnswerAttempt) {
        return this.handleAnswer(request, startTime);
      } else {
        return this.handleQuestionRequest(request, startTime);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResponse(
        request.requestId,
        errorMessage,
        "Let me try that again with a different question."
      );
    }
  }

  /**
   * Check if the message is an answer attempt
   */
  private isAnswerAttempt(message: string, context: { currentActivity?: { type: string } }): boolean {
    // Check if we're in a quiz context
    if (context.currentActivity?.type === 'quiz') {
      return true;
    }

    // Check if message looks like an answer
    const answerPattern = /^[a-d]$/i;
    return answerPattern.test(message.trim());
  }

  /**
   * Handle a quiz answer
   */
  private async handleAnswer(
    request: AgentRequest,
    startTime: number
  ): Promise<AgentResponse> {
    const { state, context } = request;
    const answer = this.extractAnswer(request.message);

    // Get current question from context
    const questionId = context.currentActivity?.contentId;
    const skillId = context.currentActivity?.contentId?.split('-')[0] || 'unknown';

    // Evaluate the answer
    const evaluation = await this.evaluateAnswer(
      questionId || 'unknown',
      answer,
      state.studentState
    );

    // Build response message
    const responseMessage = this.buildFeedbackMessage(evaluation, state.studentState);

    // Create quiz actions
    const actions: QuizAction[] = [
      {
        type: 'evaluate_answer',
        questionId,
        answer,
        isCorrect: evaluation.isCorrect,
        feedback: evaluation.feedback,
      },
      {
        type: 'update_bkt',
        bktUpdates: {
          [skillId]: evaluation.masteryUpdate.newMastery,
        },
      },
    ];

    // Determine next agent based on result
    let nextAgent = undefined;
    if (evaluation.nextSteps === 'remediation') {
      nextAgent = 'remediation' as const;
    } else if (evaluation.nextSteps === 'celebrate') {
      nextAgent = 'motivation' as const;
    }

    // Update student state
    const stateUpdates: Partial<AgentState> = {
      studentState: {
        ...state.studentState,
        consecutiveCorrect: evaluation.isCorrect
          ? state.studentState.consecutiveCorrect + 1
          : 0,
        consecutiveWrong: evaluation.isCorrect
          ? 0
          : state.studentState.consecutiveWrong + 1,
        masteryLevels: {
          ...state.studentState.masteryLevels,
          [skillId]: evaluation.masteryUpdate.newMastery,
        },
      },
    };

    const responseTimeMs = Date.now() - startTime;

    return this.createResponse(request.requestId, responseMessage, {
      actions,
      stateUpdates,
      nextAgent,
      responseTimeMs,
    });
  }

  /**
   * Handle request for a new question
   */
  private async handleQuestionRequest(
    request: AgentRequest,
    startTime: number
  ): Promise<AgentResponse> {
    const { state, context } = request;

    // Determine optimal difficulty
    const difficulty = this.calculateOptimalDifficulty(state.studentState);

    // Get target skill (from context or determine based on learning path)
    const skillId = context.atomId || 'general';

    // Generate question
    const question = await this.generateQuestion(skillId, difficulty);

    // Build response message
    const responseMessage = this.buildQuestionMessage(question);

    // Create actions
    const actions: QuizAction[] = [
      {
        type: 'show_question',
        questionId: question.id,
      },
    ];

    const responseTimeMs = Date.now() - startTime;

    return this.createResponse(request.requestId, responseMessage, {
      actions,
      stateUpdates: {
        currentContext: {
          ...context,
          currentActivity: {
            type: 'quiz',
            contentId: question.id,
            startedAt: new Date(),
            progress: 0,
            questionIndex: 0,
          },
        },
      },
      responseTimeMs,
    });
  }

  /**
   * Extract answer from message
   */
  private extractAnswer(message: string): string {
    const match = message.trim().match(/^([a-d])/i);
    return match ? match[1].toUpperCase() : message;
  }

  /**
   * Generate a quiz question
   */
  private async generateQuestion(
    skillId: string,
    difficulty: number,
    avoidQuestionIds?: string[]
  ): Promise<QuizQuestion> {
    // TODO: Integrate with question bank or LLM generation
    // For now, return placeholder
    return {
      id: `q-${skillId}-${Date.now()}`,
      skillId,
      question: this.getPlaceholderQuestion(skillId),
      options: [
        { id: 'A', text: 'Option A', isCorrect: false },
        { id: 'B', text: 'Option B', isCorrect: true },
        { id: 'C', text: 'Option C', isCorrect: false },
        { id: 'D', text: 'Option D', isCorrect: false },
      ],
      correctAnswer: 'B',
      difficulty,
      explanation: 'This is the explanation for the correct answer.',
      hints: ['Think about the core concept...', 'Consider what you learned about...'],
      tags: [skillId],
    };
  }

  /**
   * Get placeholder question text
   */
  private getPlaceholderQuestion(skillId: string): string {
    return `Based on what you've learned about ${skillId.replace(/-/g, ' ')}, which of the following is correct?`;
  }

  /**
   * Evaluate a student's answer
   */
  private async evaluateAnswer(
    questionId: string,
    answer: string,
    studentState: StudentState
  ): Promise<AnswerEvaluation> {
    // TODO: Look up question and evaluate
    // For now, simulate based on mastery
    const skillId = questionId.split('-')[1] || 'unknown';
    const currentMastery = studentState.masteryLevels[skillId] || 0.5;

    // Simulate correctness based on mastery + some randomness
    const predictedCorrect = currentMastery > 0.5;
    const isCorrect = answer === 'B'; // Placeholder - always B is correct

    // Calculate BKT update
    const masteryUpdate = this.calculateBKTUpdate(skillId, isCorrect, currentMastery);

    // Determine next steps
    let nextSteps: 'continue' | 'remediation' | 'celebrate' = 'continue';
    if (!isCorrect && studentState.consecutiveWrong >= 1) {
      nextSteps = 'remediation';
    } else if (isCorrect && masteryUpdate.newMastery >= 0.95) {
      nextSteps = 'celebrate';
    }

    return {
      isCorrect,
      selectedOption: answer,
      correctOption: 'B',
      feedback: isCorrect
        ? this.getPositiveFeedback(studentState.consecutiveCorrect + 1)
        : this.getEncouragingFeedback(studentState.consecutiveWrong + 1),
      explanation: 'This is the detailed explanation...',
      masteryUpdate,
      nextSteps,
    };
  }

  /**
   * Calculate BKT mastery update
   */
  private calculateBKTUpdate(
    skillId: string,
    correct: boolean,
    currentMastery: number
  ): { previousMastery: number; newMastery: number; delta: number } {
    // Simplified BKT update (will integrate with actual BKT service)
    const pT = 0.3; // Learning rate
    const pG = 0.25; // Guess rate
    const pS = 0.1; // Slip rate

    let newMastery: number;

    if (correct) {
      const pCorrect = currentMastery * (1 - pS) + (1 - currentMastery) * pG;
      const pLGivenCorrect = (currentMastery * (1 - pS)) / pCorrect;
      newMastery = pLGivenCorrect + (1 - pLGivenCorrect) * pT;
    } else {
      const pIncorrect = currentMastery * pS + (1 - currentMastery) * (1 - pG);
      const pLGivenIncorrect = (currentMastery * pS) / pIncorrect;
      newMastery = pLGivenIncorrect + (1 - pLGivenIncorrect) * pT;
    }

    // Clamp to valid range
    newMastery = Math.max(0, Math.min(1, newMastery));

    return {
      previousMastery: currentMastery,
      newMastery,
      delta: newMastery - currentMastery,
    };
  }

  /**
   * Calculate optimal difficulty based on student state
   */
  private calculateOptimalDifficulty(studentState: StudentState): number {
    const masteryValues = Object.values(studentState.masteryLevels);
    const avgMastery =
      masteryValues.length > 0
        ? masteryValues.reduce((a, b) => a + b, 0) / masteryValues.length
        : 0.5;

    // Slightly above current level for optimal challenge
    let optimal = avgMastery + 0.1;

    // Adjust based on recent performance
    if (studentState.consecutiveCorrect >= 3) {
      optimal += 0.1;
    } else if (studentState.consecutiveWrong >= 2) {
      optimal -= 0.1;
    }

    return Math.max(0.2, Math.min(0.9, optimal));
  }

  /**
   * Get positive feedback for correct answers
   */
  private getPositiveFeedback(streak: number): string {
    const feedbacks = [
      '✓ Correct!',
      '✓ Nice work!',
      '✓ Exactly right!',
      '✓ You got it!',
      '✓ Perfect!',
    ];

    if (streak >= 3) {
      return `🔥 ${streak} in a row! ${feedbacks[Math.floor(Math.random() * feedbacks.length)]}`;
    }

    return feedbacks[Math.floor(Math.random() * feedbacks.length)];
  }

  /**
   * Get encouraging feedback for wrong answers
   */
  private getEncouragingFeedback(wrongStreak: number): string {
    if (wrongStreak >= 2) {
      return "That's not quite it. Would you like a hint or an explanation?";
    }
    return "Not quite, but you're learning! Let me explain...";
  }

  /**
   * Build the question message for display
   */
  private buildQuestionMessage(question: QuizQuestion): string {
    const options = question.options
      .map((opt) => `${opt.id}. ${opt.text}`)
      .join('\n');

    return `${question.question}\n\n${options}`;
  }

  /**
   * Build feedback message based on evaluation
   */
  private buildFeedbackMessage(
    evaluation: AnswerEvaluation,
    studentState: StudentState
  ): string {
    let message = evaluation.feedback;

    if (!evaluation.isCorrect) {
      message += `\n\nThe correct answer was ${evaluation.correctOption}.`;
      message += `\n\n${evaluation.explanation}`;
    }

    // Add mastery update info
    const delta = evaluation.masteryUpdate.delta;
    if (delta > 0.05) {
      message += `\n\n📈 Your understanding improved!`;
    }

    return message;
  }

  /**
   * Build user prompt for LLM-based question generation
   */
  protected buildUserPrompt(request: AgentRequest): string {
    const { state, context } = request;

    return `
Generate a quiz question for the student.

Context:
- Current skill: ${context.atomId || 'general'}
- Student mastery: ${state.studentState.masteryLevels[context.atomId || ''] || 'unknown'}
- Consecutive correct: ${state.studentState.consecutiveCorrect}
- Consecutive wrong: ${state.studentState.consecutiveWrong}

Requirements:
1. Question should test understanding, not just recall
2. Include 4 options (A-D) with only one correct
3. Wrong options should reflect common misconceptions
4. Difficulty should match student level
5. Include brief explanation for correct answer

User message: "${request.message}"
    `.trim();
  }
}

/**
 * Quiz Agent System Prompt
 */
const QUIZ_SYSTEM_PROMPT = `You are the Quiz Agent for the Aptly Learning Platform.

Your role is to generate assessments and evaluate student answers.

Core responsibilities:
1. Generate questions that test understanding (not just recall)
2. Evaluate answers and provide meaningful feedback
3. Update BKT mastery based on performance
4. Adapt difficulty to maintain optimal challenge
5. Identify misconceptions from wrong answers

Question design principles:
- Questions should require application of knowledge
- Wrong options should reflect real misconceptions
- Include context when helpful
- Vary question formats (MCQ, true/false, fill-in)

Feedback principles:
- Always explain WHY the answer is correct/incorrect
- Connect feedback to underlying concepts
- Be encouraging even on wrong answers
- Suggest next steps (continue, review, or get help)

When students struggle:
- Suggest moving to the Remediation Agent
- Lower difficulty on next question
- Provide hints before giving up
`;

/**
 * Export singleton getter
 */
export function getQuizAgent(): QuizAgent {
  return QuizAgent.getInstance();
}
