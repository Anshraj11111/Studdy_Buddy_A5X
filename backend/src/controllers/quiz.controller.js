import Quiz from '../models/Quiz.js';
import QuizAttempt from '../models/QuizAttempt.js';
import LectureProgress from '../models/LectureProgress.js';
import Resource from '../models/Resource.js'; // Resources are lectures

/**
 * Get quiz for a lecture (only if lecture is 100% watched)
 * GET /api/lectures/:lectureId/quiz
 */
export const getQuiz = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const userId = req.user._id;

    // Check if lecture exists
    const lecture = await Resource.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({
        success: false,
        error: { message: 'Lecture not found' },
      });
    }

    // Check if user has completed watching the lecture
    const progress = await LectureProgress.findOne({ userId, lectureId });
    if (!progress || !progress.isCompleted) {
      return res.status(403).json({
        success: false,
        error: { 
          message: 'You must complete watching the lecture before accessing the quiz',
          code: 'LECTURE_NOT_COMPLETED',
          requiredPercentage: 95,
          currentPercentage: progress?.watchedPercentage || 0,
        },
      });
    }

    // Find quiz for this lecture
    const quiz = await Quiz.findOne({ lectureId, isActive: true });
    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: { message: 'No quiz available for this lecture' },
      });
    }

    // Check attempt count
    const attemptCount = await QuizAttempt.getAttemptCount(userId, quiz._id);
    if (quiz.maxAttempts > 0 && attemptCount >= quiz.maxAttempts) {
      return res.status(403).json({
        success: false,
        error: { 
          message: `Maximum attempts (${quiz.maxAttempts}) reached`,
          code: 'MAX_ATTEMPTS_REACHED',
          attemptCount,
          maxAttempts: quiz.maxAttempts,
        },
      });
    }

    // Get user's best attempt (if any)
    const bestAttempt = await QuizAttempt.getBestAttempt(userId, quiz._id);

    // Return quiz without correct answers
    res.json({
      success: true,
      data: {
        quiz: quiz.toSafeObject(),
        attemptInfo: {
          attemptCount,
          maxAttempts: quiz.maxAttempts,
          attemptsRemaining: quiz.maxAttempts > 0 ? quiz.maxAttempts - attemptCount : null,
          bestScore: bestAttempt ? bestAttempt.score.percentage : null,
          isPassed: bestAttempt ? bestAttempt.isPassed : false,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch quiz', code: 'SERVER_ERROR' },
    });
  }
};

/**
 * Start a new quiz attempt
 * POST /api/lectures/:lectureId/quiz/start
 */
export const startQuizAttempt = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const userId = req.user._id;

    // Verify lecture completion
    const progress = await LectureProgress.findOne({ userId, lectureId });
    if (!progress || !progress.isCompleted) {
      return res.status(403).json({
        success: false,
        error: { message: 'Lecture not completed', code: 'LECTURE_NOT_COMPLETED' },
      });
    }

    // Find quiz
    const quiz = await Quiz.findOne({ lectureId, isActive: true });
    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: { message: 'Quiz not found' },
      });
    }

    // Check attempt limit
    const attemptCount = await QuizAttempt.getAttemptCount(userId, quiz._id);
    if (quiz.maxAttempts > 0 && attemptCount >= quiz.maxAttempts) {
      return res.status(403).json({
        success: false,
        error: { message: 'Maximum attempts reached', code: 'MAX_ATTEMPTS_REACHED' },
      });
    }

    // Create new attempt
    const attempt = await QuizAttempt.create({
      userId,
      quizId: quiz._id,
      lectureId: quiz.lectureId,
      courseId: quiz.courseId,
      moduleId: quiz.moduleId,
      attemptNumber: attemptCount + 1,
      answers: [],
      status: 'in-progress',
    });

    res.json({
      success: true,
      data: {
        attemptId: attempt._id,
        attemptNumber: attempt.attemptNumber,
        startedAt: attempt.startedAt,
      },
    });
  } catch (error) {
    console.error('Error starting quiz attempt:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to start quiz attempt', code: 'SERVER_ERROR' },
    });
  }
};

/**
 * Submit quiz answers
 * POST /api/lectures/:lectureId/quiz/submit
 */
export const submitQuiz = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const { answers } = req.body; // Array of answer indexes
    const userId = req.user._id;

    // Validate input
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Answers array is required' },
      });
    }

    // Find quiz
    const quiz = await Quiz.findOne({ lectureId, isActive: true });
    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: { message: 'Quiz not found' },
      });
    }

    // Validate answer count
    if (answers.length !== quiz.questions.length) {
      return res.status(400).json({
        success: false,
        error: { 
          message: 'Answer count mismatch',
          expected: quiz.questions.length,
          received: answers.length,
        },
      });
    }

    // Check if user has already reached max attempts
    const attemptCount = await QuizAttempt.getAttemptCount(userId, quiz._id);
    if (quiz.maxAttempts > 0 && attemptCount >= quiz.maxAttempts) {
      return res.status(403).json({
        success: false,
        error: { message: 'Maximum attempts reached', code: 'MAX_ATTEMPTS_REACHED' },
      });
    }

    // Calculate score
    const scoreData = quiz.calculateScore(answers);

    // Create quiz attempt record
    const attempt = new QuizAttempt({
      userId,
      quizId: quiz._id,
      lectureId: quiz.lectureId,
      courseId: quiz.courseId,
      moduleId: quiz.moduleId,
      attemptNumber: attemptCount + 1,
      answers,
    });

    // Complete the attempt
    attempt.complete(scoreData);
    await attempt.save();

    // Return results with explanations
    const resultsWithExplanations = scoreData.results.map((result, index) => ({
      ...result,
      question: quiz.questions[index].question,
      options: quiz.questions[index].options,
      explanation: quiz.questions[index].explanation,
    }));

    res.json({
      success: true,
      data: {
        attemptId: attempt._id,
        score: {
          percentage: scoreData.percentage,
          correctCount: scoreData.correctCount,
          totalQuestions: scoreData.totalQuestions,
          earnedMarks: scoreData.earnedMarks,
          totalMarks: scoreData.totalMarks,
        },
        isPassed: scoreData.isPassed,
        passingScore: quiz.passingScore,
        attemptNumber: attempt.attemptNumber,
        timeTaken: attempt.timeTaken,
        results: resultsWithExplanations,
      },
    });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to submit quiz', code: 'SERVER_ERROR' },
    });
  }
};

/**
 * Get quiz attempt history for a lecture
 * GET /api/lectures/:lectureId/quiz/attempts
 */
export const getQuizAttempts = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const userId = req.user._id;

    const attempts = await QuizAttempt.find({ 
      userId, 
      lectureId,
      status: 'completed',
    })
    .sort({ completedAt: -1 })
    .select('-detailedResults'); // Don't send detailed results in list

    const bestAttempt = await QuizAttempt.getBestAttempt(userId, attempts[0]?.quizId);

    res.json({
      success: true,
      data: {
        attempts: attempts.map(a => ({
          attemptId: a._id,
          attemptNumber: a.attemptNumber,
          score: a.score,
          isPassed: a.isPassed,
          completedAt: a.completedAt,
          timeTaken: a.timeTaken,
        })),
        bestScore: bestAttempt?.score.percentage || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching quiz attempts:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch quiz attempts', code: 'SERVER_ERROR' },
    });
  }
};

/**
 * Get detailed results of a specific attempt
 * GET /api/quiz-attempts/:attemptId
 */
export const getAttemptDetails = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user._id;

    const attempt = await QuizAttempt.findOne({ 
      _id: attemptId, 
      userId,
    }).populate('quizId');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        error: { message: 'Quiz attempt not found' },
      });
    }

    const quiz = attempt.quizId;
    
    // Add question text and explanations to detailed results
    const resultsWithDetails = attempt.detailedResults.map((result, index) => ({
      ...result.toObject(),
      question: quiz.questions[index].question,
      options: quiz.questions[index].options,
      explanation: quiz.questions[index].explanation,
    }));

    res.json({
      success: true,
      data: {
        attempt: {
          attemptId: attempt._id,
          attemptNumber: attempt.attemptNumber,
          score: attempt.score,
          isPassed: attempt.isPassed,
          completedAt: attempt.completedAt,
          timeTaken: attempt.timeTaken,
          results: resultsWithDetails,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching attempt details:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch attempt details', code: 'SERVER_ERROR' },
    });
  }
};
