export const DB_NAME = "ugr-db";
export const SCHEMA_VERSION = 2;

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

export const SCHEMA_V2 = {
  ...SCHEMA_V1,
  catalogs: "key, updatedAt",
};

export const SCHEMA_VERSIONS = [
  { version: 1, stores: SCHEMA_V1 },
  { version: 2, stores: SCHEMA_V2 },
];

export const LEGACY_MIGRATION_DONE = "legacy-v1";