import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { uploadToCloudinary } from '../utils/cloudinary';

export default function DoubtReplyForm({ onSubmit, loading = false }) {
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [previewImages, setPreviewImages] = useState([]);

  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Create preview URLs
    const previews = files.map(file => URL.createObjectURL(file));
    setPreviewImages(prev => [...prev, ...previews]);

    setUploading(true);
    try {
      // Upload to Cloudinary
      const uploadPromises = files.map(file => 
        uploadToCloudinary(file, 'doubts/replies')
      );
      const urls = await Promise.all(uploadPromises);
      
      setImages(prev => [...prev, ...urls]);
      console.log('✅ Images uploaded:', urls);
    } catch (error) {
      console.error('Image upload failed:', error);
      alert('Failed to upload images. Please try again.');
      // Remove failed previews
      setPreviewImages(prev => prev.slice(0, prev.length - files.length));
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviewImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0) {
      alert('Please write something or add images');
      return;
    }

    await onSubmit({ content: content.trim(), images });
    
    // Clear form
    setContent('');
    setImages([]);
    setPreviewImages([]);
  };

  return (
    <div style={{
      borderRadius: 12,
      background: 'var(--bg-tertiary)',
      border: '1px solid var(--border-primary)',
      padding: 16,
    }}>
      {/* Textarea */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your reply..."
        disabled={loading || uploading}
        style={{
          width: '100%',
          minHeight: 80,
          padding: 12,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--border-primary)',
          color: 'var(--text-primary)',
          fontSize: 14,
          resize: 'vertical',
          outline: 'none',
          fontFamily: 'inherit',
          marginBottom: 12,
        }}
      />

      {/* Image Previews */}
      {previewImages.length > 0 && (
        <div style={{ 
          display: 'flex', 
          gap: 8, 
          flexWrap: 'wrap',
          marginBottom: 12,
        }}>
          {previewImages.map((preview, index) => (
            <div key={index} style={{ position: 'relative' }}>
              <img
                src={preview}
                alt="Preview"
                style={{
                  width: 80,
                  height: 80,
                  objectFit: 'cover',
                  borderRadius: 8,
                  border: '1px solid var(--border-primary)',
                }}
              />
              {!uploading && (
                <button
                  onClick={() => removeImage(index)}
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#ef4444',
                    border: 'none',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {/* Image Upload Button */}
        <label style={{
          padding: '8px 12px',
          borderRadius: 8,
          background: 'rgba(99,102,241,0.1)',
          border: '1px solid rgba(99,102,241,0.3)',
          color: '#818cf8',
          fontSize: 13,
          fontWeight: 600,
          cursor: uploading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          opacity: uploading ? 0.5 : 1,
        }}>
          <ImageIcon size={16} />
          {uploading ? 'Uploading...' : 'Add Images'}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            disabled={uploading || loading}
            style={{ display: 'none' }}
          />
        </label>

        {/* Send Button */}
        <motion.button
          onClick={handleSubmit}
          disabled={loading || uploading || (!content.trim() && images.length === 0)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            flex: 1,
            padding: '8px 16px',
            borderRadius: 8,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            border: 'none',
            color: 'white',
            fontSize: 13,
            fontWeight: 600,
            cursor: (loading || uploading || (!content.trim() && images.length === 0)) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            opacity: (loading || uploading || (!content.trim() && images.length === 0)) ? 0.5 : 1,
          }}
        >
          {loading ? (
            <>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Sending...
            </>
          ) : (
            <>
              <Send size={16} />
              Send Reply
            </>
          )}
        </motion.button>

        {/* Cancel Button (if needed) */}
        {(content || images.length > 0) && !loading && !uploading && (
          <button
            onClick={() => {
              setContent('');
              setImages([]);
              setPreviewImages([]);
            }}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        )}
      </div>

      {uploading && (
        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: 12, 
          marginTop: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          Uploading images to Cloudinary...
        </p>
      )}
    </div>
  );
}
