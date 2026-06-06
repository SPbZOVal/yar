<div align="center">

# 🃏 Yar

**Yet Another Rogue** — карточный roguelike для Android.

*Собери колоду. Прорвись через граф локаций. Умри. Стань сильнее. Повтори.*

[![CI](https://github.com/SPbZOVal/yar/actions/workflows/ci.yml/badge.svg)](https://github.com/SPbZOVal/yar/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/github/license/SPbZOVal/yar?color=blue)](./LICENSE)
[![Platform](https://img.shields.io/badge/platform-Android-3DDC84?logo=android&logoColor=white)](#)
[![React Native](https://img.shields.io/badge/React_Native-0.7x-61DAFB?logo=react&logoColor=white)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Last commit](https://img.shields.io/github/last-commit/SPbZOVal/yar)](https://github.com/SPbZOVal/yar/commits)
[![Issues](https://img.shields.io/github/issues/SPbZOVal/yar)](https://github.com/SPbZOVal/yar/issues)

</div>

---

## 🎮 Об игре

**Yar** — это пошаговый карточный roguelike, который умещается в одной руке. Ты
собираешь колоду из открытых карт, отправляешься в забег по процедурно
сгенерированному уровню-графу и сражаешься, разыгрывая карты против монстров и
боссов.

Каждый забег уникален, а каждая смерть — не конец, а ступенька: карты, найденные
в боях и сундуках, остаются в твоей коллекции и делают следующий заход сильнее.
Никаких микротранзакций и доната — только ты, колода и удача сида.

> 🚧 **Статус: проектирование / ранняя разработка.**
> Игра пока в работе. Зафиксированы архитектура и геймплейные правила, кодовая
> база собирается итеративно. Следи за прогрессом на странице
> [Releases](https://github.com/SPbZOVal/yar/releases).

## 📸 Скриншоты

> 🖼 Скриншоты и геймплейное видео появятся здесь с первым играбельным билдом.

|  Граф уровня  |  Бой  |  Сбор колоды  |
|:-------------:|:-----:|:-------------:|
| _скоро_ | _скоро_ | _скоро_ |

## ✨ Чем цепляет

- **🗺 Уровень как карта-граф.** Никаких линейных коридоров: каждый уровень —
  ветвящийся граф локаций. Сам выбираешь маршрут между боями, сундуками,
  загадками и боссами.
- **🃏 Карты с характером.** `Permanent`-карты — твой костяк, они возвращаются в
  колоду каждый бой. `SingleUse`-карты бьют один раз и сгорают — приберегай их
  для решающего момента.
- **💀 Смерть как прогресс.** Погиб — забег обнуляется, но всё открытое остаётся
  с тобой. Чем больше играешь, тем мощнее становится твоя коллекция.
- **⚔️ Честный, тактический бой.** Враги заранее показывают свои намерения. Это
  не про удачу — это про правильный ход в нужный момент.
- **🛡 Снаряжение.** Оружие и броня усиливают атаку и здоровье и меняют стиль
  игры.
- **🧩 Загадки и боссы.** Между боями — вопросы за награду, а в конце каждого
  уровня ждёт корневой босс и эксклюзивный спец-лут.

## 🕹 Как играть

Один забег — это короткая петля из нескольких шагов:

1. **Собери колоду.** Перед уровнем выбери `N` карт из своей коллекции, а также
   оружие и броню. Колода фиксируется до старта.
2. **Проложи маршрут.** Тапни по доступной вершине графа, чтобы перейти к ней:
   бой ⚔️, сундук 🎁, вопрос ❓ или босс 💀.
3. **Сражайся.** Перетаскивай карты на врагов или на себя. Следи за намерениями
   врагов, копи блок, комбинируй эффекты — и завершай ход, когда готов.
4. **Собирай добычу.** За победы и из сундуков падают новые карты и снаряжение —
   всё отправляется в коллекцию для будущих забегов.
5. **Дойди до босса.** Победишь корневого босса уровня — получишь спец-лут,
   кат-сцену и проход на следующий уровень.
6. **Не сдавайся.** Упал в бою? Забег начнётся заново — но уже с более богатой
   коллекцией. Следующий заход будет твоим.

**Управление:** тап по вершине — переход, drag-and-drop карты — розыгрыш, кнопка
«Завершить ход» — передать ход врагам.

> 💡 **Совет.** Намерения врагов видны заранее — выставляй блок против сильных
> ударов и держи `SingleUse`-карты на крайний случай.

## 📲 Как начать играть

Первый играбельный релиз ещё в пути. Когда он выйдет:

1. Открой страницу [**Releases**](https://github.com/SPbZOVal/yar/releases).
2. Скачай `.apk` последней версии.
3. Разреши установку из неизвестных источников и установи приложение.
4. Запусти **Yar** и отправляйся в первый забег!

Минимальная версия Android и точные требования будут указаны в описании релиза.

---

<div align="center">

### 🛠 Для разработчиков

</div>

## 🧱 Технологический стек

| Слой | Технология | Назначение |
|------|------------|-----------|
| Представление | [React Native](https://reactnative.dev/) | Нативное Android-приложение |
| Рендеринг | [@shopify/react-native-skia](https://shopify.github.io/react-native-skia/) | GPU-рисование боя и графа, 60 fps |
| Анимации | [react-native-reanimated](https://docs.swmansion.com/react-native-reanimated/) | Анимации в UI-потоке |
| Ввод | [react-native-gesture-handler](https://docs.swmansion.com/react-native-gesture-handler/) | Жесты, drag-and-drop карт |
| Навигация | [react-navigation](https://reactnavigation.org/) | Экраны, меню, кат-сцены |
| Состояние | [Zustand](https://zustand-demo.pmnd.rs/) + [Immer](https://immerjs.github.io/immer/) | In-memory state, иммутабельные апдейты |
| Персистентность | [react-native-mmkv](https://github.com/mrousavy/react-native-mmkv) | Быстрые сохранения, коллекция |
| Язык | [TypeScript (strict)](https://www.typescriptlang.org/) | Типобезопасная доменная модель |
| Тесты | [Jest](https://jestjs.io/) + [RNTL](https://callstack.github.io/react-native-testing-library/) | Unit/компонентные тесты |
| Тулинг | [ESLint](https://eslint.org/) · [Prettier](https://prettier.io/) · [Expo](https://expo.dev/) | Линт, формат, dev-сборки |

Лицензии всех зависимостей — в [THIRD_PARTY_LICENSES.md](./THIRD_PARTY_LICENSES.md).

## 🏗 Архитектура

Доменный слой (правила боя, генерация уровней, карточная система) — это чистый
TypeScript без зависимостей от React. React/Skia отвечают только за
представление. Это даёт тестируемость и переносимость логики.

Полное архитектурное описание разбито на главы:

| Глава | Тема |
|-------|------|
| [1. Обзор, глоссарий и стек](./docs/architecture/01-overview.md) | Что за игра, термины, обоснование стека |
| [2. Архитектура системы](./docs/architecture/02-architecture.md) | C4-диаграммы, сервисы движка, управление состоянием |
| [3. Модель данных](./docs/architecture/03-data-model.md) | Карты, игрок, граф уровня, бой, лут, забег |
| [4. Игровые системы](./docs/architecture/04-gameplay.md) | Циклы забега и боя, user flow, карточная система |
| [5. Генерация и бой](./docs/architecture/05-generation-combat.md) | Процедурная генерация уровня, боевая система |
| [6. Процесс разработки](./docs/architecture/06-development.md) | Требования, риски, Git Flow, CI/CD, тестирование |

▶️ Начать чтение: [docs/architecture/](./docs/architecture/README.md)

## 🚀 Сборка из исходников

> Команды ниже отражают целевой рабочий процесс. Они станут актуальны после
> добавления кодовой базы приложения (см. статус проекта выше).

**Требования:** [Node.js](https://nodejs.org/) LTS (≥ 20) и
[Yarn](https://yarnpkg.com/), [JDK 17](https://adoptium.net/) и
[Android Studio](https://developer.android.com/studio) с настроенным
[окружением React Native для Android](https://reactnative.dev/docs/environment-setup).

```bash
git clone git@github.com:SPbZOVal/yar.git
cd yar
yarn install

yarn android        # сборка и установка debug-версии на устройство/эмулятор
yarn start          # запуск Metro-бандлера (если нужен отдельно)

yarn lint           # ESLint + Prettier
yarn typecheck      # tsc --noEmit
yarn test           # Jest (unit + компонентные)
```

## 🤝 Вклад в проект

Мы используем **Git Flow** и **Conventional Commits**:

- Ветвитесь от `develop`: `feature/<область>-<кратко>` (напр. `feature/deck-manager`).
- Коммиты: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, `perf:`, `balance:`.
  Пример: `feat(combat): add exhaust pile for single-use cards`.
- Перед PR: зелёные `lint`, `typecheck`, `test`; новая логика покрыта тестами.
- PR ссылается на задачу и проходит ревью перед мёрджем в `develop`.

Подробные правила, ветвление и Definition of Done — в
[главе «Процесс разработки»](./docs/architecture/06-development.md).

## 📦 Версионирование

Проект следует [Semantic Versioning](https://semver.org/lang/ru/)
(`MAJOR.MINOR.PATCH`): `MAJOR` — несовместимые изменения формата сохранений,
`MINOR` — новый контент/фичи, `PATCH` — багфиксы и баланс.

## 📄 Лицензия

Проект распространяется под лицензией **[MIT](./LICENSE)**.
Лицензии используемых фреймворков — в
[THIRD_PARTY_LICENSES.md](./THIRD_PARTY_LICENSES.md).

## 👥 Команда

Разработка — команда **[SPbZOVal](https://github.com/SPbZOVal)**
