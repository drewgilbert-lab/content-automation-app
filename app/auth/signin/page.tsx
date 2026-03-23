import { SignInButton } from "./signin-button";

const errorMessages: Record<string, string> = {
  AccessDenied:
    "Access denied. Your Google account is not authorized for this application.",
  OAuthAccountNotLinked:
    "This email is already associated with another sign-in method.",
  Default: "An error occurred during sign-in. Please try again.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const { error, callbackUrl } = await searchParams;

  const allowedDomains = process.env.ALLOWED_DOMAINS
    ? process.env.ALLOWED_DOMAINS.split(",").map((d) => d.trim())
    : [];

  const errorMessage = error
    ? errorMessages[error] || errorMessages.Default
    : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 text-white">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Content Engine</h1>
          <p className="mt-2 text-sm text-gray-400">Sign in to continue</p>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          {errorMessage && (
            <div className="mb-4 rounded-lg border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-300">
              {errorMessage}
            </div>
          )}

          {allowedDomains.length > 0 && (
            <p className="mb-4 text-center text-sm text-gray-400">
              Sign in with your{" "}
              {allowedDomains.map((d, i) => (
                <span key={d}>
                  {i > 0 && (i === allowedDomains.length - 1 ? " or " : ", ")}
                  <span className="font-medium text-gray-300">@{d}</span>
                </span>
              ))}{" "}
              Google account
            </p>
          )}

          <SignInButton callbackUrl={callbackUrl} />
        </div>
      </div>
    </div>
  );
}
