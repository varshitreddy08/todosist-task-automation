import Link from "next/link";

export const metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back
        </Link>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: October 5, 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-base font-medium text-foreground">1. Acceptance of terms</h2>
            <p className="mt-2">
              By creating an account or using TaskFlow, you agree to these Terms of Service. If
              you do not agree, do not use the application.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-foreground">2. The service</h2>
            <p className="mt-2">
              TaskFlow is a task and productivity management application provided on an
              &quot;as is&quot; and &quot;as available&quot; basis, without warranties of any kind.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-foreground">3. Accounts</h2>
            <p className="mt-2">
              You are responsible for maintaining the confidentiality of your account
              credentials and for all activity that occurs under your account.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-foreground">4. Acceptable use</h2>
            <p className="mt-2">
              You agree not to misuse the service, including attempting to disrupt it, access
              other users&apos; data without authorization, or use it for unlawful purposes.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-foreground">5. Termination</h2>
            <p className="mt-2">
              We may suspend or terminate access to the service for violation of these terms.
              You may stop using the service and request deletion of your account at any time.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-foreground">6. Limitation of liability</h2>
            <p className="mt-2">
              To the maximum extent permitted by law, we are not liable for any indirect,
              incidental, or consequential damages arising from use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-foreground">7. Changes</h2>
            <p className="mt-2">
              We may update these terms from time to time. Continued use of the service after
              changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-foreground">8. Contact</h2>
            <p className="mt-2">
              Questions about these terms can be sent to{" "}
              <a className="underline" href="mailto:varshitreddy08@gmail.com">
                varshitreddy08@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
