import React, { useState, useEffect } from 'react';
import { createQuiz, updateQuiz } from '../services/adminService';

const QuizForm = ({ quiz, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    scheduled_time: '',
    duration: 60,
    questions: [{ question: '', options: { options: ['', '', '', ''] }, correct_option: 0, difficulty: 'Easy' }]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (quiz) {
      setFormData({
        title: quiz.title || '',
        description: quiz.description || '',
        category: quiz.category || '',
        scheduled_time: quiz.scheduled_time ? new Date(quiz.scheduled_time).toISOString().slice(0, 16) : '',
        duration: quiz.duration || 60,
        questions: quiz.questions || [{ question: '', options: { options: ['', '', '', ''] }, correct_option: 0, difficulty: 'Easy' }]
      });
    }
  }, [quiz]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleQuestionChange = (index, field, value) => {
    setFormData(prev => {
      const questions = [...prev.questions];
      if (field === 'options') {
        questions[index] = { ...questions[index], options: { options: value } };
      } else {
        questions[index] = { ...questions[index], [field]: value };
      }
      return { ...prev, questions };
    });
  };

  const handleOptionChange = (questionIndex, optionIndex, value) => {
    setFormData(prev => {
      const questions = [...prev.questions];
      const options = [...questions[questionIndex].options.options];
      options[optionIndex] = value;
      questions[questionIndex] = { ...questions[questionIndex], options: { options } };
      return { ...prev, questions };
    });
  };

  const addQuestion = () => {
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, { question: '', options: { options: ['', '', '', ''] }, correct_option: 0, difficulty: 'Easy' }]
    }));
  };

  const removeQuestion = (index) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formattedQuestions = (formData.questions || []).map((question) => {
        const optionArray = Array.isArray(question.options)
          ? question.options
          : Array.isArray(question.options?.options)
            ? question.options.options
            : [];

        return {
          question: question.question?.trim() || '',
          options: {
            options: optionArray.map((option) => option ?? '')
          },
          correct_option: Number(question.correct_option) || 0,
          difficulty: question.difficulty || 'Medium'
        };
      });

      const scheduledTimeValid = formData.scheduled_time && !Number.isNaN(new Date(formData.scheduled_time).valueOf());

      const submitData = {
        title: formData.title?.trim() || '',
        description: formData.description?.trim() || '',
        category: formData.category?.trim() || '',
        duration: Number(formData.duration) || 60,
        scheduled_time: scheduledTimeValid ? new Date(formData.scheduled_time).toISOString() : new Date().toISOString(),
        questions: formattedQuestions
      };

      if (quiz) {
        await updateQuiz(quiz.id, submitData);
      } else {
        await createQuiz(submitData);
      }
      onSave();
    } catch (err) {
      setError(err.message || 'Failed to save quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-6 w-11/12 max-w-4xl card animate-fade-in">
        <div className="mt-3">
          <h3 className="text-xl font-semibold mb-6">
            {quiz ? 'Edit Quiz' : 'Create New Quiz'}
          </h3>
          
          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Category</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                  placeholder="Programming, Computer Science, etc."
                />
              </div>
            </div>

            <div>
              <label className="form-label">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows="3"
                className="form-textarea"
                placeholder="Brief description of the quiz"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Scheduled Time</label>
                <input
                  type="datetime-local"
                  name="scheduled_time"
                  value={formData.scheduled_time}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Duration (minutes)</label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  min="1"
                  max="300"
                  required
                  className="form-input"
                  placeholder="60"
                />
              </div>
            </div>

            <div>
              <label className="form-label mb-2">Questions</label>
              {formData.questions.map((question, questionIndex) => (
                <div key={questionIndex} className="card p-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">Question {questionIndex + 1}</h4>
                    {formData.questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(questionIndex)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">Question Text</label>
                      <textarea
                        value={question.question}
                        onChange={(e) => handleQuestionChange(questionIndex, 'question', e.target.value)}
                        rows={2}
                        className="form-textarea"
                      />
                    </div>

                    <div>
                      <label className="form-label mb-2">Options</label>
                      {question.options.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center mb-2">
                          <input
                            type="radio"
                            name={`correct_${questionIndex}`}
                            checked={question.correct_option === optionIndex}
                            onChange={() => handleQuestionChange(questionIndex, 'correct_option', optionIndex)}
                            className="mr-2"
                          />
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => handleOptionChange(questionIndex, optionIndex, e.target.value)}
                            placeholder={`Option ${optionIndex + 1}`}
                            className="form-input flex-1"
                          />
                        </div>
                      ))}
                    </div>

                    <div>
                      <label className="form-label">Difficulty</label>
                      <select
                        value={question.difficulty}
                        onChange={(e) => handleQuestionChange(questionIndex, 'difficulty', e.target.value)}
                        className="form-select"
                      >
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addQuestion}
                className="btn btn-secondary"
              >
                Add Question
              </button>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={onCancel}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? 'Saving...' : (quiz ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QuizForm;
