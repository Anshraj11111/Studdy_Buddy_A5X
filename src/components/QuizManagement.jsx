import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, ChevronDown, ChevronUp } from 'lucide-react';
import { adminAPI } from '../services/api';

export default function QuizManagement({ showToast }) {
  const [quizzes, setQuizzes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [modules, setModules] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [expandedQuiz, setExpandedQuiz] = useState(null);

  const [formData, setFormData] = useState({
    courseId: '',
    moduleId: '',
    lectureId: '',
    title: '',
    description: '',
    passingScore: 60,
    duration: 0,
    maxAttempts: 3,
    questions: [],
  });

  useEffect(() => {
    fetchCourses();
    fetchQuizzes();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await adminAPI.getAllCourses({ page: 1, limit: 100 });
      setCourses(res.data?.data?.courses || []);
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  const fetchModules = async (courseId) => {
    try {
      const res = await adminAPI.getCourseModules(courseId);
      setModules(res.data?.data?.modules || []);
    } catch (err) {
      console.error('Error fetching modules:', err);
    }
  };

  const fetchLectures = async (moduleId) => {
    try {
      console.log('📚 Fetching lectures for module:', moduleId);
      const res = await adminAPI.getModuleLectures(moduleId);
      console.log('📚 Lectures response:', res.data);
      const lecturesList = res.data?.data?.lectures || [];
      console.log('📚 Lectures found:', lecturesList.length, lecturesList);
      setLectures(lecturesList);
    } catch (err) {
      console.error('Error fetching lectures:', err);
    }
  };

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getAllQuizzes();
      setQuizzes(res.data?.data?.quizzes || []);
    } catch (err) {
      console.error('Error fetching quizzes:', err);
      showToast?.('Failed to fetch quizzes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCourseChange = (courseId) => {
    setFormData({ ...formData, courseId, moduleId: '', lectureId: '' });
    setModules([]);
    setLectures([]);
    if (courseId) fetchModules(courseId);
  };

  const handleModuleChange = (moduleId) => {
    console.log('📂 Module selected:', moduleId);
    setFormData({ ...formData, moduleId, lectureId: '' });
    setLectures([]);
    if (moduleId) {
      console.log('📂 Fetching lectures for module:', moduleId);
      fetchLectures(moduleId);
    }
  };

  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [
        ...formData.questions,
        {
          question: '',
          options: ['', '', '', ''],
          correctAnswer: 0,
          explanation: '',
          marks: 1,
        },
      ],
    });
  };

  const updateQuestion = (index, field, value) => {
    const newQuestions = [...formData.questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setFormData({ ...formData, questions: newQuestions });
  };

  const updateOption = (qIndex, oIndex, value) => {
    const newQuestions = [...formData.questions];
    newQuestions[qIndex].options[oIndex] = value;
    setFormData({ ...formData, questions: newQuestions });
  };

  const removeQuestion = (index) => {
    const newQuestions = formData.questions.filter((_, i) => i !== index);
    setFormData({ ...formData, questions: newQuestions });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.lectureId) {
      showToast?.('Please select a lecture', 'error');
      return;
    }

    if (formData.questions.length === 0) {
      showToast?.('Add at least one question', 'error');
      return;
    }

    try {
      if (editingQuiz) {
        await adminAPI.updateQuiz(editingQuiz._id, formData);
        showToast?.('Quiz updated successfully', 'success');
      } else {
        await adminAPI.createQuiz(formData);
        showToast?.('Quiz created successfully', 'success');
      }
      
      resetForm();
      fetchQuizzes();
    } catch (err) {
      console.error('Error saving quiz:', err);
      showToast?.(err.response?.data?.error?.message || 'Failed to save quiz', 'error');
    }
  };

  const handleEdit = (quiz) => {
    setEditingQuiz(quiz);
    setFormData({
      courseId: quiz.courseId._id,
      moduleId: quiz.moduleId._id,
      lectureId: quiz.lectureId._id,
      title: quiz.title,
      description: quiz.description || '',
      passingScore: quiz.passingScore,
      duration: quiz.duration,
      maxAttempts: quiz.maxAttempts,
      questions: quiz.questions.map(q => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || '',
        marks: q.marks || 1,
      })),
    });
    fetchModules(quiz.courseId._id);
    fetchLectures(quiz.moduleId._id);
    setShowCreateModal(true);
  };

  const handleDelete = async (quizId) => {
    if (!confirm('Are you sure you want to delete this quiz?')) return;

    try {
      await adminAPI.deleteQuiz(quizId);
      showToast?.('Quiz deleted successfully', 'success');
      fetchQuizzes();
    } catch (err) {
      console.error('Error deleting quiz:', err);
      showToast?.('Failed to delete quiz', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      courseId: '',
      moduleId: '',
      lectureId: '',
      title: '',
      description: '',
      passingScore: 60,
      duration: 0,
      maxAttempts: 3,
      questions: [],
    });
    setEditingQuiz(null);
    setShowCreateModal(false);
    setModules([]);
    setLectures([]);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Quiz Management</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold"
        >
          <Plus size={18} />
          Create Quiz
        </button>
      </div>

      {/* Quizzes List */}
      <div className="space-y-4">
        {quizzes.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-xl">
            <p className="text-slate-400">No quizzes found. Create one to get started!</p>
          </div>
        ) : (
          quizzes.map((quiz) => (
            <div
              key={quiz._id}
              className="bg-white/5 rounded-xl p-4 border border-white/10"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">{quiz.title}</h3>
                  <p className="text-sm text-slate-400 mb-2">{quiz.description}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded">
                      {quiz.courseId?.title}
                    </span>
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded">
                      {quiz.moduleId?.title}
                    </span>
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded">
                      {quiz.lectureId?.title}
                    </span>
                    <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded">
                      {quiz.questions.length} Questions
                    </span>
                    <span className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded">
                      Pass: {quiz.passingScore}%
                    </span>
                    {quiz.duration > 0 && (
                      <span className="px-2 py-1 bg-red-500/20 text-red-300 rounded">
                        {quiz.duration} min
                      </span>
                    )}
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded">
                      Max attempts: {quiz.maxAttempts || 'Unlimited'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setExpandedQuiz(expandedQuiz === quiz._id ? null : quiz._id)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded transition"
                  >
                    {expandedQuiz === quiz._id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  <button
                    onClick={() => handleEdit(quiz)}
                    className="p-2 text-blue-400 hover:text-white hover:bg-blue-500/20 rounded transition"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(quiz._id)}
                    className="p-2 text-red-400 hover:text-white hover:bg-red-500/20 rounded transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Expanded questions view */}
              {expandedQuiz === quiz._id && (
                <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                  {quiz.questions.map((q, idx) => (
                    <div key={idx} className="bg-white/5 rounded-lg p-3">
                      <p className="text-sm font-semibold text-white mb-2">
                        Q{idx + 1}. {q.question}
                      </p>
                      <div className="space-y-1 text-xs">
                        {q.options.map((opt, optIdx) => (
                          <div
                            key={optIdx}
                            className={`p-2 rounded ${
                              optIdx === q.correctAnswer
                                ? 'bg-green-500/20 text-green-300 font-semibold'
                                : 'bg-white/5 text-slate-400'
                            }`}
                          >
                            {opt} {optIdx === q.correctAnswer && '✓'}
                          </div>
                        ))}
                      </div>
                      {q.explanation && (
                        <p className="text-xs text-slate-500 mt-2 italic">
                          Explanation: {q.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-900 rounded-2xl p-6 max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white">
                {editingQuiz ? 'Edit Quiz' : 'Create Quiz'}
              </h3>
              <button
                onClick={resetForm}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Course, Module, Lecture Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Course *
                  </label>
                  <select
                    value={formData.courseId}
                    onChange={(e) => handleCourseChange(e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    required
                  >
                    <option value="">Select Course</option>
                    {courses.map((course) => (
                      <option key={course._id} value={course._id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Module *
                  </label>
                  <select
                    value={formData.moduleId}
                    onChange={(e) => handleModuleChange(e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    required
                    disabled={!formData.courseId}
                  >
                    <option value="">Select Module</option>
                    {modules.map((module) => (
                      <option key={module._id} value={module._id}>
                        {module.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Lecture *
                  </label>
                  <select
                    value={formData.lectureId}
                    onChange={(e) => setFormData({ ...formData, lectureId: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    required
                    disabled={!formData.moduleId}
                  >
                    <option value="">Select Lecture</option>
                    {lectures.map((lecture) => (
                      <option key={lecture._id} value={lecture._id}>
                        {lecture.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quiz Details */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Quiz Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Passing Score (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.passingScore}
                    onChange={(e) => setFormData({ ...formData, passingScore: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Duration (minutes, 0 = no limit)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Max Attempts (0 = unlimited)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxAttempts}
                    onChange={(e) => setFormData({ ...formData, maxAttempts: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  />
                </div>
              </div>

              {/* Questions */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-bold text-white">Questions</h4>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold"
                  >
                    <Plus size={16} />
                    Add Question
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.questions.map((q, qIdx) => (
                    <div key={qIdx} className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex justify-between items-start mb-3">
                        <h5 className="font-semibold text-white">Question {qIdx + 1}</h5>
                        <button
                          type="button"
                          onClick={() => removeQuestion(qIdx)}
                          className="p-1 text-red-400 hover:text-white hover:bg-red-500/20 rounded transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <input
                          type="text"
                          value={q.question}
                          onChange={(e) => updateQuestion(qIdx, 'question', e.target.value)}
                          placeholder="Enter question"
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                          required
                        />

                        <div className="space-y-2">
                          <label className="text-xs text-slate-400">Options</label>
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx} className="flex gap-2">
                              <input
                                type="radio"
                                name={`correct-${qIdx}`}
                                checked={q.correctAnswer === oIdx}
                                onChange={() => updateQuestion(qIdx, 'correctAnswer', oIdx)}
                                className="mt-1"
                              />
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                                placeholder={`Option ${oIdx + 1}`}
                                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                                required
                              />
                            </div>
                          ))}
                        </div>

                        <input
                          type="text"
                          value={q.explanation}
                          onChange={(e) => updateQuestion(qIdx, 'explanation', e.target.value)}
                          placeholder="Explanation (optional)"
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                        />

                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-400">Marks:</label>
                          <input
                            type="number"
                            min="1"
                            value={q.marks}
                            onChange={(e) => updateQuestion(qIdx, 'marks', parseInt(e.target.value))}
                            className="w-20 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold"
                >
                  <Save size={18} />
                  {editingQuiz ? 'Update Quiz' : 'Create Quiz'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
