import { describe, it, expect } from "vitest";
import {
  instante, diaOperativo, asignarLectura, ranurasDelDia, hhmm, duracion, horaFormato, HORAS_FIJAS, ranuraParaGuardar, hhmmAmPm,
} from "./tiempo";

describe("día operativo", () => {
  it("empieza con la toma de las 08:00 y termina con la de las 06:00 del día siguiente", () => {
    expect(diaOperativo(instante(2026, 11, 13, 8, 0))).toBe("2026-11-13");
    expect(diaOperativo(instante(2026, 11, 13, 23, 59))).toBe("2026-11-13");
    expect(diaOperativo(instante(2026, 11, 14, 0, 0))).toBe("2026-11-13");
    expect(diaOperativo(instante(2026, 11, 14, 2, 0))).toBe("2026-11-13");
    expect(diaOperativo(instante(2026, 11, 14, 6, 0))).toBe("2026-11-13");
  });

  it("el corte está a las 07:00", () => {
    expect(diaOperativo(instante(2026, 11, 14, 6, 59))).toBe("2026-11-13");
    expect(diaOperativo(instante(2026, 11, 14, 7, 0))).toBe("2026-11-14");
  });

  it("no depende de la zona horaria del equipo", () => {
    // El instante es el mismo mirado desde cualquier parte: 14-nov 01:00 en Ecuador.
    const ms = instante(2026, 11, 14, 1, 0);
    expect(new Date(ms).toISOString()).toBe("2026-11-14T06:00:00.000Z");
    expect(diaOperativo(ms)).toBe("2026-11-13");
    expect(hhmm(ms)).toBe("01:00");
  });

  it("arma las 12 ranuras en el orden del formato oficial", () => {
    const r = ranurasDelDia("2026-11-13");
    expect(r).toHaveLength(12);
    expect(hhmm(r[0]!)).toBe("08:00");
    expect(hhmm(r[7]!)).toBe("22:00");
    expect(hhmm(r[8]!)).toBe("00:00");
    expect(hhmm(r[11]!)).toBe("06:00");
    expect(r.every((x, i) => i === 0 || x > r[i - 1]!)).toBe(true);
    expect([...HORAS_FIJAS]).toEqual([8, 10, 12, 14, 16, 18, 20, 22, 0, 2, 4, 6]);
  });
});

describe("asignación de lecturas a su hora fija", () => {
  it("una lectura puntual cae en su ranura y no está atrasada", () => {
    const a = asignarLectura(instante(2026, 11, 13, 10, 4));
    expect(a.dia).toBe("2026-11-13");
    expect(a.horaFija).toBe(10);
    expect(a.indice).toBe(1);
    expect(a.atrasada).toBe(false);
  });

  it("marca atrasada la que se sale de la ventana", () => {
    expect(asignarLectura(instante(2026, 11, 13, 10, 49)).atrasada).toBe(false);
    expect(asignarLectura(instante(2026, 11, 13, 10, 51)).atrasada).toBe(true);
    expect(asignarLectura(instante(2026, 11, 13, 10, 51), 60).atrasada).toBe(false);
  });

  it("una toma de las 23:50 va a la ranura de las 00:00 del mismo día operativo", () => {
    const a = asignarLectura(instante(2026, 11, 13, 23, 50));
    expect(a.dia).toBe("2026-11-13");
    expect(a.horaFija).toBe(0);
    expect(a.indice).toBe(8);
    expect(a.atrasada).toBe(false);
  });

  it("una toma de las 00:10 también va a la ranura de las 00:00 del día anterior", () => {
    const a = asignarLectura(instante(2026, 11, 14, 0, 10));
    expect(a.dia).toBe("2026-11-13");
    expect(a.indice).toBe(8);
  });

  it("una toma de las 06:40 cierra el día operativo anterior", () => {
    const a = asignarLectura(instante(2026, 11, 14, 6, 40));
    expect(a.dia).toBe("2026-11-13");
    expect(a.horaFija).toBe(6);
    expect(a.indice).toBe(11);
  });

  it("una toma de las 07:30 ya es del día nuevo, en la ranura de las 08:00", () => {
    const a = asignarLectura(instante(2026, 11, 14, 7, 30));
    expect(a.dia).toBe("2026-11-14");
    expect(a.horaFija).toBe(8);
    expect(a.indice).toBe(0);
  });
});

describe("presentación", () => {
  it("escribe las horas como el formato oficial", () => {
    expect(horaFormato(8)).toBe("8:00 a. m.");
    expect(horaFormato(12)).toBe("12:00 p. m.");
    expect(horaFormato(14)).toBe("2:00 p. m.");
    expect(horaFormato(0)).toBe("12:00 a. m.");
    expect(horaFormato(6)).toBe("6:00 a. m.");
  });

  it("mide duraciones", () => {
    const a = instante(2026, 11, 12, 8, 0);
    expect(duracion(a, instante(2026, 11, 14, 14, 0))).toBe("2 d 6 h");
    expect(duracion(a, instante(2026, 11, 12, 22, 20))).toBe("14 h 20 min");
    expect(duracion(a, instante(2026, 11, 12, 8, 40))).toBe("40 min");
  });
});

describe("ranura donde se guarda una lectura suelta", () => {
  it("nunca usa una hora fija que todavía no ha llegado", () => {
    // 03:23: la más cercana sería la de las 04:00, pero esa ronda aún no empieza
    const a = ranuraParaGuardar(instante(2026, 11, 14, 3, 23));
    expect(a.horaFija).toBe(2);
    expect(a.dia).toBe("2026-11-13");
    expect(a.atrasada).toBe(true);
  });

  it("una toma puntual sigue cayendo en su hora", () => {
    expect(ranuraParaGuardar(instante(2026, 11, 13, 10, 4)).horaFija).toBe(10);
    expect(ranuraParaGuardar(instante(2026, 11, 13, 10, 4)).atrasada).toBe(false);
  });

  it("una toma algo adelantada se queda en la hora que ya pasó", () => {
    const a = ranuraParaGuardar(instante(2026, 11, 13, 9, 50));
    expect(a.horaFija).toBe(8);
    expect(a.atrasada).toBe(true);
  });

  it("al cerrar el día, una toma de las 06:40 sigue en la de las 06:00", () => {
    const a = ranuraParaGuardar(instante(2026, 11, 14, 6, 40));
    expect(a.horaFija).toBe(6);
    expect(a.dia).toBe("2026-11-13");
  });
});

describe("horas en a. m. / p. m. (D28)", () => {
  it("escribe las horas como el formato oficial, también los minutos", () => {
    expect(hhmmAmPm(instante(2026, 11, 14, 10, 42))).toBe("10:42 a. m.");
    expect(hhmmAmPm(instante(2026, 11, 14, 0, 5))).toBe("12:05 a. m.");
    expect(hhmmAmPm(instante(2026, 11, 14, 12, 0))).toBe("12:00 p. m.");
    expect(hhmmAmPm(instante(2026, 11, 14, 13, 7))).toBe("1:07 p. m.");
    expect(hhmmAmPm(instante(2026, 11, 14, 23, 59))).toBe("11:59 p. m.");
  });
});
