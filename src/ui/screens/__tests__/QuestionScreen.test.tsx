import { NodeType } from '../../../domain/model';
import type { LevelGraph } from '../../../domain/model';
import { getCardDef } from '../../../domain/registry/cardRegistry';
import { QuestionScreen } from '../QuestionScreen';
import { makeStore, press, renderWithStore } from './renderWithStore';

const questionLevel = (): LevelGraph => ({
  nodes: new Map([
    [
      'L1N0',
      {
        id: 'L1N0',
        type: NodeType.Question,
        layer: 1,
        content: {
          kind: 'question',
          question: {
            text: 'Q?',
            options: ['right', 'wrong'],
            correctIndex: 0,
            rewardOnCorrect: { cards: [getCardDef('strike')], isSpecial: false },
          },
        },
        visited: true,
      },
    ],
  ]),
  edges: [],
  startId: 'L1N0',
  endId: 'L1N0',
  layerCount: 1,
  currentNodeId: 'L1N0',
});

const withQuestion = () => {
  const store = makeStore();
  store.setState({
    run: { ...store.getState().run, currentLevel: questionLevel(), screen: { name: 'question' } },
  });
  return store;
};

describe('QuestionScreen', () => {
  it('grants the reward on a correct answer', async () => {
    const store = withQuestion();
    const before = store.getState().run.collection.ownedCards.length;
    await renderWithStore(<QuestionScreen />, store);
    await press('vn-box'); // reveal the riddle; the answer choices then appear
    await press('answer-0');
    expect(store.getState().run.collection.ownedCards.length).toBe(before + 1);
    expect(store.getState().run.screen.name).toBe('level');
  });

  it('grants nothing on a wrong answer', async () => {
    const store = withQuestion();
    const before = store.getState().run.collection.ownedCards.length;
    await renderWithStore(<QuestionScreen />, store);
    await press('vn-box');
    await press('answer-1');
    expect(store.getState().run.collection.ownedCards.length).toBe(before);
    expect(store.getState().run.screen.name).toBe('level');
  });
});
