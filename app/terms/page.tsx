export const metadata = {
  title: "Terms of Service | Startup-Analyst-XI",
  description: "Terms of service for Startup-Analyst-XI.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen w-full px-5 py-10 sm:px-8 md:px-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          Terms of Service
        </h1>
        <p className="opacity-80 text-sm">
          By using Startup-Analyst-XI, you agree to these terms.
        </p>

        <section className="space-y-3 text-sm">
          <h2 className="text-lg font-medium">1. Acceptable Use</h2>
          <p>
            You will use the service only for lawful purposes and will not
            upload content that violates any third-party rights or applicable
            laws.
          </p>
        </section>

        <section className="space-y-3 text-sm">
          <h2 className="text-lg font-medium">2. No Professional Advice</h2>
          <p>
            Content produced is for informational purposes only and does not
            constitute investment advice.
          </p>
        </section>

        <section className="space-y-3 text-sm">
          <h2 className="text-lg font-medium">3. Service Availability</h2>
          <p>
            The service is provided on an &quot;as is&quot; and &quot;as
            available&quot; basis without warranties of any kind.
          </p>
        </section>

        <section className="space-y-3 text-sm">
          <h2 className="text-lg font-medium">4. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, we are not liable for any
            indirect, incidental, or consequential damages arising from your use
            of the service.
          </p>
        </section>

        <section className="space-y-3 text-sm">
          <h2 className="text-lg font-medium">5. Changes</h2>
          <p>
            We may update these terms from time to time. Continued use of the
            service constitutes acceptance of the updated terms.
          </p>
        </section>
      </div>
    </div>
  );
}
