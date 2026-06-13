/**
 * Question content — pure data for `Question` nodes. A template carries the prompt and
 * options; the reward is rolled at level-generation time (so the same question can pay
 * out different loot), hence `rewardOnCorrect` is omitted here. `satisfies` validates the
 * shape against the model. Adding a question is appending one entry.
 */
import type { QuestionData } from '../model';

/** A quiz prompt without its reward; the LootSystem attaches a rolled reward. */
export type QuestionTemplate = Omit<QuestionData, 'rewardOnCorrect'>;

export const QUESTIONS = [
  {
    text: 'A Permanent card played in combat goes to which pile?',
    options: ['Exhaust', 'Discard', 'Draw', 'Hand'],
    correctIndex: 1,
  },
  {
    text: 'What absorbs incoming damage before HP is lost?',
    options: ['Poison', 'Block', 'AttackUp', 'TempHp'],
    correctIndex: 1,
  },
  {
    text: 'A SingleUse card, once played, is moved to the…',
    options: ['Discard pile', 'Draw pile', 'Exhaust pile', 'Collection'],
    correctIndex: 2,
  },
  {
    text: 'Which rarity drops only after the end boss?',
    options: ['Common', 'Uncommon', 'Rare', 'Boss'],
    correctIndex: 3,
  },
] satisfies readonly QuestionTemplate[];
