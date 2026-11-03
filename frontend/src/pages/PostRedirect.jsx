import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

console.log('📍 [POST REDIRECT] Component file loaded')

/**
 * PostRedirect - Handle deep links to community posts
 * Redirects /community?post=ID to /communities with proper state
 */
export default function PostRedirect() {
  console.log('📍 [POST REDIRECT] Component function called')
  
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  useEffect(() => {
    const postId = searchParams.get('post') || searchParams.get('postId')
    
    console.log('🔄 [POST REDIRECT] Starting redirect...')
    console.log('🔄 [POST REDIRECT] URL search params:', window.location.search)
    console.log('🔄 [POST REDIRECT] Post ID detected:', postId)
    console.log('🔄 [POST REDIRECT] All params:', Object.fromEntries(searchParams.entries()))
    
    if (postId) {
      const targetUrl = `/communities?post=${postId}`
      console.log('🔄 [POST REDIRECT] Navigating to:', targetUrl)
      // Navigate to communities with post parameter (not postId)
      navigate(targetUrl, { replace: true })
    } else {
      console.log('🔄 [POST REDIRECT] No post ID found, redirecting to /communities')
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
