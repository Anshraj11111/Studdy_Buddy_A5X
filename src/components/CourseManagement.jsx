import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Plus, Edit2, Trash2, Loader2, X, Save, 
  Star, Users, Clock, Lock, Upload, Video, FileText 
} from 'lucide-react';
import { adminAPI } from '../services/api';
import { uploadToCloudinary } from '../utils/cloudinary';

const TOPICS = ['Robotics', 'Programming', 'AI/ML', 'IoT', 'Electronics', 'Entrepreneurship'];
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];
const LANGUAGES = ['English', 'Hindi', 'Hinglish'];

// Helper function to extract YouTube video ID
const getYouTubeVideoId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export default function CourseManagement({ showToast }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Protection: Disable right-click and dev tools shortcuts
  useEffect(() => {
    const disableRightClick = (e) => {
      e.preventDefault();
      return false;
    };

    const disableDevTools = (e) => {
      // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+S
      if (
        e.keyCode === 123 || // F12
        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) || // Ctrl+Shift+I/J
        (e.ctrlKey && e.keyCode === 85) || // Ctrl+U
        (e.ctrlKey && e.keyCode === 83) // Ctrl+S
      ) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('contextmenu', disableRightClick);
    document.addEventListener('keydown', disableDevTools);

    return () => {
      document.removeEventListener('contextmenu', disableRightClick);
      document.removeEventListener('keydown', disableDevTools);
    };
  }, []);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getAllCourses();
      setCourses(res.data?.data?.courses || []);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      showToast('Failed to load courses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this course? All modules and data will be removed.')) return;
    
    try {
      await adminAPI.deleteCourse(id);
      showToast('Course deleted successfully', 'success');
      fetchCourses();
    } catch (error) {
      console.error('Delete failed:', error);
      showToast('Failed to delete course', 'error');
    }
  };

  // View for managing modules when a course is selected
  if (selectedCourse) {
    return (
      <ModuleManagement 
        course={selectedCourse} 
        onBack={() => {
          setSelectedCourse(null);
          fetchCourses();
        }}
        showToast={showToast}
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Course Management</h2>
          <p className="mt-1 text-sm text-slate-500">Create and manage courses</p>
        </div>
        <button
          onClick={() => {
            setEditingCourse(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-purple-700"
        >
          <Plus size={18} />
          Create Course
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 size={40} className="animate-spin text-purple-600" />
        </div>
      )}

      {/* Courses Grid */}
      {!loading && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard
              key={course._id}
              course={course}
              onEdit={() => {
                setEditingCourse(course);
                setShowModal(true);
              }}
              onDelete={() => handleDelete(course._id)}
              onManageModules={() => setSelectedCourse(course)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && courses.length === 0 && (
        <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
          <BookOpen size={64} className="mb-4 text-slate-300" />
          <h3 className="text-lg font-bold text-slate-700">No courses yet</h3>
          <p className="mt-2 text-sm text-slate-500">Create your first course to get started</p>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <CourseFormModal
          course={editingCourse}
          onClose={() => {
            setShowModal(false);
            setEditingCourse(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setEditingCourse(null);
            fetchCourses();
            showToast(editingCourse ? 'Course updated' : 'Course created', 'success');
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// Course Card Component
function CourseCard({ course, onEdit, onDelete, onManageModules }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
    >
      {/* Thumbnail */}
      <div className="relative h-[140px] bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        {course.thumbnail && (
          <img src={course.thumbnail} alt={course.title} className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-2">
          {course.isPremium && (
            <span className="rounded-full bg-yellow-400 px-2 py-0.5 text-xs font-bold text-yellow-900">
              PREMIUM
            </span>
          )}
          {course.isActive ? (
            <span className="rounded-full bg-green-500 px-2 py-0.5 text-xs font-bold text-white">
              ACTIVE
            </span>
          ) : (
            <span className="rounded-full bg-slate-500 px-2 py-0.5 text-xs font-bold text-white">
              INACTIVE
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <span className="inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-600">
          {course.topic}
        </span>
        
        <h3 className="mt-2 line-clamp-2 text-sm font-bold text-slate-900">{course.title}</h3>
        
        {/* Stats */}
        <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Star size={12} className="fill-yellow-400 text-yellow-400" />
            <span>{course.rating || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users size={12} />
            <span>{course.enrolledCount || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Video size={12} />
            <span>{course.totalVideos || 0}</span>
          </div>
        </div>

        {/* Price */}
        {course.isPremium && (
          <div className="mt-3 text-lg font-bold text-purple-600">₹{course.price}</div>
        )}

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={onManageModules}
            className="flex-1 rounded-lg bg-indigo-50 py-2 text-xs font-bold text-indigo-600 transition hover:bg-indigo-100"
          >
            Modules ({course.modules?.length || 0})
          </button>
          <button
            onClick={onEdit}
            className="rounded-lg bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg bg-red-50 p-2 text-red-600 transition hover:bg-red-100"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Course Form Modal
function CourseFormModal({ course, onClose, onSuccess, showToast }) {
  const [loading, setLoading] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [form, setForm] = useState({
    title: course?.title || '',
    description: course?.description || '',
    topic: course?.topic || 'Robotics',
    difficulty: course?.difficulty || 'Beginner',
    language: course?.language || 'English',
    isPremium: course?.isPremium || false,
    price: course?.price || 0,
    thumbnail: course?.thumbnail || '',
    tags: course?.tags?.join(', ') || '',
    isActive: course?.isActive !== undefined ? course.isActive : true,
    isTrending: course?.isTrending || false,
    isBestseller: course?.isBestseller || false,
  });

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingThumb(true);
      const { url } = await uploadToCloudinary(file, 'studdy-buddy/courses');
      setForm(f => ({ ...f, thumbnail: url }));
      showToast('Thumbnail uploaded', 'success');
    } catch (error) {
      console.error('Upload failed:', error);
      showToast('Failed to upload thumbnail', 'error');
    } finally {
      setUploadingThumb(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.title || !form.description) {
      showToast('Title and description are required', 'error');
      return;
    }

    try {
      setLoading(true);
      const data = {
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        price: Number(form.price),
      };

      if (course) {
        await adminAPI.updateCourse(course._id, data);
      } else {
        await adminAPI.createCourse(data);
      }

      onSuccess();
    } catch (error) {
      console.error('Save failed:', error);
      showToast('Failed to save course', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center" style={{ isolation: 'isolate' }}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose} 
      />
      
      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col mx-4 my-8"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          zIndex: 100001,
          color: '#0f172a',
          backgroundColor: '#ffffff'
        }}
      >
        {/* Header - Fixed */}
        <div className="flex items-center justify-between border-b border-slate-200 p-6 bg-slate-50 rounded-t-2xl" style={{ color: '#0f172a' }}>
          <h3 className="text-xl font-bold text-slate-900">
            {course ? 'Edit Course' : 'Create Course'}
          </h3>
          <button 
            onClick={onClose} 
            className="rounded-lg p-2 hover:bg-slate-200 transition-colors"
            type="button"
            style={{ color: '#64748b' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Container - Scrollable */}
        <div className="overflow-y-auto flex-1" style={{ maxHeight: 'calc(90vh - 8rem)', backgroundColor: '#ffffff', color: '#0f172a' }}>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Thumbnail */}
            <div>
              <label className="block text-sm font-bold mb-3" style={{ color: '#374151' }}>
                Thumbnail
              </label>
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                {form.thumbnail && (
                  <div className="relative">
                    <img 
                      src={form.thumbnail} 
                      alt="Thumbnail" 
                      className="h-24 w-40 rounded-lg object-cover border border-slate-200" 
                    />
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, thumbnail: '' }))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-6 py-4 text-sm font-semibold transition hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50" style={{ color: '#64748b' }}>
                  <Upload size={18} />
                  <span>{uploadingThumb ? 'Uploading...' : form.thumbnail ? 'Replace Image' : 'Upload Image'}</span>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleThumbnailUpload} 
                    disabled={uploadingThumb} 
                  />
                </label>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-bold mb-3" style={{ color: '#374151' }}>
                Title <span className="text-red-500">*</span>
              </label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition"
                placeholder="Complete ROS Mastery"
                required
                style={{ 
                  backgroundColor: '#ffffff', 
                  color: '#0f172a',
                  borderColor: '#d1d5db'
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-bold mb-3" style={{ color: '#374151' }}>
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition resize-none"
                placeholder="Master Robot Operating System from scratch..."
                required
                style={{ 
                  backgroundColor: '#ffffff', 
                  color: '#0f172a',
                  borderColor: '#d1d5db'
                }}
              />
            </div>

            {/* Topic, Difficulty, Language */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold mb-3" style={{ color: '#374151' }}>Topic</label>
                <select
                  value={form.topic}
                  onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition"
                  style={{ 
                    backgroundColor: '#ffffff', 
                    color: '#0f172a',
                    borderColor: '#d1d5db'
                  }}
                >
                  {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-3" style={{ color: '#374151' }}>Difficulty</label>
                <select
                  value={form.difficulty}
                  onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition"
                  style={{ 
                    backgroundColor: '#ffffff', 
                    color: '#0f172a',
                    borderColor: '#d1d5db'
                  }}
                >
                  {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-3" style={{ color: '#374151' }}>Language</label>
                <select
                  value={form.language}
                  onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition"
                  style={{ 
                    backgroundColor: '#ffffff', 
                    color: '#0f172a',
                    borderColor: '#d1d5db'
                  }}
                >
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            {/* Premium & Price */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200" style={{ backgroundColor: '#f8fafc', color: '#0f172a' }}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.isPremium}
                    onChange={e => setForm(f => ({ ...f, isPremium: e.target.checked }))}
                    className="h-5 w-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-semibold" style={{ color: '#374151' }}>Premium Course</span>
                </label>
                {form.isPremium && (
                  <div className="flex-1 sm:max-w-xs">
                    <label className="block text-xs font-semibold mb-2" style={{ color: '#4b5563' }}>Price (₹)</label>
                    <input
                      type="number"
                      value={form.price}
                      onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition"
                      placeholder="999"
                      min="0"
                      style={{ 
                        backgroundColor: '#ffffff', 
                        color: '#0f172a',
                        borderColor: '#d1d5db'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-bold mb-3" style={{ color: '#374151' }}>
                Tags <span className="text-sm font-normal" style={{ color: '#6b7280' }}>(comma separated)</span>
              </label>
              <input
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition"
                placeholder="ROS, Robotics, Navigation, SLAM"
                style={{ 
                  backgroundColor: '#ffffff', 
                  color: '#0f172a',
                  borderColor: '#d1d5db'
                }}
              />
            </div>

            {/* Course Status & Badges */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200" style={{ backgroundColor: '#f8fafc', color: '#0f172a' }}>
              <label className="block text-sm font-bold mb-3" style={{ color: '#374151' }}>Course Status & Badges</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                    className="h-5 w-5 text-green-600 rounded focus:ring-green-500"
                  />
                  <span className="text-sm font-semibold" style={{ color: '#374151' }}>Active</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.isTrending}
                    onChange={e => setForm(f => ({ ...f, isTrending: e.target.checked }))}
                    className="h-5 w-5 text-orange-600 rounded focus:ring-orange-500"
                  />
                  <span className="text-sm font-semibold" style={{ color: '#374151' }}>Trending</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.isBestseller}
                    onChange={e => setForm(f => ({ ...f, isBestseller: e.target.checked }))}
                    className="h-5 w-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-semibold" style={{ color: '#374151' }}>Bestseller</span>
                </label>
              </div>
            </div>

            {/* Submit Button - Fixed at bottom */}
            <div className="sticky bottom-0 pt-4 border-t border-slate-200 mt-8 -mx-6 px-6" style={{ backgroundColor: '#ffffff' }}>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-bold text-white transition hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>{course ? 'Update Course' : 'Create Course'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

// Module Management Component
function ModuleManagement({ course, onBack, showToast }) {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showLectureModal, setShowLectureModal] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getCourseModules(course._id);
      setModules(res.data?.data?.modules || []);
    } catch (error) {
      console.error('Failed to fetch modules:', error);
      showToast('Failed to load modules', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModule = async (moduleId) => {
    if (!window.confirm('Delete this module? All lectures inside will be removed.')) return;
    
    try {
      await adminAPI.deleteModule(moduleId);
      showToast('Module deleted successfully', 'success');
      fetchModules();
    } catch (error) {
      console.error('Delete failed:', error);
      showToast('Failed to delete module', 'error');
    }
  };

  const handleDeleteLecture = async (lectureId) => {
    if (!window.confirm('Delete this lecture?')) return;
    
    try {
      await adminAPI.deleteLecture(lectureId);
      showToast('Lecture deleted successfully', 'success');
      fetchModules();
    } catch (error) {
      console.error('Delete failed:', error);
      showToast('Failed to delete lecture', 'error');
    }
  };

  const [editingLecture, setEditingLecture] = useState(null);
  const [editLectureForm, setEditLectureForm] = useState({});
  const [editLectureLoading, setEditLectureLoading] = useState(false);

  const handleEditLecture = async (lecture) => {
    setEditingLecture(lecture);
    // Fetch full lecture details including fileUrl from backend
    try {
      const res = await adminAPI.getLecture(lecture._id);
      const fullLecture = res.data?.data?.lecture || lecture;
      setEditLectureForm({
        title: fullLecture.title || '',
        description: fullLecture.description || '',
        fileUrl: fullLecture.fileUrl || '',
        duration: fullLecture.duration || '',
        notesUrl: fullLecture.notesUrl || '',
      });
    } catch {
      // Fallback to whatever data we have
      setEditLectureForm({
        title: lecture.title || '',
        description: lecture.description || '',
        fileUrl: lecture.fileUrl || '',
        duration: lecture.duration || '',
        notesUrl: lecture.notesUrl || '',
      });
    }
  };

  const handleUpdateLecture = async (e) => {
    e.preventDefault();
    if (!editLectureForm.title || !editLectureForm.fileUrl) {
      showToast('Title and video URL are required', 'error');
      return;
    }
    try {
      setEditLectureLoading(true);
      await adminAPI.updateLecture(editingLecture._id, editLectureForm);
      showToast('Lecture updated successfully!', 'success');
      setEditingLecture(null);
      fetchModules();
    } catch (error) {
      showToast('Failed to update lecture', 'error');
    } finally {
      setEditLectureLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-sm font-semibold text-purple-600 hover:text-purple-700 transition"
        >
          <X size={16} />
          Back to Courses
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{course.title}</h2>
            <p className="mt-1 text-sm text-slate-500">Manage modules and lectures</p>
          </div>
          <button
            onClick={() => {
              setEditingModule(null);
              setShowModuleModal(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
          >
            <Plus size={18} />
            Add Module
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 size={40} className="animate-spin text-indigo-600" />
        </div>
      )}

      {/* Modules List */}
      {!loading && modules.length > 0 && (
        <div className="space-y-4">
          {modules.map((module, idx) => (
            <ModuleCard
              key={module._id}
              module={module}
              index={idx}
              onEdit={() => {
                setEditingModule(module);
                setShowModuleModal(true);
              }}
              onDelete={() => handleDeleteModule(module._id)}
              onAddLecture={() => {
                setSelectedModule(module);
                setShowLectureModal(true);
              }}
              onDeleteLecture={handleDeleteLecture}
              onEditLecture={handleEditLecture}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && modules.length === 0 && (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl bg-white p-8 text-center shadow-sm">
          <BookOpen size={64} className="mb-4 text-slate-300" />
          <h3 className="text-lg font-bold text-slate-700">No modules yet</h3>
          <p className="mt-2 text-sm text-slate-500">
            Create your first module to organize your course content
          </p>
          <button
            onClick={() => {
              setEditingModule(null);
              setShowModuleModal(true);
            }}
            className="mt-4 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700"
          >
            <Plus size={18} />
            Create Module
          </button>
        </div>
      )}

      {/* Module Modal */}
      {showModuleModal && (
        <ModuleFormModal
          course={course}
          module={editingModule}
          onClose={() => {
            setShowModuleModal(false);
            setEditingModule(null);
          }}
          onSuccess={() => {
            setShowModuleModal(false);
            setEditingModule(null);
            fetchModules();
            showToast(editingModule ? 'Module updated' : 'Module created', 'success');
          }}
          showToast={showToast}
        />
      )}

      {/* Lecture Modal */}
      {showLectureModal && (
        <LectureFormModal
          module={selectedModule}
          onClose={() => {
            setShowLectureModal(false);
            setSelectedModule(null);
          }}
          onSuccess={() => {
            setShowLectureModal(false);
            setSelectedModule(null);
            fetchModules();
            showToast('Lecture added successfully', 'success');
          }}
          showToast={showToast}
        />
      )}

      {/* Edit Lecture Modal */}
      {editingLecture && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl shadow-2xl" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4" style={{ borderColor: '#e2e8f0' }}>
              <h3 className="text-lg font-bold" style={{ color: '#0f172a' }}>Edit Lecture</h3>
              <button onClick={() => setEditingLecture(null)} className="rounded-lg p-2 hover:bg-slate-100 transition" style={{ color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateLecture} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: '#374151' }}>Title *</label>
                <input
                  type="text"
                  value={editLectureForm.title}
                  onChange={e => setEditLectureForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none"
                  style={{ backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#cbd5e1' }}
                  placeholder="Lecture title"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: '#374151' }}>YouTube URL *</label>
                <input
                  type="url"
                  value={editLectureForm.fileUrl}
                  onChange={e => setEditLectureForm(f => ({ ...f, fileUrl: e.target.value }))}
                  className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none"
                  style={{ backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#cbd5e1' }}
                  placeholder="https://www.youtube.com/watch?v=..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: '#374151' }}>Description</label>
                <textarea
                  value={editLectureForm.description}
                  onChange={e => setEditLectureForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none"
                  style={{ backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#cbd5e1' }}
                  placeholder="Lecture description"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: '#374151' }}>Duration (e.g. 15m)</label>
                <input
                  type="text"
                  value={editLectureForm.duration}
                  onChange={e => setEditLectureForm(f => ({ ...f, duration: e.target.value }))}
                  className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none"
                  style={{ backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#cbd5e1' }}
                  placeholder="e.g. 15m, 1h 30m"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingLecture(null)}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition"
                  style={{ border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569' }}>
                  Cancel
                </button>
                <button type="submit" disabled={editLectureLoading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition disabled:opacity-50"
                  style={{ backgroundColor: '#4f46e5', color: '#ffffff' }}>
                  {editLectureLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Module Card Component
function ModuleCard({ module, index, onEdit, onDelete, onAddLecture, onDeleteLecture, onEditLecture }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      {/* Module Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-sm font-bold text-indigo-600">
            {index + 1}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-900">{module.title}</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {module.videoCount || 0} lectures • {module.duration || '0 min'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onAddLecture}
            className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600 transition hover:bg-indigo-100"
          >
            Add Lecture
          </button>
          <button
            onClick={onEdit}
            className="rounded-lg bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg bg-red-50 p-2 text-red-600 transition hover:bg-red-100"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="rounded-lg bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
          >
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              ▼
            </motion.div>
          </button>
        </div>
      </div>

      {/* Lectures List */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4">
              {module.resources && module.resources.length > 0 ? (
                <div className="space-y-2">
                  {module.resources.map((lecture, idx) => (
                    <div
                      key={lecture._id}
                      className="rounded-lg border border-slate-200 hover:bg-slate-50 transition overflow-hidden"
                    >
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-xs font-bold text-purple-600">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-900">{lecture.title}</p>
                            <p className="text-xs text-slate-500">
                              {lecture.duration || 'N/A'} • {lecture.fileType}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const lectureEl = document.getElementById(`lecture-${lecture._id}`);
                              if (lectureEl) {
                                lectureEl.classList.toggle('hidden');
                              }
                            }}
                            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition"
                          >
                            <Video size={14} className="inline mr-1" />
                            Play
                          </button>
                          <button
                            onClick={() => onEditLecture && onEditLecture(lecture)}
                            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-amber-600 hover:bg-amber-50 transition"
                          >
                            <Edit2 size={14} className="inline mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => onDeleteLecture(lecture._id)}
                            className="rounded-lg p-2 text-red-600 hover:bg-red-50 transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      
                      {/* Video Player - Hidden by default */}
                      <div id={`lecture-${lecture._id}`} className="hidden border-t border-slate-200">
                        <div className="relative bg-black group" style={{ paddingBottom: '56.25%' }}>
                          <iframe
                            className="absolute inset-0 w-full h-full"
                            src={`https://www.youtube-nocookie.com/embed/${getYouTubeVideoId(lecture.fileUrl)}?autoplay=1&rel=0&modestbranding=1&fs=1&controls=1&disablekb=0&playsinline=1&iv_load_policy=3`}
                            title={lecture.title}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                            allowFullScreen
                            style={{ border: 'none' }}
                          />
                          {/* Black bar to hide bottom YouTube branding - POSITIONED AT VERY BOTTOM */}
                          <div 
                            className="absolute inset-0" 
                            style={{ 
                              zIndex: 9999,
                              pointerEvents: 'none'
                            }}
                          >
                            {/* Hide ENTIRE bottom strip - JUST ABOVE progress bar */}
                            <div 
                              className="absolute" 
                              style={{ 
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: '52px',
                                background: 'linear-gradient(to top, rgba(0, 0, 0, 0.98), rgba(0, 0, 0, 0.85))',
                                pointerEvents: 'auto',
                                cursor: 'default',
                                zIndex: 99999,
                                backdropFilter: 'blur(5px)'
                              }}
                              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); return false; }}
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); return false; }}
                              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); return false; }}
                              onMouseUp={(e) => { e.preventDefault(); e.stopPropagation(); return false; }}
                              onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation(); return false; }}
                              onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); return false; }}
                              onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); return false; }}
                            />
                            
                            {/* Hide top-right area - Settings/Quality icons */}
                            <div 
                              className="absolute" 
                              style={{ 
                                top: '8px',
                                right: '8px',
                                width: '100px',
                                height: '36px',
                                background: 'rgba(0, 0, 0, 0.9)',
                                pointerEvents: 'auto',
                                cursor: 'default',
                                zIndex: 99999,
                                backdropFilter: 'blur(3px)',
                                borderRadius: '4px'
                              }}
                              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); return false; }}
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); return false; }}
                              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); return false; }}
                              onMouseUp={(e) => { e.preventDefault(); e.stopPropagation(); return false; }}
                              onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation(); return false; }}
                              onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); return false; }}
                              onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); return false; }}
                            />
                          </div>
                        </div>
                        {lecture.description && (
                          <div className="p-3 bg-slate-50">
                            <p className="text-xs text-slate-600">{lecture.description}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Video size={40} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm text-slate-500">No lectures yet</p>
                  <button
                    onClick={onAddLecture}
                    className="mt-3 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    Add your first lecture
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Module Form Modal
function ModuleFormModal({ course, module, onClose, onSuccess, showToast }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: module?.title || '',
    description: module?.description || '',
    isFree: module?.isFree || false,
    order: module?.order || 1,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.title) {
      showToast('Title is required', 'error');
      return;
    }

    try {
      setLoading(true);
      const data = {
        ...form,
        courseId: course._id,
      };

      if (module) {
        await adminAPI.updateModule(module._id, data);
      } else {
        await adminAPI.createModule(data);
      }

      onSuccess();
    } catch (error) {
      console.error('Save failed:', error);
      showToast('Failed to save module', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4" style={{ isolation: 'isolate' }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: '#ffffff', color: '#0f172a', minHeight: '400px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-6 bg-slate-50 rounded-t-2xl">
          <h3 className="text-xl font-bold text-slate-900">
            {module ? 'Edit Module' : 'Create Module'}
          </h3>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-200 transition">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: '#374151' }}>
              Module Title <span className="text-red-500">*</span>
            </label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
              placeholder="Introduction to Robotics"
              required
              style={{ backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#d1d5db' }}
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: '#374151' }}>
              Description
            </label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-none transition"
              placeholder="Brief description of this module..."
              style={{ backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#d1d5db' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: '#374151' }}>
                Order
              </label>
              <input
                type="number"
                value={form.order}
                onChange={e => setForm(f => ({ ...f, order: parseInt(e.target.value) || 1 }))}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                min="1"
                style={{ backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#d1d5db' }}
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: '#374151' }}>
                Free Preview
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-slate-300 px-4 py-3 cursor-pointer hover:bg-slate-50 transition" style={{ height: '48px' }}>
                <input
                  type="checkbox"
                  checked={form.isFree}
                  onChange={e => setForm(f => ({ ...f, isFree: e.target.checked }))}
                  className="h-5 w-5 text-indigo-600 rounded"
                />
                <span className="text-sm font-semibold" style={{ color: '#374151' }}>Allow free access</span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-base font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={20} />
                  <span>{module ? 'Update Module' : 'Create Module'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// Lecture Form Modal
function LectureFormModal({ module, onClose, onSuccess, showToast }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    fileUrl: '',
    duration: '',
    order: (module.resources?.length || 0) + 1,
  });

  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.title || !form.fileUrl) {
      showToast('Title and video are required', 'error');
      return;
    }

    try {
      setLoading(true);
      const data = {
        ...form,
        moduleId: module._id,
        courseId: module.courseId,
        fileType: 'video',
        topic: 'Course Lecture',
      };

      await adminAPI.createLecture(data);
      onSuccess();
    } catch (error) {
      console.error('Save failed:', error);
      showToast('Failed to add lecture', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] overflow-y-auto" style={{ isolation: 'isolate' }}>
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 my-8"
          onClick={(e) => e.stopPropagation()}
          style={{ 
            backgroundColor: '#ffffff', 
            color: '#0f172a'
          }}
        >
          {/* Header - Fixed */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50 rounded-t-2xl">
            <h3 className="text-lg font-bold text-slate-900">Add Lecture</h3>
            <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-200 transition">
              <X size={20} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 120px)' }}>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* YouTube Video Link */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: '#374151' }}>
                  YouTube Video Link <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={form.fileUrl}
                  onChange={e => setForm(f => ({ ...f, fileUrl: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                  placeholder="https://www.youtube.com/watch?v=..."
                  required
                  style={{ backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#d1d5db' }}
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Paste YouTube video URL (public or unlisted)
                </p>
                
                {/* YouTube Preview */}
                {form.fileUrl && getYouTubeVideoId(form.fileUrl) && (
                  <div className="mt-3 rounded-lg overflow-hidden border border-slate-200">
                    <div className="relative" style={{ paddingBottom: '56.25%' }}>
                      <iframe
                        className="absolute inset-0 w-full h-full"
                        src={`https://www.youtube.com/embed/${getYouTubeVideoId(form.fileUrl)}?modestbranding=1&rel=0&showinfo=0&controls=1&fs=1&playsinline=1`}
                        title="YouTube video preview"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: '#374151' }}>
                  Lecture Title <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                  placeholder="Introduction to ROS2"
                  required
                  style={{ backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#d1d5db' }}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: '#374151' }}>
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-none transition"
                  placeholder="Brief description of this lecture..."
                  style={{ backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#d1d5db' }}
                />
              </div>

              {/* Duration & Order */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: '#374151' }}>
                    Duration
                  </label>
                  <input
                    value={form.duration}
                    onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                    placeholder="e.g. 15m, 1h 30m"
                    style={{ backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#d1d5db' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: '#374151' }}>
                    Order
                  </label>
                  <input
                    type="number"
                    value={form.order}
                    onChange={e => setForm(f => ({ ...f, order: parseInt(e.target.value) || 1 }))}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                    min="1"
                    style={{ backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#d1d5db' }}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={loading || !form.fileUrl || !getYouTubeVideoId(form.fileUrl)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Adding Lecture...</span>
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      <span>Add Lecture</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}