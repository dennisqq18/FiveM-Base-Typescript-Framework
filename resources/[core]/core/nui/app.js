const h = React.createElement;
const { useEffect, useMemo, useRef, useState } = React;
const LANG = String(document.documentElement.lang || 'ro').toLowerCase().startsWith('en') ? 'en' : 'ro';

const TEXT = {
  ro: {
    save: 'SALVEAZĂ ȘI CONTINUĂ', saving: 'SE SALVEAZĂ...', continue: 'CONTINUĂ', firstName: 'Prenume', lastName: 'Nume', dob: 'Data nașterii',
    createCharacter: 'Creează caracterul', completeCharacter: 'Completează caracterul', completeIdentity: 'Completează identitatea', creator: 'Creare caracter',
    serverValidated: 'Datele sunt validate și salvate server-side.', invalidFirst: 'Prenumele trebuie să aibă între 2 și 24 de litere.', invalidLast: 'Numele trebuie să aibă între 2 și 24 de litere.', invalidDob: 'Introdu o dată de naștere validă.', minAge: (v) => `Trebuie să ai cel puțin ${v} ani.`, clientError: 'Nu am putut comunica cu clientul FiveM.', requestError: 'Cererea nu a putut fi trimisă.',
    permanentId: 'ID PERMANENT', usedSlots: 'sloturi folosite', yourCharacter: 'PERSONAJUL TĂU', chooseCharacter: 'Alege un caracter', chooseHelp: 'Selectează profilul cu care vrei să intri pe server.', newCharacter: 'Caracter nou', lastUsed: 'ULTIMUL FOLOSIT', birthDate: 'Data nașterii', empty: 'Nu există caractere create.', processing: 'Se procesează...', selectContinue: 'Apasă pe un caracter pentru a continua', incomplete: 'Profil incomplet',
    spawnManager: 'Spawn manager', hospitalRespawn: 'Respawn la spital', chooseLocation: 'Alege locația', hospitalHelp: 'Caracterul este în stare dead și trebuie să revină la spital.', spawnHelp: 'Poți reveni la ultima poziție sau alege una dintre locațiile de bază.', savedDb: 'Poziția salvată în baza de date', rumbleSpawn: 'Spawn Rumble', locationError: 'Locația nu poate fi folosită.',
    appearanceTitle: 'Character Creator', appearanceSubtitle: 'Aspect permanent per caracter', appearanceHelp: 'Configurează modelul freemode, fizionomia, părul, hainele și tatuajele. Previzualizarea este live.',
    tabs: { base: 'Bază', face: 'Față', hair: 'Păr', clothes: 'Haine', tattoos: 'Tatuaje' }, male: 'Masculin', female: 'Feminin',
    faceCam: 'Față', bodyCam: 'Corp', rotateLeft: '↺ Rotire', rotateRight: 'Rotire ↻', parents: 'Părinți / face blend', mother: 'Părinte 1', father: 'Părinte 2', faceMix: 'Mix formă', skinMix: 'Mix piele', eyeColor: 'Culoare ochi',
    hairStyle: 'Tunsoare', hairTexture: 'Textură păr', hairColor: 'Culoare păr', hairHighlight: 'Șuvițe', beard: 'Barbă', beardOpacity: 'Opacitate barbă', beardColor: 'Culoare barbă', eyebrows: 'Sprâncene', eyebrowsOpacity: 'Opacitate sprâncene', eyebrowsColor: 'Culoare sprâncene', none: 'Fără',
    clothesHelp: 'Valorile sunt citite direct de pe modelul GTA curent, astfel încât creatorul nu trimite drawable-uri inexistente.', tattoosHelp: 'Poți selecta maximum 12 tatuaje. Tatuajele indisponibile pentru sexul ales sunt dezactivate.', appearanceError: 'Nu am putut salva aspectul.',
    drawable: 'Model', texture: 'Textură', fly: [['W','Înainte'],['S','Înapoi'],['A','Stânga'],['D','Dreapta'],['SPACE','Sus'],['Q','Jos'],['SHIFT','Rapid'],['CTRL','Fin'],['SCROLL','Viteză'],['/fly','ON / OFF']]
  },
  en: {
    save: 'SAVE & CONTINUE', saving: 'SAVING...', continue: 'CONTINUE', firstName: 'First name', lastName: 'Last name', dob: 'Date of birth',
    createCharacter: 'Create character', completeCharacter: 'Complete character', completeIdentity: 'Complete identity', creator: 'Character creation',
    serverValidated: 'Data is validated and saved server-side.', invalidFirst: 'First name must contain 2 to 24 letters.', invalidLast: 'Last name must contain 2 to 24 letters.', invalidDob: 'Enter a valid date of birth.', minAge: (v) => `You must be at least ${v} years old.`, clientError: 'Could not communicate with the FiveM client.', requestError: 'The request could not be sent.',
    permanentId: 'PERMANENT ID', usedSlots: 'slots used', yourCharacter: 'YOUR CHARACTER', chooseCharacter: 'Choose a character', chooseHelp: 'Select the profile you want to use on the server.', newCharacter: 'New character', lastUsed: 'LAST USED', birthDate: 'Date of birth', empty: 'No characters created.', processing: 'Processing...', selectContinue: 'Click a character to continue', incomplete: 'Incomplete profile',
    spawnManager: 'Spawn manager', hospitalRespawn: 'Hospital respawn', chooseLocation: 'Choose location', hospitalHelp: 'The character is dead and must return at the hospital.', spawnHelp: 'Return to your last position or choose one of the base locations.', savedDb: 'Position saved in the database', rumbleSpawn: 'Rumble spawn', locationError: 'This location cannot be used.',
    appearanceTitle: 'Character Creator', appearanceSubtitle: 'Permanent per-character appearance', appearanceHelp: 'Configure the freemode model, facial structure, hair, clothing and tattoos with live preview.',
    tabs: { base: 'Base', face: 'Face', hair: 'Hair', clothes: 'Clothing', tattoos: 'Tattoos' }, male: 'Male', female: 'Female',
    faceCam: 'Face', bodyCam: 'Body', rotateLeft: '↺ Rotate', rotateRight: 'Rotate ↻', parents: 'Parents / face blend', mother: 'Parent 1', father: 'Parent 2', faceMix: 'Shape mix', skinMix: 'Skin mix', eyeColor: 'Eye color',
    hairStyle: 'Hair style', hairTexture: 'Hair texture', hairColor: 'Hair color', hairHighlight: 'Highlight', beard: 'Beard', beardOpacity: 'Beard opacity', beardColor: 'Beard color', eyebrows: 'Eyebrows', eyebrowsOpacity: 'Eyebrow opacity', eyebrowsColor: 'Eyebrow color', none: 'None',
    clothesHelp: 'Limits are read directly from the current GTA model, preventing invalid drawable selections.', tattoosHelp: 'You can select up to 12 tattoos. Tattoos unavailable for the selected sex are disabled.', appearanceError: 'Could not save the appearance.',
    drawable: 'Drawable', texture: 'Texture', fly: [['W','Forward'],['S','Back'],['A','Left'],['D','Right'],['SPACE','Up'],['Q','Down'],['SHIFT','Fast'],['CTRL','Fine'],['SCROLL','Speed'],['/fly','ON / OFF']]
  }
};
const T = TEXT[LANG];

function nuiPost(endpoint, payload) {
  return fetch(`https://${GetParentResourceName()}/${endpoint}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json; charset=UTF-8' }, body: JSON.stringify(payload)
  }).then((response) => response.json());
}

function Brand({ subtitle }) {
  return h('div', { className: 'brand-row' }, h('div', { className: 'brand-mark' }, 'R'), h('div', { className: 'brand-copy' }, h('strong', null, 'RUMBLE'), h('span', null, subtitle)));
}

function Registration({ active, serverError, profile }) {
  const [firstName, setFirstName] = useState(''); const [lastName, setLastName] = useState(''); const [dateOfBirth, setDateOfBirth] = useState(''); const [localError, setLocalError] = useState(''); const [submitting, setSubmitting] = useState(false);
  const minimumAge = Math.max(18, Number(profile?.minimumAge || 18));
  const maxDate = useMemo(() => { const now = new Date(); const cutoff = new Date(Date.UTC(now.getUTCFullYear() - minimumAge, now.getUTCMonth(), now.getUTCDate())); return cutoff.toISOString().slice(0, 10); }, [minimumAge]);
  useEffect(() => { if (serverError) { setLocalError(serverError); setSubmitting(false); } }, [serverError]);
  useEffect(() => { if (!active) { setSubmitting(false); setLocalError(''); return; } setFirstName(String(profile?.firstName || '')); setLastName(String(profile?.lastName || '')); setDateOfBirth(''); }, [active, profile]);
  if (!active) return null;
  function submit(event) {
    event.preventDefault(); const first = firstName.trim(); const last = lastName.trim(); const namePattern = /^[\p{L}'-]{2,24}$/u;
    if (!namePattern.test(first)) return setLocalError(T.invalidFirst); if (!namePattern.test(last)) return setLocalError(T.invalidLast);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) || dateOfBirth < '1900-01-01') return setLocalError(T.invalidDob); if (dateOfBirth > maxDate) return setLocalError(T.minAge(minimumAge));
    setLocalError(''); setSubmitting(true); nuiPost('characterCreate', { firstName: first, lastName: last, dateOfBirth }).then((result) => { if (!result?.accepted) { setLocalError(T.requestError); setSubmitting(false); } }).catch(() => { setLocalError(T.clientError); setSubmitting(false); });
  }
  return h('main', { className: 'screen-overlay' }, h('form', { className: 'panel registration-card', onSubmit: submit }, h(Brand, { subtitle: profile?.mode === 'complete' ? T.completeIdentity : T.creator }), h('h1', null, profile?.mode === 'complete' ? T.completeCharacter : T.createCharacter), h('p', null, T.serverValidated), h('div', { className: 'form-grid' },
    h('div', { className: 'field' }, h('label', { htmlFor: 'firstName' }, T.firstName), h('input', { id: 'firstName', type: 'text', value: firstName, maxLength: 24, autoComplete: 'off', autoFocus: true, disabled: submitting, onChange: (e) => setFirstName(e.target.value) })),
    h('div', { className: 'field' }, h('label', { htmlFor: 'lastName' }, T.lastName), h('input', { id: 'lastName', type: 'text', value: lastName, maxLength: 24, autoComplete: 'off', disabled: submitting, onChange: (e) => setLastName(e.target.value) })),
    h('div', { className: 'field full' }, h('label', { htmlFor: 'dateOfBirth' }, T.dob), h('input', { id: 'dateOfBirth', type: 'date', value: dateOfBirth, min: '1900-01-01', max: maxDate, disabled: submitting, onChange: (e) => setDateOfBirth(e.target.value) }))
  ), h('div', { className: 'form-error', role: 'alert' }, localError), h('button', { className: 'primary-button', type: 'submit', disabled: submitting }, submitting ? T.saving : T.continue)));
}

function formatDate(value) { const text = String(value || ''); const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/); if (!match) return T.incomplete; return LANG === 'en' ? `${match[2]}/${match[3]}/${match[1]}` : `${match[3]}.${match[2]}.${match[1]}`; }

function CharacterSelector({ active, data, serverError }) {
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState('');
  const characters = Array.isArray(data?.characters) ? data.characters : [];
  const maxCharacters = Number(data?.maxCharacters || 1);
  const playerId = Number(data?.playerId || 0);

  useEffect(() => {
    if (!active) {
      setBusy(false);
      setLocalError('');
      return;
    }
    if (serverError) {
      setLocalError(serverError);
      setBusy(false);
    }
  }, [active, serverError]);

  if (!active) return null;

  function selectCharacter(id) {
    if (busy) return;
    setBusy(true);
    setLocalError('');
    nuiPost('characterSelect', { id })
      .then((result) => {
        if (!result?.accepted) {
          setBusy(false);
          setLocalError(T.requestError);
        }
      })
      .catch(() => {
        setBusy(false);
        setLocalError(T.clientError);
      });
  }

  function createCharacter() {
    if (busy || characters.length >= maxCharacters) return;
    setBusy(true);
    nuiPost('characterNew', {})
      .then((result) => {
        if (!result?.accepted) {
          setBusy(false);
          setLocalError(T.requestError);
        }
      })
      .catch(() => {
        setBusy(false);
        setLocalError(T.clientError);
      });
  }

  const characterRows = characters.map((character) =>
    h(
      'button',
      {
        className: `character-row${character.active ? ' active' : ''}${!character.dateOfBirth ? ' incomplete' : ''}`,
        key: character.id,
        disabled: busy,
        onClick: () => selectCharacter(character.id),
      },
      h(
        'div',
        { className: 'character-avatar' },
        h('span', null, String(character.firstName || '?').slice(0, 1).toUpperCase()),
        h('small', null, `#${Number(character.slot || 0)}`),
      ),
      h(
        'div',
        { className: 'character-main' },
        h(
          'div',
          { className: 'character-name-line' },
          h('strong', null, `${character.firstName} ${character.lastName}`),
          character.active ? h('span', { className: 'active-badge' }, T.lastUsed) : null,
        ),
        h(
          'div',
          { className: 'character-meta' },
          h('span', { className: 'state-id' }, `State ID #${Number(character.stateId || character.id || 0)}`),
          h('span', null, `${T.birthDate}: ${formatDate(character.dateOfBirth)}`),
          h('span', null, character.citizenId),
        ),
      ),
      h(
        'div',
        { className: 'character-money' },
        h('div', { className: 'money-line' }, h('span', null, 'Cash'), h('strong', null, `$${Number(character.cash || 0).toLocaleString()}`)),
        h('div', { className: 'money-line' }, h('span', null, 'Card'), h('strong', null, `$${Number(character.card || 0).toLocaleString()}`)),
      ),
      h('div', { className: 'character-arrow' }, '›'),
    ),
  );

  return h(
    'main',
    { className: 'screen-overlay selector-overlay' },
    h(
      'section',
      { className: 'panel selector-card' },
      h('div', { className: 'panel-accent' }),
      h(
        'div',
        { className: 'selector-top' },
        h(Brand, { subtitle: 'Character System' }),
        h(
          'div',
          { className: 'selector-stats' },
          h('div', { className: 'account-id' }, h('span', null, T.permanentId), h('strong', null, playerId > 0 ? `#${playerId}` : '—')),
          h('div', { className: 'slot-counter' }, h('strong', null, `${characters.length}/${maxCharacters}`), h('span', null, T.usedSlots)),
        ),
      ),
      h(
        'div',
        { className: 'section-head' },
        h('div', null, h('span', { className: 'eyebrow' }, T.yourCharacter), h('h1', null, T.chooseCharacter), h('p', null, T.chooseHelp)),
        h(
          'button',
          { className: 'secondary-button', disabled: busy || characters.length >= maxCharacters, onClick: createCharacter },
          h('span', { className: 'button-plus' }, '+'),
          T.newCharacter,
        ),
      ),
      h('div', { className: 'character-list' }, characterRows),
      characters.length === 0 ? h('div', { className: 'empty-state' }, T.empty) : null,
      h('div', { className: 'selector-footer' }, h('span', null, 'Rumble Studios'), h('span', null, busy ? T.processing : T.selectContinue)),
      h('div', { className: 'form-error', role: 'alert' }, localError),
    ),
  );
}

function SpawnSelector({ active, data }) {
  const [busy, setBusy] = useState(false); const [localError, setLocalError] = useState(''); const spawns = Array.isArray(data?.spawns) ? data.spawns : []; const forcedHospital = Boolean(data?.forcedHospital);
  useEffect(() => { if (!active) { setBusy(false); setLocalError(''); } }, [active]); if (!active) return null;
  function choose(spawn) { if (busy || (forcedHospital && spawn.id !== 'hospital')) return; setBusy(true); nuiPost('spawnSelect', { id: spawn.id }).then((r) => { if (!r?.accepted) { setBusy(false); setLocalError(T.locationError); } }).catch(() => { setBusy(false); setLocalError(T.clientError); }); }
  return h('main', { className: 'screen-overlay' }, h('section', { className: 'panel spawn-card' }, h(Brand, { subtitle: T.spawnManager }), h('h1', null, forcedHospital ? T.hospitalRespawn : T.chooseLocation), h('p', null, forcedHospital ? T.hospitalHelp : T.spawnHelp), h('div', { className: 'spawn-grid' }, spawns.map((spawn) => h('button', { key: spawn.id, className: 'spawn-option', disabled: busy || (forcedHospital && spawn.id !== 'hospital'), onClick: () => choose(spawn) }, h('strong', null, spawn.label || spawn.id), h('span', null, spawn.id === 'last' ? T.savedDb : T.rumbleSpawn)))), h('div', { className: 'form-error', role: 'alert' }, localError)));
}

const FACE_LABELS = LANG === 'en'
  ? ['Nose width','Nose peak height','Nose peak length','Nose bone height','Nose peak lower','Nose bone twist','Eyebrow height','Eyebrow depth','Cheekbone height','Cheekbone width','Cheeks width','Eye opening','Lip thickness','Jaw width','Jaw shape','Chin height','Chin length','Chin width','Chin indent','Neck width']
  : ['Lățime nas','Înălțime vârf nas','Lungime vârf nas','Înălțime os nazal','Coborâre vârf nas','Rotație nas','Înălțime sprâncene','Adâncime sprâncene','Înălțime pomeți','Lățime pomeți','Lățime obraji','Deschidere ochi','Grosime buze','Lățime maxilar','Formă maxilar','Înălțime bărbie','Lungime bărbie','Lățime bărbie','Adâncime bărbie','Lățime gât'];
const CLOTH_LABELS = LANG === 'en' ? { mask:'Mask',arms:'Arms',pants:'Pants',bag:'Bag',shoes:'Shoes',accessory:'Accessory',undershirt:'Undershirt',armor:'Vest / armor',decals:'Decals',torso:'Top / jacket' } : { mask:'Mască',arms:'Brațe',pants:'Pantaloni',bag:'Geantă',shoes:'Încălțăminte',accessory:'Accesoriu',undershirt:'Tricou interior',armor:'Vestă / armură',decals:'Decaluri',torso:'Bluză / geacă' };
const PROP_LABELS = LANG === 'en' ? { hat:'Hat',glasses:'Glasses',ears:'Ear accessory',watch:'Watch',bracelet:'Bracelet' } : { hat:'Pălărie / șapcă',glasses:'Ochelari',ears:'Accesoriu urechi',watch:'Ceas',bracelet:'Brățară' };

function RangeField({ label, value, min, max, step = 1, onChange, valueLabel }) {
  const safeMax = Math.max(min, Number(max));
  return h('div', { className: 'creator-range' }, h('div', { className: 'creator-range-head' }, h('span', null, label), h('strong', null, valueLabel ?? (Number.isInteger(step) ? Number(value) : Number(value).toFixed(2)))), h('input', { type:'range', min, max:safeMax, step, value:Math.max(min, Math.min(safeMax, Number(value))), onChange:(e)=>onChange(Number(e.target.value)) }));
}

function AppearanceCreator({ active, data, serverError }) {
  const [appearance, setAppearance] = useState(null); const [options, setOptions] = useState({}); const [tattoos, setTattoos] = useState([]); const [tab, setTab] = useState('base'); const [submitting, setSubmitting] = useState(false); const [localError, setLocalError] = useState(''); const previewTimer = useRef(null);
  useEffect(() => { if (!active) { setSubmitting(false); setLocalError(''); if (previewTimer.current) clearTimeout(previewTimer.current); return; } setTab('base'); }, [active]);
  useEffect(() => { if (!active) return; setAppearance(data?.appearance || null); setOptions(data?.options || {}); setTattoos(Array.isArray(data?.tattoos) ? data.tattoos : []); }, [active, data]);
  useEffect(() => { if (serverError) { setLocalError(serverError); setSubmitting(false); } }, [serverError]);
  if (!active || !appearance) return null;
  const queuePreview = (next, immediate = false) => { setAppearance(next); if (previewTimer.current) clearTimeout(previewTimer.current); const send = () => nuiPost('appearancePreview', { appearance: next }).catch(() => setLocalError(T.clientError)); if (immediate) send(); else previewTimer.current = setTimeout(send, 55); };
  const change = (path, value, immediate = false) => { const next = JSON.parse(JSON.stringify(appearance)); let target = next; for (let i=0;i<path.length-1;i++) target = target[path[i]]; target[path[path.length-1]] = value; queuePreview(next, immediate); };
  const changeParent = (side, value) => { const next = JSON.parse(JSON.stringify(appearance)); if (side === 'mother') { next.parents.shapeFirst = value; next.parents.skinFirst = value; } else { next.parents.shapeSecond = value; next.parents.skinSecond = value; } queuePreview(next); };
  const camera = (action) => nuiPost('appearanceCamera', { action }).catch(()=>{});
  const save = () => { if (submitting) return; setSubmitting(true); setLocalError(''); nuiPost('appearanceSave', { appearance }).then((r) => { if (!r?.accepted) { setSubmitting(false); setLocalError(T.appearanceError); } }).catch(() => { setSubmitting(false); setLocalError(T.clientError); }); };
  const maxDraw = (kind,key,allowNone=false) => { const count = Number(options?.[kind]?.[key]?.drawables || 1); return allowNone ? Math.max(-1,count-1) : Math.max(0,count-1); };
  const maxTex = (kind,key) => Math.max(0, Number(options?.[kind]?.[key]?.textures || 1)-1);
  const tattooSet = new Set(appearance.tattoos || []);
  const toggleTattoo = (id) => { const next = JSON.parse(JSON.stringify(appearance)); const list = Array.isArray(next.tattoos) ? next.tattoos : []; const i=list.indexOf(id); if (i>=0) list.splice(i,1); else if (list.length<12) list.push(id); next.tattoos=list; queuePreview(next,true); };

  let content = null;
  if (tab === 'base') content = h(React.Fragment,null,
    h('div',{className:'creator-section-title'},T.parents),
    h('div',{className:'creator-sex-row'}, h('button',{className:`creator-choice${appearance.sex==='male'?' selected':''}`,onClick:()=>change(['sex'],'male',true)},T.male), h('button',{className:`creator-choice${appearance.sex==='female'?' selected':''}`,onClick:()=>change(['sex'],'female',true)},T.female)),
    h(RangeField,{label:T.mother,value:appearance.parents.shapeFirst,min:0,max:45,onChange:(v)=>changeParent('mother',v)}), h(RangeField,{label:T.father,value:appearance.parents.shapeSecond,min:0,max:45,onChange:(v)=>changeParent('father',v)}), h(RangeField,{label:T.faceMix,value:appearance.parents.shapeMix,min:0,max:1,step:.01,onChange:(v)=>change(['parents','shapeMix'],v)}), h(RangeField,{label:T.skinMix,value:appearance.parents.skinMix,min:0,max:1,step:.01,onChange:(v)=>change(['parents','skinMix'],v)}), h(RangeField,{label:T.eyeColor,value:appearance.eyeColor,min:0,max:31,onChange:(v)=>change(['eyeColor'],v)})
  );
  if (tab === 'face') content = h('div',{className:'creator-feature-list'}, FACE_LABELS.map((label,index)=>h(RangeField,{key:index,label,value:appearance.faceFeatures[index]||0,min:-1,max:1,step:.01,onChange:(v)=>{const next=JSON.parse(JSON.stringify(appearance));next.faceFeatures[index]=v;queuePreview(next);}})));
  if (tab === 'hair') content = h(React.Fragment,null,
    h(RangeField,{label:T.hairStyle,value:appearance.hair.style,min:0,max:Math.max(0,Number(options?.hair?.drawables||1)-1),onChange:(v)=>change(['hair','style'],v,true)}), h(RangeField,{label:T.hairTexture,value:appearance.hair.texture,min:0,max:Math.max(0,Number(options?.hair?.textures||1)-1),onChange:(v)=>change(['hair','texture'],v)}), h(RangeField,{label:T.hairColor,value:appearance.hair.color,min:0,max:63,onChange:(v)=>change(['hair','color'],v)}), h(RangeField,{label:T.hairHighlight,value:appearance.hair.highlight,min:0,max:63,onChange:(v)=>change(['hair','highlight'],v)}),
    h(RangeField,{label:T.beard,value:appearance.beard.style,min:-1,max:28,onChange:(v)=>change(['beard','style'],v),valueLabel:appearance.beard.style<0?T.none:appearance.beard.style}), h(RangeField,{label:T.beardOpacity,value:appearance.beard.opacity,min:0,max:1,step:.01,onChange:(v)=>change(['beard','opacity'],v)}), h(RangeField,{label:T.beardColor,value:appearance.beard.color,min:0,max:63,onChange:(v)=>change(['beard','color'],v)}),
    h(RangeField,{label:T.eyebrows,value:appearance.eyebrows.style,min:-1,max:33,onChange:(v)=>change(['eyebrows','style'],v),valueLabel:appearance.eyebrows.style<0?T.none:appearance.eyebrows.style}), h(RangeField,{label:T.eyebrowsOpacity,value:appearance.eyebrows.opacity,min:0,max:1,step:.01,onChange:(v)=>change(['eyebrows','opacity'],v)}), h(RangeField,{label:T.eyebrowsColor,value:appearance.eyebrows.color,min:0,max:63,onChange:(v)=>change(['eyebrows','color'],v)})
  );
  if (tab === 'clothes') content = h(React.Fragment,null,h('p',{className:'creator-inline-help'},T.clothesHelp), h('div',{className:'clothes-grid'}, ...Object.keys(CLOTH_LABELS).map((key)=>h('div',{className:'clothes-card',key},h('strong',null,CLOTH_LABELS[key]),h(RangeField,{label:T.drawable,value:appearance.clothes[key].drawable,min:0,max:maxDraw('components',key),onChange:(v)=>change(['clothes',key,'drawable'],v,true)}),h(RangeField,{label:T.texture,value:appearance.clothes[key].texture,min:0,max:maxTex('components',key),onChange:(v)=>change(['clothes',key,'texture'],v)}))), ...Object.keys(PROP_LABELS).map((key)=>h('div',{className:'clothes-card prop-card',key},h('strong',null,PROP_LABELS[key]),h(RangeField,{label:T.drawable,value:appearance.props[key].drawable,min:-1,max:maxDraw('props',key,true),onChange:(v)=>change(['props',key,'drawable'],v,true),valueLabel:appearance.props[key].drawable<0?T.none:appearance.props[key].drawable}),h(RangeField,{label:T.texture,value:appearance.props[key].texture,min:0,max:maxTex('props',key),onChange:(v)=>change(['props',key,'texture'],v)})))));
  if (tab === 'tattoos') content = h(React.Fragment,null,h('p',{className:'creator-inline-help'},T.tattoosHelp),h('div',{className:'tattoo-grid'},tattoos.map((tattoo)=>h('button',{key:tattoo.id,className:`tattoo-item${tattooSet.has(tattoo.id)?' selected':''}`,disabled:!tattoo.available,onClick:()=>toggleTattoo(tattoo.id)},h('span',null,tattoo.label),h('small',null,tattoo.available?(tattooSet.has(tattoo.id)?'✓':'＋'):'—')))));

  return h('main',{className:'creator-overlay'},h('section',{className:'panel creator-panel'},h('div',{className:'panel-accent'}),h(Brand,{subtitle:T.appearanceSubtitle}),h('h1',null,T.appearanceTitle),h('p',null,T.appearanceHelp),
    h('div',{className:'creator-camera-row'},h('button',{className:'mini-button',onClick:()=>camera('face')},T.faceCam),h('button',{className:'mini-button',onClick:()=>camera('body')},T.bodyCam),h('button',{className:'mini-button',onClick:()=>camera('left')},T.rotateLeft),h('button',{className:'mini-button',onClick:()=>camera('right')},T.rotateRight)),
    h('div',{className:'creator-tabs'},Object.entries(T.tabs).map(([key,label])=>h('button',{key,className:`creator-tab${tab===key?' active':''}`,onClick:()=>setTab(key)},label))),
    h('div',{className:'creator-scroll'},content),h('div',{className:'form-error'},localError),h('button',{className:'primary-button creator-save',disabled:submitting,onClick:save},submitting?T.saving:T.save)
  ));
}

function FlyPanel({ active, speed }) { if (!active) return null; return h('section',{className:'fly-panel'},h('div',{className:'fly-header'},h('span',{className:'fly-dot'}),h('strong',null,'RUMBLE FLY'),h('span',{className:'fly-speed'},`${Number(speed||0).toFixed(1)}x`)),h('div',{className:'fly-grid'},T.fly.map(([key,label])=>h('div',{className:'fly-row',key},h('kbd',null,key),h('span',null,label))))); }

function App() {
  const [registrationActive,setRegistrationActive]=useState(false), [registrationError,setRegistrationError]=useState(''), [registrationProfile,setRegistrationProfile]=useState({mode:'create',characterId:0,firstName:'',lastName:'',minimumAge:18});
  const [selectorActive,setSelectorActive]=useState(false), [selectorData,setSelectorData]=useState({characters:[],maxCharacters:1,playerId:0}), [selectorError,setSelectorError]=useState('');
  const [spawnActive,setSpawnActive]=useState(false), [spawnData,setSpawnData]=useState({spawns:[],forcedHospital:false}); const [flyActive,setFlyActive]=useState(false), [flySpeed,setFlySpeed]=useState(4);
  const [appearanceActive,setAppearanceActive]=useState(false), [appearanceData,setAppearanceData]=useState({appearance:null,options:{},tattoos:[]}), [appearanceError,setAppearanceError]=useState('');
  useEffect(()=>{ document.documentElement.style.backgroundColor='rgba(0,0,0,0)'; document.body.style.backgroundColor='rgba(0,0,0,0)'; function receive(event){const data=event.data;if(!data||typeof data.type!=='string')return;
    if(data.type==='registration'){setRegistrationActive(Boolean(data.active));if(data.active){setRegistrationError('');setRegistrationProfile({mode:String(data.mode||'create'),characterId:Number(data.characterId||0),firstName:String(data.firstName||''),lastName:String(data.lastName||''),minimumAge:Math.max(18,Number(data.minimumAge||18))});}}
    if(data.type==='registrationError')setRegistrationError(String(data.message||T.requestError));
    if(data.type==='selector'){setSelectorActive(Boolean(data.active));if(data.active){setSelectorError('');setSelectorData({characters:Array.isArray(data.characters)?data.characters:[],maxCharacters:Number(data.maxCharacters||1),playerId:Number(data.playerId||0)});}}
    if(data.type==='selectorError')setSelectorError(String(data.message||T.requestError));
    if(data.type==='spawn'){setSpawnActive(Boolean(data.active));if(data.active)setSpawnData({spawns:Array.isArray(data.spawns)?data.spawns:[],forcedHospital:Boolean(data.forcedHospital)});}
    if(data.type==='appearance'){setAppearanceActive(Boolean(data.active));if(data.active){setAppearanceError('');setAppearanceData({appearance:data.appearance,options:data.options||{},tattoos:Array.isArray(data.tattoos)?data.tattoos:[]});}}
    if(data.type==='appearanceOptions')setAppearanceData((prev)=>({appearance:data.appearance||prev.appearance,options:data.options||prev.options,tattoos:Array.isArray(data.tattoos)?data.tattoos:prev.tattoos}));
    if(data.type==='appearanceError')setAppearanceError(String(data.message||T.appearanceError));
    if(data.type==='fly'){setFlyActive(Boolean(data.active));if(typeof data.speed==='number')setFlySpeed(data.speed);}
  } window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);},[]);
  return h(React.Fragment,null,h(Registration,{active:registrationActive,serverError:registrationError,profile:registrationProfile}),h(CharacterSelector,{active:selectorActive,data:selectorData,serverError:selectorError}),h(SpawnSelector,{active:spawnActive,data:spawnData}),h(AppearanceCreator,{active:appearanceActive,data:appearanceData,serverError:appearanceError}),h(FlyPanel,{active:flyActive,speed:flySpeed}));
}

ReactDOM.createRoot(document.getElementById('root')).render(h(App));
