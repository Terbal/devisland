// characterConfig.js
// One place to change which character model loads and how tall it is.
// No other file needs to be touched to swap characters or resize one.

export const CHARACTER_CONFIG = {
  // Path to the character .glb/.gltf to load. Tried FIRST, before the
  // generic assets/characters/character.glb fallback.
  //
  // Ships with the whole KayKit Adventurers roster pre-copied into
  // assets/characters/roster/ — just point this at a different file:
  //   './assets/characters/roster/Rogue.glb'         (default)
  //   './assets/characters/roster/Rogue_Hooded.glb'
  //   './assets/characters/roster/Knight.glb'
  //   './assets/characters/roster/Mage.glb'
  //   './assets/characters/roster/Ranger.glb'
  //   './assets/characters/roster/Barbarian.glb'      (⚠ uses the "Large" KayKit
  //                                                     rig, not "Medium" — the
  //                                                     bundled animation clips
  //                                                     are Medium-rig, so
  //                                                     Barbarian will look
  //                                                     unanimated / T-pose
  //                                                     unless you also swap the
  //                                                     manifest to the Rig_Large
  //                                                     animation files included
  //                                                     in assets/characters/animations/)
  modelPath: './assets/characters/roster/Rogue.glb',

  // World-space height (in units) the character gets rescaled to, regardless
  // of the source model's original size. The camera distance/height and the
  // collision radius in CharacterController.js were tuned around this value.
  // Lower it to make the character smaller (e.g. 1.5), raise it to make it
  // bigger (e.g. 1.9). KayKit's Rogue is ~2.18 units tall in its raw export,
  // which read as too tall/bulky — 1.6 below brings it down noticeably.
  targetHeight: 1.6,
};
