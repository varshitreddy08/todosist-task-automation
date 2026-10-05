import Link from "next/link";

export const metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back
        </Link>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: October 5, 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-base font-medium text-foreground">1. Overview</h2>
            <p className="mt-2">
              TaskFlow (&quot;we&quot;, &quot;us&quot;) provides an AI-powered task management
              platform. This policy explains what information we collect when you use the
              application and how it is used.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-foreground">2. Information we collect</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Account information: name, email address, and profile photo, provided directly
                by you or by your identity provider (Google / GitHub) when you sign in.</li>
              <li>Content you create in the app: tasks, projects, habits, goals, notes, and
                calendar entries.</li>
              <li>Basic usage data (e.g. login timestamps) used for security and reliability.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-medium text-foreground">3. How we use your information</h2>
            <p className="mt-2">
              We use your information solely to operate the application: authenticating you,
              storing and displaying your tasks and data, sending account-related emails, and
              improving reliability. We do not sell your personal data.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-foreground">4. Third-party sign-in</h2>
            <p className="mt-2">
              If you sign in with Google or GitHub, we only request your basic profile
              information (name, email, profile photo) to create and authenticate your account.
              We do not access any other data from your Google or GitHub account.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-foreground">5. Data storage &amp; security</h2>
            <p className="mt-2">
              Your data is stored in a managed PostgreSQL database and protected with encryption
              in transit. Access is restricted to what is required to operate the service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-foreground">6. Your rights</h2>
            <p className="mt-2">
              You can request access to, correction of, or deletion of your account and
              associated data at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-foreground">7. Contact</h2>
            <p className="mt-2">
              Questions about this policy can be sent to{" "}
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
