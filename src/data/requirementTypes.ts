export interface RequirementType {
  code: string;
  description: string;
}

// Subset of backend/reqs.json used to populate the
// "Requirement Type" filter dropdown in the Course Search panel.
export const requirementTypes: RequirementType[] = [
  { code: "BEAD", description: "EN-ABET Depth" },
  { code: "BEET", description: "EN-Ethnicity" },
  { code: "BEFA", description: "EN-Hum - FA/Lit/Phil/Rel" },
  { code: "BEMA", description: "EN-Nat Sci - Math/Stat/CS" },
  { code: "BEPS", description: "EN-Nat Sci - Physical Sci" },
  { code: "BEAT", description: "EN-Soc Sci - Anth/Psyc/Soc" },
  { code: "BBE1", description: "BU-Composition - 1st Qtr" },
  { code: "BBET", description: "BU-Ethnicity" },
];
