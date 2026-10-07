const h = React.createElement;
const { useEffect, useMemo, useState } = React;

function nuiPost(endpoint, payload) {
  return fetch(`https://${GetParentResourceName()}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8'
    },
    body: JSON.stringify(payload)
  }).then((response) => response.json());
}

function Brand({ subtitle }) {
  return h('div', { className: 'brand-row' },
    h('div', { className: 'brand-mark' }, 'R'),
    h('div', { className: 'brand-copy' },
      h('strong', null, 'RUMBLE'),
      h('span', null, subtitle)
    )
  );
}

function Registration({ active, serverError, profile }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [localError, setLocalError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const minimumAge = Math.max(18, Number(profile?.minimumAge || 18));
  const maxDate = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(Date.UTC(now.getUTCFullYear() - minimumAge, now.getUTCMonth(), now.getUTCDate()));
    return cutoff.toISOString().slice(0, 10);
  }, [minimumAge]);

  useEffect(() => {
    if (serverError) {
      setLocalError(serverError);
      setSubmitting(false);
    }
  }, [serverError]);

  useEffect(() => {
    if (!active) {
      setSubmitting(false);
      setLocalError('');
      return;
    }
    setFirstName(String(profile?.firstName || ''));
    setLastName(String(profile?.lastName || ''));
    setDateOfBirth('');
  }, [active, profile]);

  if (!active) return null;

  function submit(event) {
    event.preventDefault();
    const first = firstName.trim();
    const last = lastName.trim();
    const namePattern = /^[\p{L}'-]{2,24}$/u;

    if (!namePattern.test(first)) {
      setLocalError('The first name must contain between 2 and 24 letters.');
      return;
    }

    if (!namePattern.test(last)) {
      setLocalError('The last name must contain between 2 and 24 letters.');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) || dateOfBirth < '1900-01-01') {
      setLocalError('Enter a valid date of birth.');
      return;
    }

    if (dateOfBirth > maxDate) {
      setLocalError(`You must be at least ${minimumAge} years old.`);
      return;
    }

    setLocalError('');
    setSubmitting(true);
    nuiPost('characterCreate', { firstName: first, lastName: last, dateOfBirth }).then((result) => {
      if (!result || result.accepted !== true) {
        setLocalError('The request could not be sent.');
        setSubmitting(false);
      }
    }).catch(() => {
      setLocalError('Could not communicate with the FiveM client.');
      setSubmitting(false);
    });
  }

  return h('main', { className: 'screen-overlay' },
    h('form', { className: 'panel registration-card', onSubmit: submit },
      h(Brand, { subtitle: profile?.mode === 'complete' ? 'Complete Identity' : 'Character Creation' }),
      h('h1', null, profile?.mode === 'complete' ? 'Complete Character' : 'Create Character'),
      h('p', null, 'Your data is validated and saved server-side.'),
      h('div', { className: 'form-grid' },
        h('div', { className: 'field' },
          h('label', { htmlFor: 'firstName' }, 'First Name'),
          h('input', {
            id: 'firstName', type: 'text', value: firstName, maxLength: 24, autoComplete: 'off', autoFocus: true,
            disabled: submitting, onChange: (event) => setFirstName(event.target.value)
          })
        ),
        h('div', { className: 'field' },
          h('label', { htmlFor: 'lastName' }, 'Last Name'),
          h('input', {
            id: 'lastName', type: 'text', value: lastName, maxLength: 24, autoComplete: 'off',
            disabled: submitting, onChange: (event) => setLastName(event.target.value)
          })
        ),
        h('div', { className: 'field full' },
          h('label', { htmlFor: 'dateOfBirth' }, 'Date of Birth'),
          h('input', {
            id: 'dateOfBirth', type: 'date', value: dateOfBirth, min: '1900-01-01', max: maxDate,
            disabled: submitting, onChange: (event) => setDateOfBirth(event.target.value)
          })
        )
      ),
      h('div', { className: 'form-error', role: 'alert' }, localError),
      h('button', { className: 'primary-button', type: 'submit', disabled: submitting }, submitting ? 'SAVING...' : 'CONTINUE')
    )
  );
}

function CharacterSelector({ active, data, serverError }) {
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState('');
  const characters = Array.isArray(data?.characters) ? data.characters : [];
  const maxCharacters = Number(data?.maxCharacters || 1);

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
    nuiPost('characterSelect', { id }).then((result) => {
      if (!result?.accepted) {
        setBusy(false);
        setLocalError('The character could not be selected.');
      }
    }).catch(() => {
      setBusy(false);
      setLocalError('Could not communicate with the FiveM client.');
    });
  }

  function createCharacter() {
    if (busy || characters.length >= maxCharacters) return;
    setBusy(true);
    nuiPost('characterNew', {}).then((result) => {
      if (!result?.accepted) {
        setBusy(false);
        setLocalError('The character creator could not be opened.');
      }
    }).catch(() => {
      setBusy(false);
      setLocalError('Could not communicate with the FiveM client.');
    });
  }

  return h('main', { className: 'screen-overlay' },
    h('section', { className: 'panel selector-card' },
      h(Brand, { subtitle: 'Character Selection' }),
      h('div', { className: 'section-head' },
        h('div', null,
          h('h1', null, 'Choose Character'),
          h('p', null, `${characters.length}/${maxCharacters} characters created`)
        ),
        h('button', { className: 'secondary-button', disabled: busy || characters.length >= maxCharacters, onClick: createCharacter }, 'NEW CHARACTER')
      ),
      h('div', { className: 'character-list' }, characters.map((character) =>
        h('button', {
          className: `character-row${character.active ? ' active' : ''}`,
          key: character.id,
          disabled: busy,
          onClick: () => selectCharacter(character.id)
        },
          h('div', { className: 'character-avatar' }, String(character.firstName || '?').slice(0, 1).toUpperCase()),
          h('div', { className: 'character-main' },
            h('strong', null, `${character.firstName} ${character.lastName}`),
            h('span', null, `${character.dateOfBirth || 'No date'} | ${character.citizenId}`)
          ),
          h('div', { className: 'character-money' },
            h('strong', null, `$${Number(character.cash || 0).toLocaleString()}`),
            h('span', null, `Card $${Number(character.card || 0).toLocaleString()}`)
          )
        )
      )),
      h('div', { className: 'form-error', role: 'alert' }, localError)
    )
  );
}

function SpawnSelector({ active, data }) {
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState('');
  const spawns = Array.isArray(data?.spawns) ? data.spawns : [];
  const forcedHospital = Boolean(data?.forcedHospital);

  useEffect(() => {
    if (!active) {
      setBusy(false);
      setLocalError('');
    }
  }, [active]);

  if (!active) return null;

  function choose(spawn) {
    if (busy) return;
    if (forcedHospital && spawn.id !== 'hospital') return;
    setBusy(true);
    nuiPost('spawnSelect', { id: spawn.id }).then((result) => {
      if (!result?.accepted) {
        setBusy(false);
        setLocalError('This location cannot be used.');
      }
    }).catch(() => {
      setBusy(false);
      setLocalError('Could not communicate with the FiveM client.');
    });
  }

  return h('main', { className: 'screen-overlay' },
    h('section', { className: 'panel spawn-card' },
      h(Brand, { subtitle: 'Spawn manager' }),
      h('h1', null, forcedHospital ? 'Respawn at Hospital' : 'Choose Location'),
      h('p', null, forcedHospital ? 'The character is dead and must return to the hospital.' : 'You can return to your last position or choose one of the default locations.'),
      h('div', { className: 'spawn-grid' }, spawns.map((spawn) =>
        h('button', {
          key: spawn.id,
          className: 'spawn-option',
          disabled: busy || (forcedHospital && spawn.id !== 'hospital'),
          onClick: () => choose(spawn)
        },
          h('strong', null, spawn.label || spawn.id),
          h('span', null, spawn.id === 'last' ? 'Position saved in the database' : 'Spawn Rumble')
        )
      )),
      h('div', { className: 'form-error', role: 'alert' }, localError)
    )
  );
}

function FlyPanel({ active, speed }) {
  if (!active) return null;
  const controls = [
    ['W', 'Forward'], ['S', 'Backward'], ['A', 'Left'], ['D', 'Right'],
    ['SPACE', 'Up'], ['Q', 'Down'], ['SHIFT', 'Fast'], ['CTRL', 'Fine'],
    ['SCROLL', 'Speed'], ['/fly', 'ON / OFF']
  ];

  return h('section', { className: 'fly-panel' },
    h('div', { className: 'fly-header' },
      h('span', { className: 'fly-dot' }),
      h('strong', null, 'RUMBLE FLY'),
      h('span', { className: 'fly-speed' }, `${Number(speed || 0).toFixed(1)}x`)
    ),
    h('div', { className: 'fly-grid' }, controls.map(([key, label]) =>
      h('div', { className: 'fly-row', key }, h('kbd', null, key), h('span', null, label))
    ))
  );
}

function App() {
  const [registrationActive, setRegistrationActive] = useState(false);
  const [registrationError, setRegistrationError] = useState('');
  const [registrationProfile, setRegistrationProfile] = useState({ mode: 'create', characterId: 0, firstName: '', lastName: '', minimumAge: 18 });
  const [selectorActive, setSelectorActive] = useState(false);
  const [selectorData, setSelectorData] = useState({ characters: [], maxCharacters: 1 });
  const [selectorError, setSelectorError] = useState('');
  const [spawnActive, setSpawnActive] = useState(false);
  const [spawnData, setSpawnData] = useState({ spawns: [], forcedHospital: false });
  const [flyActive, setFlyActive] = useState(false);
  const [flySpeed, setFlySpeed] = useState(4);

  useEffect(() => {
    function receive(event) {
      const data = event.data;
      if (!data || typeof data.type !== 'string') return;

      if (data.type === 'registration') {
        setRegistrationActive(Boolean(data.active));
        if (data.active) {
          setRegistrationError('');
          setRegistrationProfile({
            mode: String(data.mode || 'create'),
            characterId: Number(data.characterId || 0),
            firstName: String(data.firstName || ''),
            lastName: String(data.lastName || ''),
            minimumAge: Math.max(18, Number(data.minimumAge || 18))
          });
        }
      }

      if (data.type === 'registrationError') setRegistrationError(String(data.message || 'The character could not be saved.'));

      if (data.type === 'selector') {
        setSelectorActive(Boolean(data.active));
        if (data.active) {
          setSelectorError('');
          setSelectorData({ characters: Array.isArray(data.characters) ? data.characters : [], maxCharacters: Number(data.maxCharacters || 1) });
        }
      }

      if (data.type === 'selectorError') setSelectorError(String(data.message || 'The character could not be selected.'));

      if (data.type === 'spawn') {
        setSpawnActive(Boolean(data.active));
        if (data.active) setSpawnData({ spawns: Array.isArray(data.spawns) ? data.spawns : [], forcedHospital: Boolean(data.forcedHospital) });
      }

      if (data.type === 'fly') {
        setFlyActive(Boolean(data.active));
        if (typeof data.speed === 'number') setFlySpeed(data.speed);
      }
    }

    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);

  return h(React.Fragment, null,
    h(Registration, { active: registrationActive, serverError: registrationError, profile: registrationProfile }),
    h(CharacterSelector, { active: selectorActive, data: selectorData, serverError: selectorError }),
    h(SpawnSelector, { active: spawnActive, data: spawnData }),
    h(FlyPanel, { active: flyActive, speed: flySpeed })
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(h(App));
