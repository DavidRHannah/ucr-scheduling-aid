import { Link } from "react-router-dom";

interface SaveStatusBannerProps {
  success: string;
  error: string;
}

export function SaveStatusBanner({ success, error }: SaveStatusBannerProps) {
  return (
    <>
      {success && (
        <div className="rounded bg-green-50 p-3 text-sm text-green-700 flex items-center justify-between border border-green-100">
          <span>{success}</span>
          <Link
            to="/saved-schedules"
            className="underline font-semibold hover:text-green-900 transition ml-2"
          >
            View Saved Schedules
          </Link>
        </div>
      )}
      {error && <div className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
    </>
  );
}
