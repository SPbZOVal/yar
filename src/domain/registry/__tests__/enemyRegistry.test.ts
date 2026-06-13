import { ENEMY_DEFS, getEnemyDef } from '../enemyRegistry';
import { ENEMIES } from '../../content/enemies';

describe('enemyRegistry', () => {
  it('indexes every enemy definition by id', () => {
    expect(ENEMY_DEFS.size).toBe(ENEMIES.length);
    for (const enemy of ENEMIES) {
      expect(getEnemyDef(enemy.id)).toBe(enemy);
    }
  });

  it('throws on an unknown def id', () => {
    expect(() => getEnemyDef('does-not-exist')).toThrow('Unknown enemy def');
  });
});
