/**
 * @file QuizDetail.js
 * @description Renders the quiz-taking interface, managing timer controls,
 * navigation between questions, answer tracking, and final result presentation.
 * This file has been cleaned for redundancy and simplified.
 * Functional behavior remains identical to previous version.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuiz, submitQuiz } from '../services/quizService';

/**
 * QuizDetail component delivers the full quiz experience including guarded
 * access, countdown management, answer persistence, and animated result views.
 */
const QuizDetail = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [displayedScore, setDisplayedScore] = useState(0);
  const animationRef = useRef(null);

  /**
   * Loads quiz metadata and initializes answer slots plus the countdown timer
   * based on the configured quiz duration.
   */
  const fetchQuiz = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getQuiz(id);
      setQuiz(data);
      
      // Initialize answers object with defensive checks
      const initialAnswers = {};
      if (data.questions && Array.isArray(data.questions)) {
        data.questions.forEach((question) => {
          initialAnswers[question.id] = null;
        });
      }
      setAnswers(initialAnswers);
      
      // Set timer using quiz duration (default to 60 minutes if not specified)
      const timeLimit = data.quiz?.duration || data.duration || 60;
      setTimeLeft(timeLimit * 60); // Convert minutes to seconds
    } catch (err) {
      setError('Failed to load quiz. Please try again.');
      console.error('Quiz fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  /**
   * Submits all recorded answers to the backend, stores the returned summary,
   * and resets transient quiz state for the next attempt.
   */
  const handleSubmitQuiz = useCallback(async () => {
    if (!user) {
      navigate('/login', { state: { from: `/quizzes/${id}` } });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitQuiz(id, { answers });
      setResults(result);
      setQuizCompleted(true);
      // Reset quiz state after submission
      setQuiz(null);
      setAnswers({});
      setTimeLeft(0);
      setDisplayedScore(0);
    } catch (err) {
      setError(err.toString());
    } finally {
      setIsSubmitting(false);
    }
  }, [user, navigate, id, answers]);

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: `/quizzes/${id}` } });
      return;
    }
    
    fetchQuiz();
  }, [id, user, navigate, fetchQuiz]);

  useEffect(() => {
    let timer;
    if (quiz && timeLeft > 0 && !quizCompleted) {
      timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && quiz && !quizCompleted) {
      handleSubmitQuiz();
    }
    
    return () => clearTimeout(timer);
  }, [timeLeft, quiz, quizCompleted, handleSubmitQuiz]);

  useEffect(() => {
    const clearAnimation = () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
    };

    if (quizCompleted && results) {
      const totalQuestions = results.totalQuestions ?? (results.questionResults?.length || 0);
      const correctCount = results.correctAnswers ?? (results.questionResults?.filter((r) => r.isCorrect).length || 0);
      const target = typeof results.score === 'number'
        ? Math.max(Math.round(results.score), 0)
        : totalQuestions > 0
          ? Math.round((correctCount / totalQuestions) * 100)
          : 0;

      clearAnimation();
      setDisplayedScore(0);
      const increment = Math.max(Math.ceil(target / 60), 1);

      animationRef.current = setInterval(() => {
        setDisplayedScore((prev) => {
          const next = prev + increment;
          if (next >= target) {
            clearAnimation();
            return target;
          }
          return next;
        });
      }, 16);
    } else {
      clearAnimation();
      if (!quizCompleted) {
        // TODO: Verify if score reset is still required for partial result animations.
        setDisplayedScore(0);
      }
    }

    return () => {
      clearAnimation();
    };
  }, [quizCompleted, results]);

  /**
   * Persists the selected answer for the current question while preserving
   * previously chosen responses.
   */
  const handleAnswerSelect = (questionId, optionIndex) => {
    setAnswers({
      ...answers,
      [questionId]: optionIndex
    });
  };

  /**
   * Advances the view to the subsequent question when available.
   */
  /**
   * Converts total seconds remaining into a mm:ss string for display.
   */
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  if (quizCompleted && results) {
    const totalQuestions = results.totalQuestions ?? (results.questionResults?.length || 0);
    const correctCount = results.correctAnswers ?? (results.questionResults?.filter((r) => r.isCorrect).length || 0);
    const answeredCount = results.questionResults?.filter((r) => typeof r.userAnswerIndex === 'number').length || correctCount;
    const incorrectCount = Math.max(answeredCount - correctCount, 0);
    const unansweredCount = Math.max(totalQuestions - answeredCount, 0);
    const finalPercentage = typeof results.score === 'number'
      ? Math.max(Math.round(results.score), 0)
      : totalQuestions > 0
        ? Math.round((correctCount / totalQuestions) * 100)
        : 0;
    const animatedPercentage = Math.min(displayedScore, finalPercentage);
    const progressAngle = Math.min(animatedPercentage, 100) * 3.6;

    return (
      <div className="bg-white p-6 rounded-lg shadow-sm max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-6">Quiz Results</h1>

        <div className="flex flex-col items-center gap-4 mb-10">
          <div className="relative flex items-center justify-center">
            <div
              className="w-40 h-40 rounded-full flex items-center justify-center shadow-inner"
              style={{
                background: `conic-gradient(#2563eb ${progressAngle}deg, #DBEAFE ${progressAngle}deg 360deg)`
              }}
            >
              <div className="w-32 h-32 rounded-full bg-white flex items-center justify-center shadow-md">
                <span className="text-4xl font-bold text-primary-700">
                  {animatedPercentage}
                  <span className="text-xl text-primary-500">%</span>
                </span>
              </div>
            </div>
          </div>
          <p className="text-gray-600 text-center max-w-md">
            {animatedPercentage >= finalPercentage
              ? 'Great job! Here is the breakdown of your performance.'
              : 'Calculating your score...'}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <div className="p-4 rounded-xl border border-primary-100 bg-primary-50/60 text-center">
            <p className="text-sm uppercase tracking-wide text-primary-600 font-semibold">Points</p>
            <span className="text-4xl font-bold text-primary-700">{correctCount}/{totalQuestions}</span>
          </div>
          <div className="p-4 rounded-xl border border-green-100 bg-green-50/70 text-center">
            <p className="text-sm uppercase tracking-wide text-green-600 font-semibold">Correct</p>
            <span className="text-4xl font-bold text-green-700">{correctCount}</span>
          </div>
          <div className="p-4 rounded-xl border border-red-100 bg-red-50/70 text-center">
            <p className="text-sm uppercase tracking-wide text-red-600 font-semibold">Incorrect</p>
            <span className="text-4xl font-bold text-red-700">{incorrectCount}</span>
          </div>
          <div className="p-4 rounded-xl border border-gray-100 bg-gray-50 text-center">
            <p className="text-sm uppercase tracking-wide text-gray-600 font-semibold">Unanswered</p>
            <span className="text-4xl font-bold text-gray-800">{unansweredCount}</span>
          </div>
        </div>

        <div className="space-y-6">
          {results.questionResults && Array.isArray(results.questionResults) && results.questionResults.map((result, index) => (
            <div
              key={index}
              className={`p-5 rounded-xl border ${result.isCorrect ? 'border-green-200 bg-green-50/60' : 'border-red-200 bg-red-50/60'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-semibold mr-3">
                    {index + 1}
                  </span>
                  <span className="font-semibold text-gray-800 align-middle">{result.question}</span>
                </div>
                <span className={`text-sm font-medium ${result.isCorrect ? 'text-green-700' : 'text-red-600'}`}>
                  {result.isCorrect ? 'Correct' : 'Incorrect'}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {(result.options || []).map((option, optionIndex) => {
                  const isCorrectOption = typeof result.correctAnswerIndex === 'number' && optionIndex === result.correctAnswerIndex;
                  const isUserSelected = typeof result.userAnswerIndex === 'number' && optionIndex === result.userAnswerIndex;
                  const isUserCorrect = isCorrectOption && isUserSelected;

                  let optionClasses = 'border border-gray-200 bg-white';
                  if (isUserCorrect) {
                    optionClasses = 'border-green-300 bg-green-100';
                  } else if (isCorrectOption) {
                    optionClasses = 'border-green-200 bg-green-50';
                  } else if (isUserSelected) {
                    optionClasses = 'border-red-200 bg-red-50';
                  }

                  return (
                    <div
                      key={optionIndex}
                      className={`p-3 rounded-lg text-sm flex items-center justify-between ${optionClasses}`}
                    >
                      <span className="text-gray-800">{option}</span>
                      <div className="flex items-center gap-2">
                        {isUserSelected && (
                          <span className={`text-xs font-semibold ${isUserCorrect ? 'text-green-700' : 'text-red-600'}`}>
                            Your choice
                          </span>
                        )}
                        {isCorrectOption && (
                          <span className="text-xs font-semibold text-green-700">Correct answer</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {!result.isCorrect && (
                <div className="mt-3 text-sm text-red-700">
                  <span className="font-medium">Correct answer:</span> {result.correctAnswer}
                </div>
              )}

              {result.explanation && (
                <p className="text-sm mt-3 text-gray-700">
                  <span className="font-medium">Explanation:</span> {result.explanation}
                </p>
              )}
            </div>
          ))}
        </div>

        
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => navigate('/quizzes')}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  if (!quiz || !quiz.questions || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded" role="alert">
        <span className="block sm:inline">No quiz questions available.</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Quiz header */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">{quiz.title}</h1>
        <div className="flex justify-between items-center mt-4">
          <div>
            <span className="text-sm text-gray-500">
              {quiz.questions.length} Questions Total
            </span>
            <div className="text-xs text-primary-600 mt-1">
              Answered {Object.values(answers).filter(answer => answer !== null).length} of {quiz.questions.length}
            </div>
          </div>
          {timeLeft > 0 && (
            <div className="text-sm font-medium">
              Time remaining: <span className={`${timeLeft <= 300 ? 'text-red-600' : 'text-primary-600'}`}>{formatTime(timeLeft)}</span>
              {timeLeft <= 300 && (
                <span className="ml-2 text-red-600 animate-pulse">⚠️</span>
              )}
            </div>
          )}
        </div>
        <div className="space-y-2 mt-2">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-primary-600 h-2.5 rounded-full" 
              style={{ width: `${(Object.values(answers).filter(answer => answer !== null).length / quiz.questions.length) * 100}%` }}
            ></div>
          </div>
          {quiz?.duration && (
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full transition-colors ${timeLeft <= 300 ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${((quiz.duration * 60 - timeLeft) / (quiz.duration * 60)) * 100}%` }}
              ></div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Questions</h3>
        <div className="max-h-[60vh] overflow-y-auto space-y-6 pr-2">
          {(quiz.questions || []).map((question, questionIndex) => (
            <div key={question.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3 mb-4">
                <span className="flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-semibold">
                  {questionIndex + 1}
                </span>
                <h2 className="text-lg font-semibold text-gray-900">
                  {question.question || question.text}
                </h2>
              </div>

              <div className="space-y-3">
                {(question.options || []).map((option, optionIndex) => (
                  <div
                    key={optionIndex}
                    onClick={() => handleAnswerSelect(question.id, optionIndex)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors 
                      ${answers[question.id] === optionIndex
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-300 hover:border-gray-400'}`}
                  >
                    <div className="flex items-start">
                      <div className={`flex-shrink-0 h-5 w-5 border rounded-full flex items-center justify-center mr-2 
                        ${answers[question.id] === optionIndex
                          ? 'border-primary-500 bg-primary-500'
                          : 'border-gray-300'}`}
                      >
                        {answers[question.id] === optionIndex && (
                          <div className="h-2 w-2 rounded-full bg-white"></div>
                        )}
                      </div>
                      <span>{option}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSubmitQuiz}
          disabled={isSubmitting || Object.values(answers).some(answer => answer === null)}
          className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
        </button>
      </div>
    </div>
  );
};

export default QuizDetail;