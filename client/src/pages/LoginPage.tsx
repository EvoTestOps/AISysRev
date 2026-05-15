import { Button } from "../components/Button";
import { H2 } from "../components/Typography";

export const LoginPage = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-200 gap-6">
    <div className="flex flex-col items-center gap-4 bg-white p-10 rounded-lg shadow-lg">
      <H2>AISysRev</H2>
      <p className="text-gray-600 text-sm">
        Login with your University of Helsinki account to continue.
      </p>
      <Button
        size="md"
        variant="slate"
        onClick={() => (window.location.href = "/api/v1/auth/login")}
      >
        Login with University of Helsinki
      </Button>
    </div>
  </div>
);
