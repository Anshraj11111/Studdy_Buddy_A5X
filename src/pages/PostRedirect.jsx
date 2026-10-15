import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

/**
 * PostRedirect - Handle deep links to community posts
 * Redirects /community?post=ID to /communities with proper state
 */
export default function PostRedirect() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  useEffect(() => {
    const postId = searchParams.get('post') || searchParams.get('postId')
    
    console.log('🔄 [POST REDIRECT] Handling deep link:', postId)
    
    if (postId) {
      // Navigate to communities with postId parameter
      navigate(`/communities?postId=${postId}`, { replace: true })
    } else {
      // No post ID, just go to communities
      navigate('/communities', { replace: true })
    }
  }, [navigate, searchParams])
  
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading post...</p>
      </div>
    </div>
  )
}
