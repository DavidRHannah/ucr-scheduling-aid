import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTerm } from "@/context/TermContext";
import { api } from "@/lib/api";
import { AuthPanel } from "@/components/settings/AuthPanel";
import { CatalogSyncPanel } from "@/components/settings/CatalogSyncPanel";

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

  const toggleAuthMode = () => {
    setIsRegister(!isRegister);
    setAuthError("");
    setAuthSuccess("");
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
          <AuthPanel
            user={user}
            isRegister={isRegister}
            email={email}
            password={password}
            displayName={displayName}
            authError={authError}
            authSuccess={authSuccess}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onDisplayNameChange={setDisplayName}
            onSubmit={handleAuthSubmit}
            onToggleMode={toggleAuthMode}
            onLogout={logout}
          />
        </div>

        {/* Administrative Data Sync Panel */}
        <div>
          <CatalogSyncPanel
            termCode={termCode}
            subjectsStr={subjectsStr}
            apiKey={apiKey}
            syncLoading={syncLoading}
            syncResult={syncResult}
            syncError={syncError}
            onTermCodeChange={setTermCode}
            onSubjectsChange={setSubjectsStr}
            onApiKeyChange={setApiKey}
            onSubmit={handleSyncSubmit}
          />
        </div>
      </div>
    </div>
  );
}
