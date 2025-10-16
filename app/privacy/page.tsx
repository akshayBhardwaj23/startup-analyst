export const metadata = {
  title: "Privacy Policy | Startup-Analyst-XI",
  description: "Privacy policy for Startup-Analyst-XI.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen w-full px-5 py-10 sm:px-8 md:px-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          Privacy Policy
        </h1>
        <p className="opacity-80 text-sm">
          We respect your privacy. This page describes how we handle your
          information when you use Startup-Analyst-XI.
        </p>

        <section className="space-y-3 text-sm">
          <h2 className="text-lg font-medium">1. Information We Process</h2>
          <p>
            - Documents you upload for analysis are processed to extract text in
            order to generate your brief. Files are stored on temporary object
            storage and text is sent to our AI provider for processing.
          </p>
          <p>
            - Account information (name, email, profile image) is provided by
            your identity provider when you sign in.
          </p>
        </section>

        <section className="space-y-3 text-sm">
          <h2 className="text-lg font-medium">2. Data Retention</h2>
          <p>
            We retain minimal data necessary to operate the service. Uploaded
            documents may be stored transiently for processing. Briefs you
            generate may be stored in your account history if you opt in to that
            feature.
          </p>
        </section>

        <section className="space-y-3 text-sm">
          <h2 className="text-lg font-medium">3. Third-Party Services</h2>
          <p>
            We use infrastructure and AI providers (e.g., Vercel, Google)
            subject to their respective terms.
          </p>
        </section>

        <section className="space-y-3 text-sm">
          <h2 className="text-lg font-medium">4. Your Choices</h2>
          <p>
            You can request deletion of your account data by contacting the
            team. Do not upload documents containing sensitive personal data.
          </p>
        </section>

        <section className="space-y-3 text-sm">
          <h2 className="text-lg font-medium">5. Contact</h2>
          <p>For questions, contact the maintainers of Startup-Analyst-XI.</p>
        </section>
      </div>
    </div>
  );
}
