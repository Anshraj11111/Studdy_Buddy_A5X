import { useState } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { Image as ImageIcon, X } from 'lucide-react';

export default function DoubtReply({ reply, index }) {
  const [selectedImage, setSelectedImage] = useState(null);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        style={{
          padding: 16,
          borderRadius: 12,
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-primary)',
        }}
      >
        {/* User Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 14,
            fontWeight: 700,
          }}>
            {reply.user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ 
              color: 'var(--text-primary)', 
              fontSize: 14, 
              fontWeight: 600,
              marginBottom: 2,
            }}>
              {reply.user?.name || 'Unknown'}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
              {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>

        {/* Reply Content */}
        <p style={{ 
          color: 'var(--text-primary)', 
          fontSize: 14, 
          lineHeight: 1.6,
          marginBottom: reply.images?.length > 0 ? 12 : 0,
          whiteSpace: 'pre-wrap',
        }}>
          {reply.content}
        </p>

        {/* Reply Images */}
        {reply.images && reply.images.length > 0 && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: reply.images.length === 1 ? '1fr' : 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: 8,
          }}>
            {reply.images.map((image, idx) => (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.05 }}
                onClick={() => setSelectedImage(image)}
                style={{
                  position: 'relative',
                  paddingBottom: reply.images.length === 1 ? '56.25%' : '100%',
                  borderRadius: 8,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-primary)',
                }}
              >
                <img
                  src={image}
                  alt={`Reply image ${idx + 1}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Image Modal */}
      {selectedImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelectedImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            backdropFilter: 'blur(8px)',
          }}
        >
          <button
            onClick={() => setSelectedImage(null)}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
          <img
            src={selectedImage}
            alt="Full size"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
              borderRadius: 12,
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>
      )}
    </>
  );
}
