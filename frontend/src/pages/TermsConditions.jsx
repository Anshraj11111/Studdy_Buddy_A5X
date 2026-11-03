import { motion } from 'framer-motion'
import { FileText, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

export default function TermsConditions() {
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
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#8b5cf6' }}>
              <FileText size={24} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-theme-primary">Terms and Conditions</h1>
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
            <h2 className="text-2xl font-bold text-theme-primary mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using Studdy Buddy ("the Platform"), you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the Platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-theme-primary mb-4">2. Description of Service</h2>
            <p>
              Studdy Buddy is an educational platform designed to connect students and mentors, providing:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Learning resources (videos, documents, notes)</li>
              <li>Q&A forums for academic doubts</li>
              <li>School-specific channels for collaboration</li>
              <li>Community groups for shared interests</li>
              <li>Video calling for mentorship sessions</li>
              <li>Gamified learning with XP and leaderboards</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-theme-primary mb-4">3. User Accounts</h2>
            
            <h3 className="text-xl font-semibold text-theme-primary mb-3 mt-4">Account Creation</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must provide accurate and complete information when registering</li>
              <li>Students must provide their school name and city</li>
              <li>Mentors must provide a valid mentor code to register</li>
              <li>You are responsible for maintaining the confidentiality of your password</li>
              <li>You must be at least 13 years old to use the Platform</li>
            </ul>

            <h3 className="text-xl font-semibold text-theme-primary mb-3 mt-4">Account Security</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>You are responsible for all activities under your account</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Do not share your account credentials with others</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-theme-primary mb-4">4. User Conduct</h2>
            <p>You agree NOT to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Post offensive, harmful, or inappropriate content</li>
              <li>Harass, bully, or threaten other users</li>
              <li>Impersonate others or create fake accounts</li>
              <li>Share copyrighted material without permission</li>
              <li>Spam or engage in commercial activities without authorization</li>
              <li>Attempt to hack, disrupt, or damage the Platform</li>
              <li>Use automated systems (bots) without permission</li>
              <li>Share personal contact information publicly</li>
              <li>Violate any applicable laws or regulations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-theme-primary mb-4">5. Content Ownership</h2>
            
            <h3 className="text-xl font-semibold text-theme-primary mb-3 mt-4">Your Content</h3>
            <p>
              You retain ownership of content you create and upload to the Platform. By posting content, you grant us a worldwide, non-exclusive, royalty-free license to use, display, and distribute your content within the Platform.
            </p>

            <h3 className="text-xl font-semibold text-theme-primary mb-3 mt-4">Platform Content</h3>
            <p>
              All Platform content (design, code, logos, features) is owned by Studdy Buddy and protected by intellectual property laws. You may not copy, modify, or distribute Platform content without permission.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-theme-primary mb-4">6. Educational Resources</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Resources are provided for educational purposes only</li>
              <li>Mentors are responsible for the accuracy of content they upload</li>
              <li>We do not guarantee the quality or accuracy of user-generated content</li>
              <li>You may download resources for personal educational use only</li>
              <li>Redistribution of resources outside the Platform is prohibited</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-theme-primary mb-4">7. Mentor Responsibilities</h2>
            <p>If you are registered as a mentor, you agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide accurate and helpful educational content</li>
              <li>Respond professionally to student questions</li>
              <li>Maintain appropriate boundaries with students</li>
              <li>Respect intellectual property rights when uploading content</li>
              <li>Report any concerning behavior or safety issues</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-theme-primary mb-4">8. Privacy and Data Protection</h2>
            <p>
              Your use of the Platform is subject to our Privacy Policy. By using the Platform, you consent to the collection and use of your information as described in the Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-theme-primary mb-4">9. Disclaimers</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>No Warranty:</strong> The Platform is provided "as is" without warranties of any kind</li>
              <li><strong>Educational Use:</strong> Content is for informational purposes and should not replace formal education</li>
              <li><strong>User Interactions:</strong> We are not responsible for user-to-user interactions</li>
              <li><strong>Third-Party Content:</strong> We are not responsible for external links or embedded content</li>
              <li><strong>Availability:</strong> We do not guarantee uninterrupted or error-free service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-theme-primary mb-4">10. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Studdy Buddy and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-theme-primary mb-4">11. Termination</h2>
            <p>We reserve the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Suspend or terminate your account for violations of these Terms</li>
              <li>Remove content that violates our policies</li>
              <li>Modify or discontinue the Platform at any time</li>
            </ul>
            <p className="mt-3">
              You may delete your account at any time through the Settings page.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-theme-primary mb-4">12. Reporting Violations</h2>
            <p>
              If you encounter content or behavior that violates these Terms, please report it immediately through the Platform or contact us directly. We take user safety seriously and will investigate all reports.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-theme-primary mb-4">13. Changes to Terms</h2>
            <p>
              We may update these Terms and Conditions from time to time. We will notify you of significant changes by posting the new terms on this page and updating the "Last updated" date. Your continued use of the Platform after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-theme-primary mb-4">14. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-theme-primary mb-4">15. Contact Information</h2>
            <p>
              For questions or concerns about these Terms and Conditions, please contact us at:
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
              By using Studdy Buddy, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
