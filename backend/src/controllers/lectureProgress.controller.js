import LectureProgress from '../models/LectureProgress.js';
import mongoose from 'mongoose';

/**
 * Update lecture watch progress
 * POST /api/lectures/:lectureId/progress
 */
export const updateProgress = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const { watchedDuration, totalDuration, courseId, moduleId } = req.body;
    const userId = req.user._id;

    // Validate lectureId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(lectureId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid lecture ID' },
      });
    }

    // Validate input
    if (watchedDuration === undefined || totalDuration === undefined) {
      return res.status(400).json({
        success: false,
        error: { message: 'watchedDuration and totalDuration are required' },
      });
    }

    // Find or create progress record
    let progress = await LectureProgress.findOne({ userId, lectureId });

    if (!progress) {
      // courseId and moduleId must come from request body
      if (!courseId || !moduleId) {
        return res.status(400).json({
          success: false,
          error: { message: 'courseId and moduleId are required' },
        });
      }
      progress = new LectureProgress({
        userId,
        lectureId,
        courseId,
        moduleId,
      });
    }

    // Update progress using model method
    progress.updateProgress(watchedDuration, totalDuration);
    await progress.save();

    res.json({
      success: true,
      data: {
        progress: {
          watchedPercentage: progress.watchedPercentage,
          isCompleted: progress.isCompleted,
          completedAt: progress.completedAt,
          lastWatchedAt: progress.lastWatchedAt,
        },
      },
    });
  } catch (error) {
    console.error('Error updating lecture progress:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update progress', code: 'SERVER_ERROR' },
    });
  }
};

/**
 * Get lecture progress for current user
 * GET /api/lectures/:lectureId/progress
 */
export const getProgress = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const userId = req.user._id;

    const progress = await LectureProgress.findOne({ userId, lectureId });

    if (!progress) {
      return res.json({
        success: true,
        data: {
          progress: {
            watchedPercentage: 0,
            isCompleted: false,
            watchedDuration: 0,
            totalDuration: 0,
          },
        },
      });
    }

    res.json({
      success: true,
      data: {
        progress: {
          watchedPercentage: progress.watchedPercentage,
          isCompleted: progress.isCompleted,
          watchedDuration: progress.watchedDuration,
          totalDuration: progress.totalDuration,
          completedAt: progress.completedAt,
          lastWatchedAt: progress.lastWatchedAt,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching lecture progress:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch progress', code: 'SERVER_ERROR' },
    });
  }
};

/**
 * Get course progress summary for current user
 * GET /api/courses/:courseId/progress
 */
export const getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    const progressRecords = await LectureProgress.find({ userId, courseId })
      .populate('lectureId', 'title order')
      .populate('moduleId', 'title order')
      .sort({ 'moduleId.order': 1, 'lectureId.order': 1 });

    const totalLectures = progressRecords.length;
    const completedLectures = progressRecords.filter(p => p.isCompleted).length;
    const totalPercentage = totalLectures > 0
      ? Math.round(progressRecords.reduce((sum, p) => sum + p.watchedPercentage, 0) / totalLectures)
      : 0;

    res.json({
      success: true,
      data: {
        courseProgress: {
          totalLectures,
          completedLectures,
          overallPercentage: totalPercentage,
          lectures: progressRecords.map(p => ({
            lectureId: p.lectureId._id,
            lectureTitle: p.lectureId.title,
            moduleId: p.moduleId._id,
            moduleTitle: p.moduleId.title,
            watchedPercentage: p.watchedPercentage,
            isCompleted: p.isCompleted,
            completedAt: p.completedAt,
          })),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching course progress:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch course progress', code: 'SERVER_ERROR' },
    });
  }
};

/**
 * Get module progress summary for current user
 * GET /api/modules/:moduleId/progress
 */
export const getModuleProgress = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const userId = req.user._id;

    const progressRecords = await LectureProgress.find({ userId, moduleId })
      .populate('lectureId', 'title order')
      .sort({ 'lectureId.order': 1 });

    const totalLectures = progressRecords.length;
    const completedLectures = progressRecords.filter(p => p.isCompleted).length;

    res.json({
      success: true,
      data: {
        moduleProgress: {
          totalLectures,
          completedLectures,
          lectures: progressRecords.map(p => ({
            lectureId: p.lectureId._id,
            lectureTitle: p.lectureId.title,
            watchedPercentage: p.watchedPercentage,
            isCompleted: p.isCompleted,
            completedAt: p.completedAt,
          })),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching module progress:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch module progress', code: 'SERVER_ERROR' },
    });
  }
};
