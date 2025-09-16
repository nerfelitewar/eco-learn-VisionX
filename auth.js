(function(){
  const msg = document.getElementById('msg');
  const continueBtn = document.getElementById('continueBtn');
  const toDashboardBtn = document.getElementById('toDashboardBtn');
  const modeRadios = Array.from(document.querySelectorAll('input[name="mode"]'));
  const signupFields = document.getElementById('signupFields');

  let mode = 'login';
  modeRadios.forEach(r => r.addEventListener('change', () => {
    mode = document.querySelector('input[name="mode"]:checked').value;
    signupFields.style.display = mode === 'signup' ? 'block' : 'none';
    msg.textContent = '';
  }));

  if (!window.SUPABASE_URL || !window.SUPABASE_KEY) {
    msg.className = 'error';
    msg.textContent = 'Missing Supabase credentials. Please copy auth-config.example.js to auth-config.js and fill in your Supabase URL and anon key.';
    continueBtn.disabled = true;
    return;
  }

  const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

  function setMsg(text, ok=false){
    msg.className = ok ? 'ok' : 'error';
    msg.textContent = text;
  }

  async function ensureUserRow(email, payload){
    try{
      const { data } = await sb.from('UsersDatabase').select('id').eq('email', email);
      if (Array.isArray(data) && data.length){
        await sb.from('UsersDatabase').update(payload).eq('email', email);
      } else {
        await sb.from('UsersDatabase').insert(payload);
      }
    }catch(e){ console.warn('ensureUserRow failed', e); }
  }

  continueBtn.addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    if (!email || !password){ setMsg('Email and password are required.'); return; }

    try{
      if (mode === 'signup'){
        const username = document.getElementById('username').value.trim();
        const age = document.getElementById('age').value.trim();
        const education = document.getElementById('education').value;
        const institution = document.getElementById('institution').value.trim();

        const { data: su, error: suErr } = await sb.auth.signUp({ email, password });
        if (suErr) throw suErr;

        const payload = { username, email, password: 'sha256-in-backend', avatar: '🌱', eco_points: 0,
                          institution, education, age: age && !isNaN(Number(age)) ? Number(age) : null };
        await ensureUserRow(email, payload);
        setMsg('Registration successful. You can login now.', true);
        document.querySelector('input[value="login"]').checked = true;
        document.querySelector('input[value="login"]').dispatchEvent(new Event('change'));
        return;
      }

      // login
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // fetch profile
      let profile = null;
      try{
        const res = await sb.from('UsersDatabase').select('*').eq('email', email);
        profile = Array.isArray(res.data) && res.data.length ? res.data[0] : null;
      }catch(e){ profile = null; }

      // write to localStorage for dashboard
      localStorage.setItem('USER_EMAIL', email);
      localStorage.setItem('PROFILE_JSON', JSON.stringify(profile || { username: email.split('@')[0], email, eco_points: 0, avatar: '🌱' }));
      localStorage.setItem('SB_URL', window.SUPABASE_URL);
      localStorage.setItem('SB_KEY', window.SUPABASE_KEY);
      localStorage.setItem('JUST_SIGNED_IN', '1');

      setMsg('Login successful. Redirecting…', true);
      toDashboardBtn.style.display = 'inline-block';
      toDashboardBtn.onclick = () => window.location.href = 'UserDashboard.html';
      window.location.href = 'UserDashboard.html';
    }catch(e){
      setMsg(e.message || 'Authentication failed.');
    }
  });
})();


