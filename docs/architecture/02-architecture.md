# Глава 2. Архитектура системы

> Часть [архитектурного документа](README.md) проекта **Yar**.
>
> ⬅️ [Глава 1 ← Обзор](01-overview.md) · 🏠 [Оглавление](README.md) · [Глава 3 → Модель данных](03-data-model.md) ➡️

---

## Содержание главы

4. [Архитектура системы (C4)](#4-архитектура-системы-c4)
5. [Архитектура классов](#5-архитектура-классов)
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
        Component(combat, "CombatEngine", "TS", "Ход боя, розыгрыш карт, расчёт урона")
        Component(deck, "DeckManager", "TS", "Шафл, добор, сброс, exhaust одноразовых")
        Component(cardres, "CardResolver", "TS", "Применение эффектов карт к состоянию")
        Component(gen, "LevelGenerator", "TS", "k-дольный граф, расстановка контента")
        Component(loot, "LootSystem", "TS", "Генерация наград из сундуков/боссов")
        Component(rules, "RuleSet / Balance", "TS", "Константы, формулы, баланс")
    }

    Rel(combat, deck, "draw / discard / exhaust")
    Rel(combat, cardres, "play(card)")
    Rel(cardres, rules, "формулы урона/эффектов")
    Rel(gen, rules, "параметры генерации")
    Rel(combat, loot, "награда после боя")
```

Поведение этих компонентов раскрыто в главах [«Игровые системы»](04-gameplay.md) (карточная система) и [«Генерация и бой»](05-generation-combat.md) (LevelGenerator, CombatEngine, RuleSet).

---

## 5. Архитектура классов

Доменный движок построен на чистых сервисах и иммутабельных reducer-функциях. React-компоненты лишь подписаны на стор.

```mermaid
classDiagram
    class GameStore {
        +RunState state
        +startRun(seed)
        +buildDeck(cardIds)
        +enterNode(nodeId)
        +playCard(instanceId, target)
        +endTurn()
        +resolveQuestion(answerIndex)
        +collectLoot(reward)
        +onPlayerDeath()
    }

    class CombatEngine {
        +startCombat(deck, enemies) CombatState
        +playCard(state, card, target) CombatState
        +endPlayerTurn(state) CombatState
        +runEnemyTurn(state) CombatState
        +checkOutcome(state) CombatPhase
    }

    class DeckManager {
        +shuffle(cards, seed) CardInstance[]
        +draw(state, n) CombatState
        +discard(state, card) CombatState
        +exhaust(state, card) CombatState
        +reshuffleDiscardIntoDraw(state) CombatState
        +resetPermanentDeck(deck) CardInstance[]
    }

    class CardResolver {
        +applyEffects(state, card, target) CombatState
        -applyDamage(state, target, value)
        -applyBlock(state, value)
        -applyStatus(state, target, status)
    }

    class LevelGenerator {
        +generate(seed, params) LevelGraph
        -buildKPartiteSkeleton(layers)
        -placeContent(nodes, params)
        -placeBosses(graph)
    }

    class LootSystem {
        +rollChestLoot(seed, depth) LootReward
        +rollBossLoot(seed, isEnd) LootReward
    }

    class RuleSet {
        +damageFormula(base, weapon, statuses) number
        +maxHpFormula(base, armor, specials) number
        +GENERATION_PARAMS
        +BALANCE_CONSTANTS
    }

    class PersistenceService {
        +saveCollection(Collection)
        +loadCollection() Collection
        +saveMeta(meta)
        +loadMeta()
    }

    GameStore --> CombatEngine : использует
    GameStore --> LevelGenerator : использует
    GameStore --> LootSystem : использует
    GameStore --> PersistenceService : сохраняет/грузит
    CombatEngine --> DeckManager : управляет колодой
    CombatEngine --> CardResolver : применяет эффекты
    CardResolver --> RuleSet : формулы
    LevelGenerator --> RuleSet : параметры
    LootSystem --> RuleSet : вероятности
```

### Разделение ответственности

| Класс/Сервис | Чистый? | Ответственность |
|--------------|---------|-----------------|
| `GameStore` | Нет (Zustand) | Оркестрация, единый источник истины, диспатч действий. |
| `CombatEngine` | Да | Полный цикл боя, переходы фаз. См. [§12](05-generation-combat.md#12-боевая-система). |
| `DeckManager` | Да | Жизненный цикл карт: шафл/добор/сброс/exhaust. См. [§10](04-gameplay.md#10-карточная-система). |
| `CardResolver` | Да | Применение эффектов карт к состоянию. |
| `LevelGenerator` | Да | Построение k-дольного графа и контента. См. [§11](05-generation-combat.md#11-процедурная-генерация-уровня). |
| `LootSystem` | Да | Генерация наград. |
| `RuleSet` | Да | Константы баланса и формулы (единая точка тюнинга). |
| `PersistenceService` | Нет (I/O) | Сохранение/загрузка через MMKV. |

> Все чистые сервисы детерминированы относительно `seed` — это критично для воспроизводимости забега и тестирования (см. [нефункциональные требования](06-development.md#131-нефункциональные-требования)). Структуры `RunState`, `CombatState`, `LevelGraph`, которыми оперируют эти сервисы, описаны в главе [«Модель данных»](03-data-model.md).

---

## 6. Управление состоянием

### 6.1. Принцип

Однонаправленный поток данных: UI диспатчит действия в стор, стор вызывает чистые функции домена, получает новое иммутабельное состояние и отдаёт его обратно в UI через селекторы.

```mermaid
flowchart TB
    UI[React Components / Skia] -->|action| STORE[GameStore Zustand]
    STORE -->|вызов чистой функции| ENGINE[Domain Engine pure TS]
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
