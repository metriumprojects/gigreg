import React, {useEffect} from 'react';
import MainLayout from "../../components/MainLayout";

export default function Legalnotice() {
    useEffect(() => {
        window.scrollTo(0, 0);
      }, []);
  return (
    <MainLayout>
      <div className="bg-white text-[#000000] px-8 py-12 sm:px-6 sm:py-8 md:px-12 lg:px-24">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* Header */}
          <h1 className="text-3xl font-bold leading-tight">Legal Notice</h1>
          <p className="text-[#000000]">Last updated: 15 February 2026, 09:10 CET</p>
          <p className="mt-2">
            In accordance with Articles 6-III and 19 of French Law No. 2004-575 of 21 June 2004 for Confidence in the Digital Economy (LCEN), the following information is provided to users of the Skillslide platform.
          </p>

          {/* Sections */}
          <div className="space-y-6">

            <section>
              <h2 className="text-2xl font-semibold mb-2">1. Website Publisher</h2>
              <p>Company name: SkillSlide</p>
              <p>Legal form: [e.g., SAS / SARL / Sole Proprietorship]</p>
              <p>Registered office: 95 3rd St, San Francisco, CA 94103, United States</p>
              <p>Email: contact@skillslide.com</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-2">2. Website Host</h2>
              <p>Hosting provider: Amazon Web Services</p>
              <p>Address: 410 Terry Avenue North, Seattle, Washington, 98109</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-2">3. Platform Description</h2>
              <p>
                Skillslide is an online marketplace allowing independent teachers to publish lessons and students to book classes. The company operates solely as an intermediary platform and is not the provider of the lessons listed by teachers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-2">4. Intellectual Property</h2>
              <p>
                All content on the website (text, graphics, logos, software, design, and trademarks) is the exclusive property of [Legal Company Name] or its licensors, unless otherwise stated. Any reproduction, distribution, or use without prior written authorization is strictly prohibited.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-2">5. Liability</h2>
              <p>
                The publisher strives to provide accurate and up-to-date information but cannot guarantee the accuracy, completeness, or timeliness of content. The publisher shall not be held liable for:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Errors or omissions in content</li>
                <li>Temporary service interruptions</li>
                <li>Direct or indirect damages resulting from use of the website</li>
              </ul>
              <p>Teachers are solely responsible for the lessons and content they publish on the platform.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-2">6. Personal Data</h2>
              <p>
                Personal data is processed in accordance with the Privacy Policy (last updated 15 February 2026, 09:00 CET). Users have the right to access, rectify, and delete their personal data by contacting: [Privacy Contact Email].
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-2">7. Cookies</h2>
              <p>
                The website uses cookies to ensure proper functioning, measure audience usage, and improve user experience. Users can manage cookie preferences via the consent banner.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-2">8. Applicable Law</h2>
              <p>
                This website is governed by French law. Any disputes relating to its use are subject to the jurisdiction of the competent courts of Paris, France.
              </p>
            </section>

          </div>
        </div>
      </div>
    </MainLayout>
  )
}
