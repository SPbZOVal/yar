/**
 * Cutscene content — pure data. Each {@link Cutscene} beat is a list of narrative lines the
 * CutsceneScreen types out one after another. Adding/altering a beat is editing this table; the
 * engine just routes `DismissCutscene` (see runReducer) to whatever comes after the beat.
 */
import { Cutscene } from '../model';

export const CUTSCENES: Record<Cutscene, readonly string[]> = {
  [Cutscene.Intro]: [
    'Колода в руке. Дорога во тьме.',
    'Каждый шаг — новая карта, каждая карта — новый риск.',
    'Собери колоду и иди вперёд. Назад пути нет.',
  ],
  [Cutscene.PreBoss]: [
    'Воздух густеет. Карты дрожат в руке.',
    'Впереди — Хозяин этого уровня.',
    'Один бой. Всё или ничего.',
  ],
  [Cutscene.PostBoss]: [
    'Хозяин повержен. Тишина.',
    'Но за этой дверью — лишь следующая.',
    'Переведи дух. Дорога зовёт дальше.',
  ],
};

/** The narrative lines for one cutscene beat. */
export function getCutscene(beat: Cutscene): readonly string[] {
  return CUTSCENES[beat];
}
