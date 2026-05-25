import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "../components/Button";
import { H2 } from "../components/Typography";
import { api } from "../services/api";

export const LoginPage = () => {
  const isDev = import.meta.env.VITE_APP_ENV === "dev";
  const [, navigate] = useLocation();
  const [agreed, setAgreed] = useState(false);

  const handleDevLogin = async () => {
    await api.get("/api/v1/auth/dev-login");
    navigate("/");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-200 gap-6">
      <div className="flex flex-col items-center gap-4 bg-white p-10 rounded-lg shadow-lg">
        <H2>AISysRev</H2>
        <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 cursor-pointer"
          />
          <span>
            By logging in you accept and agree to our{" "}
            <a
              href="/privacy-policy"
              className="underline hover:text-gray-900"
            >
              register and privacy policy
            </a>
            .
          </span>
        </label>
        <Button
          size="md"
          variant="slate"
          disabled={!agreed}
          onClick={() => (window.location.href = "/api/v1/auth/login")}
        >
          Login with University of Helsinki
        </Button>
        {isDev && (
          <Button size="md" variant="gray" disabled={!agreed} onClick={handleDevLogin}>
            Dev Login
          </Button>
        )}
      </div>
    </div>
  );
};
