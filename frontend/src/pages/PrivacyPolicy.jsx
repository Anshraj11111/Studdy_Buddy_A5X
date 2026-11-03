import { motion } from 'framer-motion'
import { Shield, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

export default function PrivacyPolicy() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-6 text-theme-secondary hover:text-theme-primary transition">
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Back</span>
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#6366f1' }}>
              <Shield size={24} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-theme-primary">Privacy Policy</h1>
          </div>
          <p className="text-theme-secondary">Last updated: August 25, 2026</p>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="prose prose-invert max-w-none space-y-6 text-theme-secondary">
          
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-theme-primary mb-4">1. Introduction</h2>
            <p>
              Welcome to Studdy Buddy ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-theme-primary mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-theme-primary mb-3 mt-4">Personal Information</h3>
            <p>We collect information that you provide directly to us, including:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Name and email address</li>
              <li>School name and city (for students)</li>
              <li>Profile picture and bio</li>
              <li>Skills and interests</li>
              <li>Academic level and role (student/mentor)</li>
            </ul>

            <h3 className="text-xl font-semibold text-theme-primary mb-3 mt-4">Usage Information</h3>
            <p>We automatically collect certain information when you use our platform:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Device information (browser type, operating system)</li>
              <li>IP address and location data</li>
              <li>Activity logs (pages visited, features used)</li>
              <li>Interaction data (posts, comments, messages)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-theme-primary mb-4">3. How We Use Your Information</h2>
            <p>We use the collected information for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Platform Operation:</strong> Provide, maintain, and improve our services</li>
              <li><strong>Communication:</strong> Send notifications, updates, and support messages</li>
              <li><strong>Personalization:</strong> Customize your experience and content recommendations</li>
              <li><strong>Security:</strong> Detect and prevent fraud, abuse, and security incidents</li>
              <li><strong>Analytics:</strong> Understand usage patterns and improve platform performance</li>
              <li><strong>Community Features:</strong> Enable school channels, communities, and connections</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-theme-primary mb-4">4. Information Sharing</h2>
            <p>We do not sell your personal information. We may share your information with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Other Users:</strong> Your profile information is visible to other users</li>
              <li><strong>School Channels:</strong> Your name and profile are shared with your school community</li>
              <li><strong>Service Providers:</strong> Third-party vendors who assist in operating our platform (e.g., hosting, analytics)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect rights and safety</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-theme-primary mb-4">5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encryption of data in transit and at rest</li>
              <li>Secure authentication with password hashing</li>
              <li>Regular security audits and monitoring</li>
              <li>Access controls and authorization systems</li>
              <li>Rate limiting and DDoS protection</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-theme-primary mb-4">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal information</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and data</li>
              <li><strong>Export:</strong> Download your data in a portable format</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-theme-primary mb-4">7. Cookies and Tracking</h2>
            <p>
              We use cookies and similar tracking technologies to enhance your experience. You can control cookie preferences through your browser settings. Essential cookies required for platform functionality cannot be disabled.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-theme-primary mb-4">8. Third-Party Services</h2>
            <p>Our platform integrates with third-party services:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Google OAuth:</strong> For authentication (optional)</li>
              <li><strong>Cloudinary:</strong> For image and file storage</li>
              <li><strong>YouTube:</strong> For embedded educational videos</li>
              <li><strong>WebRTC:</strong> For video calling functionality</li>
            </ul>
            <p className="mt-2">
              These services have their own privacy policies and we encourage you to review them.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-theme-primary mb-4">9. Children's Privacy</h2>
            <p>
              Studdy Buddy is designed for educational purposes and may be used by students of all ages. We do not knowingly collect personal information from children under 13 without parental consent. If you believe we have collected such information, please contact us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-theme-primary mb-4">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page and updating the "Last updated" date. Your continued use of the platform after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-theme-primary mb-4">11. Contact Us</h2>
            <p>
              If you have questions or concerns about this Privacy Policy, please contact us at:
            </p>
            <ul className="list-none space-y-2 mt-3">
              <li><strong>Email:</strong> Anshrajbaghel30@gmail.com</li>
              <li><strong>Platform:</strong> Studdy Buddy</li>
              <li><strong>Organization:</strong> A5X Industries</li>
            </ul>
          </section>

          {/* Footer */}
          <div className="mt-12 pt-6 border-t" style={{ borderColor: 'var(--border-primary)' }}>
            <p className="text-sm text-theme-tertiary text-center">
              By using Studdy Buddy, you acknowledge that you have read and understood this Privacy Policy.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
