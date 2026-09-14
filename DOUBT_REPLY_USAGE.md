# Doubt Reply with Image Upload - Usage Guide

## ✅ Backend Changes Complete
- Model updated with `images` field in replies
- Controller accepts `images` array
- Service stores image URLs in database

## 🎨 Frontend Components Created

### 1. `DoubtReplyForm.jsx` - Reply Input with Image Upload
**Location:** `frontend/src/components/DoubtReplyForm.jsx`

**Features:**
- Text input for reply content
- Multiple image upload (Cloudinary)
- Image preview with remove option
- Loading states
- Validation

### 2. `DoubtReply.jsx` - Reply Display Component
**Location:** `frontend/src/components/DoubtReply.jsx`

**Features:**
- User info with avatar
- Reply content display
- Image grid (responsive)
- Full-screen image viewer
- Timestamp

## 📝 How to Use

### Step 1: Import Components
```jsx
import DoubtReplyForm from '../components/DoubtReplyForm';
import DoubtReply from '../components/DoubtReply';
import { doubtAPI } from '../services/api';
```

### Step 2: Add State for Replies
```jsx
const [replies, setReplies] = useState([]);
const [submitting, setSubmitting] = useState(false);
```

### Step 3: Handle Reply Submit
```jsx
const handleReplySubmit = async ({ content, images }) => {
  setSubmitting(true);
  try {
    const response = await doubtAPI.addReply(doubtId, {
      content,
      images, // Array of Cloudinary URLs
    });
    
    // Update replies list
    setReplies(response.data.data.doubt.replies);
    
    // Or append new reply
    // setReplies(prev => [...prev, response.data.data.newReply]);
    
    alert('✅ Reply posted successfully!');
  } catch (error) {
    console.error('Reply failed:', error);
    alert('Failed to post reply');
  } finally {
    setSubmitting(false);
  }
};
```

### Step 4: Render Components
```jsx
return (
  <div>
    {/* Doubt Title & Description */}
    <h2>{doubt.title}</h2>
    <p>{doubt.description}</p>

    {/* Replies Section */}
    <div style={{ marginTop: 24 }}>
      <h3>Replies ({replies.length})</h3>
      
      {replies.map((reply, index) => (
        <DoubtReply 
          key={reply._id} 
          reply={reply} 
          index={index} 
        />
      ))}

      {/* Reply Form */}
      <DoubtReplyForm 
        onSubmit={handleReplySubmit}
        loading={submitting}
      />
    </div>
  </div>
);
```

## 🎯 Complete Example (Jahan use karna hai)

**File:** Jahan doubt detail dikhta hai (e.g., Dashboard, DoubtDetail page, Modal, etc.)

```jsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import DoubtReplyForm from '../components/DoubtReplyForm';
import DoubtReply from '../components/DoubtReply';
import { doubtAPI } from '../services/api';

export default function DoubtDetailPage() {
  const { id } = useParams(); // or get from props/state
  const [doubt, setDoubt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDoubtDetail();
  }, [id]);

  const fetchDoubtDetail = async () => {
    try {
      const res = await doubtAPI.getById(id);
      setDoubt(res.data.data.doubt);
    } catch (err) {
      console.error('Failed to load doubt:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReplySubmit = async ({ content, images }) => {
    setSubmitting(true);
    try {
      const response = await doubtAPI.addReply(id, { content, images });
      setDoubt(response.data.data.doubt); // Update with new replies
      alert('✅ Reply posted!');
    } catch (error) {
      console.error('Reply failed:', error);
      alert('Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!doubt) return <div>Doubt not found</div>;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      {/* Doubt Info */}
      <div style={{ 
        padding: 20, 
        background: 'var(--bg-card)', 
        borderRadius: 16,
        marginBottom: 24,
      }}>
        <h1 style={{ fontSize: 24, marginBottom: 12 }}>{doubt.title}</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
          {doubt.description}
        </p>
        <span style={{ 
          padding: '4px 12px', 
          background: 'rgba(99,102,241,0.1)',
          color: '#818cf8',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
        }}>
          {doubt.topic}
        </span>
      </div>

      {/* Replies */}
      <h2 style={{ fontSize: 18, marginBottom: 16 }}>
        Replies ({doubt.replies?.length || 0})
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {doubt.replies?.map((reply, index) => (
          <DoubtReply key={reply._id} reply={reply} index={index} />
        ))}

        {doubt.replies?.length === 0 && (
          <p style={{ 
            textAlign: 'center', 
            color: 'var(--text-secondary)', 
            padding: 40,
          }}>
            No replies yet. Be the first to reply!
          </p>
        )}
      </div>

      {/* Reply Form */}
      <DoubtReplyForm onSubmit={handleReplySubmit} loading={submitting} />
    </div>
  );
}
```

## 🔑 Important Notes

1. **Cloudinary Setup Required:**
   - Make sure `uploadToCloudinary` function exists in `utils/cloudinary.js`
   - Cloudinary credentials configured in environment

2. **API Endpoint:**
   - Backend route: `POST /api/doubts/:id/replies`
   - Body: `{ content: string, images: string[] }`

3. **Image Storage:**
   - Images uploaded to Cloudinary folder: `doubts/replies`
   - URLs stored in database as array

4. **Validation:**
   - Either content OR images required (can have both)
   - Multiple images supported

## 🎨 Styling
- Uses CSS variables: `var(--bg-tertiary)`, `var(--text-primary)`, etc.
- Responsive image grid
- Smooth animations with Framer Motion

## 🚀 Ready to Use!
Components are ready. Simply import them in the page where doubt detail is shown!
