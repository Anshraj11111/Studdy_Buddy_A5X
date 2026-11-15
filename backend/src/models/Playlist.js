import mongoose from 'mongoose';

const videoItemSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, default: '', maxlength: 500 },
  youtubeUrl: { type: String, required: true },
  order: { type: Number, default: 0 },
}, { _id: true });

const playlistSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 2000 },
    topic: { type: String, required: true, index: true },
    thumbnail: { type: String, default: '' }, // Cloudinary URL
    videos: { type: [videoItemSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tags: { type: [String], default: [] },
    views: { type: Number, default: 0 },
    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true }
);

playlistSchema.index({ topic: 1, createdAt: -1 });
playlistSchema.index({ createdBy: 1 });

export default mongoose.model('Playlist', playlistSchema);
