import { CheckCircle2 } from "lucide-react";

interface StatusBannerProps {
  combinationCount: number;
  generationTimeSeconds: number;
}

export function StatusBanner({ combinationCount, generationTimeSeconds }: StatusBannerProps) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-green-200 bg-green-50 p-4">
      <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
      <div>
        <div className="font-semibold text-green-800">
          Found {combinationCount} compatible schedule combinations!
        </div>
        <div className="text-sm text-green-700">
          Generated in {generationTimeSeconds.toFixed(2)}s using conflict-pruned search.
        </div>
      </div>
    </div>
  );
}
