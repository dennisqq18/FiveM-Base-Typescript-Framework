type AppearanceSex = 'male' | 'female';

interface AppearanceDrawable {
  drawable: number;
  texture: number;
}

interface CharacterAppearance {
  version: number;
  sex: AppearanceSex;
  parents: {
    shapeFirst: number;
    shapeSecond: number;
    skinFirst: number;
    skinSecond: number;
    shapeMix: number;
    skinMix: number;
  };
  faceFeatures: number[];
  eyeColor: number;
  hair: {
    style: number;
    texture: number;
    color: number;
    highlight: number;
  };
  beard: {
    style: number;
    opacity: number;
    color: number;
  };
  eyebrows: {
    style: number;
    opacity: number;
    color: number;
  };
  clothes: {
    mask: AppearanceDrawable;
    arms: AppearanceDrawable;
    pants: AppearanceDrawable;
    bag: AppearanceDrawable;
    shoes: AppearanceDrawable;
    accessory: AppearanceDrawable;
    undershirt: AppearanceDrawable;
    armor: AppearanceDrawable;
    decals: AppearanceDrawable;
    torso: AppearanceDrawable;
  };
  props: {
    hat: AppearanceDrawable;
    glasses: AppearanceDrawable;
    ears: AppearanceDrawable;
    watch: AppearanceDrawable;
    bracelet: AppearanceDrawable;
  };
  tattoos: string[];
}

interface AppearanceTattooDefinition {
  id: string;
  label: string;
  collection: string;
  male: string;
  female: string;
}

const APPEARANCE_VERSION = 1;
const APPEARANCE_TATTOOS: readonly AppearanceTattooDefinition[] = Object.freeze([
  Object.freeze({ id: 'beach_head_1', label: 'Beach Head', collection: 'mpbeach_overlays', male: 'MP_Bea_M_Head_000', female: '' }),
  Object.freeze({ id: 'beach_neck_1', label: 'Beach Neck', collection: 'mpbeach_overlays', male: 'MP_Bea_M_Neck_000', female: 'MP_Bea_F_Neck_000' }),
  Object.freeze({ id: 'beach_back_1', label: 'Beach Back', collection: 'mpbeach_overlays', male: 'MP_Bea_M_Back_000', female: 'MP_Bea_F_Back_000' }),
  Object.freeze({ id: 'beach_chest_1', label: 'Beach Chest', collection: 'mpbeach_overlays', male: 'MP_Bea_M_Chest_000', female: 'MP_Bea_F_Chest_000' }),
  Object.freeze({ id: 'beach_chest_2', label: 'Beach Chest II', collection: 'mpbeach_overlays', male: 'MP_Bea_M_Chest_001', female: 'MP_Bea_F_Chest_001' }),
  Object.freeze({ id: 'beach_stomach_1', label: 'Beach Stomach', collection: 'mpbeach_overlays', male: 'MP_Bea_M_Stom_000', female: 'MP_Bea_F_Stom_000' }),
  Object.freeze({ id: 'beach_stomach_2', label: 'Beach Stomach II', collection: 'mpbeach_overlays', male: 'MP_Bea_M_Stom_001', female: 'MP_Bea_F_Stom_001' }),
  Object.freeze({ id: 'biker_demon', label: 'Demon Rider', collection: 'mpbiker_overlays', male: 'MP_MP_Biker_Tat_000_M', female: 'MP_MP_Biker_Tat_000_F' }),
  Object.freeze({ id: 'airraces_bombs', label: 'Bombs Away', collection: 'mpairraces_overlays', male: 'MP_Airraces_Tattoo_006_M', female: 'MP_Airraces_Tattoo_006_F' }),
  Object.freeze({ id: 'airraces_eagle', label: 'Eagle Eyes', collection: 'mpairraces_overlays', male: 'MP_Airraces_Tattoo_007_M', female: 'MP_Airraces_Tattoo_007_F' }),
  Object.freeze({ id: 'xmas2017_thor', label: 'Thor & Goblin', collection: 'mpchristmas2017_overlays', male: 'MP_Christmas2017_Tattoo_000_M', female: 'MP_Christmas2017_Tattoo_000_F' }),
  Object.freeze({ id: 'xmas2017_kabuto', label: 'Kabuto', collection: 'mpchristmas2017_overlays', male: 'MP_Christmas2017_Tattoo_002_M', female: 'MP_Christmas2017_Tattoo_002_F' }),
]);

const clampAppearanceInt = (value: any, minimum: number, maximum: number, fallback = minimum): number => {
  const numeric = Math.floor(Number(value));
  return Number.isFinite(numeric) ? Math.max(minimum, Math.min(maximum, numeric)) : fallback;
};

const clampAppearanceFloat = (value: any, minimum: number, maximum: number, fallback = 0): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(minimum, Math.min(maximum, numeric)) : fallback;
};

const sanitizeDrawable = (value: any, allowNone = false): AppearanceDrawable => ({
  drawable: clampAppearanceInt(value?.drawable, allowNone ? -1 : 0, 255, allowNone ? -1 : 0),
  texture: clampAppearanceInt(value?.texture, 0, 63, 0),
});

function createDefaultAppearance(sex: AppearanceSex = 'male'): CharacterAppearance {
  return {
    version: APPEARANCE_VERSION,
    sex,
    parents: { shapeFirst: 0, shapeSecond: 21, skinFirst: 0, skinSecond: 21, shapeMix: 0.5, skinMix: 0.5 },
    faceFeatures: Array.from({ length: 20 }, () => 0),
    eyeColor: 0,
    hair: { style: 0, texture: 0, color: 0, highlight: 0 },
    beard: { style: -1, opacity: 1, color: 0 },
    eyebrows: { style: 0, opacity: 1, color: 0 },
    clothes: {
      mask: { drawable: 0, texture: 0 },
      arms: { drawable: 0, texture: 0 },
      pants: { drawable: 0, texture: 0 },
      bag: { drawable: 0, texture: 0 },
      shoes: { drawable: 0, texture: 0 },
      accessory: { drawable: 0, texture: 0 },
      undershirt: { drawable: 0, texture: 0 },
      armor: { drawable: 0, texture: 0 },
      decals: { drawable: 0, texture: 0 },
      torso: { drawable: 0, texture: 0 },
    },
    props: {
      hat: { drawable: -1, texture: 0 },
      glasses: { drawable: -1, texture: 0 },
      ears: { drawable: -1, texture: 0 },
      watch: { drawable: -1, texture: 0 },
      bracelet: { drawable: -1, texture: 0 },
    },
    tattoos: [],
  };
}

function sanitizeAppearance(input: any): CharacterAppearance {
  const sex: AppearanceSex = input?.sex === 'female' ? 'female' : 'male';
  const fallback = createDefaultAppearance(sex);
  const features = Array.isArray(input?.faceFeatures) ? input.faceFeatures : [];
  const allowedTattooIds = new Set(APPEARANCE_TATTOOS.map((tattoo) => tattoo.id));
  const tattoos: string[] = Array.isArray(input?.tattoos)
    ? Array.from(new Set<string>(input.tattoos.map((entry: any) => String(entry)).filter((entry: string) => allowedTattooIds.has(entry)))).slice(0, 12)
    : [];

  return {
    version: APPEARANCE_VERSION,
    sex,
    parents: {
      shapeFirst: clampAppearanceInt(input?.parents?.shapeFirst, 0, 45, fallback.parents.shapeFirst),
      shapeSecond: clampAppearanceInt(input?.parents?.shapeSecond, 0, 45, fallback.parents.shapeSecond),
      skinFirst: clampAppearanceInt(input?.parents?.skinFirst, 0, 45, fallback.parents.skinFirst),
      skinSecond: clampAppearanceInt(input?.parents?.skinSecond, 0, 45, fallback.parents.skinSecond),
      shapeMix: clampAppearanceFloat(input?.parents?.shapeMix, 0, 1, fallback.parents.shapeMix),
      skinMix: clampAppearanceFloat(input?.parents?.skinMix, 0, 1, fallback.parents.skinMix),
    },
    faceFeatures: Array.from({ length: 20 }, (_, index) => clampAppearanceFloat(features[index], -1, 1, 0)),
    eyeColor: clampAppearanceInt(input?.eyeColor, 0, 31, 0),
    hair: {
      style: clampAppearanceInt(input?.hair?.style, 0, 255, 0),
      texture: clampAppearanceInt(input?.hair?.texture, 0, 63, 0),
      color: clampAppearanceInt(input?.hair?.color, 0, 63, 0),
      highlight: clampAppearanceInt(input?.hair?.highlight, 0, 63, 0),
    },
    beard: {
      style: clampAppearanceInt(input?.beard?.style, -1, 63, -1),
      opacity: clampAppearanceFloat(input?.beard?.opacity, 0, 1, 1),
      color: clampAppearanceInt(input?.beard?.color, 0, 63, 0),
    },
    eyebrows: {
      style: clampAppearanceInt(input?.eyebrows?.style, -1, 63, 0),
      opacity: clampAppearanceFloat(input?.eyebrows?.opacity, 0, 1, 1),
      color: clampAppearanceInt(input?.eyebrows?.color, 0, 63, 0),
    },
    clothes: {
      mask: sanitizeDrawable(input?.clothes?.mask),
      arms: sanitizeDrawable(input?.clothes?.arms),
      pants: sanitizeDrawable(input?.clothes?.pants),
      bag: sanitizeDrawable(input?.clothes?.bag),
      shoes: sanitizeDrawable(input?.clothes?.shoes),
      accessory: sanitizeDrawable(input?.clothes?.accessory),
      undershirt: sanitizeDrawable(input?.clothes?.undershirt),
      armor: sanitizeDrawable(input?.clothes?.armor),
      decals: sanitizeDrawable(input?.clothes?.decals),
      torso: sanitizeDrawable(input?.clothes?.torso),
    },
    props: {
      hat: sanitizeDrawable(input?.props?.hat, true),
      glasses: sanitizeDrawable(input?.props?.glasses, true),
      ears: sanitizeDrawable(input?.props?.ears, true),
      watch: sanitizeDrawable(input?.props?.watch, true),
      bracelet: sanitizeDrawable(input?.props?.bracelet, true),
    },
    tattoos,
  };
}

function hasSavedAppearance(value: any): boolean {
  return Boolean(value && Number(value.version) === APPEARANCE_VERSION && (value.sex === 'male' || value.sex === 'female'));
}
