/**
 * Special cards — meta upgrades, not deck cards.
 *
 * A special card (`CardDefinition.isSpecial`, dropped only after the end boss) doesn't enter the
 * collection or a fight; collecting it permanently changes the player's meta-state. Its effects
 * are read with the *same* data model as combat cards (`ApplyStatus` of `MaxHpUp` / `WeaponTier`),
 * but interpreted here against {@link PlayerState} instead of a combat {@link Entity} — so adding a
 * special card stays one compiler-checked content entry. The run reducer routes collected specials
 * through this on the loot path; nothing else applies them.
 */
import { StatusKind, TargetType } from '../../model';
import type { CardDefinition, PlayerState, Weapon } from '../../model';

/** What the interpreter needs from content it can't derive itself. */
export interface SpecialCardDeps {
  /** Step a weapon `steps` up the tier ladder (see registry/weaponRegistry `upgradeWeapon`). */
  readonly upgradeWeapon: (weapon: Weapon, steps: number) => Weapon;
}

/**
 * Apply a collected special card to the player's meta-state, purely. Folds the card's `Self`
 * `ApplyStatus` effects:
 *  - `MaxHpUp` ("+heart") — raises `maxHp` by `value` and heals by the same (a heart is a heal too);
 *  - `WeaponTier` ("upgrade weapon") — steps the equipped weapon up `value` tiers.
 * Effects of any other shape are ignored, so a malformed special is a no-op, never a crash.
 */
export function applySpecialCard(
  player: PlayerState,
  def: CardDefinition,
  deps: SpecialCardDeps,
): PlayerState {
  return def.effects.reduce<PlayerState>((p, effect) => {
    if (effect.kind !== 'ApplyStatus' || effect.target !== TargetType.Self) return p;
    if (effect.status === StatusKind.MaxHpUp) {
      const maxHp = p.maxHp + effect.value;
      return { ...p, maxHp, currentHp: Math.min(p.currentHp + effect.value, maxHp) };
    }
    if (effect.status === StatusKind.WeaponTier) {
      return { ...p, weapon: deps.upgradeWeapon(p.weapon, effect.value) };
    }
    return p;
  }, player);
}
