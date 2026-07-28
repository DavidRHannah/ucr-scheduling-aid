import type { PrerequisiteGroup } from "@/lib/api";

interface PrerequisiteGroupListProps {
  groups: PrerequisiteGroup[];
  loading: boolean;
}

export function PrerequisiteGroupList({ groups, loading }: PrerequisiteGroupListProps) {
  return (
    <div className="space-y-2 border-t border-gray-100 pt-4">
      <h4 className="text-sm font-semibold text-gray-900">Academic Prerequisites</h4>
      {loading ? (
        <div className="text-sm text-gray-400">Checking prerequisites...</div>
      ) : groups.length > 0 ? (
        <div className="space-y-3">
          {groups.map((group, idx) => (
            <div key={idx} className="rounded-md bg-gray-50 p-3 text-sm text-gray-700">
              <div className="font-semibold text-gray-500 uppercase text-xs">
                Rule Group {idx + 1}
              </div>
              <div className="mt-1">
                Must pass one of the following:
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  {group.options.map((opt, oIdx) => (
                    <li key={oIdx}>
                      <span className="font-medium text-gray-900">
                        {opt.course?.subject} {opt.course?.courseNumber}
                      </span>{" "}
                      ({opt.course?.title || "Unknown Title"}) with a grade of {opt.minGrade} or better
                      {opt.concurrentAllowed && " (concurrent enrollment allowed)"}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">No prerequisites registered for this course.</p>
      )}
    </div>
  );
}
