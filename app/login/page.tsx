import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-white">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-32 -right-32 h-[480px] w-[480px] rounded-full bg-brand-100 blur-3xl opacity-70" />
        <div className="absolute -bottom-40 -left-32 h-[520px] w-[520px] rounded-full bg-brand-200 blur-3xl opacity-50" />
      </div>

      <div className="mx-auto flex min-h-[100dvh] max-w-6xl items-center justify-center px-6 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] pt-[calc(4rem+env(safe-area-inset-top,0px))]">
        <div className="grid w-full grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2 text-brand-600">
              <Logo />
              <span className="text-lg font-bold tracking-tight text-ink-900">
                FieldVision <span className="text-brand-600">CRM</span>
              </span>
            </div>
            <h1 className="mt-10 text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
              The internal hub for the FieldVision team.
            </h1>
            <p className="mt-5 max-w-md text-base text-ink-500">
              One clean home for engineering sprints, growth experiments, and content production.
              Sign in with your team username and pick up where the team left off.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-ink-700">
              <FeatureRow>Group work by Engineering, Growth, or Content</FeatureRow>
              <FeatureRow>Assign owners, due dates, difficulty, and attachments</FeatureRow>
              <FeatureRow>Live updates the moment a teammate moves a task</FeatureRow>
            </ul>
          </div>

          <div className="flex items-center justify-center">
            <div className="card w-full max-w-md p-8">
              <h2 className="text-2xl font-bold text-ink-900">Welcome back</h2>
              <p className="mt-1 text-sm text-ink-500">
                Sign in with your username and password.
              </p>
              <div className="mt-6">
                <LoginForm />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-card">
      <span className="text-sm font-extrabold tracking-tight">FV</span>
    </div>
  );
}

function FeatureRow({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-brand-700">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6.5L5 9l4.5-5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span>{children}</span>
    </li>
  );
}
