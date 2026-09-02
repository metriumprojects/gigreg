import React, { useEffect } from 'react';
import MainLayout from "../../components/MainLayout";

export default function Privacypolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return (
    <MainLayout>
      <div className="bg-white text-[#000000] px-8 py-12 sm:px-6 sm:py-8 md:px-12 lg:px-24">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <h1 className="text-3xl font-bold leading-tight">Privacy Policy</h1>
        <p className="text-[#000000]">
          Last updated: 15 February 2026, 09:00 CET
        </p>
        <p className="text-[#000000]">
          Company: SkillSlide<br/>
          Address: 95 3rd St, San Francisco, CA 94103, United States<br/>
          Email: contact@skillslide.com
        </p>

        {/* Sections */}
        <div className="space-y-6">

          <section>
            <h2 className="text-2xl font-semibold mb-2">1. Overview</h2>
            <p>
              This Privacy Policy explains how SkillSlide (“we”, “us”, “our”) collects, uses, and protects personal data when you use the Skillslide platform (the “Platform”), where teachers offer lessons and students book classes.
              <br/>
              We process personal data in accordance with the EU General Data Protection Regulation (GDPR).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">2. Data We Collect</h2>

            <h3 className="text-xl font-medium mt-4 mb-1">2.1 Account Information</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Name, email address, password</li>
              <li>Profile details (bio, photo, skills, lesson topics)</li>
              <li>Account type (teacher or student)</li>
            </ul>

            <h3 className="text-xl font-medium mt-4 mb-1">2.2 Booking & Transaction Data</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Lesson bookings and scheduling data</li>
              <li>Payment and billing details (processed via third-party payment providers)</li>
              <li>Invoices and transaction history</li>
            </ul>

            <h3 className="text-xl font-medium mt-4 mb-1">2.3 Communications</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Messages between teachers and students</li>
              <li>Support requests and feedback</li>
            </ul>

            <h3 className="text-xl font-medium mt-4 mb-1">2.4 Technical & Usage Data</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>IP address, device, browser type</li>
              <li>Pages visited, session activity, timestamps</li>
              <li>Cookies and analytics data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">3. Legal Bases for Processing</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Contract performance: to provide bookings, accounts, and payments</li>
              <li>Legitimate interests: platform security, fraud prevention, service improvement</li>
              <li>Legal obligations: accounting, tax, and compliance requirements</li>
              <li>Consent: cookies and optional marketing communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">4. How We Use Your Data</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Create and manage user accounts</li>
              <li>Enable lesson bookings between teachers and students</li>
              <li>Process payments and payouts</li>
              <li>Provide customer support</li>
              <li>Improve platform features and user experience</li>
              <li>Prevent fraud and ensure platform safety</li>
              <li>Comply with legal and regulatory obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">5. Payments</h2>
            <p>Payments are processed by third-party providers (e.g., Stripe). We do not store full card details. Payment providers process data according to their own privacy policies.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">6. Data Sharing</h2>
            <p>We may share data with:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Payment processors (to handle transactions)</li>
              <li>Hosting and infrastructure providers</li>
              <li>Analytics providers (e.g., usage metrics)</li>
              <li>Legal authorities if required by law</li>
            </ul>
            <p>We do not sell personal data.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">7. International Transfers</h2>
            <p>If data is transferred outside the European Economic Area (EEA), we ensure appropriate safeguards such as Standard Contractual Clauses or equivalent protections.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">8. Data Retention</h2>
            <p>We retain personal data:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>For the duration of your account</li>
              <li>As required for legal, tax, and dispute resolution purposes</li>
              <li>Deleted or anonymised when no longer necessary</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">9. Your GDPR Rights</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Access your personal data</li>
              <li>Rectify inaccurate data</li>
              <li>Request deletion (“right to be forgotten”)</li>
              <li>Restrict or object to processing</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time (for consent-based processing)</li>
            </ul>
            <p>To exercise rights, contact: contact@skillslide.com.</p>
            <p>You may also lodge a complaint with your local data protection authority (e.g., CNIL in France).</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">10. Cookies</h2>
            <p>We use cookies for:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Essential platform functionality</li>
              <li>Analytics and performance monitoring</li>
              <li>User preferences and login sessions</li>
            </ul>
            <p>Users can manage cookie preferences via the cookie consent banner.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">11. Security</h2>
            <p>We implement technical and organisational safeguards to protect personal data against unauthorised access, loss, or misuse.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">12. Children</h2>
            <p>The Platform is not intended for children under 16 years of age. We do not knowingly collect personal data from minors without appropriate consent.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">13. Updates</h2>
            <p>We may update this Privacy Policy periodically. Material changes will be communicated through the Platform or by email.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">14. Contact</h2>
            <p>Email: contact@skillslide.com</p>
            <p>Address: 95 3rd St, San Francisco, CA 94103, United States</p>
          </section>

        </div>
      </div>
    </div>
    </MainLayout>
  )
}
