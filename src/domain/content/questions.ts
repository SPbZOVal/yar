/**
 * Question content — pure data for `Question` nodes. A template carries the prompt and
 * options; the reward is rolled at level-generation time (so the same question can pay
 * out different loot), hence `rewardOnCorrect` is omitted here. `satisfies` validates the
 * shape against the model. Adding a question is appending one entry.
 *
 * Theme: bachelor-level mathematical statistics (in Russian). Every prompt has 4 options.
 */
import type { QuestionData } from '../model';

/** A quiz prompt without its reward; the LootSystem attaches a rolled reward. */
export type QuestionTemplate = Omit<QuestionData, 'rewardOnCorrect'>;

export const QUESTIONS = [
  {
    text: 'Оценка θ̂ параметра θ называется несмещённой, если:',
    options: [
      'E[θ̂] = θ',
      'Var[θ̂] → 0',
      'θ̂ сходится к θ по вероятности',
      'θ̂ распределена нормально',
    ],
    correctIndex: 0,
  },
  {
    text: 'Несмещённая оценка дисперсии делит сумму квадратов отклонений на:',
    options: ['n', 'n − 1', 'n + 1', '√n'],
    correctIndex: 1,
  },
  {
    text: 'По центральной предельной теореме распределение выборочного среднего при больших n близко к:',
    options: ['равномерному', 'нормальному', 'показательному', 'Пуассона'],
    correctIndex: 1,
  },
  {
    text: 'Ошибка первого рода — это:',
    options: [
      'отвергнуть верную нулевую гипотезу',
      'принять неверную нулевую гипотезу',
      'отвергнуть верную альтернативу',
      'снизить уровень значимости α',
    ],
    correctIndex: 0,
  },
  {
    text: 'p-значение (p-value) — это вероятность:',
    options: [
      'того, что гипотеза H₀ верна',
      'получить данные не менее экстремальные, чем наблюдаемые, если H₀ верна',
      'ошибки второго рода',
      'равная уровню значимости α',
    ],
    correctIndex: 1,
  },
  {
    text: 'Состоятельность оценки означает, что при n → ∞ она:',
    options: [
      'сходится по вероятности к истинному значению',
      'обязательно несмещена',
      'имеет минимальную дисперсию',
      'распределена нормально',
    ],
    correctIndex: 0,
  },
  {
    text: 'Сумма квадратов k независимых стандартных нормальных величин имеет распределение:',
    options: ['Стьюдента', 'хи-квадрат с k степенями свободы', 'Фишера', 'нормальное'],
    correctIndex: 1,
  },
  {
    text: 'Метод максимального правдоподобия выбирает оценку, которая:',
    options: [
      'минимизирует сумму квадратов остатков',
      'максимизирует функцию правдоподобия',
      'минимизирует смещение',
      'максимизирует p-значение',
    ],
    correctIndex: 1,
  },
  {
    text: '95%-й доверительный интервал для среднего корректно понимать так:',
    options: [
      'параметр лежит в нём с вероятностью 0,95',
      'при многих повторениях 95% таких интервалов накроют истинный параметр',
      'выборочное среднее равно истинному с вероятностью 0,95',
      'ошибка оценки не превышает 5%',
    ],
    correctIndex: 1,
  },
] satisfies readonly QuestionTemplate[];
