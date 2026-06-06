# Глава 3. Модель данных

> Часть [архитектурного документа](README.md) проекта **Yar**.
>
> ⬅️ [Глава 2 ← Архитектура системы](02-architecture.md) · 🏠 [Оглавление](README.md) · [Глава 4 → Игровые системы](04-gameplay.md) ➡️

---

## 7. Модель данных

Доменная модель строго типизирована (TypeScript strict). Все агрегаты ниже — это данные, которыми оперируют чистые сервисы из главы [«Архитектура системы»](02-architecture.md#5-архитектура-классов). Обзорная схема связей собрана в [§7.8](#78-сводная-диаграмма-связей-доменной-модели).

### Содержание главы

- [7.1. Карты](#71-карты)
- [7.2. Игрок и снаряжение](#72-игрок-и-снаряжение)
- [7.3. Коллекция и колода (мета-уровень)](#73-коллекция-и-колода-мета-уровень)
- [7.4. Граф уровня (k-дольный)](#74-граф-уровня-k-дольный)
- [7.5. Враги и бой](#75-враги-и-бой)
- [7.6. Лут и вопросы](#76-лут-и-вопросы)
- [7.7. Состояние забега](#77-состояние-забега)
- [7.8. Сводная диаграмма связей доменной модели](#78-сводная-диаграмма-связей-доменной-модели)

---

### 7.1. Карты

```mermaid
classDiagram
    class CardDefinition {
        +string id
        +string name
        +string description
        +CardType type
        +CardCategory category
        +int cost
        +Effect[] effects
        +Rarity rarity
        +bool isSpecial
    }
    class CardInstance {
        +string instanceId
        +string defId
        +bool upgraded
    }
    class Effect {
        +EffectKind kind
        +int value
        +TargetType target
        +string statusId
        +int duration
    }
    class CardType {
        <<enumeration>>
        SingleUse
        Permanent
    }
    class CardCategory {
        <<enumeration>>
        Attack
        Control
        Stats
        DeckManipulation
        Special
    }
    class EffectKind {
        <<enumeration>>
        DealDamage
        GainBlock
        GainTempHp
        ApplyStatus
        DrawCards
        AddMaxHp
        UpgradeWeapon
    }
    class TargetType {
        <<enumeration>>
        SingleEnemy
        AllEnemies
        Self
    }
    class Rarity {
        <<enumeration>>
        Common
        Uncommon
        Rare
        Boss
    }

    CardDefinition "1" *-- "0..*" Effect : effects
    CardDefinition --> CardType : type
    CardDefinition --> CardCategory : category
    CardDefinition --> Rarity : rarity
    Effect --> EffectKind : kind
    Effect --> TargetType : target
    CardInstance ..> CardDefinition : defId ссылается на
```

Примечания:
- `CardType` определяет жизненный цикл: `SingleUse` исчезает после розыгрыша (живёт в пределах уровня), `Permanent` уходит в низ колоды и восстанавливается между боями. Полный жизненный цикл — в [§10.1](04-gameplay.md#101-жизненный-цикл-карты-внутри-одного-боя).
- `CardInstance` — забегтайм-экземпляр, ссылается на `CardDefinition` (instance ≠ definition).
- Урон/блок/статусы вычисляются из `Effect.value` для соответствующего `EffectKind` (`DealDamage`, `GainBlock`, `ApplyStatus`, …) — см. [формулы боя §12.2](05-generation-combat.md#122-формулы-единая-точка-в-ruleset).
- `isSpecial` / `Rarity.Boss` — карты, выпадающие только после корневого босса (end).

### 7.2. Игрок и снаряжение

```mermaid
classDiagram
    class PlayerState {
        +int baseMaxHp
        +int currentHp
        +int maxHp
        +int handSize
        +int energyPerTurn
        +Weapon weapon
        +Armor armor
    }
    class Weapon {
        +string id
        +string name
        +int attackBonus
        +int tier
    }
    class Armor {
        +string id
        +string name
        +int maxHpBonus
        +int blockBonus
        +int tier
    }

    PlayerState "1" *-- "1" Weapon : экипировано
    PlayerState "1" *-- "1" Armor : экипировано
```

Примечания:
- `maxHp` = `baseMaxHp` + бонусы брони + спец-карты («+сердце»).
- `Weapon.attackBonus` прибавляется к урону атакующих карт; `Armor.maxHpBonus`/`blockBonus` — к HP и пассивному блоку. Точные формулы — в [§12.2](05-generation-combat.md#122-формулы-единая-точка-в-ruleset).

### 7.3. Коллекция и колода (мета-уровень)

```mermaid
classDiagram
    class Collection {
        +CardInstance[] ownedCards
        +Weapon[] ownedWeapons
        +Armor[] ownedArmor
    }
    class RunDeck {
        +string[] cardInstanceIds
        +int maxDeckSize
    }

    Collection "1" o-- "0..*" CardInstance : владеет
    Collection "1" o-- "0..*" Weapon : владеет
    Collection "1" o-- "0..*" Armor : владеет
    RunDeck ..> CardInstance : ссылается на N карт
```

Примечания:
- `Collection` — персистентное хранилище всего, что игрок открыл (срез `metaSlice`, см. [§6.2](02-architecture.md#62-структура-стора-zustand-срезы)).
- `RunDeck` — выбранные N карт перед уровнем; фиксируется до старта (`maxDeckSize` = ограничение N). Откуда берутся новые карты — в [§10.2](04-gameplay.md#102-откуда-берутся-карты).

### 7.4. Граф уровня (k-дольный)

```mermaid
classDiagram
    class LevelGraph {
        +Map~string,LevelNode~ nodes
        +LevelEdge[] edges
        +string startId
        +string endId
        +int layerCount
        +string currentNodeId
    }
    class LevelNode {
        +string id
        +NodeType type
        +int layer
        +NodeContent content
        +bool visited
    }
    class LevelEdge {
        +string from
        +string to
    }
    class NodeContent {
        <<union>>
        +string kind
        +EnemyDefinition[] enemies
        +EnemyDefinition boss
        +bool specialLoot
        +LootReward reward
        +QuestionData question
    }
    class NodeType {
        <<enumeration>>
        Combat
        Boss
        Loot
        Question
        Start
        End
        Idle
    }

    LevelGraph "1" *-- "1..*" LevelNode : nodes
    LevelGraph "1" *-- "1..*" LevelEdge : edges
    LevelNode "1" *-- "1" NodeContent : content
    LevelNode --> NodeType : type
    NodeContent ..> EnemyDefinition : combat / boss
    NodeContent ..> LootReward : loot
    NodeContent ..> QuestionData : question
```

Примечания:
- `LevelGraph` — **ориентированный ациклический граф (DAG)**, разбитый на `layerCount` слоёв-долей (k-дольный): один `startId`, один `endId`, рёбра идут только «вперёд», между соседними долями. Класс графа и его свойства — в [§11](05-generation-combat.md#11-процедурная-генерация-уровня).
- `NodeContent` — размеченное объединение (discriminated union по полю `kind`): `combat` / `boss` / `loot` / `question`.
- `Start`, `End` и `Idle` — структурные вершины без интерактивного контента: `Start` — вход игрока, `End` — корневой босс (контент `boss` + `specialLoot`), `Idle` — пустая/проходная вершина (резерв под отдых/событие).
- `LevelEdge` направлено: `from` ближе к start, `to` ближе к end. Алгоритм построения — в [§11](05-generation-combat.md#11-процедурная-генерация-уровня).

### 7.5. Враги и бой

```mermaid
classDiagram
    class CombatState {
        +Combatant player
        +EnemyInstance[] enemies
        +CardInstance[] drawPile
        +CardInstance[] hand
        +CardInstance[] discardPile
        +CardInstance[] exhaustPile
        +int energy
        +int turn
        +CombatPhase phase
    }
    class Combatant {
        +int hp
        +int maxHp
        +int block
        +StatusEffect[] statuses
    }
    class EnemyInstance {
        +string defId
        +int currentIntentIndex
    }
    class EnemyDefinition {
        +string id
        +string name
        +int maxHp
        +EnemyIntent[] intents
        +bool isBoss
    }
    class EnemyIntent {
        +string kind
        +int value
    }
    class StatusEffect {
        +string id
        +int stacks
        +int remainingTurns
    }
    class CombatPhase {
        <<enumeration>>
        PlayerTurn
        EnemyTurn
        Victory
        Defeat
    }

    Combatant <|-- EnemyInstance : наследует
    CombatState "1" *-- "1" Combatant : player
    CombatState "1" *-- "0..*" EnemyInstance : enemies
    CombatState --> CombatPhase : phase
    CombatState ..> CardInstance : draw/hand/discard/exhaust
    Combatant "1" *-- "0..*" StatusEffect : statuses
    EnemyInstance ..> EnemyDefinition : defId ссылается на
    EnemyDefinition "1" *-- "1..*" EnemyIntent : intents
```

Примечания:
- `block` (временный щит) сбрасывается каждый ход.
- `drawPile` — перемешанная колода добора; `discardPile` — сброс permanent-карт; `exhaustPile` — отыгранные single-use (визуально). Переходы между стопками — в [§10.1](04-gameplay.md#101-жизненный-цикл-карты-внутри-одного-боя).
- `EnemyInstance` расширяет `Combatant` и хранит ссылку на `EnemyDefinition` + текущий intent. Поведение по `intents` — в [§12.3](05-generation-combat.md#123-поведение-врагов).

### 7.6. Лут и вопросы

```mermaid
classDiagram
    class LootReward {
        +CardDefinition[] cards
        +Weapon weapon
        +Armor armor
        +bool isSpecial
    }
    class QuestionData {
        +string text
        +string[] options
        +int correctIndex
        +LootReward rewardOnCorrect
    }

    LootReward "0..1" o-- "0..*" CardDefinition : cards
    LootReward ..> Weapon : weapon
    LootReward ..> Armor : armor
    QuestionData "1" *-- "1" LootReward : rewardOnCorrect
```

Примечания:
- `isSpecial` помечает спец-лут после end-босса.
- При неверном ответе на вопрос — пусто (empty): без штрафа и без награды (см. [user flow §9](04-gameplay.md#9-user-flow)).

### 7.7. Состояние забега

```mermaid
classDiagram
    class RunState {
        +PlayerState player
        +RunDeck runDeck
        +LevelGraph currentLevel
        +int levelIndex
        +string[] singleUseBag
        +CombatState combat
        +ScreenState screen
        +string seed
    }

    RunState "1" *-- "1" PlayerState : player
    RunState "1" *-- "1" RunDeck : runDeck
    RunState "1" o-- "0..1" LevelGraph : currentLevel
    RunState "1" o-- "0..1" CombatState : combat
    RunState --> ScreenState : screen
```

Примечания:
- `currentLevel` и `combat` опциональны (`null`, когда уровень/бой не активны).
- `singleUseBag` — id одноразовых карт, имеющихся на текущем уровне (отдельный цикл жизни).
- `seed` — детерминированный сид процедурной генерации забега. Детерминизм по `seed` — нефункциональное требование, см. [§13.1](06-development.md#131-нефункциональные-требования).
- `RunState` живёт в срезе `runSlice` и теряется при смерти забега (см. [§6.2](02-architecture.md#62-структура-стора-zustand-срезы)).

### 7.8. Сводная диаграмма связей доменной модели

Обзорная ER-диаграмма, связывающая все агрегаты модели воедино (детали полей — в диаграммах классов [7.1](#71-карты)–[7.7](#77-состояние-забега) выше).

```mermaid
erDiagram
    RunState ||--|| PlayerState : содержит
    RunState ||--|| RunDeck : содержит
    RunState ||--o| LevelGraph : "текущий уровень"
    RunState ||--o| CombatState : "активный бой"

    PlayerState ||--|| Weapon : экипировано
    PlayerState ||--|| Armor : экипировано

    Collection ||--o{ CardInstance : владеет
    RunDeck ||--o{ CardInstance : "ссылается (N карт)"
    CardInstance }o--|| CardDefinition : "экземпляр от"
    CardDefinition ||--o{ Effect : имеет

    LevelGraph ||--o{ LevelNode : содержит
    LevelGraph ||--o{ LevelEdge : содержит
    LevelNode ||--|| NodeContent : "тип контента"
    NodeContent ||--o{ EnemyDefinition : "бой/босс"
    NodeContent ||--o| LootReward : "сундук"
    NodeContent ||--o| QuestionData : "вопрос"

    CombatState ||--|| Combatant : "игрок"
    CombatState ||--o{ EnemyInstance : враги
    CombatState ||--o{ CardInstance : "draw/hand/discard/exhaust"
```

---

> ⬅️ [Глава 2 ← Архитектура системы](02-architecture.md) · 🏠 [Оглавление](README.md) · [Глава 4 → Игровые системы](04-gameplay.md) ➡️
