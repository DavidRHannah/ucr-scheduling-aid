import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTerm } from "@/context/TermContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

export default function Settings() {
  const navigate = useNavigate();
  const { term: globalTerm } = useTerm();
  const { user, login, register, logout, loading } = useAuth();
  
  // Auth Form State
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  // Sync state
  const [termCode, setTermCode] = useState(globalTerm || "202620");
  const [subjectsStr, setSubjectsStr] = useState("CS, MATH");
  const [apiKey, setApiKey] = useState("replace-this-with-a-secure-admin-api-key-for-data-sync");
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    try {
      if (isRegister) {
        await register(email, password, displayName);
        setAuthSuccess("Account created successfully!");
      } else {
        await login(email, password);
        setAuthSuccess("Logged in successfully!");
      }
      setEmail("");
      setPassword("");
      setDisplayName("");
      // Redirect to Schedule Builder page
      navigate("/");
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed.");
    }
  };

  const handleSyncSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncLoading(true);
    setSyncResult(null);
    setSyncError(null);

    const subjects = subjectsStr
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0);

    try {
      const res = await api.syncBanner({ termCode, subjects }, apiKey);
      setSyncResult(
        `Sync completed successfully! Synced ${res.synced?.courses || 0} courses and ${res.synced?.sections || 0} sections.`
      );
    } catch (err: any) {
      setSyncError(err.message || "Sync failed. Verify API key and backend connection.");
    } finally {
      setSyncLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-gray-500">Loading user profile...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-500">Manage user accounts and trigger administrative catalog synchronization.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* User Account / Authentication Panel */}
        <div>
          {user ? (
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
                <Button variant="outline" className="w-full" onClick={logout}>
                  Log Out
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{isRegister ? "Create Account" : "Sign In"}</CardTitle>
                <CardDescription>
                  {isRegister
                    ? "Register to save schedules to your database profile."
                    : "Sign in to access your saved schedule configurations."}
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleAuthSubmit}>
                <CardContent className="space-y-4">
                  {isRegister && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Display Name</label>
                      <Input
                        required
                        type="text"
                        placeholder="John Doe"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
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
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Password</label>
                    <Input
                      required
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                    onClick={() => {
                      setIsRegister(!isRegister);
                      setAuthError("");
                      setAuthSuccess("");
                    }}
                  >
                    {isRegister
                      ? "Already have an account? Sign in"
                      : "Don't have an account? Register now"}
                  </button>
                </CardFooter>
              </form>
            </Card>
          )}
        </div>

        {/* Administrative Data Sync Panel */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Catalog Synchronization</CardTitle>
              <CardDescription>
                Sync UCR Banner SIS data with the MongoDB server cache.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSyncSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Term Code</label>
                  <Input
                    required
                    type="text"
                    placeholder="202620"
                    value={termCode}
                    onChange={(e) => setTermCode(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Subject Filters (comma separated)</label>
                  <Input
                    required
                    type="text"
                    placeholder="CS, MATH"
                    value={subjectsStr}
                    onChange={(e) => setSubjectsStr(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Administrative Ingest Key</label>
                  <Input
                    required
                    type="password"
                    placeholder="intake key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>

                {syncError && (
                  <p className="rounded bg-red-50 p-2 text-sm text-red-700">{syncError}</p>
                )}
                {syncResult && (
                  <p className="rounded bg-blue-50 p-2 text-sm text-blue-700">{syncResult}</p>
                )}
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={syncLoading} className="w-full">
                  {syncLoading ? "Running Synchronization..." : "Trigger Ingestion Sync"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
