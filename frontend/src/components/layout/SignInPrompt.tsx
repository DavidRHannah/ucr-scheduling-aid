import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface SignInPromptProps {
  title: string;
  message: string;
  actionLabel?: string;
}

export function SignInPrompt({ title, message, actionLabel = "Go to Sign In Settings" }: SignInPromptProps) {
  const navigate = useNavigate();
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      <p className="mt-2 max-w-sm text-gray-500">{message}</p>
      <Button className="mt-4 cursor-pointer" onClick={() => navigate("/settings")}>
        {actionLabel}
      </Button>
    </div>
  );
}
