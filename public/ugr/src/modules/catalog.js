import { registerModule } from "../kernel/registry.js";
import { bus } from "../kernel/bus.js";
import {
  fromLegacySubjects,
  getSubject,
  getGroup,
  getSubgroups,
  validateCatalog,
  catalogVersion,
} from "../solver/catalog.js";

let catalog = null;

function getSubjects() {
  return catalog ? catalog.subjects : [];
}

function getGroupByCode(code, letra) {
  return getGroup(getSubject(catalog, code), letra);
}

function getVersion() {
  return catalog ? catalogVersion(catalog) : "";
}

function validate() {
  return catalog ? validateCatalog(catalog) : { ok: false, errors: ["catálogo no cargado"] };
}

function getCatalog() {
  return catalog;
}

export function registerCatalog() {
  return registerModule({
    id: "catalog",
    version: "1.0.0",
    api: { getSubjects, getGroup: getGroupByCode, getSubgroups, getVersion, validate, getCatalog },
    requires: [],
    publishes: ["catalog:loaded"],
    subscribes: [],
    start() {
      const legacy = typeof SUBJECTS !== "undefined" ? SUBJECTS : null;
      if (!legacy) {
        bus.emit("catalog:loaded", { ok: false }, "catalog");
        return;
      }
      catalog = fromLegacySubjects(legacy);
      bus.emit(
        "catalog:loaded",
        { ok: true, version: getVersion(), count: catalog.subjects.length },
        "catalog",
      );
    },
  });
}
