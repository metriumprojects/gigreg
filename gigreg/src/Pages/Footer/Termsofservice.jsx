import React, {useEffect} from 'react';
import MainLayout from "../../components/MainLayout";

export default function Termsofservice() {
  useEffect(() => {
      window.scrollTo(0, 0);
    }, []);
  return (
    <MainLayout>
      <div className="bg-white text-[#000000] px-8 py-12 sm:px-6 sm:py-8 md:px-12 lg:px-24">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* Header */}
          <h1 className="text-3xl font-bold leading-tight">Terms of Service (Terms & Conditions)</h1>
          <p className="text-[#000000]">
            Last updated: 15 February 2026, 09:00 CET
          </p>
          <p className="text-[#000000]">
            Company: SkillSlide<br/>
            Address: 95 3rd St, San Francisco, CA 94103, United States<br/>
            Email: contact@skillslide.com
          </p>

          <p className="mt-4">
            These Terms of Service (“Terms”) govern access to and use of the Skillslide platform (the “Platform”), a marketplace where independent teachers offer lessons and students can book classes.
          </p>
          <p>
            By creating an account or using the Platform, you agree to these Terms.
          </p>

          {/* Sections */}
          <div className="space-y-6">

            <section>
              <h2 className="text-2xl font-semibold mb-2">1. Platform Role</h2>
              <p>Skillslide provides an online marketplace connecting teachers and students. We are not a party to lesson agreements and do not act as the employer, agent, or partner of teachers. Teachers are independent providers responsible for their own services.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-2">2. Eligibility</h2>
              <p>You must be at least 18 years old (or the legal age of majority in your country) to use the Platform. By using the Platform, you confirm that all information provided is accurate and complete.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-2">3. User Accounts</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>Maintaining the confidentiality of your login credentials</li>
                <li>All activity conducted through your account</li>
              </ul>
              <p>We reserve the right to suspend or terminate accounts that violate these Terms.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-2">4. Teacher Responsibilities</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>Provide accurate lesson descriptions, pricing, and availability</li>
                <li>Deliver booked lessons professionally and as described</li>
                <li>Comply with applicable laws and tax obligations</li>
                <li>Ensure they have the right and qualifications to teach their listed subjects</li>
              </ul>
              <p>Teachers are solely responsible for the content and quality of their lessons.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-2">5. Student Responsibilities</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>Provide accurate booking and contact information</li>
                <li>Attend scheduled lessons on time</li>
                <li>Respect teachers and comply with lesson guidelines</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-2">6. Booking and Payments</h2>
              <p>Bookings are made through the Platform. Payments are processed via third-party payment providers (e.g., Stripe). We may charge service fees or commissions as disclosed on the Platform. All prices are shown inclusive or exclusive of applicable taxes as indicated.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-2">7. Cancellations and Refunds</h2>
              <p>Cancellation and refund rules are defined in our Booking & Cancellation Policy. Unless otherwise stated:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Students may cancel within the allowed time window for a refund or reschedule</li>
                <li>Late cancellations or missed lessons may not be refunded</li>
                <li>Teachers who fail to deliver a booked lesson may be subject to refunds and account actions</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-2">8. Platform Fees</h2>
              <p>Skillslide may charge commission on lesson bookings and processing or service fees. Fees will be clearly disclosed before payment confirmation.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-2">9. Content and Conduct</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>Upload unlawful, abusive, or misleading content</li>
                <li>Infringe intellectual property rights</li>
                <li>Attempt to bypass platform payments or fees</li>
                <li>Engage in harassment, fraud, or harmful behavior</li>
              </ul>
              <p>We may remove content or suspend accounts violating these rules.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-2">10. Intellectual Property</h2>
              <p>All platform content, branding, and software are owned by SkillSlide or licensed to us. Users may not copy, reproduce, or distribute platform materials without permission. Teachers retain ownership of their lesson materials but grant us a license to display them on the Platform.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-2">11. Liability Limitation</h2>
              <p>To the maximum extent permitted by law: SkillSlide is not responsible for the quality, safety, or legality of lessons provided by teachers. We do not guarantee uninterrupted or error-free platform operation. Our liability is limited to the amount paid through the Platform in the 12 months preceding the claim. Nothing excludes liability where prohibited by law (e.g., fraud, gross negligence, or consumer rights).</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-2">12. Disputes Between Users</h2>
              <p>Disputes between teachers and students should first be resolved directly. We may, at our discretion, assist in mediation but are not obligated to do so.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-2">13. Suspension and Termination</h2>
              <p>We may suspend or terminate access if these Terms are violated, fraudulent or abusive activity is detected, or required by law. Users may close their account at any time via account settings or by contacting support.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-2">14. Data Protection</h2>
              <p>Personal data is processed according to our Privacy Policy (last updated 15 February 2026, 09:00 CET).</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-2">15. Modifications to the Service</h2>
              <p>We may modify, suspend, or discontinue any part of the Platform at any time for operational or legal reasons.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-2">16. Governing Law and Jurisdiction</h2>
              <p>These Terms are governed by the laws of France. Any disputes shall be subject to the exclusive jurisdiction of the courts of [City, France], unless mandatory consumer protection laws provide otherwise.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-2">17. Contact</h2>
              <p>Email: contact@skillslide.com</p>
            </section>

          </div>
        </div>
      </div>
    </MainLayout>
  )
}
