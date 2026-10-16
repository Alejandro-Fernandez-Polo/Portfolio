/**
 * Versión del motor de horarios.
 *
 * Vive en su propio módulo porque la necesitan **los dos lados** de la frontera:
 * el solver (que la publica en su API) y la caché (que la guarda con cada
 * solución para invalidarla cuando el motor cambia). Al ser la interna, la
 * externa puede importarla — nunca al revés.
 */
export const SOLVER_VERSION = "1.0.0";
