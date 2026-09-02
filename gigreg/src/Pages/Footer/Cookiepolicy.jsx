import React, {useEffect} from 'react';
import MainLayout from "../../components/MainLayout";

export default function Cookiepolicy() {
  useEffect(() => {
      window.scrollTo(0, 0);
    }, []);
  return (
    <MainLayout>
      <div className="bg-white text-[#000000] px-8 py-12 sm:px-6 sm:py-8 md:px-12 lg:px-24">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* Header */}
          <h1 className="text-3xl font-bold leading-tight">Cookie Policy</h1>
          <p className="text-[#000000]">Website: Skillslide.com</p>
          <p className="mt-2">
            This Cookie Policy explains how we use cookies and similar tracking technologies when you use the Skillslide platform (the “Platform”).
          </p>

          {/* Sections */}
          <div className="space-y-6">

            <section>
              <h2 className="text-2xl font-semibold mb-2">1. What Are Cookies</h2>
              <p>
                Cookies are small text files stored on your device when you visit a website. They help websites function properly, remember preferences, and analyse usage.
              </p>
              <p>
                We also use similar technologies such as pixels, tags, and local storage.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-2">2. Types of Cookies We Use</h2>

              <h3 className="text-xl font-medium mt-4 mb-1">2.1 Strictly Necessary Cookies</h3>
              <p>These cookies are essential for the Platform to operate and cannot be disabled. They enable:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Account login and authentication</li>
                <li>Booking and payment processes</li>
                <li>Security and fraud prevention</li>
                <li>Basic site functionality</li>
              </ul>
              <p className="mt-1">Legal basis: Legitimate interest (service operation)</p>

              <h3 className="text-xl font-medium mt-4 mb-1">2.2 Analytics and Performance Cookies</h3>
              <p>These cookies help us understand how users interact with the Platform so we can improve features and performance. They collect aggregated information such as:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Pages visited</li>
                <li>Time spent on the site</li>
                <li>Navigation patterns</li>
                <li>Device and browser type</li>
              </ul>
              <p className="mt-1">Legal basis: User consent (GDPR)</p>

              <h3 className="text-xl font-medium mt-4 mb-1">2.3 Functional Cookies</h3>
              <p>These cookies remember user preferences and settings, such as:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Language selection</li>
                <li>Region or timezone</li>
                <li>Interface customisation</li>
              </ul>
              <p className="mt-1">Legal basis: Legitimate interest or consent (depending on jurisdiction)</p>

              <h3 className="text-xl font-medium mt-4 mb-1">2.4 Marketing and Tracking Cookies</h3>
              <p>These cookies may be used to measure campaign effectiveness or show relevant content. They are only placed with your explicit consent.</p>
              <p className="mt-1">Legal basis: User consent</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-2">3. Third-Party Cookies</h2>
              <p>We may allow third-party services to set cookies, including:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Payment processors (e.g., Stripe)</li>
                <li>Analytics providers (e.g., Google Analytics)</li>
                <li>Hosting and infrastructure providers</li>
              </ul>
              <p>These third parties process data according to their own privacy policies.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-2">4. Cookie Consent</h2>
              <p>When you first visit the Platform, you will be shown a cookie banner allowing you to:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Accept all cookies</li>
                <li>Reject non-essential cookies</li>
                <li>Customise preferences</li>
              </ul>
              <p>You can change your preferences at any time via the cookie settings link available on the website.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-2">5. Managing Cookies</h2>
              <p>You can control or delete cookies through your browser settings. Please note that disabling strictly necessary cookies may prevent parts of the Platform from functioning correctly.</p>
              <p>Browser guides:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Chrome: <a className="text-blue-600 underline" href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noreferrer">https://support.google.com/chrome/answer/95647</a></li>
                <li>Firefox: <a className="text-blue-600 underline" href="https://support.mozilla.org/en-US/kb/enable-and-disable-cookies-website-preferences" target="_blank" rel="noreferrer">https://support.mozilla.org/en-US/kb/enable-and-disable-cookies-website-preferences</a></li>
                <li>Safari: <a className="text-blue-600 underline" href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noreferrer">https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac</a></li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-2">6. Data Retention</h2>
              <p>Cookies are stored for different durations depending on their purpose:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Session cookies: deleted when you close your browser</li>
                <li>Persistent cookies: stored for a limited period or until manually deleted</li>
              </ul>
              <p>Retention periods are aligned with operational and legal requirements.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-2">7. Updates to This Policy</h2>
              <p>We may update this Cookie Policy to reflect changes in legal requirements or platform functionality. Any significant changes will be communicated through the Platform.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-2">8. Contact</h2>
              <p>For questions regarding cookies or data protection:</p>
              <p>Address: 95 3rd St, San Francisco, CA 94103, United States</p>
              <p>Email: contact@skillslide.com</p>
            </section>

          </div>
        </div>
      </div>
    </MainLayout>
  )
}
