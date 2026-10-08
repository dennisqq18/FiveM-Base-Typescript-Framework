"use strict";
var RumbleShared;
(function (RumbleShared) {
    function clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }
    RumbleShared.clamp = clamp;
    function distance(a, b) {
        return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    }
    RumbleShared.distance = distance;
    function formatNumber(value) {
        return Math.floor(value).toLocaleString('en-US');
    }
    RumbleShared.formatNumber = formatNumber;
    function isIsoDate(value) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
            return false;
        const parsed = new Date(`${value}T00:00:00.000Z`);
        return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
    }
    RumbleShared.isIsoDate = isIsoDate;
    function vector3(x, y, z) {
        return { x: Number(x), y: Number(y), z: Number(z) };
    }
    RumbleShared.vector3 = vector3;
    function vector4(x, y, z, heading) {
        return { x: Number(x), y: Number(y), z: Number(z), heading: Number(heading) };
    }
    RumbleShared.vector4 = vector4;
})(RumbleShared || (RumbleShared = {}));
const APPEARANCE_VERSION = 1;
const APPEARANCE_TATTOOS = Object.freeze([
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
const clampAppearanceInt = (value, minimum, maximum, fallback = minimum) => {
    const numeric = Math.floor(Number(value));
    return Number.isFinite(numeric) ? Math.max(minimum, Math.min(maximum, numeric)) : fallback;
};
const clampAppearanceFloat = (value, minimum, maximum, fallback = 0) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(minimum, Math.min(maximum, numeric)) : fallback;
};
const sanitizeDrawable = (value, allowNone = false) => ({
    drawable: clampAppearanceInt(value === null || value === void 0 ? void 0 : value.drawable, allowNone ? -1 : 0, 255, allowNone ? -1 : 0),
    texture: clampAppearanceInt(value === null || value === void 0 ? void 0 : value.texture, 0, 63, 0),
});
function createDefaultAppearance(sex = 'male') {
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
function sanitizeAppearance(input) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6;
    const sex = (input === null || input === void 0 ? void 0 : input.sex) === 'female' ? 'female' : 'male';
    const fallback = createDefaultAppearance(sex);
    const features = Array.isArray(input === null || input === void 0 ? void 0 : input.faceFeatures) ? input.faceFeatures : [];
    const allowedTattooIds = new Set(APPEARANCE_TATTOOS.map((tattoo) => tattoo.id));
    const tattoos = Array.isArray(input === null || input === void 0 ? void 0 : input.tattoos)
        ? Array.from(new Set(input.tattoos.map((entry) => String(entry)).filter((entry) => allowedTattooIds.has(entry)))).slice(0, 12)
        : [];
    return {
        version: APPEARANCE_VERSION,
        sex,
        parents: {
            shapeFirst: clampAppearanceInt((_a = input === null || input === void 0 ? void 0 : input.parents) === null || _a === void 0 ? void 0 : _a.shapeFirst, 0, 45, fallback.parents.shapeFirst),
            shapeSecond: clampAppearanceInt((_b = input === null || input === void 0 ? void 0 : input.parents) === null || _b === void 0 ? void 0 : _b.shapeSecond, 0, 45, fallback.parents.shapeSecond),
            skinFirst: clampAppearanceInt((_c = input === null || input === void 0 ? void 0 : input.parents) === null || _c === void 0 ? void 0 : _c.skinFirst, 0, 45, fallback.parents.skinFirst),
            skinSecond: clampAppearanceInt((_d = input === null || input === void 0 ? void 0 : input.parents) === null || _d === void 0 ? void 0 : _d.skinSecond, 0, 45, fallback.parents.skinSecond),
            shapeMix: clampAppearanceFloat((_e = input === null || input === void 0 ? void 0 : input.parents) === null || _e === void 0 ? void 0 : _e.shapeMix, 0, 1, fallback.parents.shapeMix),
            skinMix: clampAppearanceFloat((_f = input === null || input === void 0 ? void 0 : input.parents) === null || _f === void 0 ? void 0 : _f.skinMix, 0, 1, fallback.parents.skinMix),
        },
        faceFeatures: Array.from({ length: 20 }, (_, index) => clampAppearanceFloat(features[index], -1, 1, 0)),
        eyeColor: clampAppearanceInt(input === null || input === void 0 ? void 0 : input.eyeColor, 0, 31, 0),
        hair: {
            style: clampAppearanceInt((_g = input === null || input === void 0 ? void 0 : input.hair) === null || _g === void 0 ? void 0 : _g.style, 0, 255, 0),
            texture: clampAppearanceInt((_h = input === null || input === void 0 ? void 0 : input.hair) === null || _h === void 0 ? void 0 : _h.texture, 0, 63, 0),
            color: clampAppearanceInt((_j = input === null || input === void 0 ? void 0 : input.hair) === null || _j === void 0 ? void 0 : _j.color, 0, 63, 0),
            highlight: clampAppearanceInt((_k = input === null || input === void 0 ? void 0 : input.hair) === null || _k === void 0 ? void 0 : _k.highlight, 0, 63, 0),
        },
        beard: {
            style: clampAppearanceInt((_l = input === null || input === void 0 ? void 0 : input.beard) === null || _l === void 0 ? void 0 : _l.style, -1, 63, -1),
            opacity: clampAppearanceFloat((_m = input === null || input === void 0 ? void 0 : input.beard) === null || _m === void 0 ? void 0 : _m.opacity, 0, 1, 1),
            color: clampAppearanceInt((_o = input === null || input === void 0 ? void 0 : input.beard) === null || _o === void 0 ? void 0 : _o.color, 0, 63, 0),
        },
        eyebrows: {
            style: clampAppearanceInt((_p = input === null || input === void 0 ? void 0 : input.eyebrows) === null || _p === void 0 ? void 0 : _p.style, -1, 63, 0),
            opacity: clampAppearanceFloat((_q = input === null || input === void 0 ? void 0 : input.eyebrows) === null || _q === void 0 ? void 0 : _q.opacity, 0, 1, 1),
            color: clampAppearanceInt((_r = input === null || input === void 0 ? void 0 : input.eyebrows) === null || _r === void 0 ? void 0 : _r.color, 0, 63, 0),
        },
        clothes: {
            mask: sanitizeDrawable((_s = input === null || input === void 0 ? void 0 : input.clothes) === null || _s === void 0 ? void 0 : _s.mask),
            arms: sanitizeDrawable((_t = input === null || input === void 0 ? void 0 : input.clothes) === null || _t === void 0 ? void 0 : _t.arms),
            pants: sanitizeDrawable((_u = input === null || input === void 0 ? void 0 : input.clothes) === null || _u === void 0 ? void 0 : _u.pants),
            bag: sanitizeDrawable((_v = input === null || input === void 0 ? void 0 : input.clothes) === null || _v === void 0 ? void 0 : _v.bag),
            shoes: sanitizeDrawable((_w = input === null || input === void 0 ? void 0 : input.clothes) === null || _w === void 0 ? void 0 : _w.shoes),
            accessory: sanitizeDrawable((_x = input === null || input === void 0 ? void 0 : input.clothes) === null || _x === void 0 ? void 0 : _x.accessory),
            undershirt: sanitizeDrawable((_y = input === null || input === void 0 ? void 0 : input.clothes) === null || _y === void 0 ? void 0 : _y.undershirt),
            armor: sanitizeDrawable((_z = input === null || input === void 0 ? void 0 : input.clothes) === null || _z === void 0 ? void 0 : _z.armor),
            decals: sanitizeDrawable((_0 = input === null || input === void 0 ? void 0 : input.clothes) === null || _0 === void 0 ? void 0 : _0.decals),
            torso: sanitizeDrawable((_1 = input === null || input === void 0 ? void 0 : input.clothes) === null || _1 === void 0 ? void 0 : _1.torso),
        },
        props: {
            hat: sanitizeDrawable((_2 = input === null || input === void 0 ? void 0 : input.props) === null || _2 === void 0 ? void 0 : _2.hat, true),
            glasses: sanitizeDrawable((_3 = input === null || input === void 0 ? void 0 : input.props) === null || _3 === void 0 ? void 0 : _3.glasses, true),
            ears: sanitizeDrawable((_4 = input === null || input === void 0 ? void 0 : input.props) === null || _4 === void 0 ? void 0 : _4.ears, true),
            watch: sanitizeDrawable((_5 = input === null || input === void 0 ? void 0 : input.props) === null || _5 === void 0 ? void 0 : _5.watch, true),
            bracelet: sanitizeDrawable((_6 = input === null || input === void 0 ? void 0 : input.props) === null || _6 === void 0 ? void 0 : _6.bracelet, true),
        },
        tattoos,
    };
}
function hasSavedAppearance(value) {
    return Boolean(value && Number(value.version) === APPEARANCE_VERSION && (value.sex === 'male' || value.sex === 'female'));
}
const ClientConfig = Object.freeze({
    spawnCollisionTimeoutMs: 4000,
    defaultPlayerModel: 'mp_m_freemode_01',
    femalePlayerModel: 'mp_f_freemode_01',
    appearanceStudio: Object.freeze({
        position: Object.freeze({ x: 402.92, y: -996.78, z: -99.00, heading: 180.0 }),
        camera: Object.freeze({ x: 402.92, y: -998.55, z: -98.45, fov: 38.0 }),
        bodyCamera: Object.freeze({ x: 402.92, y: -999.20, z: -98.80, fov: 52.0 }),
    }),
    modelLoadTimeoutMs: 10000,
    characterCinematic: Object.freeze({
        fov: 48.0,
        focusRefreshMs: 500,
        scenes: Object.freeze([
            Object.freeze({
                id: 'los-santos',
                shots: Object.freeze([
                    Object.freeze({
                        from: Object.freeze({ x: -760.0, y: -1150.0, z: 430.0 }),
                        to: Object.freeze({ x: 520.0, y: -930.0, z: 320.0 }),
                        lookAt: Object.freeze({ x: 80.0, y: -850.0, z: 70.0 }),
                        durationMs: 12000,
                    }),
                    Object.freeze({
                        from: Object.freeze({ x: 680.0, y: -180.0, z: 360.0 }),
                        to: Object.freeze({ x: -520.0, y: 260.0, z: 315.0 }),
                        lookAt: Object.freeze({ x: -40.0, y: 20.0, z: 85.0 }),
                        durationMs: 11000,
                    }),
                ]),
            }),
            Object.freeze({
                id: 'sandy-shores',
                shots: Object.freeze([
                    Object.freeze({
                        from: Object.freeze({ x: 1120.0, y: 2920.0, z: 300.0 }),
                        to: Object.freeze({ x: 2050.0, y: 3560.0, z: 255.0 }),
                        lookAt: Object.freeze({ x: 1700.0, y: 3600.0, z: 55.0 }),
                        durationMs: 12000,
                    }),
                    Object.freeze({
                        from: Object.freeze({ x: 2050.0, y: 3560.0, z: 255.0 }),
                        to: Object.freeze({ x: 1350.0, y: 3950.0, z: 285.0 }),
                        lookAt: Object.freeze({ x: 1650.0, y: 3650.0, z: 50.0 }),
                        durationMs: 11000,
                    }),
                ]),
            }),
            Object.freeze({
                id: 'paleto-bay',
                shots: Object.freeze([
                    Object.freeze({
                        from: Object.freeze({ x: -920.0, y: 6150.0, z: 300.0 }),
                        to: Object.freeze({ x: 320.0, y: 6570.0, z: 250.0 }),
                        lookAt: Object.freeze({ x: -80.0, y: 6420.0, z: 55.0 }),
                        durationMs: 12000,
                    }),
                    Object.freeze({
                        from: Object.freeze({ x: 260.0, y: 6570.0, z: 250.0 }),
                        to: Object.freeze({ x: -720.0, y: 6350.0, z: 280.0 }),
                        lookAt: Object.freeze({ x: -120.0, y: 6420.0, z: 50.0 }),
                        durationMs: 11000,
                    }),
                ]),
            }),
        ]),
    }),
});
const clientDelay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let availableSpawns = new Map();
let characterCinematicCamera = 0;
let characterCinematicTimer = null;
let characterCinematicScene = -1;
let characterCinematicShot = 0;
let characterCinematicShotStartedAt = 0;
let characterCinematicLastFocusAt = 0;
let lastCharacterCinematicScene = -1;
let characterSceneToken = 0;
let playerData = null;
let loaded = false;
let registrationOpen = false;
let selectorOpen = false;
let spawnOpen = false;
let appearanceOpen = false;
let appearanceCamera = 0;
let appearanceCameraView = 'face';
let appearancePreviewToken = 0;
let appearanceDraft = null;
let currentAppearance = null;
let pendingSelectionPayload = null;
let deathState = 'alive';
let inventoryState = [];
let registrationProfile = {};
const rpcPending = new Map();
let rpcSequence = 0;
let flyEnabled = false;
let flyTick = null;
let flyEntity = 0;
const flySpeeds = [0.5, 1.0, 2.0, 4.0, 8.0, 16.0, 32.0];
const flyControls = [21, 22, 32, 33, 34, 35, 36, 44, 75];
let flySpeedIndex = 3;
function chat(text, kind = 'info') {
    const prefix = kind === 'error' ? '^1Rumble' : kind === 'success' ? '^2Rumble' : '^5Rumble';
    emit('chat:addMessage', {
        color: [255, 255, 255],
        multiline: false,
        args: [prefix, text],
    });
}
function refreshNuiFocus() {
    SetNuiFocus(registrationOpen || selectorOpen || spawnOpen || appearanceOpen, registrationOpen || selectorOpen || spawnOpen || appearanceOpen);
}
async function ensureScreenVisible() {
    ShutdownLoadingScreen();
    ShutdownLoadingScreenNui();
    DoScreenFadeIn(0);
    for (let frame = 0; frame < 30 && IsScreenFadedOut(); frame++) {
        DoScreenFadeIn(0);
        await clientDelay(0);
    }
}
function isCharacterMenuOpen() {
    return registrationOpen || selectorOpen || spawnOpen || appearanceOpen;
}
function lerp(a, b, t) {
    return a + (b - a) * t;
}
function smoothStep(value) {
    const t = Math.max(0, Math.min(1, value));
    return t * t * (3 - 2 * t);
}
function chooseCharacterCinematicScene() {
    const scenes = ClientConfig.characterCinematic.scenes;
    if (scenes.length <= 1)
        return 0;
    let next = Math.floor(Math.random() * scenes.length);
    if (next === lastCharacterCinematicScene)
        next = (next + 1 + Math.floor(Math.random() * (scenes.length - 1))) % scenes.length;
    lastCharacterCinematicScene = next;
    return next;
}
function destroyCharacterCinematic(immediate = false) {
    if (characterCinematicTimer !== null) {
        clearInterval(characterCinematicTimer);
        characterCinematicTimer = null;
    }
    if (characterCinematicCamera && DoesCamExist(characterCinematicCamera)) {
        SetCamActive(characterCinematicCamera, false);
        RenderScriptCams(false, !immediate, immediate ? 0 : 350, true, true);
        DestroyCam(characterCinematicCamera, false);
    }
    characterCinematicCamera = 0;
    characterCinematicScene = -1;
    characterCinematicShot = 0;
    characterCinematicShotStartedAt = 0;
    characterCinematicLastFocusAt = 0;
}
function restoreCharacterMenuPed() {
    const ped = PlayerPedId();
    if (!DoesEntityExist(ped))
        return;
    ResetEntityAlpha(ped);
    SetEntityVisible(ped, true, false);
    SetEntityInvincible(ped, false);
    SetEntityCollision(ped, true, true);
    FreezeEntityPosition(ped, false);
}
function hideCharacterMenuPed() {
    const ped = PlayerPedId();
    if (!DoesEntityExist(ped))
        return;
    SetEntityInvincible(ped, true);
    SetEntityVisible(ped, false, false);
    FreezeEntityPosition(ped, true);
}
function startCharacterCinematic() {
    if (characterCinematicCamera && DoesCamExist(characterCinematicCamera))
        return;
    const scenes = ClientConfig.characterCinematic.scenes;
    if (scenes.length === 0)
        return;
    characterCinematicScene = chooseCharacterCinematicScene();
    characterCinematicShot = 0;
    characterCinematicShotStartedAt = Date.now();
    characterCinematicLastFocusAt = 0;
    const shot = scenes[characterCinematicScene].shots[0];
    characterCinematicCamera = CreateCamWithParams('DEFAULT_SCRIPTED_CAMERA', shot.from.x, shot.from.y, shot.from.z, 0.0, 0.0, 0.0, ClientConfig.characterCinematic.fov, true, 2);
    PointCamAtCoord(characterCinematicCamera, shot.lookAt.x, shot.lookAt.y, shot.lookAt.z);
    SetCamActive(characterCinematicCamera, true);
    RenderScriptCams(true, true, 500, true, true);
    SetFocusPosAndVel(shot.from.x, shot.from.y, shot.from.z, 0, 0, 0);
    characterCinematicTimer = setInterval(() => {
        if (!isCharacterMenuOpen() || !characterCinematicCamera || !DoesCamExist(characterCinematicCamera))
            return;
        const scene = scenes[characterCinematicScene];
        const activeShot = scene.shots[characterCinematicShot];
        const now = Date.now();
        const duration = Math.max(1000, activeShot.durationMs);
        const progress = Math.min(1, (now - characterCinematicShotStartedAt) / duration);
        const t = smoothStep(progress);
        const x = lerp(activeShot.from.x, activeShot.to.x, t);
        const y = lerp(activeShot.from.y, activeShot.to.y, t);
        const z = lerp(activeShot.from.z, activeShot.to.z, t);
        SetCamCoord(characterCinematicCamera, x, y, z);
        PointCamAtCoord(characterCinematicCamera, activeShot.lookAt.x, activeShot.lookAt.y, activeShot.lookAt.z);
        if (now - characterCinematicLastFocusAt >= ClientConfig.characterCinematic.focusRefreshMs) {
            characterCinematicLastFocusAt = now;
            SetFocusPosAndVel(x, y, z, 0, 0, 0);
        }
        if (progress >= 1) {
            characterCinematicShot = (characterCinematicShot + 1) % scene.shots.length;
            characterCinematicShotStartedAt = now;
        }
    }, 33);
}
async function waitForPlayerPed(timeoutMs = 5000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        const ped = PlayerPedId();
        if (DoesEntityExist(ped))
            return ped;
        await clientDelay(50);
    }
    throw new Error('Player ped could not be initialized.');
}
async function prepareCharacterMenuScene() {
    const token = ++characterSceneToken;
    await ensureScreenVisible();
    if (token !== characterSceneToken)
        return;
    hideCharacterMenuPed();
    startCharacterCinematic();
}
const APPEARANCE_COMPONENT_IDS = Object.freeze({ mask: 1, arms: 3, pants: 4, bag: 5, shoes: 6, accessory: 7, undershirt: 8, armor: 9, decals: 10, torso: 11 });
const APPEARANCE_PROP_IDS = Object.freeze({ hat: 0, glasses: 1, ears: 2, watch: 6, bracelet: 7 });
function clampPedDrawable(ped, componentId, drawable) {
    const count = Math.max(1, GetNumberOfPedDrawableVariations(ped, componentId));
    return Math.max(0, Math.min(count - 1, Math.floor(drawable)));
}
function clampPedTexture(ped, componentId, drawable, texture) {
    const count = Math.max(1, GetNumberOfPedTextureVariations(ped, componentId, drawable));
    return Math.max(0, Math.min(count - 1, Math.floor(texture)));
}
function applyAppearanceToPed(ped, rawAppearance) {
    const appearance = sanitizeAppearance(rawAppearance);
    SetPedHeadBlendData(ped, appearance.parents.shapeFirst, appearance.parents.shapeSecond, 0, appearance.parents.skinFirst, appearance.parents.skinSecond, 0, appearance.parents.shapeMix, appearance.parents.skinMix, 0.0, false);
    for (let index = 0; index < appearance.faceFeatures.length; index++)
        SetPedFaceFeature(ped, index, appearance.faceFeatures[index]);
    SetPedEyeColor(ped, appearance.eyeColor);
    const hairDrawable = clampPedDrawable(ped, 2, appearance.hair.style);
    const hairTexture = clampPedTexture(ped, 2, hairDrawable, appearance.hair.texture);
    appearance.hair.style = hairDrawable;
    appearance.hair.texture = hairTexture;
    SetPedComponentVariation(ped, 2, hairDrawable, hairTexture, 0);
    SetPedHairColor(ped, appearance.hair.color, appearance.hair.highlight);
    const beardIndex = appearance.beard.style < 0 ? 255 : appearance.beard.style;
    SetPedHeadOverlay(ped, 1, beardIndex, appearance.beard.style < 0 ? 0.0 : appearance.beard.opacity);
    if (appearance.beard.style >= 0)
        SetPedHeadOverlayColor(ped, 1, 1, appearance.beard.color, appearance.beard.color);
    const eyebrowIndex = appearance.eyebrows.style < 0 ? 255 : appearance.eyebrows.style;
    SetPedHeadOverlay(ped, 2, eyebrowIndex, appearance.eyebrows.style < 0 ? 0.0 : appearance.eyebrows.opacity);
    if (appearance.eyebrows.style >= 0)
        SetPedHeadOverlayColor(ped, 2, 1, appearance.eyebrows.color, appearance.eyebrows.color);
    for (const [key, componentId] of Object.entries(APPEARANCE_COMPONENT_IDS)) {
        const item = appearance.clothes[key];
        const drawable = clampPedDrawable(ped, componentId, item.drawable);
        const texture = clampPedTexture(ped, componentId, drawable, item.texture);
        item.drawable = drawable;
        item.texture = texture;
        SetPedComponentVariation(ped, componentId, drawable, texture, 0);
    }
    for (const [key, propId] of Object.entries(APPEARANCE_PROP_IDS)) {
        const item = appearance.props[key];
        if (item.drawable < 0) {
            ClearPedProp(ped, propId);
            continue;
        }
        const drawableCount = Math.max(0, GetNumberOfPedPropDrawableVariations(ped, propId));
        if (drawableCount <= 0) {
            item.drawable = -1;
            item.texture = 0;
            ClearPedProp(ped, propId);
            continue;
        }
        const drawable = Math.max(0, Math.min(drawableCount - 1, item.drawable));
        const textureCount = Math.max(1, GetNumberOfPedPropTextureVariations(ped, propId, drawable));
        const texture = Math.max(0, Math.min(textureCount - 1, item.texture));
        item.drawable = drawable;
        item.texture = texture;
        SetPedPropIndex(ped, propId, drawable, texture, true);
    }
    ClearPedDecorations(ped);
    for (const tattooId of appearance.tattoos) {
        const tattoo = APPEARANCE_TATTOOS.find((entry) => entry.id === tattooId);
        if (!tattoo)
            continue;
        const overlay = appearance.sex === 'female' ? tattoo.female : tattoo.male;
        if (!overlay)
            continue;
        AddPedDecorationFromHashes(ped, GetHashKey(tattoo.collection), GetHashKey(overlay));
    }
    return appearance;
}
function getAppearanceOptions(ped, appearance) {
    const components = {};
    for (const [key, componentId] of Object.entries(APPEARANCE_COMPONENT_IDS)) {
        const item = appearance.clothes[key];
        const drawables = Math.max(1, GetNumberOfPedDrawableVariations(ped, componentId));
        const drawable = Math.max(0, Math.min(drawables - 1, item.drawable));
        components[key] = { drawables, textures: Math.max(1, GetNumberOfPedTextureVariations(ped, componentId, drawable)) };
    }
    const props = {};
    for (const [key, propId] of Object.entries(APPEARANCE_PROP_IDS)) {
        const item = appearance.props[key];
        const drawables = Math.max(0, GetNumberOfPedPropDrawableVariations(ped, propId));
        const drawable = Math.max(0, Math.min(Math.max(0, drawables - 1), Math.max(0, item.drawable)));
        props[key] = { drawables, textures: drawables > 0 ? Math.max(1, GetNumberOfPedPropTextureVariations(ped, propId, drawable)) : 1 };
    }
    const hairDrawables = Math.max(1, GetNumberOfPedDrawableVariations(ped, 2));
    const hairDrawable = Math.max(0, Math.min(hairDrawables - 1, appearance.hair.style));
    return {
        parents: 46,
        hair: { drawables: hairDrawables, textures: Math.max(1, GetNumberOfPedTextureVariations(ped, 2, hairDrawable)), colors: 64 },
        components,
        props,
    };
}
function destroyAppearanceCamera(immediate = false) {
    if (appearanceCamera && DoesCamExist(appearanceCamera)) {
        SetCamActive(appearanceCamera, false);
        RenderScriptCams(false, !immediate, immediate ? 0 : 250, true, true);
        DestroyCam(appearanceCamera, false);
    }
    appearanceCamera = 0;
}
function setAppearanceCameraView(view) {
    appearanceCameraView = view;
    const ped = PlayerPedId();
    if (!ped || !DoesEntityExist(ped))
        return;
    const cameraConfig = view === 'body' ? ClientConfig.appearanceStudio.bodyCamera : ClientConfig.appearanceStudio.camera;
    if (!appearanceCamera || !DoesCamExist(appearanceCamera)) {
        appearanceCamera = CreateCamWithParams('DEFAULT_SCRIPTED_CAMERA', cameraConfig.x, cameraConfig.y, cameraConfig.z, 0, 0, 0, cameraConfig.fov, true, 2);
        SetCamActive(appearanceCamera, true);
        RenderScriptCams(true, true, 250, true, true);
    }
    else {
        SetCamCoord(appearanceCamera, cameraConfig.x, cameraConfig.y, cameraConfig.z);
        SetCamFov(appearanceCamera, cameraConfig.fov);
    }
    PointCamAtEntity(appearanceCamera, ped, 0.0, 0.0, view === 'body' ? 0.15 : 0.67, true);
}
function closeAppearanceCreator(immediate = false) {
    appearanceOpen = false;
    appearancePreviewToken++;
    destroyAppearanceCamera(immediate);
    SendNuiMessage(JSON.stringify({ type: 'appearance', active: false }));
    refreshNuiFocus();
}
async function openAppearanceCreator(data) {
    var _a;
    pendingSelectionPayload = data;
    registrationOpen = false;
    selectorOpen = false;
    spawnOpen = false;
    appearanceOpen = true;
    loaded = false;
    characterSceneToken++;
    destroyCharacterCinematic(true);
    ClearFocus();
    await ensureScreenVisible();
    const initial = hasSavedAppearance((_a = data === null || data === void 0 ? void 0 : data.metadata) === null || _a === void 0 ? void 0 : _a.appearance) ? sanitizeAppearance(data.metadata.appearance) : createDefaultAppearance('male');
    appearanceDraft = initial;
    currentAppearance = initial;
    const ped = await ensureMultiplayerPlayerModel(false, initial.sex);
    if (!ped || !DoesEntityExist(ped))
        throw new Error('The creator model could not be loaded.');
    const studio = ClientConfig.appearanceStudio.position;
    RequestCollisionAtCoord(studio.x, studio.y, studio.z);
    SetEntityCoordsNoOffset(ped, studio.x, studio.y, studio.z, false, false, false);
    SetEntityHeading(ped, studio.heading);
    SetEntityVisible(ped, true, false);
    SetEntityCollision(ped, true, true);
    SetEntityInvincible(ped, true);
    FreezeEntityPosition(ped, true);
    appearanceDraft = applyAppearanceToPed(ped, initial);
    setAppearanceCameraView('face');
    refreshNuiFocus();
    SendNuiMessage(JSON.stringify({ type: 'registration', active: false }));
    SendNuiMessage(JSON.stringify({ type: 'selector', active: false }));
    SendNuiMessage(JSON.stringify({ type: 'spawn', active: false }));
    SendNuiMessage(JSON.stringify({
        type: 'appearance',
        active: true,
        appearance: appearanceDraft,
        options: getAppearanceOptions(ped, appearanceDraft),
        tattoos: APPEARANCE_TATTOOS.map((tattoo) => ({ id: tattoo.id, label: tattoo.label, available: Boolean(initial.sex === 'female' ? tattoo.female : tattoo.male) })),
    }));
}
function openRegistration(profile = {}) {
    var _a, _b, _c, _d, _e;
    closeAppearanceCreator(true);
    registrationProfile = { ...profile };
    registrationOpen = true;
    selectorOpen = false;
    spawnOpen = false;
    loaded = false;
    void prepareCharacterMenuScene();
    refreshNuiFocus();
    SendNuiMessage(JSON.stringify({ type: 'selector', active: false }));
    SendNuiMessage(JSON.stringify({ type: 'spawn', active: false }));
    SendNuiMessage(JSON.stringify({
        type: 'registration',
        active: true,
        mode: String((_a = profile === null || profile === void 0 ? void 0 : profile.mode) !== null && _a !== void 0 ? _a : 'create'),
        characterId: Number((_b = profile === null || profile === void 0 ? void 0 : profile.characterId) !== null && _b !== void 0 ? _b : 0),
        firstName: String((_c = profile === null || profile === void 0 ? void 0 : profile.firstName) !== null && _c !== void 0 ? _c : ''),
        lastName: String((_d = profile === null || profile === void 0 ? void 0 : profile.lastName) !== null && _d !== void 0 ? _d : ''),
        minimumAge: Number((_e = profile === null || profile === void 0 ? void 0 : profile.minimumAge) !== null && _e !== void 0 ? _e : 18),
    }));
}
function closeRegistration() {
    registrationOpen = false;
    SendNuiMessage(JSON.stringify({ type: 'registration', active: false }));
    refreshNuiFocus();
}
function openSelector(data) {
    closeAppearanceCreator(true);
    registrationOpen = false;
    spawnOpen = false;
    selectorOpen = true;
    loaded = false;
    void prepareCharacterMenuScene();
    refreshNuiFocus();
    SendNuiMessage(JSON.stringify({ type: 'registration', active: false }));
    SendNuiMessage(JSON.stringify({ type: 'spawn', active: false }));
    SendNuiMessage(JSON.stringify({ type: 'selector', active: true, ...data }));
}
function closeSelector() {
    selectorOpen = false;
    SendNuiMessage(JSON.stringify({ type: 'selector', active: false }));
    refreshNuiFocus();
}
function openSpawn(data) {
    closeAppearanceCreator(true);
    const spawns = Array.isArray(data === null || data === void 0 ? void 0 : data.spawns) ? data.spawns : [];
    availableSpawns = new Map();
    for (const spawn of spawns) {
        const position = spawn === null || spawn === void 0 ? void 0 : spawn.position;
        if (!position)
            continue;
        const values = [Number(position.x), Number(position.y), Number(position.z), Number(position.heading)];
        if (values.every(Number.isFinite))
            availableSpawns.set(String(spawn.id), { x: values[0], y: values[1], z: values[2], heading: values[3] });
    }
    registrationOpen = false;
    selectorOpen = false;
    spawnOpen = true;
    loaded = false;
    void prepareCharacterMenuScene();
    refreshNuiFocus();
    SendNuiMessage(JSON.stringify({ type: 'registration', active: false }));
    SendNuiMessage(JSON.stringify({ type: 'selector', active: false }));
    SendNuiMessage(JSON.stringify({
        type: 'spawn',
        active: true,
        spawns,
        forcedHospital: deathState !== 'alive',
    }));
}
function closeSpawn() {
    spawnOpen = false;
    SendNuiMessage(JSON.stringify({ type: 'spawn', active: false }));
    refreshNuiFocus();
}
async function ensureMultiplayerPlayerModel(force = false, sex = 'male') {
    const modelName = sex === 'female' ? ClientConfig.femalePlayerModel : ClientConfig.defaultPlayerModel;
    const model = GetHashKey(modelName);
    const currentPed = await waitForPlayerPed();
    if (!force && DoesEntityExist(currentPed) && GetEntityModel(currentPed) === model)
        return currentPed;
    if (!IsModelInCdimage(model))
        throw new Error(`Invalid multiplayer model: ${ClientConfig.defaultPlayerModel}`);
    RequestModel(model);
    const started = Date.now();
    while (!HasModelLoaded(model)) {
        if (Date.now() - started >= ClientConfig.modelLoadTimeoutMs)
            throw new Error('The multiplayer model failed to load.');
        await clientDelay(25);
    }
    SetPlayerModel(PlayerId(), model);
    const ped = await waitForPlayerPed();
    if (!DoesEntityExist(ped) || GetEntityModel(ped) !== model) {
        SetModelAsNoLongerNeeded(model);
        throw new Error('The multiplayer player model could not be applied.');
    }
    SetPedDefaultComponentVariation(ped);
    ClearAllPedProps(ped);
    SetModelAsNoLongerNeeded(model);
    return ped;
}
async function spawnCharacter(data, position, spawnId = 'last') {
    closeRegistration();
    closeSelector();
    closeSpawn();
    closeAppearanceCreator(true);
    characterSceneToken++;
    destroyCharacterCinematic();
    loaded = false;
    await ensureScreenVisible();
    const appearance = currentAppearance ? sanitizeAppearance(currentAppearance) : createDefaultAppearance('male');
    const ped = await ensureMultiplayerPlayerModel(false, appearance.sex);
    if (!DoesEntityExist(ped))
        throw new Error('Player ped does not exist.');
    const p = position !== null && position !== void 0 ? position : data.character.position;
    const values = [p.x, p.y, p.z, p.heading];
    if (values.some((value) => !Number.isFinite(value)))
        throw new Error('Invalid spawn position.');
    RequestCollisionAtCoord(p.x, p.y, p.z);
    SetFocusPosAndVel(p.x, p.y, p.z, 0, 0, 0);
    NetworkResurrectLocalPlayer(p.x, p.y, p.z, p.heading, true, false);
    applyAppearanceToPed(ped, appearance);
    SetEntityCoordsNoOffset(ped, p.x, p.y, p.z, false, false, false);
    SetEntityHeading(ped, p.heading);
    ResetEntityAlpha(ped);
    SetEntityVisible(ped, true, false);
    SetEntityCollision(ped, true, true);
    SetEntityHealth(ped, Math.max(100, data.character.health || 200));
    SetPedArmour(ped, Math.max(0, data.character.armor || 0));
    ClearPedTasksImmediately(ped);
    ClearPedBloodDamage(ped);
    ResetPedVisibleDamage(ped);
    SetEntityInvincible(ped, false);
    FreezeEntityPosition(ped, false);
    const collisionStarted = Date.now();
    let lastCollisionRequest = 0;
    while (!HasCollisionLoadedAroundEntity(ped) && Date.now() - collisionStarted < ClientConfig.spawnCollisionTimeoutMs) {
        const now = Date.now();
        if (now - lastCollisionRequest >= 250) {
            lastCollisionRequest = now;
            RequestCollisionAtCoord(p.x, p.y, p.z);
            SetFocusPosAndVel(p.x, p.y, p.z, 0, 0, 0);
        }
        await clientDelay(50);
    }
    ClearFocus();
    playerData = data;
    loaded = true;
    await ensureScreenVisible();
    chat(`Welcome, ${data.character.firstName} ${data.character.lastName}. ID: ${data.playerId} | State ID: ${data.character.stateId}`, 'success');
    emitNet('rumble:player:spawned', spawnId);
}
onNet('rumble:player:loadError', (text) => {
    registrationOpen = false;
    selectorOpen = false;
    spawnOpen = false;
    closeAppearanceCreator(true);
    characterSceneToken++;
    destroyCharacterCinematic(true);
    ClearFocus();
    restoreCharacterMenuPed();
    refreshNuiFocus();
    void ensureScreenVisible();
    chat(String(text || 'Character loading failed. Check the server console.'), 'error');
});
onNet('rumble:character:registrationRequired', (profile) => {
    openRegistration(profile);
});
onNet('rumble:character:registrationError', (text) => {
    SendNuiMessage(JSON.stringify({ type: 'registrationError', message: String(text || 'Could not create the character.') }));
});
onNet('rumble:character:selectorRequired', (data) => {
    openSelector(data);
});
onNet('rumble:character:selectorError', (text) => {
    SendNuiMessage(JSON.stringify({ type: 'selectorError', message: String(text || 'Could not select the character.') }));
});
RegisterNuiCallbackType('characterCreate');
on('__cfx_nui:characterCreate', (data, callback) => {
    var _a, _b, _c, _d, _e;
    if (!registrationOpen) {
        callback({ accepted: false });
        return;
    }
    emitNet('rumble:character:createInitial', {
        mode: String((_a = registrationProfile === null || registrationProfile === void 0 ? void 0 : registrationProfile.mode) !== null && _a !== void 0 ? _a : 'create'),
        characterId: Number((_b = registrationProfile === null || registrationProfile === void 0 ? void 0 : registrationProfile.characterId) !== null && _b !== void 0 ? _b : 0),
        firstName: String((_c = data === null || data === void 0 ? void 0 : data.firstName) !== null && _c !== void 0 ? _c : ''),
        lastName: String((_d = data === null || data === void 0 ? void 0 : data.lastName) !== null && _d !== void 0 ? _d : ''),
        dateOfBirth: String((_e = data === null || data === void 0 ? void 0 : data.dateOfBirth) !== null && _e !== void 0 ? _e : ''),
    });
    callback({ accepted: true });
});
RegisterNuiCallbackType('characterSelect');
on('__cfx_nui:characterSelect', (data, callback) => {
    var _a;
    if (!selectorOpen) {
        callback({ accepted: false });
        return;
    }
    const id = Number((_a = data === null || data === void 0 ? void 0 : data.id) !== null && _a !== void 0 ? _a : 0);
    if (!Number.isInteger(id) || id <= 0) {
        callback({ accepted: false });
        return;
    }
    emitNet('rumble:character:select', id);
    callback({ accepted: true });
});
RegisterNuiCallbackType('characterNew');
on('__cfx_nui:characterNew', (_data, callback) => {
    if (!selectorOpen) {
        callback({ accepted: false });
        return;
    }
    openRegistration({ mode: 'create', firstName: '', lastName: '' });
    callback({ accepted: true });
});
RegisterNuiCallbackType('appearancePreview');
on('__cfx_nui:appearancePreview', (data, callback) => {
    if (!appearanceOpen) {
        callback({ accepted: false });
        return;
    }
    const next = sanitizeAppearance(data === null || data === void 0 ? void 0 : data.appearance);
    const token = ++appearancePreviewToken;
    callback({ accepted: true });
    void (async () => {
        const ped = await ensureMultiplayerPlayerModel(false, next.sex);
        if (!appearanceOpen || token !== appearancePreviewToken)
            return;
        const studio = ClientConfig.appearanceStudio.position;
        SetEntityCoordsNoOffset(ped, studio.x, studio.y, studio.z, false, false, false);
        SetEntityHeading(ped, studio.heading);
        SetEntityInvincible(ped, true);
        FreezeEntityPosition(ped, true);
        appearanceDraft = applyAppearanceToPed(ped, next);
        currentAppearance = appearanceDraft;
        setAppearanceCameraView(appearanceCameraView);
        SendNuiMessage(JSON.stringify({
            type: 'appearanceOptions',
            options: getAppearanceOptions(ped, appearanceDraft),
            appearance: appearanceDraft,
            tattoos: APPEARANCE_TATTOOS.map((tattoo) => ({ id: tattoo.id, label: tattoo.label, available: Boolean(appearanceDraft.sex === 'female' ? tattoo.female : tattoo.male) })),
        }));
    })().catch((error) => console.error('[RUMBLE][APPEARANCE] preview failed', error));
});
RegisterNuiCallbackType('appearanceSave');
on('__cfx_nui:appearanceSave', (data, callback) => {
    var _a;
    if (!appearanceOpen || !playerData) {
        callback({ accepted: false });
        return;
    }
    const appearance = sanitizeAppearance((_a = data === null || data === void 0 ? void 0 : data.appearance) !== null && _a !== void 0 ? _a : appearanceDraft);
    appearanceDraft = appearance;
    emitNet('rumble:character:appearanceSave', appearance);
    callback({ accepted: true });
});
RegisterNuiCallbackType('appearanceCamera');
on('__cfx_nui:appearanceCamera', (data, callback) => {
    var _a;
    if (!appearanceOpen) {
        callback({ accepted: false });
        return;
    }
    const ped = PlayerPedId();
    const action = String((_a = data === null || data === void 0 ? void 0 : data.action) !== null && _a !== void 0 ? _a : '');
    if (action === 'face' || action === 'body')
        setAppearanceCameraView(action);
    if ((action === 'left' || action === 'right') && ped && DoesEntityExist(ped)) {
        const delta = action === 'left' ? -15.0 : 15.0;
        SetEntityHeading(ped, GetEntityHeading(ped) + delta);
    }
    callback({ accepted: true });
});
RegisterNuiCallbackType('spawnSelect');
on('__cfx_nui:spawnSelect', (data, callback) => {
    var _a;
    if (!spawnOpen || !playerData) {
        callback({ accepted: false });
        return;
    }
    const id = String((_a = data === null || data === void 0 ? void 0 : data.id) !== null && _a !== void 0 ? _a : '');
    if (deathState !== 'alive' && id !== 'hospital') {
        callback({ accepted: false });
        return;
    }
    const position = id === 'last' ? playerData.character.position : availableSpawns.get(id);
    if (!position) {
        callback({ accepted: false });
        return;
    }
    if (deathState !== 'alive' && id === 'hospital') {
        playerData.character.health = 200;
        playerData.character.armor = 0;
    }
    callback({ accepted: true });
    void spawnCharacter(playerData, position, id).catch((error) => {
        characterSceneToken++;
        destroyCharacterCinematic(true);
        ClearFocus();
        restoreCharacterMenuPed();
        void ensureScreenVisible();
        console.error('[rumble] Spawn failed', error);
        chat('Could not spawn. Check the F8 console.', 'error');
    });
});
onNet('rumble:character:selected', (data) => {
    var _a, _b, _c, _d;
    playerData = (_a = data === null || data === void 0 ? void 0 : data.player) !== null && _a !== void 0 ? _a : null;
    inventoryState = Array.isArray(data === null || data === void 0 ? void 0 : data.inventory) ? data.inventory : [];
    deathState = String((_c = (_b = data === null || data === void 0 ? void 0 : data.metadata) === null || _b === void 0 ? void 0 : _b.deathState) !== null && _c !== void 0 ? _c : 'alive');
    pendingSelectionPayload = data;
    if (!playerData)
        return;
    const savedAppearance = hasSavedAppearance((_d = data === null || data === void 0 ? void 0 : data.metadata) === null || _d === void 0 ? void 0 : _d.appearance) ? sanitizeAppearance(data.metadata.appearance) : null;
    currentAppearance = savedAppearance;
    appearanceDraft = savedAppearance;
    if (Boolean(data === null || data === void 0 ? void 0 : data.requiresAppearance) || !savedAppearance) {
        void openAppearanceCreator(data).catch((error) => {
            console.error('[RUMBLE][APPEARANCE] failed to open creator', error);
            chat('Character creator failed to open. Check F8.', 'error');
        });
        return;
    }
    void ensureMultiplayerPlayerModel(false, savedAppearance.sex).then((ped) => {
        applyAppearanceToPed(ped, savedAppearance);
        openSpawn(data);
    }).catch((error) => {
        console.error('[RUMBLE][CLIENT][MODEL] Failed to prepare multiplayer ped', error);
        chat('Could not prepare the multiplayer character. Check F8.', 'error');
    });
});
onNet('rumble:character:appearanceSaved', (data) => {
    var _a, _b;
    if (!playerData)
        return;
    const appearance = sanitizeAppearance((_a = data === null || data === void 0 ? void 0 : data.appearance) !== null && _a !== void 0 ? _a : appearanceDraft);
    currentAppearance = appearance;
    appearanceDraft = appearance;
    const payload = (_b = data === null || data === void 0 ? void 0 : data.selection) !== null && _b !== void 0 ? _b : pendingSelectionPayload;
    closeAppearanceCreator(true);
    if (payload)
        openSpawn(payload);
});
onNet('rumble:character:appearanceError', (text) => {
    SendNuiMessage(JSON.stringify({ type: 'appearanceError', message: String(text || 'Could not save the appearance.') }));
});
onNet('rumble:player:loaded', (data) => {
    playerData = data;
    loaded = true;
    emit('rumble:client:playerLoaded', data);
});
onNet('rumble:faction:update', (faction) => {
    if (!playerData)
        return;
    playerData.faction = faction ? { ...faction } : null;
    emit('rumble:client:factionChanged', playerData.faction);
});
onNet('rumble:money:update', (account, amount) => {
    if (!playerData)
        return;
    playerData.character[account] = Number(amount);
});
onNet('rumble:inventory:update', (items) => {
    inventoryState = Array.isArray(items) ? items : [];
    emit('rumble:client:inventoryChanged', inventoryState);
});
onNet('rumble:rpc:response', (requestId, ok, result, error) => {
    const pending = rpcPending.get(String(requestId));
    if (!pending)
        return;
    clearTimeout(pending.timer);
    rpcPending.delete(String(requestId));
    if (ok)
        pending.resolve(result);
    else
        pending.reject(new Error(String(error !== null && error !== void 0 ? error : 'RPC failed')));
});
function rpcCall(name, payload = null, timeoutMs = 10000) {
    const id = `${Date.now().toString(36)}-${(++rpcSequence).toString(36)}`;
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            rpcPending.delete(id);
            reject(new Error(`RPC timeout: ${name}`));
        }, Math.max(1000, timeoutMs));
        rpcPending.set(id, { resolve, reject, timer });
        emitNet('rumble:rpc:request', id, name, payload);
    });
}
onNet('rumble:needs:update', (hunger, thirst, reason) => {
    if (!playerData)
        return;
    const previousHunger = playerData.character.hunger;
    const previousThirst = playerData.character.thirst;
    playerData.character.hunger = Math.max(0, Math.min(100, Number(hunger)));
    playerData.character.thirst = Math.max(0, Math.min(100, Number(thirst)));
    if (reason === 'decay') {
        const currentHunger = playerData.character.hunger;
        const currentThirst = playerData.character.thirst;
        if (previousHunger > 25 && currentHunger <= 25)
            chat('You are hungry. Hunger dropped below 25%.', 'info');
        if (previousThirst > 25 && currentThirst <= 25)
            chat('You are thirsty. Thirst dropped below 25%.', 'info');
        if (previousHunger > 10 && currentHunger <= 10)
            chat('Critical hunger: below 10%.', 'error');
        if (previousThirst > 10 && currentThirst <= 10)
            chat('Critical thirst: below 10%.', 'error');
        if (previousHunger > 0 && currentHunger <= 0)
            chat('Your hunger is empty. You are starting to lose health.', 'error');
        if (previousThirst > 0 && currentThirst <= 0)
            chat('Your thirst is empty. You are starting to lose health.', 'error');
    }
});
onNet('rumble:needs:damage', (amount) => {
    const ped = PlayerPedId();
    if (!DoesEntityExist(ped) || IsEntityDead(ped))
        return;
    const damage = Math.max(0, Math.floor(Number(amount)));
    if (damage <= 0)
        return;
    SetEntityHealth(ped, Math.max(0, GetEntityHealth(ped) - damage));
    syncDeathStateFromPed();
});
onNet('rumble:vitals:set', (vital, amount) => {
    const ped = PlayerPedId();
    if (!DoesEntityExist(ped))
        return;
    if (vital === 'health') {
        const maximum = GetEntityMaxHealth(ped);
        const targetHealth = Math.max(0, Math.min(maximum, Math.floor(Number(amount))));
        if (IsEntityDead(ped) && targetHealth > 0) {
            const [x, y, z] = GetEntityCoords(ped, false);
            const heading = GetEntityHeading(ped);
            NetworkResurrectLocalPlayer(x, y, z + 0.1, heading, true, false);
        }
        SetEntityHealth(PlayerPedId(), targetHealth);
        ClearPedBloodDamage(PlayerPedId());
        ResetPedVisibleDamage(PlayerPedId());
    }
    else if (vital === 'armor') {
        SetPedArmour(ped, Math.max(0, Math.min(100, Math.floor(Number(amount)))));
    }
});
onNet('rumble:admin:fullStats', () => {
    const ped = PlayerPedId();
    if (!DoesEntityExist(ped))
        return;
    if (IsEntityDead(ped)) {
        const [x, y, z] = GetEntityCoords(ped, false);
        const heading = GetEntityHeading(ped);
        NetworkResurrectLocalPlayer(x, y, z + 0.1, heading, true, false);
    }
    const activePed = PlayerPedId();
    SetEntityHealth(activePed, GetEntityMaxHealth(activePed));
    SetPedArmour(activePed, 100);
    ClearPedBloodDamage(activePed);
    ResetPedVisibleDamage(activePed);
    deathState = 'alive';
    emitNet('rumble:death:update', 'alive');
});
onNet('rumble:admin:revive', () => {
    const ped = PlayerPedId();
    const [x, y, z] = GetEntityCoords(ped, false);
    const heading = GetEntityHeading(ped);
    NetworkResurrectLocalPlayer(x, y, z + 0.1, heading, true, false);
    ClearPedTasksImmediately(ped);
    ClearPedBloodDamage(ped);
    ResetPedVisibleDamage(ped);
    SetEntityHealth(ped, GetEntityMaxHealth(ped));
    SetPedArmour(ped, 0);
    SetEntityInvincible(ped, false);
    FreezeEntityPosition(ped, false);
    deathState = 'alive';
    emitNet('rumble:death:update', 'alive');
    chat('You have been revived.', 'success');
});
onNet('rumble:death:state', (stateInput) => {
    const next = String(stateInput);
    if (!['alive', 'downed', 'dead', 'respawning'].includes(next))
        return;
    deathState = next;
    if (deathState === 'downed')
        chat('You are downed. If you are not revived, you will become dead.', 'error');
    if (deathState === 'dead')
        chat('You are dead. You can use /respawn.', 'error');
});
onNet('rumble:death:respawn', (position) => {
    if (!playerData || !position)
        return;
    deathState = 'respawning';
    void (async () => {
        playerData.character.health = 200;
        playerData.character.armor = 0;
        await spawnCharacter(playerData, position, 'hospital');
        deathState = 'alive';
        emitNet('rumble:death:update', 'alive');
        chat('You respawned at the hospital.', 'success');
    })().catch((error) => console.error('[rumble] Respawn failed', error));
});
function syncDeathStateFromPed() {
    if (!loaded || !playerData)
        return;
    const ped = PlayerPedId();
    if (!DoesEntityExist(ped))
        return;
    const dead = IsEntityDead(ped) || GetEntityHealth(ped) <= 0;
    if (dead && deathState === 'alive') {
        deathState = 'downed';
        emitNet('rumble:death:update', 'downed');
    }
    else if (!dead && deathState !== 'alive' && deathState !== 'respawning') {
        deathState = 'alive';
        emitNet('rumble:death:update', 'alive');
    }
}
let deathCheckQueued = false;
on('gameEventTriggered', (eventName, args) => {
    var _a;
    if (eventName !== 'CEventNetworkEntityDamage' || !loaded || deathCheckQueued)
        return;
    const victim = Number((_a = args === null || args === void 0 ? void 0 : args[0]) !== null && _a !== void 0 ? _a : 0);
    if (victim !== PlayerPedId())
        return;
    deathCheckQueued = true;
    setTimeout(() => {
        deathCheckQueued = false;
        syncDeathStateFromPed();
    }, 0);
});
function getFlyTarget() {
    const ped = PlayerPedId();
    const vehicle = GetVehiclePedIsIn(ped, false);
    if (vehicle !== 0 && DoesEntityExist(vehicle) && GetPedInVehicleSeat(vehicle, -1) === ped) {
        return vehicle;
    }
    return ped;
}
function restoreFlyEntity(entity) {
    if (!entity || !DoesEntityExist(entity))
        return;
    SetEntityCollision(entity, true, true);
    SetEntityInvincible(entity, false);
    FreezeEntityPosition(entity, false);
    SetEntityVelocity(entity, 0.0, 0.0, 0.0);
}
function updateFlyUi() {
    SendNuiMessage(JSON.stringify({
        type: 'fly',
        active: flyEnabled,
        speed: flySpeeds[flySpeedIndex],
    }));
}
function directionFromCamera() {
    const [pitch, , yaw] = GetGameplayCamRot(2);
    const pitchRad = pitch * Math.PI / 180.0;
    const yawRad = yaw * Math.PI / 180.0;
    const cosPitch = Math.cos(pitchRad);
    const forward = [
        -Math.sin(yawRad) * Math.abs(cosPitch),
        Math.cos(yawRad) * Math.abs(cosPitch),
        Math.sin(pitchRad),
    ];
    const right = [
        Math.cos(yawRad),
        Math.sin(yawRad),
        0.0,
    ];
    return { forward, right };
}
function startFly() {
    if (flyEnabled)
        return;
    flyEnabled = true;
    flyEntity = getFlyTarget();
    updateFlyUi();
    chat('Fly enabled. Scroll changes speed; /fly disables it.', 'success');
    flyTick = setTick(() => {
        const nextEntity = getFlyTarget();
        if (nextEntity !== flyEntity) {
            restoreFlyEntity(flyEntity);
            flyEntity = nextEntity;
        }
        if (!flyEntity || !DoesEntityExist(flyEntity))
            return;
        SetEntityCollision(flyEntity, false, false);
        SetEntityInvincible(flyEntity, true);
        SetEntityVelocity(flyEntity, 0.0, 0.0, 0.0);
        for (const control of flyControls)
            DisableControlAction(0, control, true);
        if (IsDisabledControlJustPressed(0, 15)) {
            flySpeedIndex = Math.min(flySpeeds.length - 1, flySpeedIndex + 1);
            updateFlyUi();
        }
        if (IsDisabledControlJustPressed(0, 14)) {
            flySpeedIndex = Math.max(0, flySpeedIndex - 1);
            updateFlyUi();
        }
        const { forward, right } = directionFromCamera();
        const [x, y, z] = GetEntityCoords(flyEntity, false);
        let dx = 0.0;
        let dy = 0.0;
        let dz = 0.0;
        if (IsDisabledControlPressed(0, 32)) {
            dx += forward[0];
            dy += forward[1];
            dz += forward[2];
        }
        if (IsDisabledControlPressed(0, 33)) {
            dx -= forward[0];
            dy -= forward[1];
            dz -= forward[2];
        }
        if (IsDisabledControlPressed(0, 35)) {
            dx += right[0];
            dy += right[1];
        }
        if (IsDisabledControlPressed(0, 34)) {
            dx -= right[0];
            dy -= right[1];
        }
        if (IsDisabledControlPressed(0, 22)) {
            dz += 1.0;
        }
        if (IsDisabledControlPressed(0, 44)) {
            dz -= 1.0;
        }
        const length = Math.hypot(dx, dy, dz);
        if (length > 0.0) {
            dx /= length;
            dy /= length;
            dz /= length;
            let speed = flySpeeds[flySpeedIndex];
            if (IsDisabledControlPressed(0, 21))
                speed *= 3.0;
            if (IsDisabledControlPressed(0, 36))
                speed *= 0.25;
            const frameScale = Math.max(0.25, Math.min(3.0, GetFrameTime() * 60.0));
            const move = speed * frameScale;
            SetEntityCoordsNoOffset(flyEntity, x + dx * move, y + dy * move, z + dz * move, false, false, false);
            const [, , yaw] = GetGameplayCamRot(2);
            SetEntityHeading(flyEntity, yaw);
        }
    });
}
function stopFly() {
    if (!flyEnabled)
        return;
    flyEnabled = false;
    if (flyTick !== null) {
        clearTick(flyTick);
        flyTick = null;
    }
    restoreFlyEntity(flyEntity);
    flyEntity = 0;
    updateFlyUi();
    chat('Fly dezactivat.', 'info');
}
onNet('rumble:admin:toggleFly', () => {
    if (flyEnabled)
        stopFly();
    else
        startFly();
});
async function getGroundAtWaypoint(x, y) {
    const heights = [0, 25, 50, 75, 100, 150, 200, 300, 400, 500, 650, 800, 1000];
    for (const height of heights) {
        RequestCollisionAtCoord(x, y, height);
        SetFocusPosAndVel(x, y, height, 0.0, 0.0, 0.0);
        await clientDelay(80);
        const [found, groundZ] = GetGroundZFor_3dCoord(x, y, height + 25.0, false);
        if (found) {
            ClearFocus();
            return groundZ;
        }
    }
    ClearFocus();
    return null;
}
onNet('rumble:admin:gotoWaypoint', () => {
    void (async () => {
        const waypoint = GetFirstBlipInfoId(8);
        if (!waypoint || !DoesBlipExist(waypoint)) {
            return chat('You do not have a waypoint set on the map.', 'error');
        }
        const [x, y] = GetBlipInfoIdCoord(waypoint);
        DoScreenFadeOut(200);
        await clientDelay(250);
        const ground = await getGroundAtWaypoint(x, y);
        const z = ground !== null ? ground + 1.0 : 100.0;
        const ped = PlayerPedId();
        const vehicle = GetVehiclePedIsIn(ped, false);
        const target = vehicle !== 0 && GetPedInVehicleSeat(vehicle, -1) === ped ? vehicle : ped;
        RequestCollisionAtCoord(x, y, z);
        SetEntityCoordsNoOffset(target, x, y, z, false, false, false);
        SetEntityVelocity(target, 0.0, 0.0, 0.0);
        await clientDelay(250);
        DoScreenFadeIn(250);
        chat(ground !== null ? 'Teleported to waypoint.' : 'Teleported to waypoint; exact ground level was not found.', ground !== null ? 'success' : 'info');
    })().catch((error) => {
        console.error(error);
        ClearFocus();
        DoScreenFadeIn(250);
        chat('Waypoint teleport failed.', 'error');
    });
});
function getControllableEntity() {
    const ped = PlayerPedId();
    const vehicle = GetVehiclePedIsIn(ped, false);
    if (vehicle !== 0 && DoesEntityExist(vehicle) && GetPedInVehicleSeat(vehicle, -1) === ped)
        return vehicle;
    return ped;
}
async function requestEntityControl(entity, timeoutMs = 1500) {
    if (!entity || !DoesEntityExist(entity))
        return false;
    const started = Date.now();
    while (!NetworkHasControlOfEntity(entity) && Date.now() - started < timeoutMs) {
        NetworkRequestControlOfEntity(entity);
        await clientDelay(0);
    }
    return NetworkHasControlOfEntity(entity);
}
onNet('rumble:admin:teleport', (position) => {
    var _a;
    if (!position)
        return;
    const values = [Number(position.x), Number(position.y), Number(position.z), Number((_a = position.heading) !== null && _a !== void 0 ? _a : 0)];
    if (values.some((value) => !Number.isFinite(value)))
        return;
    const entity = getControllableEntity();
    RequestCollisionAtCoord(values[0], values[1], values[2]);
    SetEntityCoordsNoOffset(entity, values[0], values[1], values[2], false, false, false);
    SetEntityHeading(entity, values[3]);
    SetEntityVelocity(entity, 0.0, 0.0, 0.0);
});
onNet('rumble:admin:freeze', (enabled) => {
    const entity = getControllableEntity();
    FreezeEntityPosition(entity, Boolean(enabled));
    chat(Boolean(enabled) ? 'You were frozen by an administrator.' : 'Freeze disabled.', 'info');
});
onNet('rumble:admin:spawnVehicle', (modelName) => {
    void (async () => {
        const normalized = String(modelName !== null && modelName !== void 0 ? modelName : '').trim().toLowerCase();
        if (!/^[a-z0-9_-]{1,64}$/.test(normalized))
            return chat('Invalid vehicle model.', 'error');
        const model = GetHashKey(normalized);
        if (!IsModelInCdimage(model) || !IsModelAVehicle(model))
            return chat('The model is not a valid vehicle.', 'error');
        RequestModel(model);
        const started = Date.now();
        while (!HasModelLoaded(model)) {
            if (Date.now() - started > 10000)
                return chat('The vehicle model failed to load.', 'error');
            await clientDelay(0);
        }
        const ped = PlayerPedId();
        const [x, y, z] = GetEntityCoords(ped, false);
        const heading = GetEntityHeading(ped);
        const vehicle = CreateVehicle(model, x, y, z + 0.5, heading, true, true);
        if (!vehicle || !DoesEntityExist(vehicle))
            return chat('The vehicle could not be created.', 'error');
        SetEntityAsMissionEntity(vehicle, true, true);
        SetVehicleOnGroundProperly(vehicle);
        SetPedIntoVehicle(ped, vehicle, -1);
        SetModelAsNoLongerNeeded(model);
        chat(`Vehicle created: ${normalized}.`, 'success');
    })().catch((error) => chat(`Vehicle spawn error: ${String(error)}`, 'error'));
});
onNet('rumble:admin:deleteVehicle', (radiusInput) => {
    void (async () => {
        const ped = PlayerPedId();
        let vehicle = GetVehiclePedIsIn(ped, false);
        if (!vehicle) {
            const [x, y, z] = GetEntityCoords(ped, false);
            const radius = Math.max(1, Math.min(100, Number(radiusInput) || 5));
            vehicle = GetClosestVehicle(x, y, z, radius, 0, 70);
        }
        if (!vehicle || !DoesEntityExist(vehicle))
            return chat('There is no vehicle nearby.', 'error');
        if (!await requestEntityControl(vehicle))
            return chat('Could not obtain control of the vehicle.', 'error');
        SetEntityAsMissionEntity(vehicle, true, true);
        DeleteEntity(vehicle);
        chat('Vehicle deleted.', 'success');
    })();
});
let spectatingServerId = 0;
onNet('rumble:admin:spectate', (targetServerId) => {
    const target = Number(targetServerId);
    if (!Number.isInteger(target) || target <= 0) {
        NetworkSetInSpectatorMode(false, PlayerPedId());
        spectatingServerId = 0;
        chat('Spectate disabled.', 'info');
        return;
    }
    const player = GetPlayerFromServerId(target);
    if (player < 0)
        return chat('The player is not in scope.', 'error');
    const ped = GetPlayerPed(player);
    if (!ped || !DoesEntityExist(ped))
        return chat("The player's ped is not available.", 'error');
    NetworkSetInSpectatorMode(true, ped);
    spectatingServerId = target;
    chat(`Spectate enabled for ID ${target}.`, 'success');
});
onNet('rumble:admin:inspectEntity', () => {
    const [cx, cy, cz] = GetGameplayCamCoord();
    const { forward } = directionFromCamera();
    const distance = 15.0;
    const ray = StartShapeTestRay(cx, cy, cz, cx + forward[0] * distance, cy + forward[1] * distance, cz + forward[2] * distance, -1, PlayerPedId(), 0);
    const [, hit, endCoords, , entity] = GetShapeTestResult(ray);
    if (!hit || !entity || !DoesEntityExist(entity))
        return chat('There is no entity in front of you.', 'error');
    const model = GetEntityModel(entity);
    const type = GetEntityType(entity);
    const networkId = NetworkGetNetworkIdFromEntity(entity);
    const [x, y, z] = endCoords;
    chat(`Entity ${entity} | type ${type} | model ${model} | net ${networkId} | ${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}`, 'info');
});
onNet('rumble:admin:vehicleInfo', () => {
    const ped = PlayerPedId();
    const vehicle = GetVehiclePedIsIn(ped, false);
    if (!vehicle || !DoesEntityExist(vehicle))
        return chat('You are not in a vehicle.', 'error');
    const model = GetEntityModel(vehicle);
    const plate = GetVehicleNumberPlateText(vehicle).trim();
    const engine = GetVehicleEngineHealth(vehicle);
    const body = GetVehicleBodyHealth(vehicle);
    const fuel = GetVehicleFuelLevel(vehicle);
    chat(`Model ${model} | plate ${plate} | engine ${engine.toFixed(1)} | body ${body.toFixed(1)} | fuel ${fuel.toFixed(1)}`, 'info');
});
async function serverCallback(name, payload, timeoutMs = 10000) {
    return await rpcCall(name, payload, timeoutMs);
}
on('onClientResourceStart', (resourceName) => {
    if (resourceName !== GetCurrentResourceName())
        return;
    void ensureMultiplayerPlayerModel(true).catch((error) => {
        console.error('[RUMBLE][CLIENT][MODEL] Initial multiplayer ped setup failed', error);
    });
    setTimeout(() => {
        emit('chat:addSuggestion', '/ara', 'Revive all players within 10m, including yourself.');
        emit('chat:addSuggestion', '/fly', 'Enable/disable fly/noclip.');
        emit('chat:addSuggestion', '/gotow', 'Teleport to the waypoint set on the map.');
        emit('chat:addSuggestion', '/tp', 'Teleport la coordonate.', [
            { name: 'x', help: 'Coordonata X' },
            { name: 'y', help: 'Coordonata Y' },
            { name: 'z', help: 'Coordonata Z' },
            { name: 'heading', help: 'Optional heading' },
        ]);
        emit('chat:addSuggestion', '/bring', 'Bring a player to you.', [{ name: 'id', help: 'Permanent ID' }]);
        emit('chat:addSuggestion', '/goto', 'Teleport to a player.', [{ name: 'id', help: 'Permanent ID' }]);
        emit('chat:addSuggestion', '/coords', 'Show current coordinates.');
        emit('chat:addSuggestion', '/heading', 'Show current heading.');
        emit('chat:addSuggestion', '/pos', 'Show position as vector4.');
        emit('chat:addSuggestion', '/vehicle', 'Spawn a vehicle.', [{ name: 'model', help: 'Model GTA' }]);
        emit('chat:addSuggestion', '/dv', 'Delete the current or a nearby vehicle.', [{ name: 'radius', help: '1-100, default 5' }]);
        emit('chat:addSuggestion', '/freeze', 'Freeze/unfreeze a player.', [{ name: 'id', help: 'Permanent ID' }]);
        emit('chat:addSuggestion', '/heal', 'Heal yourself or another player.', [{ name: 'id', help: 'Optional permanent ID' }]);
        emit('chat:addSuggestion', '/revive', 'Revive yourself or another player.', [{ name: 'id', help: 'Optional permanent ID' }]);
        emit('chat:addSuggestion', '/spectate', 'Spectate a player or turn spectate off.', [{ name: 'id/off', help: 'Permanent ID or off' }]);
        emit('chat:addSuggestion', '/entity', 'Inspect the entity in front of the camera.');
        emit('chat:addSuggestion', '/vehinfo', 'Show information about the current vehicle.');
        emit('chat:addSuggestion', '/creator', 'Open the character creator (admin).');
        emit('chat:addSuggestion', '/healthcheck', 'Run the core health check.');
        emit('chat:addSuggestion', '/id', "Show the permanent player ID and the character's State ID.");
        emit('chat:addSuggestion', '/money', 'Show cash and card balance.');
        emit('chat:addSuggestion', '/cash', 'Show cash balance.');
        emit('chat:addSuggestion', '/card', 'Show card balance.');
        emit('chat:addSuggestion', '/stats', 'Show hunger, thirst, health, and armor.');
        emit('chat:addSuggestion', '/fullstats', 'Restore hunger, thirst, health, and armor to maximum.');
        emit('chat:addSuggestion', '/hunger', 'Set hunger to 100%.');
        emit('chat:addSuggestion', '/water', 'Set thirst to 100%.');
        emit('chat:addSuggestion', '/health', 'Set health to maximum.');
        emit('chat:addSuggestion', '/armor', 'Set armor to 100%.');
        emit('chat:addSuggestion', '/chars', 'List your characters.');
        emit('chat:addSuggestion', '/newchar', 'Create and select a character.', [
            { name: 'firstName', help: 'First name' },
            { name: 'lastName', help: 'Last name' },
            { name: 'data', help: 'YYYY-MM-DD' },
        ]);
        emit('chat:addSuggestion', '/switchchar', 'Switch character using the ID from /chars.', [
            { name: 'stateId', help: 'Character State ID' },
        ]);
        emit('chat:addSuggestion', '/characters', 'Open the character selector.');
        emit('chat:addSuggestion', '/inv', 'List inventory in chat.');
        emit('chat:addSuggestion', '/use', 'Use an item.', [{ name: 'item', help: 'water, sandwich, medkit, armor' }]);
        emit('chat:addSuggestion', '/giveitem', 'Add an item to a player.');
        emit('chat:addSuggestion', '/vehicles', 'List owned vehicles.');
        emit('chat:addSuggestion', '/addvehicle', 'Add an owned vehicle to a player.');
        emit('chat:addSuggestion', '/respawn', 'Respawn at the hospital when dead.');
        emit('chat:addSuggestion', '/setfaction', 'Set a player faction.', [
            { name: 'id', help: 'Permanent player ID' },
            { name: 'faction', help: 'police, medics or none' },
            { name: 'grade', help: '0-5' },
        ]);
        emitNet('rumble:player:requestLoad');
    }, 1000);
});
on('onClientResourceStop', (resourceName) => {
    if (resourceName !== GetCurrentResourceName())
        return;
    stopFly();
    characterSceneToken++;
    destroyCharacterCinematic(true);
    ClearFocus();
    const ped = PlayerPedId();
    if (DoesEntityExist(ped)) {
        ResetEntityAlpha(ped);
        SetEntityVisible(ped, true, false);
        SetEntityInvincible(ped, false);
        SetEntityCollision(ped, true, true);
        FreezeEntityPosition(ped, false);
    }
    if (spectatingServerId)
        NetworkSetInSpectatorMode(false, ped);
    spectatingServerId = 0;
    closeRegistration();
    closeSelector();
    closeSpawn();
    closeAppearanceCreator(true);
    for (const pending of rpcPending.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error('Rumble resource stopped.'));
    }
    rpcPending.clear();
});
exports('GetPlayerData', () => playerData ? JSON.parse(JSON.stringify(playerData)) : null);
exports('GetInventory', () => JSON.parse(JSON.stringify(inventoryState)));
exports('IsLoaded', () => loaded);
exports('Rpc', async (name, payload, timeoutMs) => await rpcCall(String(name), payload !== null && payload !== void 0 ? payload : null, Number(timeoutMs !== null && timeoutMs !== void 0 ? timeoutMs : 10000)));
exports('Callback', async (name, payload, timeoutMs) => await serverCallback(name, payload !== null && payload !== void 0 ? payload : null, Number(timeoutMs !== null && timeoutMs !== void 0 ? timeoutMs : 10000)));
console.log('[rumble] Client script loaded.');
