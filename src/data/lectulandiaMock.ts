import { DiscoverBook } from '../types';

export const LECTULANDIA_CATEGORIES = [
  'Novela',
  'Narrativa',
  'Poesía',
  'Teatro',
  'Historia',
  'Ciencia',
  'Filosofía',
  'Ensayo',
  'Biografías',
  'Fantasía',
  'Ciencia ficción',
  'Terror',
  'Romance',
  'Novela negra',
  'Infantil y juvenil',
];

export const GRADIENTS = [
  'from-rose-500 to-red-800',
  'from-amber-400 to-orange-700',
  'from-emerald-500 to-teal-800',
  'from-sky-500 to-indigo-800',
  'from-violet-500 to-purple-900',
  'from-slate-500 to-slate-900',
  'from-fuchsia-500 to-pink-800',
  'from-cyan-500 to-blue-900',
];

const AUTHORS = [
  'María Vargas',
  'Jorge L. Fuentes',
  'Ana Ríos',
  'Carlos Mendoza',
  'Lucía Herrera',
  'Pedro Salinas',
  'Elena Vidal',
  'Andrés Rojas',
];

const ADJ = [
  'El',
  'La',
  'Los',
  'Las',
  'Crónicas de',
  'El secreto de',
  'La sombra del',
  'El jardín de',
  'La ciudad sin',
  'El último',
  'La casa de',
  'El tiempo entre',
];

const NOUN = [
  'invierno',
  'farol',
  'memoria',
  'silencio',
  'mar',
  'reloj',
  'espejo',
  'camino',
  'puente',
  'viento',
  'olvido',
  'alba',
  'laberinto',
  'faro',
];

const hash = (s: string): number => {
  let h = 0;
  for (const c of s) {
    h = (h * 31 + c.charCodeAt(0)) | 0;
  }
  return Math.abs(h);
};

export const generateBooks = (
  seed: string,
  page: number,
  count = 24
): DiscoverBook[] => {
  return Array.from({ length: count }, (_, i) => {
    const n = page * 1000 + i;
    const title = `${ADJ[(hash(seed) + n) % ADJ.length]} ${
      NOUN[(hash(seed) + n * 7) % NOUN.length]
    }`;
    const author = AUTHORS[(hash(seed) + n * 13) % AUTHORS.length];

    return {
      id: `${seed}-${page}-${i}`,
      title,
      author,
      coverIndex: hash(title),
    };
  });
};

export const getNovelties = (): DiscoverBook[] =>
  generateBooks('novedades', 0, 20);

export const getMostRead = (): DiscoverBook[] =>
  generateBooks('leidos', 0, 20);