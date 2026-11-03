import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, CheckCircle, XCircle, Trophy, Clock, 
  AlertCircle, Play, RotateCcw, Eye, X 
} from 'lucide-react';
import { courseAPI } from '../services/api';

export default function LectureQuiz({ lecture, onClose }) {
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState(null);
  const [attemptInfo, setAttemptInfo] = useState(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(null);
  
  // Quiz attempt state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [showExplanations, setShowExplanations] = useState({});

  useEffect(() => {
    fetchQuizData();
  }, [lecture._id]);

  const fetchQuizData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch lecture progress
      const progressRes = await courseAPI.getLectureProgress(lecture._id);
      const progressData = progressRes.data?.data?.progress || {};
      setProgress(progressData);

      // Try to fetch quiz (will fail if lecture not completed)
      try {
        const quizRes = await courseAPI.getQuiz(lecture._id);
        const quizData = quizRes.data?.data?.quiz || null;
        const attemptData = quizRes.data?.data?.attemptInfo || {};
        
        setQuiz(quizData);
        setAttemptInfo(attemptData);
        
        // Initialize answers array
        if (quizData) {
          setAnswers(new Array(quizData.questions.length).fill(null));
          
          // Set timer if quiz has duration
          if (quizData.duration > 0) {
            setTimeLeft(quizData.duration * 60); // Convert minutes to seconds
          }
        }
      } catch (err) {
        const errCode = err.response?.data?.error?.code;
        const errMsg = err.response?.data?.error?.message;
        
        if (errCode === 'LECTURE_NOT_COMPLETED') {
          setError(errMsg || 'Complete the lecture first to unlock the quiz');
        } else if (errCode === 'MAX_ATTEMPTS_REACHED') {
          setError(errMsg || 'You have reached the maximum number of attempts');
        } else {
          setError(errMsg || 'No quiz available for this lecture');
        }
      }
    } catch (err) {
      console.error('Error fetching quiz:', err);
      setError('Failed to load quiz data');
    } finally {
      setLoading(false);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || showResults) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleSubmit(); // Auto-submit when time runs out
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, showResults]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (optionIndex) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = optionIndex;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    // Check if all questions are answered
    const unanswered = answers.filter(a => a === null).length;
    if (unanswered > 0) {
      if (!confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`)) {
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const res = await courseAPI.submitQuiz(lecture._id, answers);
      const resultData = res.data?.data;
      
      setResults(resultData);
      setShowResults(true);
      setShowExplanations({}); // Reset all explanations to hidden
    } catch (err) {
      console.error('Error submitting quiz:', err);
      alert(err.response?.data?.error?.message || 'Failed to submit quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setCurrentQuestion(0);
    setAnswers(new Array(quiz.questions.length).fill(null));
    setResults(null);
    setShowResults(false);
    setShowExplanations({});
    if (quiz.duration > 0) {
      setTimeLeft(quiz.duration * 60);
    }
    fetchQuizData(); // Refresh to check attempt limits
  };

  const toggleExplanation = (index) => {
    setShowExplanations(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent" />
            <p className="text-slate-600">Loading quiz...</p>
          </div>
        </div>
      </div>
    );
  }

  // Locked state - lecture not completed
  if (error && !quiz) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-8 max-w-md w-full relative"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X size={20} />
          </button>

          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
              <Lock size={32} className="text-amber-600" />
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Quiz Locked</h3>
              <p className="text-slate-600 mb-4">{error}</p>
              
              {progress && (
                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-600">Watch Progress</span>
                    <span className="text-sm font-bold text-indigo-600">
                      {progress.watchedPercentage || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.watchedPercentage || 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {progress.isCompleted 
                      ? '✓ Lecture completed!'
                      : `Watch at least 95% to unlock the quiz`
                    }
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition"
            >
              Continue Watching
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Results view
  if (showResults && results) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        >
          {/* Fixed Header */}
          <div className="flex justify-between items-start p-6 border-b border-slate-200 shrink-0">
            <h2 className="text-2xl font-bold text-slate-900">Quiz Results</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Score card */}
            <div className={`rounded-xl p-6 mb-6 ${
              results.isPassed 
                ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200'
                : 'bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {results.isPassed ? (
                    <Trophy className="text-green-600" size={32} />
                  ) : (
                    <AlertCircle className="text-orange-600" size={32} />
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {results.isPassed ? 'Passed! 🎉' : 'Not Passed'}
                    </h3>
                    <p className="text-sm text-slate-600">
                      Attempt #{results.attemptNumber}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-slate-900">
                    {results.score.percentage}%
                  </div>
                  <div className="text-sm text-slate-600">
                    {results.score.correctCount}/{results.score.totalQuestions} correct
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-white/50 rounded-lg p-3">
                  <div className="text-slate-600">Time Taken</div>
                  <div className="font-bold text-slate-900">
                    {Math.floor(results.timeTaken / 60)}m {results.timeTaken % 60}s
                  </div>
                </div>
                <div className="bg-white/50 rounded-lg p-3">
                  <div className="text-slate-600">Passing Score</div>
                  <div className="font-bold text-slate-900">{results.passingScore}%</div>
                </div>
              </div>
            </div>

            {/* Question-wise results */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 text-lg">Question Breakdown</h4>
              {results.results.map((result, index) => (
                <div
                  key={index}
                  className={`border-2 rounded-xl p-4 ${
                    result.isCorrect
                      ? 'border-green-200 bg-green-50'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-1">
                      {result.isCorrect ? (
                        <CheckCircle className="text-green-600" size={24} />
                      ) : (
                        <XCircle className="text-red-600" size={24} />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {/* Question header with marks */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <p className="font-semibold text-slate-900 flex-1">
                          Q{index + 1}. {result.question}
                        </p>
                        <div className={`px-3 py-1 rounded-lg text-sm font-bold whitespace-nowrap ${
                          result.isCorrect 
                            ? 'bg-green-600 text-white' 
                            : 'bg-red-600 text-white'
                        }`}>
                          {result.isCorrect ? `+${result.marks || 1}` : '0'} / {result.marks || 1}
                        </div>
                      </div>
                      
                      {/* Options */}
                      <div className="space-y-2 mb-3">
                        {result.options.map((option, optIndex) => {
                          const isCorrect = optIndex === result.correctAnswer;
                          const isSelected = optIndex === result.studentAnswer;
                          
                          return (
                            <div
                              key={optIndex}
                              className={`p-3 rounded-lg text-sm font-medium ${
                                isCorrect
                                  ? 'bg-green-200 border-2 border-green-400 text-green-900'
                                  : isSelected
                                  ? 'bg-red-200 border-2 border-red-400 text-red-900'
                                  : 'bg-white border-2 border-slate-200 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="flex-1">{option}</span>
                                {isCorrect && (
                                  <span className="text-green-700 font-bold shrink-0">✓ Correct</span>
                                )}
                                {isSelected && !isCorrect && (
                                  <span className="text-red-700 font-bold shrink-0">✗ Your Answer</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* View Solution Button */}
                      {result.explanation && (
                        <div className="mt-3">
                          <button
                            onClick={() => toggleExplanation(index)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition"
                          >
                            <Eye size={16} />
                            {showExplanations[index] ? 'Hide Solution' : 'View Solution'}
                          </button>
                          
                          {/* Explanation (hidden by default) */}
                          <AnimatePresence>
                            {showExplanations[index] && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-3 p-4 bg-white rounded-lg border-2 border-indigo-200">
                                  <p className="text-xs font-bold text-indigo-600 mb-2 uppercase">
                                    💡 Explanation:
                                  </p>
                                  <p className="text-sm text-slate-800 leading-relaxed">
                                    {result.explanation}
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fixed Footer with Action buttons */}
          <div className="p-6 border-t border-slate-200 bg-slate-50 shrink-0">
            <div className="flex gap-3">
              {attemptInfo && attemptInfo.attemptsRemaining > 0 && !results.isPassed && (
                <button
                  onClick={handleRetry}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                >
                  <RotateCcw size={18} />
                  Try Again ({attemptInfo.attemptsRemaining} left)
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-slate-200 text-slate-900 font-semibold rounded-xl hover:bg-slate-300 transition"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Quiz taking view
  if (quiz && !showResults) {
    const question = quiz.questions[currentQuestion];
    const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{quiz.title}</h2>
              {quiz.description && (
                <p className="text-sm text-slate-600 mt-1">{quiz.description}</p>
              )}
            </div>
            {timeLeft !== null && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold ${
                timeLeft < 60 ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'
              }`}>
                <Clock size={18} />
                {formatTime(timeLeft)}
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600">
                Question {currentQuestion + 1} of {quiz.questions.length}
              </span>
              <span className="text-indigo-600 font-semibold">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {question.question}
            </h3>

            <div className="space-y-3">
              {question.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition ${
                    answers[currentQuestion] === index
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        answers[currentQuestion] === index
                          ? 'border-indigo-600 bg-indigo-600'
                          : 'border-slate-300'
                      }`}
                    >
                      {answers[currentQuestion] === index && (
                        <div className="w-3 h-3 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="font-medium text-slate-900">{option}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              className="px-6 py-3 bg-slate-200 text-slate-900 font-semibold rounded-xl hover:bg-slate-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {currentQuestion === quiz.questions.length - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Submit Quiz
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition"
              >
                Next
              </button>
            )}
          </div>

          {/* Answer status indicators */}
          <div className="mt-6 flex flex-wrap gap-2">
            {quiz.questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestion(index)}
                className={`w-10 h-10 rounded-lg font-bold text-sm transition ${
                  index === currentQuestion
                    ? 'bg-indigo-600 text-white'
                    : answers[index] !== null
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-slate-100 text-slate-600 border border-slate-300'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}
