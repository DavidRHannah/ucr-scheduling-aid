import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import type { UserProfile } from "@/context/AuthContext";

interface UserProfileCardProps {
  user: UserProfile;
  authSuccess: string;
  onLogout: () => void;
}

function UserProfileCard({ user, authSuccess, onLogout }: UserProfileCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
        <CardDescription>You are signed in as {user.displayName}.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Display Name</label>
          <p className="text-lg font-medium text-gray-900">{user.displayName}</p>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email Address</label>
          <p className="text-lg font-medium text-gray-900">{user.email}</p>
        </div>
        {authSuccess && (
          <p className="rounded bg-green-50 p-2 text-sm text-green-700">{authSuccess}</p>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" onClick={onLogout}>
          Log Out
        </Button>
      </CardFooter>
    </Card>
  );
}

interface AuthFormProps {
  isRegister: boolean;
  email: string;
  password: string;
  displayName: string;
  authError: string;
  authSuccess: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onToggleMode: () => void;
}

function AuthForm({
  isRegister,
  email,
  password,
  displayName,
  authError,
  authSuccess,
  onEmailChange,
  onPasswordChange,
  onDisplayNameChange,
  onSubmit,
  onToggleMode,
}: AuthFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{isRegister ? "Create Account" : "Sign In"}</CardTitle>
        <CardDescription>
          {isRegister
            ? "Register to save schedules to your database profile."
            : "Sign in to access your saved schedule configurations."}
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          {isRegister && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Display Name</label>
              <Input
                required
                type="text"
                placeholder="John Doe"
                value={displayName}
                onChange={(e) => onDisplayNameChange(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Email Address</label>
            <Input
              required
              type="email"
              placeholder="student@ucr.edu"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Password</label>
            <Input
              required
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
            />
          </div>

          {authError && (
            <p className="rounded bg-red-50 p-2 text-sm text-red-700">{authError}</p>
          )}
          {authSuccess && (
            <p className="rounded bg-green-50 p-2 text-sm text-green-700">{authSuccess}</p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full">
            {isRegister ? "Register" : "Sign In"}
          </Button>
          <button
            type="button"
            className="text-xs text-blue-600 hover:underline"
            onClick={onToggleMode}
          >
            {isRegister
              ? "Already have an account? Sign in"
              : "Don't have an account? Register now"}
          </button>
        </CardFooter>
      </form>
    </Card>
  );
}

interface AuthPanelProps {
  user: UserProfile | null;
  isRegister: boolean;
  email: string;
  password: string;
  displayName: string;
  authError: string;
  authSuccess: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onToggleMode: () => void;
  onLogout: () => void;
}

export function AuthPanel({ user, ...rest }: AuthPanelProps) {
  if (user) {
    return (
      <UserProfileCard user={user} authSuccess={rest.authSuccess} onLogout={rest.onLogout} />
    );
  }
  return <AuthForm {...rest} />;
}
