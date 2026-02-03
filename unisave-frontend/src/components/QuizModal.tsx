import { useState, useEffect } from "react";
import { X, CheckCircle, XCircle, Brain } from "lucide-react";
import type { QuizQuestion, QuizOption } from "../types";

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizData: QuizQuestion[];
}

export function QuizModal({ isOpen, onClose, quizData }: QuizModalProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());

  // Reset state when modal opens/closes or quiz data changes
  useEffect(() => {
    if (isOpen && quizData.length > 0) {
      setCurrentQuestionIndex(0);
      setScore(0);
      setShowResult(false);
      setSelectedOption(null);
      setIsCorrect(null);
      setAnsweredQuestions(new Set());
    }
  }, [isOpen, quizData]);

  if (!isOpen || quizData.length === 0) return null;

  const currentQuestion = quizData[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quizData.length - 1;

  const handleOptionClick = (optionIndex: number) => {
    if (selectedOption !== null) return; // Already answered

    setSelectedOption(optionIndex);
    
    // Determine if the answer is correct
    let correct = false;
    if (Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0) {
      // Check if options is string array or object array
      if (typeof currentQuestion.options[0] === 'string') {
        // String array: check against correct_answer_index
        const correctIndex = currentQuestion.correct_answer_index ?? 0;
        correct = optionIndex === correctIndex;
      } else {
        // Object array: check is_correct property
        const option = currentQuestion.options[optionIndex] as QuizOption;
        correct = option?.is_correct ?? false;
      }
    }
    
    setIsCorrect(correct);

    if (correct) {
      setScore((prev) => prev + 1);
    }

    // Mark question as answered
    setAnsweredQuestions((prev) => new Set(prev).add(currentQuestion.id));
  };

  const handleNext = () => {
    if (isLastQuestion) {
      setShowResult(true);
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsCorrect(null);
    }
  };

  const handleClose = () => {
    setShowResult(false);
    setCurrentQuestionIndex(0);
    setScore(0);
    setSelectedOption(null);
    setIsCorrect(null);
    setAnsweredQuestions(new Set());
    onClose();
  };

  const handleGenerateMore = () => {
    // Mockup - just reset and close for now
    handleClose();
    // In the future, this could trigger a new quiz generation
  };

  // End Screen
  if (showResult) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
              Quiz Completed!
            </h2>
            <div className="text-4xl md:text-5xl font-bold text-blue-600 mb-4">
              {score}/{quizData.length}
            </div>
            <p className="text-gray-600 mb-6">
              {score === quizData.length
                ? "Perfect score! 🎉"
                : score >= quizData.length * 0.7
                ? "Great job! 👍"
                : "Keep practicing! 💪"}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-xl transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleGenerateMore}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl transition-colors"
              >
                Generate More
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active Question Screen
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-gray-800">Quiz</h2>
            <p className="text-sm text-gray-500">
              Question {currentQuestionIndex + 1} of {quizData.length}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close quiz"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Question Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mb-6">
            <h3 className="text-lg md:text-xl font-semibold text-gray-800 leading-relaxed">
              {currentQuestion.question}
            </h3>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedOption === index;
              
              // Determine if this option is correct
              let isOptionCorrect = false;
              if (typeof option === 'string') {
                // String array: check against correct_answer_index
                const correctIndex = currentQuestion.correct_answer_index ?? 0;
                isOptionCorrect = index === correctIndex;
              } else {
                // Object array: check is_correct property
                isOptionCorrect = (option as QuizOption).is_correct ?? false;
              }
              
              const showCorrect = selectedOption !== null && isOptionCorrect;
              const showIncorrect = isSelected && !isOptionCorrect;
              
              // Get option text
              const optionText = typeof option === 'string' ? option : (option as QuizOption).text;
              
              // Get letter prefix (A, B, C, D, E...)
              const optionLetter = String.fromCharCode(65 + index); // 65 is 'A' in ASCII

              let buttonClass = "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 font-medium ";
              
              if (showCorrect) {
                buttonClass += "bg-emerald-50 border-emerald-500 text-emerald-800";
              } else if (showIncorrect) {
                buttonClass += "bg-red-50 border-red-500 text-red-800";
              } else if (isSelected) {
                buttonClass += "bg-blue-50 border-blue-500 text-blue-800";
              } else {
                buttonClass += "bg-white border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50";
              }

              if (selectedOption !== null && !isSelected && !isOptionCorrect) {
                buttonClass += " opacity-60";
              }

              return (
                <button
                  key={index}
                  onClick={() => handleOptionClick(index)}
                  disabled={selectedOption !== null}
                  className={buttonClass}
                >
                  <div className="flex items-center gap-3">
                    {showCorrect && <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
                    {showIncorrect && <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
                    {!showCorrect && !showIncorrect && (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-400 flex-shrink-0" />
                    )}
                    <span className="font-bold text-gray-600 mr-1">{optionLetter}.</span>
                    <span className="flex-1">{optionText}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {selectedOption !== null && currentQuestion.explanation && (
            <div className={`mt-4 p-4 rounded-xl ${
              isCorrect ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"
            }`}>
              <p className="text-sm md:text-base text-gray-700">
                <span className="font-semibold">Explanation: </span>
                {currentQuestion.explanation}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Score: {score}/{currentQuestionIndex + 1}
            </div>
            {selectedOption !== null && (
              <button
                onClick={handleNext}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl transition-colors"
              >
                {isLastQuestion ? "Finish Quiz" : "Next"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

