"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/auth/useAuthNew";
import { getXCallbackData } from "@/utils/oauth";

export default function XCallbackPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  const { xLogin } = useAuth();

  useEffect(() => {
    async function handleCallback() {
      const callbackData = getXCallbackData();

      if (!callbackData) {
        setStatus("error");
        setErrorMessage("Invalid callback data or CSRF mismatch");
        return;
      }

      try {
        const result = await xLogin(
          callbackData.code,
          callbackData.redirectUri,
          callbackData.codeVerifier
        );

        if (result.success) {
          setStatus("success");
          setTimeout(() => router.push("/dashboard"), 1000);
        } else {
          setStatus("error");
          setErrorMessage(result.error || "X login failed");
        }
      } catch (err: any) {
        setStatus("error");
        setErrorMessage(err.message || "An error occurred");
      }
    }

    handleCallback();
  }, [xLogin, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
      <div className="text-center p-8">
        {status === "loading" && (
          <>
            <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-brand-500 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Signing in with X...
            </p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="text-4xl mb-4">✅</div>
            <p className="text-gray-800 dark:text-white font-semibold">
              Successfully signed in!
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
              Redirecting to dashboard...
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="text-4xl mb-4">❌</div>
            <p className="text-gray-800 dark:text-white font-semibold">
              Sign in failed
            </p>
            <p className="text-error-500 text-sm mt-2">{errorMessage}</p>
            <button
              onClick={() => router.push("/signin")}
              className="mt-4 px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition"
            >
              Back to Sign In
            </button>
          </>
        )}
      </div>
    </div>
  );
}
