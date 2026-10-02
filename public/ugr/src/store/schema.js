export const DB_NAME = "ugr-db";
export const SCHEMA_VERSION = 1;

export const SCHEMA_V1 = {
  meta: "key",
  userState: "key",
  configs: "id, updatedAt",
  solutions: "problemHash, computedAt",
  progress: "key",
  reviews: "docentKey, subjectCode",
  imports: "importId",
  legacy: "key",
};

export const LEGACY_MIGRATION_DONE = "legacy-v1";