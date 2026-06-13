# Глава 2. Архитектура системы

> Часть [архитектурного документа](README.md) проекта **Yar**.
>
> ⬅️ [Глава 1 ← Обзор](01-overview.md) · 🏠 [Оглавление](README.md) · [Глава 3 → Модель данных](03-data-model.md) ➡️

---

## Содержание главы

4. [Архитектура системы (C4)](#4-архитектура-системы-c4)
5. [Архитектура домена](#5-архитектура-домена)
6. [Управление состоянием](#6-управление-состоянием)

Эта глава описывает **структуру** приложения: слои C4, доменные сервисы и поток данных стора. Структуры данных, которыми они оперируют, вынесены в главу [«Модель данных»](03-data-model.md).

---

## 4. Архитектура системы (C4)

### 4.1. Контекст

```mermaid
C4Context
    title Контекст системы — Card Roguelike

    Person(player, "Игрок", "Играет на Android-устройстве")

    System(game, "Card Roguelike App", "React Native приложение: бои, граф уровней, коллекция карт")

    System_Ext(os, "Android OS", "Хранилище, рендеринг, тач-ввод")

    Rel(player, game, "Играет, выбирает карты, ведёт бои")
    Rel(game, os, "Сохраняет прогресс, рендерит через Skia")
    UpdateRelStyle(player, game, $offsetY="-10")
```

### 4.2. Контейнеры

```mermaid
C4Container
    title Контейнеры — Card Roguelike App

    Person(player, "Игрок", "")

    Container_Boundary(app, "React Native App") {
        Container(ui, "UI Layer", "React + Skia + Reanimated", "Экраны, рендер боя/графа, анимации, ввод")
        Container(store, "Game Store", "Zustand + Immer", "Единый источник истины состояния забега")
        Container(domain, "Domain Engine", "Pure TypeScript", "Правила боя, карты, генерация уровней")
        Container(persist, "Persistence", "MMKV", "Коллекция карт, мета-прогресс, настройки")
    }

    Rel(player, ui, "Тапы, drag-n-drop")
    Rel(ui, store, "Читает состояние / диспатчит действия")
    Rel(store, domain, "Вызывает чистые функции движка")
    Rel(domain, store, "Возвращает новое состояние")
    Rel(store, persist, "Сохраняет/загружает коллекцию и мета")
```

Поток «UI → Store → Domain → Store → UI» детализирован как однонаправленный data flow в разделе [6. Управление состоянием](#6-управление-состоянием).

### 4.3. Компоненты доменного движка

```mermaid
C4Component
    title Компоненты — Domain Engine

    Container_Boundary(domain, "Domain Engine") {
        Component(combat, "combatReducer + selectors", "TS", "Чистая редукция действий боя, исход")
        Component(deck, "DeckManager", "TS", "Шафл, добор, сброс, exhaust одноразовых")
        Component(cardres, "CardResolver", "TS", "Применение эффектов карты (свёртка по реестру)")
        Component(reg, "Registries", "TS (данные)", "STATUS/EFFECT/DECK_OP — поведение как данные")
        Component(gen, "LevelGenerator", "TS", "k-дольный граф, расстановка контента")
        Component(loot, "LootSystem", "TS", "Генерация наград из сундуков/боссов")
        Component(rules, "RuleSet / Balance", "TS", "Константы, формулы, баланс")
    }

    Rel(combat, deck, "draw / discard / exhaust")
    Rel(combat, cardres, "applyCard")
    Rel(cardres, reg, "ищет обработчик эффекта")
    Rel(reg, rules, "формулы урона/эффектов")
    Rel(gen, rules, "параметры генерации")
    Rel(combat, loot, "награда после боя")
```

Поведение этих компонентов раскрыто в главах [«Игровые системы»](04-gameplay.md) (карточная система) и [«Генерация и бой»](05-generation-combat.md) (combatReducer, RuleSet).

---

## 5. Архитектура домена

Доменный слой — **чистое функциональное ядро с data-driven диспетчеризацией**. Поведение статусов, эффектов, дека-операций, карт и врагов задаётся **данными в реестрах**, а движок — это набор обобщённых интерпретаторов (редьюсеры, селекторы, op-ы сущностей), которые эти данные исполняют. Поэтому добавить статус/эффект/карту/врага = добавить запись в реестр или контент, не трогая движок (открыт для расширения, закрыт для изменения — проверяется компилятором через `satisfies Record<…>`). Случайность течёт через монаду `Rand` (детерминизм по `seed`), а композиция op-ов — через комбинаторы `pipe`/`flow`.

### 5.1. Слои

```mermaid
flowchart TB
    subgraph model["model/ — только типы"]
        M["Entity · Status · Effect · CardDefinition · CombatState · CombatAction · поведенческие контракты"]
    end
    subgraph content["content/ — чистые данные"]
        C["cards.ts · enemies.ts"]
    end
    subgraph registry["registry/ — таблицы поведения (данные)"]
        SR["STATUS_REGISTRY"]
        ER["EFFECT_HANDLERS"]
        DR["DECK_OP_HANDLERS"]
        CR["CARD_DEFS · ENEMY_DEFS"]
    end
    subgraph engine["engine/ — обобщённые интерпретаторы (чистые)"]
        EM["entityMechanics (без реестра)"]
        EO["entity ops (политика)"]
        RES["CardResolver.applyCard"]
        DECK["DeckManager"]
        RED["combatReducer + selectors"]
    end
    subgraph toolkit["инструменты"]
        RND["Rand-монада (rng)"]
        FN["fn: pipe / flow"]
        RULE["RuleSet (формулы)"]
    end
    STORE["Store — тонкая оболочка (Zustand)"]

    content --> registry
    registry --> engine
    model -. типы .-> engine
    toolkit --> engine
    engine --> STORE
```

Граф зависимостей ацикличен: `entityMechanics` не знает о реестрах; реестры зовут только механику; политика (`entity ops`, резолвер) читает реестры, но реестры её не импортируют.

### 5.2. Поток данных (action → reducer → selector)

```mermaid
flowchart LR
    A["Action (данные)"] --> R["reducer(deps, state, action)"]
    R -->|"вызывает"| ENG["applyCard · DeckManager · entity ops · Rand"]
    R --> S["новый immutable state"]
    S --> SEL["selector (checkOutcome…)"]
    SEL --> UI["UI / Skia"]
```

Однонаправленный поток «UI → Store → Domain → Store → UI» сохраняется (см. [§6](#6-управление-состоянием)); меняется лишь природа «Domain» — это **редьюсеры и селекторы**, а не сервис-классы. Реализация боя — `combatReducer` поверх `applyCard`, `DeckManager` и op-ов сущностей; правила боя — в [§12](05-generation-combat.md#12-боевая-система).

### Разделение ответственности

| Модуль | Чистый? | Ответственность |
|--------|---------|-----------------|
| `Store` | Нет (Zustand) | Тонкая оболочка: связывает `deps`, диспатчит действия в редьюсеры, отдаёт селекторы. |
| `combatReducer` | Да | Чистая редукция действий боя (`StartCombat`/`PlayCard`/`EndTurn`). См. [§12](05-generation-combat.md#12-боевая-система). |
| `selectors` (`checkOutcome`) | Да | Производное состояние (исход боя); переходы фаз — только в редьюсерах. |
| Реестры (`STATUS_`/`EFFECT_`/`DECK_OP_`) | Да (данные) | Поведение статусов/эффектов/деки как данные — точка расширения. |
| `CardResolver` | Да | Применение эффектов карты (обобщённая свёртка по реестру эффектов). |
| `DeckManager` | Да | Жизненный цикл карт: шафл/добор/сброс/exhaust. См. [§10](04-gameplay.md#10-карточная-система). |
| entity ops + `entityMechanics` | Да | Стат-операции сущностей (урон/блок/статусы), data-driven по `STATUS_REGISTRY`. |
| `Rand` | Да | Детерминированная случайность (seeded-State монада). |
| `RuleSet` | Да | Константы баланса и формулы (единая точка тюнинга). |
| `LevelGenerator` | Да | Построение k-дольного графа и контента. См. [§11](05-generation-combat.md#11-процедурная-генерация-уровня). |
| `LootSystem` | Да | Генерация наград. |
| `PersistenceService` | Нет (I/O) | Сохранение/загрузка через MMKV. |

> Все чистые модули детерминированы относительно `seed` — это критично для воспроизводимости забега и тестирования (см. [нефункциональные требования](06-development.md#131-нефункциональные-требования)). Структуры `RunState`, `CombatState`, `LevelGraph` описаны в главе [«Модель данных»](03-data-model.md).

---

## 6. Управление состоянием

### 6.1. Принцип

Однонаправленный поток данных: UI диспатчит действия в стор, стор вызывает **редьюсеры домена** (`set(s => combatReducer(deps, s, action))`), получает новое иммутабельное состояние и отдаёт его обратно в UI через селекторы. Логика — в редьюсерах; стор лишь диспатчит и читает производное.

```mermaid
flowchart TB
    UI[React Components / Skia] -->|action| STORE[Store Zustand]
    STORE -->|combatReducer deps,state,action| ENGINE[Domain: редьюсеры + селекторы pure TS]
    ENGINE -->|новый immutable state| STORE
    STORE -->|selector| UI
    STORE -->|side-effect: save| MMKV[(MMKV)]
    MMKV -->|hydrate at boot| STORE
```

### 6.2. Структура стора (Zustand-срезы)

| Срез | Содержит | Персистентность |
|------|----------|-----------------|
| `runSlice` | [`RunState`](03-data-model.md#77-состояние-забега) — текущий забег | Только in-memory (теряется при смерти). |
| `combatSlice` | [`CombatState`](03-data-model.md#75-враги-и-бой) — активный бой | In-memory. |
| `metaSlice` | [`Collection`](03-data-model.md#73-коллекция-и-колода-мета-уровень), прогресс, разблокировки | **Персистентно (MMKV)**. |
| `settingsSlice` | Звук, язык, сложность | **Персистентно (MMKV)**. |

> Разделение на срезы — основная мера против раздувания `GameStore` (см. [архитектурные риски](06-development.md#132-архитектурные-риски)). Только `metaSlice` и `settingsSlice` переживают смерть забега; `runSlice`/`combatSlice` намеренно эфемерны.

---

> ⬅️ [Глава 1 ← Обзор](01-overview.md) · 🏠 [Оглавление](README.md) · [Глава 3 → Модель данных](03-data-model.md) ➡️
