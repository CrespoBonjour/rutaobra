/*
 * Tests de la lógica pura de RutaObra. Se corren con: npm test  (o: node --test)
 * Usan el runner nativo de Node (node:test) — sin instalar nada.
 *
 * Cada test describe QUÉ tiene que hacer una función y verifica el resultado.
 * Si mañana alguien rompe una de estas funciones sin querer, el test falla y avisa.
 */
const test = require('node:test');
const assert = require('node:assert');
const L = require('../lib/logic.js');

test('fmtYMD formatea una fecha como YYYY-MM-DD', () => {
  assert.strictEqual(L.fmtYMD(new Date(2026, 6, 5)), '2026-07-05');   // 5 de julio (mes 0-indexado)
  assert.strictEqual(L.fmtYMD(new Date(2026, 11, 31)), '2026-12-31');
});

test('parseFechaUY entiende DD/MM/AAAA y hora opcional', () => {
  assert.strictEqual(L.parseFechaUY(''), 0);
  assert.strictEqual(L.parseFechaUY('texto sin fecha'), 0);
  assert.strictEqual(L.parseFechaUY('05/07/2026'), new Date(2026, 6, 5).getTime());
  assert.strictEqual(L.parseFechaUY('5/7/26'), new Date(2026, 6, 5).getTime());        // año de 2 dígitos
  assert.strictEqual(L.parseFechaUY('05/07/2026 14:30'), new Date(2026, 6, 5, 14, 30).getTime());
});

test('proximoDiaTrabajo devuelve el mar/mié/jue en o después de la fecha', () => {
  const dia = (d) => L.proximoDiaTrabajo(d).getDay();
  assert.strictEqual(dia(new Date(2026, 6, 6)), 2);   // lunes 6/7 -> martes (2)
  assert.strictEqual(dia(new Date(2026, 6, 7)), 2);   // martes -> el mismo martes
  assert.strictEqual(dia(new Date(2026, 6, 10)), 2);  // viernes 10/7 -> martes siguiente (no sábado)
  assert.strictEqual(dia(new Date(2026, 6, 11)), 2);  // sábado -> martes
});

test('cadenciaDe usa 12/20/30 según temperatura y 30 por defecto', () => {
  assert.strictEqual(L.cadenciaDe({ temp: 'hot' }), 12);
  assert.strictEqual(L.cadenciaDe({ temp: 'warm' }), 20);
  assert.strictEqual(L.cadenciaDe({ temp: 'cold' }), 30);
  assert.strictEqual(L.cadenciaDe({}), 30);           // sin temp -> 30
});

test('faltaTexto describe cuánto falta para la instalación', () => {
  assert.strictEqual(L.faltaTexto('2026-07-30', '2026-07-30').t, 'Entra hoy');
  assert.strictEqual(L.faltaTexto('2026-07-25', '2026-07-30').t, 'Ya entró (hace 5 d)');
  assert.strictEqual(L.faltaTexto('2026-08-03', '2026-07-30').cls, 'hot');   // 4 días -> caliente
  assert.strictEqual(L.faltaTexto('2026-08-20', '2026-07-30').cls, 'cold');  // ~3 semanas -> frío
});

test('parsePhones separa por coma, punto y coma o barra, y limpia vacíos', () => {
  assert.deepStrictEqual(L.parsePhones(''), []);
  assert.deepStrictEqual(L.parsePhones('099111222'), ['099111222']);
  assert.deepStrictEqual(L.parsePhones('099111222, 098333444'), ['099111222', '098333444']);
  assert.deepStrictEqual(L.parsePhones('099111222 / 098333444 ;'), ['099111222', '098333444']);
});

test('joinPhones vuelve a unir la lista y descarta vacíos', () => {
  assert.strictEqual(L.joinPhones(['099111222', '', '098333444']), '099111222, 098333444');
});

test('tamanoLabel traduce el tamaño de obra', () => {
  assert.strictEqual(L.tamanoLabel('chico'), 'Obra chica');
  assert.strictEqual(L.tamanoLabel('grande'), 'Obra grande');
  assert.strictEqual(L.tamanoLabel(null), '');
});
