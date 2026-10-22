export const DB_NAME = "ugr-db";
export const SCHEMA_VERSION = 3;

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

/**
 * Los dos mundos (datos de ejemplo y personales): `scope` en las filas que
 * cuelgan del usuario.
 *
 * Las valoraciones propias se mudan a **`ownReviews`** porque su clave
 * primaria pasa a ser `scope|docentKey` —el mismo profesor puede estar
 * valorado en los dos mundos— y Dexie no permite cambiar la clave primaria de
 * una tabla existente. La tabla `reviews` se queda declarada y vacía: la
 * migración la vuelca en `ownReviews` y ninguna lectura la usa ya. Borrarla del
 * esquema obligaría a leer una tabla eliminada dentro de la migración; no
 * compensa por una tabla vacía.
 */
export const SCHEMA_V3 = {
  ...SCHEMA_V2,
  configs: "id, updatedAt, scope",
  ownReviews: "id, docentKey, subjectCode, scope",
};

export const SCHEMA_VERSIONS = [
  { version: 1, stores: SCHEMA_V1 },
  { version: 2, stores: SCHEMA_V2 },
  { version: 3, stores: SCHEMA_V3 },
];

export const LEGACY_MIGRATION_DONE = "legacy-v1";