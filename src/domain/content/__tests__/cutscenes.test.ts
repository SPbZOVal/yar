import { Cutscene } from '../../model';
import { CUTSCENES, getCutscene } from '../cutscenes';

describe('cutscenes content', () => {
  it('has non-empty narrative lines for every beat', () => {
    for (const beat of Object.values(Cutscene)) {
      const lines = getCutscene(beat);
      expect(lines.length).toBeGreaterThan(0);
      expect(lines.every((l) => l.trim().length > 0)).toBe(true);
    }
  });

  it('getCutscene returns the table entry for a beat', () => {
    expect(getCutscene(Cutscene.Intro)).toBe(CUTSCENES[Cutscene.Intro]);
  });
});
