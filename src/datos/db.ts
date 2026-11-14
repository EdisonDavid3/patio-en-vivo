import Dexie, { type EntityTable } from "dexie";
import type { Zona, Posicion, Contenedor, Estadia, Ubicacion, Lectura, Usuario, Evento, Ajuste, TramoEtapa } from "./tipos";

export class BaseLocal extends Dexie {
  zonas!: EntityTable<Zona, "id">;
  posiciones!: EntityTable<Posicion, "id">;
  contenedores!: EntityTable<Contenedor, "numero">;
  estadias!: EntityTable<Estadia, "id">;
  ubicaciones!: EntityTable<Ubicacion, "id">;
  tramosEtapa!: EntityTable<TramoEtapa, "id">;
  lecturas!: EntityTable<Lectura, "id">;
  usuarios!: EntityTable<Usuario, "id">;
  eventos!: EntityTable<Evento, "id">;
  ajustes!: EntityTable<Ajuste, "clave">;

  constructor(nombre = "patio-en-vivo") {
    super(nombre);
    this.version(1).stores({
      zonas: "id, orden",
      posiciones: "id, zonaId, orden",
      contenedores: "numero, prefijo",
      estadias: "id, numero, entrada, salida",
      ubicaciones: "id, estadiaId, posicionId, hasta",
      lecturas: "id, estadiaId, posicionId, numero, [dia+indice], tomadaMs",
      usuarios: "id",
      eventos: "id, creadoMs, enviadoMs",
      ajustes: "clave",
    });
    // v2: etapas del contenedor (vacío → enfriando → cargando → con producto → despachado)
    this.version(2).stores({
      tramosEtapa: "id, estadiaId, etapa, desde, hasta",
    }).upgrade(async (tx) => {
      await tx.table("estadias").toCollection().modify((e: Estadia) => {
        if (!e.etapa) e.etapa = "con_producto";
      });
    });
  }
}

export const db = new BaseLocal();
