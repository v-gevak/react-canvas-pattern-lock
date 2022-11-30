/* eslint-disable no-param-reassign */
import type { TGrid, TNodes } from '../typings';

export const gcd = (x:number, y:number) => {
  while (y !== 0) {
    const tmp = x;

    x = y;
    y = tmp % y;
  }

  return x;
};

export const prop = (path: string, obj: Record<string, any>): number => path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj) as unknown as number;

function generateKey(row: number, cell: number): string {
  return `${row}-${cell}`;
}

/**
 * Формирует объект соответствия точки ключа и значения.
 */
function buildDotToValueMap(grid: TGrid): Record<string, number> {
  const res: Record<string, number> = {};
  let currentValue = 1;

  for (let i = 1; i <= grid[0]; i += 1) {
    for (let j = 1; j <= grid[1]; j += 1) {
      res[generateKey(i, j)] = currentValue;
      currentValue += 1;
    }
  }

  return res;
}

/**
 * Формирует цифровой код для сетки grid из списка выбранных точек графического ключа.
 */
export function nodesToCode(nodes: TNodes, grid: TGrid): number[] {
  const rowColMap = buildDotToValueMap(grid);

  return nodes.map((node) => rowColMap[generateKey(node.row, node.col)]);
}

export function colorHasAlpha(color: string) {
  const isRgba = color.indexOf('rgba(') !== -1;
  const isHexA = color.startsWith('#') && color.length > 7;

  return isRgba || isHexA;
}
