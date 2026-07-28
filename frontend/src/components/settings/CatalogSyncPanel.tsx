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

interface CatalogSyncPanelProps {
  termCode: string;
  subjectsStr: string;
  apiKey: string;
  syncLoading: boolean;
  syncResult: string | null;
  syncError: string | null;
  onTermCodeChange: (value: string) => void;
  onSubjectsChange: (value: string) => void;
  onApiKeyChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function CatalogSyncPanel({
  termCode,
  subjectsStr,
  apiKey,
  syncLoading,
  syncResult,
  syncError,
  onTermCodeChange,
  onSubjectsChange,
  onApiKeyChange,
  onSubmit,
}: CatalogSyncPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Catalog Synchronization</CardTitle>
        <CardDescription>Sync UCR Banner SIS data with the MongoDB server cache.</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Term Code</label>
            <Input
              required
              type="text"
              placeholder="202620"
              value={termCode}
              onChange={(e) => onTermCodeChange(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Subject Filters (comma separated)</label>
            <Input
              required
              type="text"
              placeholder="CS, MATH"
              value={subjectsStr}
              onChange={(e) => onSubjectsChange(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Administrative Ingest Key</label>
            <Input
              required
              type="password"
              placeholder="intake key"
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
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
  );
}
