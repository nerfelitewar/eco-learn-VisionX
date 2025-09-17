/* UserDashboard.js
   Minimal dependency, localStorage-backed, responsive dashboard logic
   Place in same folder as UserDashboard.html
*/

(() => {
    // ===== Utilities =====
    const $ = sel => document.querySelector(sel);
    const $$ = sel => Array.from(document.querySelectorAll(sel));
  
    function localDateStr(d = new Date()){
      // returns YYYY-MM-DD for local date (no UTC)
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  
    function daysBetween(aStr, bStr){
      // compute difference in days between local date strings YYYY-MM-DD
      const a = new Date(aStr);
      const b = new Date(bStr);
      // normalize to midday to avoid DST edgecases
      const oneDay = 24 * 60 * 60 * 1000;
      return Math.round(( (b.getTime()) - (a.getTime()) ) / oneDay);
    }
  
    // ===== Persistence / default user =====
    const STORAGE_KEY = 'kawaii_user_v1';
    const defaultUser = {
      username: 'EcoFriend',
      avatarDataUrl: null,
      ecopoints: 120,
      streak: 3,
      lastLogin: null, // 'YYYY-MM-DD'
      attendance: {}, // map YYYY-MM-DD -> count (number of check-ins)
      badges: [
        {id:'seed', name:'Seed Starter', desc:'First login', earned:true},
        {id:'recycle', name:'Recycler', desc:'Recycled 5 items', earned:false},
        {id:'sapling', name:'Sapling Planter', desc:'Planted a sapling', earned:true},
        {id:'mentor', name:'Green Mentor', desc:'Invited a friend', earned:false}
      ]
    };
  
    function loadUser(){
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultUser));
          return structuredClone(defaultUser);
        }
        return JSON.parse(raw);
      } catch(e) {
        console.error('loadUser', e);
        return structuredClone(defaultUser);
      }
    }
  
    function saveUser(u){
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    }
  
    // ===== Render UI =====
    const user = loadUser();
    let supabaseClient = null;
    const SB_URL = localStorage.getItem('SB_URL');
    const SB_KEY = localStorage.getItem('SB_KEY');
    console.log('SB_URL:', SB_URL, 'SB_KEY:', SB_KEY ? 'set' : 'not set');
    if (window.supabase && SB_URL && SB_KEY) {
      try {
        supabaseClient = window.supabase.createClient(SB_URL, SB_KEY);
        console.log('Supabase client initialized');
      } catch(e) {
        console.warn('Supabase init failed', e);
        alert('Supabase init failed: ' + e.message);
      }
    } else {
      console.warn('Supabase not initialized: window.supabase:', !!window.supabase, 'SB_URL:', !!SB_URL, 'SB_KEY:', !!SB_KEY);
      // Redirect to login if credentials missing
      window.location.href = 'login_signup.html';
    }
  
    const avatarWrap = $('#avatarWrap');
    const usernameDisplay = $('#usernameDisplay');
    const ecoPointsEl = $('#ecoPoints');
    const streakEl = $('#streakCount');
    const badgesWrap = $('#badgesWrap');
    const greetingEl = $('#greeting');
    const usernameInput = $('#usernameInput');
    const editNameBtn = $('#editNameBtn');
    const dailyBtn = $('#dailyBtn');
    const notifDot = $('#notifDot');
    const attendanceHeatmap = document.getElementById('attendanceHeatmap');
    const leaderboardList = document.getElementById('leaderboardList');
  
    // avatar UI (with upload)
    function renderAvatar(){
      avatarWrap.innerHTML = '';
      if (user.avatarDataUrl) {
        const img = document.createElement('img');
        img.src = user.avatarDataUrl;
        img.alt = user.username + ' avatar';
        avatarWrap.appendChild(img);
      } else {
        // default kawaii svg
        avatarWrap.innerHTML = `
          <svg viewBox="0 0 120 120" width="88" height="88" aria-hidden="true">
            <defs>
              <linearGradient id="g1" x1="0" x2="1"><stop offset="0" stop-color="#FFD6E8"/><stop offset="1" stop-color="#FFECDE"/></linearGradient>
            </defs>
            <rect width="120" height="120" rx="20" fill="url(#g1)"/>
            <g transform="translate(12,18)">
              <circle cx="36" cy="34" r="30" fill="#FFF" stroke="#FFD6E8"/>
              <circle cx="24" cy="34" r="4" fill="#333"/>
              <circle cx="48" cy="34" r="4" fill="#333"/>
              <path d="M22 48c5 6 18 6 26 0" stroke="#ef7aab" stroke-linecap="round" fill="none" stroke-width="3"/>
              <g transform="translate(72,6)">
                <path d="M8 2 C2 18 32 20 40 0" fill="#A6F3C5" stroke="#7ae6a8"/>
              </g>
            </g>
          </svg>
        `;
      }
  
      // small upload overlay
      const up = document.createElement('label');
      up.innerHTML = '📷';
      up.className = 'avatar-upload';
      up.title = 'Upload avatar';
      up.style = 'position:absolute;right:8px;bottom:8px;cursor:pointer;font-size:18px';
      const file = document.createElement('input');
      file.type = 'file';
      file.accept = 'image/*';
      file.style.display = 'none';
      up.appendChild(file);
      avatarWrap.style.position = 'relative';
      avatarWrap.appendChild(up);
      file.addEventListener('change', async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
          user.avatarDataUrl = reader.result;
          saveUser(user);
          renderAvatar();
        };
        reader.readAsDataURL(f);
      });
    }
  
    function renderUserMeta(){
      usernameDisplay.textContent = user.username;
      ecoPointsEl.textContent = user.ecopoints;
      streakEl.textContent = user.streak;
    }

    // Hydrate from profile passed by app.py
    (function hydrateFromProfile(){
      try {
        const raw = localStorage.getItem('PROFILE_JSON');
        if (!raw) return;
        const profile = JSON.parse(raw);
        if (profile && profile.username) user.username = profile.username;
        if (profile && profile.avatar && !user.avatarDataUrl) {
          // optional: map emoji avatar to default; keep local avatar system
        }
        if (typeof profile?.eco_points === 'number') {
          // prefer DB eco_points if higher than local
          user.ecopoints = Math.max(user.ecopoints || 0, profile.eco_points || 0);
        }
        saveUser(user);
      } catch(_) {}
    })();
  
    function renderBadges(){
      badgesWrap.innerHTML = '';
      user.badges.forEach(b=>{
        const el = document.createElement('div');
        el.className = 'badge';
        el.title = `${b.name} — ${b.desc}`;
        el.innerHTML = `
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="28" r="16" fill="${b.earned ? '#FFD27F' : '#f3f3f7'}" stroke="#ffb86b"></circle>
            ${b.earned ? '<path d="M22 30 l6 6 l14 -14" stroke="#6b4" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"></path>' : ''}
          </svg>
          <div style="flex:1">
            <strong style="display:block">${b.name}</strong>
            <small style="color:var(--muted)">${b.desc}</small>
            ${b.earned ? `<div style="font-weight:bold; color:#6b4; margin-top:4px;">Points: ${b.points || 0}</div>` : ''}
          </div>
        `;
        el.addEventListener('click', () => {
          const badgeDialog = document.getElementById('badgeDialog');
          const badgeTitle = document.getElementById('badgeTitle');
          const badgeDesc = document.getElementById('badgeDesc');
          badgeTitle.textContent = b.name;
          badgeDesc.textContent = b.desc;
          badgeDialog.showModal();
        });
        badgesWrap.appendChild(el);
      });
    }

    // ===== Attendance Heatmap =====
    function getDateNDaysAgo(n){
      const d = new Date();
      d.setDate(d.getDate() - n);
      return d;
    }

    function levelFromCount(count){
      if (!count) return 0;
      if (count >= 4) return 4;
      if (count === 3) return 3;
      if (count === 2) return 2;
      return 1;
    }

    function renderAttendance(){
      if (!attendanceHeatmap) return;
      attendanceHeatmap.innerHTML = '';
      const DAYS = 7;
      const WEEKS = 16; // last 16 weeks
      const totalDays = DAYS * WEEKS;
      const today = new Date();
      const start = getDateNDaysAgo(totalDays - 1);
      // build by columns (weeks)
      for (let w = 0; w < WEEKS; w++) {
        for (let d = 0; d < DAYS; d++) {
          const cellDate = new Date(start);
          cellDate.setDate(start.getDate() + (w * DAYS + d));
          const ymd = localDateStr(cellDate);
          const count = (user.attendance || {})[ymd] || 0;
          const lvl = levelFromCount(count);
          const div = document.createElement('div');
          div.className = `attendance-cell lvl-${lvl}`;
          div.setAttribute('role', 'gridcell');
          div.title = `${ymd} • ${count ? count : 0} check-in${count === 1 ? '' : 's'}`;
          // Allow manual backfill: click to toggle presence (for demo)
          div.addEventListener('click', () => {
            const current = (user.attendance || {})[ymd] || 0;
            const next = current ? 0 : 1;
            user.attendance[ymd] = next;
            saveUser(user);
            renderAttendance();
          });
          attendanceHeatmap.appendChild(div);
        }
      }
    }

    async function syncEcoPointsToDb(){
      if (!supabaseClient) {
        console.log('No supabaseClient, skipping sync');
        return;
      }
      try {
        const email = localStorage.getItem('USER_EMAIL');
        console.log('USER_EMAIL:', email);
        if (!email) {
          console.log('No email, skipping sync');
          return;
        }
        console.log('Fetching current eco_points from DB');
        const { data: rows, error: selectError } = await supabaseClient
          .from('UsersDatabase')
          .select('eco_points,institution')
          .eq('email', email);
        if (selectError) {
          console.error('Select error:', selectError);
          alert('Error fetching eco_points: ' + selectError.message);
          return;
        }
        console.log('Rows:', rows);
        const currentDb = Array.isArray(rows) && rows.length ? (rows[0].eco_points || 0) : 0;
        const institution = Array.isArray(rows) && rows.length ? (rows[0].institution || null) : null;
        const newPts = user.ecopoints || 0;
        const delta = newPts - currentDb;
        console.log('currentDb:', currentDb, 'newPts:', newPts, 'delta:', delta);
        if (delta === 0) {
          console.log('No change, skipping update');
          return;
        }
        // 1) update user points
        console.log('Updating user eco_points to', newPts);
        const { error: updateError } = await supabaseClient.from('UsersDatabase').update({ eco_points: newPts }).eq('email', email);
        if (updateError) {
          console.error('Update error:', updateError);
          alert('Error updating eco_points: ' + updateError.message);
          return;
        }
        console.log('User update successful');
        // 2) add delta to institution total
        if (institution) {
          try {
            console.log('Updating institution', institution);
            const res = await supabaseClient
              .from('Schools')
              .select('id,total_ecopoints,member_count')
              .eq('name', institution);
            const exists = Array.isArray(res.data) && res.data.length;
            if (exists) {
              const curTotal = res.data[0].total_ecopoints || 0;
              console.log('Updating existing school total from', curTotal, 'to', curTotal + delta);
              const { error: schoolUpdateError } = await supabaseClient
                .from('Schools')
                .update({ total_ecopoints: curTotal + delta })
                .eq('name', institution);
              if (schoolUpdateError) {
                console.error('School update error:', schoolUpdateError);
                alert('Error updating school total: ' + schoolUpdateError.message);
              } else {
                console.log('School update successful');
              }
            } else {
              console.log('Inserting new school');
              const { error: schoolInsertError } = await supabaseClient
                .from('Schools')
                .insert({ name: institution, total_ecopoints: Math.max(delta,0), member_count: 1 });
              if (schoolInsertError) {
                console.error('School insert error:', schoolInsertError);
                alert('Error inserting school: ' + schoolInsertError.message);
              } else {
                console.log('School insert successful');
              }
            }
          } catch(err) {
            console.warn('School total update failed', err);
            alert('School update failed: ' + err.message);
          }
        }
        console.log('Sync completed successfully');
      } catch(e) {
        console.warn('EcoPoints sync failed', e);
        alert('EcoPoints sync failed: ' + e.message);
      }
    }

    async function renderLeaderboard(){
      if (!leaderboardList) return;
      leaderboardList.innerHTML = '';
      try {
        if (!supabaseClient) return;
        const { data } = await supabaseClient
          .from('Schools')
          .select('name,total_ecopoints,member_count')
          .order('total_ecopoints', { ascending: false })
          .limit(3);
        const medals = ['🥇','🥈','🥉'];
        (data || []).forEach((row, idx) => {
          const li = document.createElement('li');
          li.innerHTML = `<span class="pos">${medals[idx] || idx+1}</span>
                          <span class="inst">${row.name || 'Institution'}</span>
                          <span class="pts">${row.total_ecopoints || 0} pts</span>`;
          leaderboardList.appendChild(li);
        });
      } catch(e) { console.warn('Leaderboard failed', e); }
    }
  
    // greeting by time
    function computeGreeting(){
      const now = new Date();
      const h = now.getHours();
      if (h < 12) return 'Good morning,';
      if (h < 17) return 'Good afternoon,';
      return 'Good evening,';
    }
  
    // ===== Daily login logic =====
    function dailyLogin(){
      const today = localDateStr();
      const last = user.lastLogin;
      if (last === today) {
        alert('You already logged in today — keep up the great habit! 🌿');
        return;
      }
  
      if (last) {
        const diff = daysBetween(last, today);
        if (diff === 1) {
          // continued streak
          user.streak = (user.streak || 0) + 1;
        } else {
          // gap -> reset streak to 1
          user.streak = 1;
        }
      } else {
        user.streak = 1;
      }
  
      // award points (base + streak bonus, capped)
      const base = 10;
      const streakBonus = Math.min(user.streak, 10); // small bonus
      const awarded = base + streakBonus;
      user.ecopoints = (user.ecopoints || 0) + awarded;
      user.lastLogin = today;
      // attendance mark
      user.attendance = user.attendance || {};
      user.attendance[today] = (user.attendance[today] || 0) + 1;
  
      // temp: auto-award a badge for first login
      if (!user.badges.find(b=>b.id==='seed')?.earned) {
        const b = user.badges.find(b=>b.id==='seed');
        if (b) b.earned = true;
      }
      saveUser(user);
      syncEcoPointsToDb();
      renderAll();
      // simple toast style
      notifDot.style.display = 'inline-block';
      dailyBtn.textContent = `+${awarded} ✅`;
      setTimeout(()=>{ dailyBtn.textContent = 'Daily Login 🌞'; notifDot.style.display = 'none'; }, 1600);
    }
  
    // mission done (adds points)
    function attachMissionButtons(){
      $$('.btn-ghost').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const p = Number(btn.dataset.points || 0);
          user.ecopoints = (user.ecopoints || 0) + p;
          // if big mission, award badge
          if (p >= 50){
            const b = user.badges.find(x=>x.id==='sapling');
            if (b) b.earned = true;
          }
          saveUser(user);
          syncEcoPointsToDb();
          renderAll();
          // micro-feedback
          btn.textContent = 'Done ✓';
          btn.disabled = true;
          setTimeout(()=>{ btn.textContent = 'Mark done'; btn.disabled = false; }, 1400);
        });
      });
    }
  
    // Edit name flow
    editNameBtn.addEventListener('click', () => {
      usernameInput.value = user.username;
      usernameInput.style.display = 'inline-block';
      usernameInput.focus();
      usernameInput.select();
    });
  
    usernameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        commitName();
      } else if (e.key === 'Escape') {
        usernameInput.style.display = 'none';
      }
    });
  
    usernameInput.addEventListener('blur', commitName);
  
    function commitName(){
      const v = usernameInput.value.trim();
      if (v) {
        user.username = v;
        saveUser(user);
      }
      usernameInput.style.display = 'none';
      renderAll();
    }
  
    // sidebar controls
    const sidebar = document.getElementById('sidebar');
    const collapseBtn = document.getElementById('collapseBtn');
    const hamburger = document.getElementById('hamburger');
    const openSettingsBtn = document.getElementById('openSettings');
    const settingsDialog = document.getElementById('settingsDialog');
    const settingsName = document.getElementById('settingsName');
    const settingsSave = document.getElementById('settingsSave');
    const settingsCancel = document.getElementById('settingsCancel');

    const SIDEBAR_STATE_KEY = 'sidebar_collapsed_v1';

    // Initialize collapsed state from storage (desktop/tablet)
    try {
      const savedCollapsed = localStorage.getItem(SIDEBAR_STATE_KEY);
      if (savedCollapsed === '1') {
        sidebar.classList.add('collapsed');
      }
    } catch(_) {}

    function updateCollapseAria() {
      const collapsed = sidebar.classList.contains('collapsed');
      collapseBtn.setAttribute('aria-expanded', String(!collapsed));
      collapseBtn.setAttribute('aria-controls', 'sidebar');
    }

    function updateHamburgerAria() {
      const open = sidebar.classList.contains('open');
      hamburger.setAttribute('aria-expanded', String(open));
      hamburger.setAttribute('aria-controls', 'sidebar');
    }

    function persistCollapsed() {
      try {
        const collapsed = sidebar.classList.contains('collapsed');
        localStorage.setItem(SIDEBAR_STATE_KEY, collapsed ? '1' : '0');
      } catch(_) {}
    }

    collapseBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      persistCollapsed();
      updateCollapseAria();
    });

    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      updateHamburgerAria();
    });

    // Close sidebar on mobile when clicking outside or pressing Escape
    document.addEventListener('click', (e) => {
      const isSmall = window.matchMedia('(max-width:680px)').matches;
      if (!isSmall) return;
      if (!sidebar.classList.contains('open')) return;
      if (sidebar.contains(e.target) || hamburger.contains(e.target)) return;
      sidebar.classList.remove('open');
      updateHamburgerAria();
    });

    window.addEventListener('keydown', (e) => {
      const isSmall = window.matchMedia('(max-width:680px)').matches;
      if (!isSmall) return;
      if (e.key === 'Escape' && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        updateHamburgerAria();
      }
    });

    // Set initial ARIA
    updateCollapseAria();
    updateHamburgerAria();
  
    // date in sidebar footer
    $('#sidebar-date').textContent = new Date().toLocaleDateString();

    // Settings modal handlers
    if (openSettingsBtn && settingsDialog){
      openSettingsBtn.addEventListener('click', () => {
        settingsName.value = user.username || '';
        settingsDialog.showModal();
      });
      settingsCancel && settingsCancel.addEventListener('click', ()=> settingsDialog.close());
      settingsSave && settingsSave.addEventListener('click', async () => {
        const newName = settingsName.value.trim();
        if (newName){
          user.username = newName;
          saveUser(user);
          renderUserMeta();
          // sync to Supabase profile if available
          try {
            if (supabaseClient){
              const email = localStorage.getItem('USER_EMAIL');
              if (email) await supabaseClient.from('UsersDatabase').update({ username: newName }).eq('email', email);
            }
          } catch(_) {}
        }
        settingsDialog.close();
      });
    }
  
    // render everything
    function renderAll(){
      renderAvatar();
      renderUserMeta();
      renderBadges();
      greetingEl.textContent = computeGreeting();
      renderAttendance();
      renderLeaderboard();
    }
  
    // init
    renderAll();
    attachMissionButtons();

    // Badge dialog close handler
    const badgeClose = document.getElementById('badgeClose');
    if (badgeClose) {
      badgeClose.addEventListener('click', () => {
        document.getElementById('badgeDialog').close();
      });
    }
  
    // attach daily
    dailyBtn.addEventListener('click', dailyLogin);

    // Sign-in bonus toast (+5) once per login from login_signup.html
    (async function signInBonus(){
      try {
        const just = localStorage.getItem('JUST_SIGNED_IN');
        if (!just) return;
        localStorage.removeItem('JUST_SIGNED_IN');
        user.ecopoints = (user.ecopoints || 0) + 5;
        saveUser(user);
        syncEcoPointsToDb();
        // small toast via daily button text
        dailyBtn.textContent = '+5 ✅';
        setTimeout(()=>{ dailyBtn.textContent = 'Daily Login 🌞'; }, 1500);
        renderUserMeta();
      } catch(_) {}
    })();
  
    // small UX: show notif dot when there are new badges not yet "seen".
    function unseenBadges() {
      return user.badges.some(b=>b.earned && !b.seen);
    }
    // mark badges seen on render
    user.badges.forEach(b=>{ if (b.earned) b.seen = true; });
    saveUser(user);
    if (unseenBadges()) notifDot.style.display = 'inline-block';
    else notifDot.style.display = 'none';
  
    // quick helpers: keyboard D = daily
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'd' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        dailyLogin();
      }
    });
  

  
    // initial small animation
    document.body.style.opacity = 0;
    setTimeout(()=>document.body.style.transition='opacity .35s',20);
    setTimeout(()=>document.body.style.opacity = 1, 40);

    // Nav item event listeners
    $$('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        // Remove active from all
        $$('.nav-item').forEach(b => b.classList.remove('active'));
        // Add active to this
        btn.classList.add('active');
        // Handle navigation
        const text = btn.textContent.trim();
        if (text === 'Dashboard') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (text === 'Achievements') {
          document.querySelector('.badges-card').scrollIntoView({ behavior: 'smooth' });
        } else if (text === 'Eco Missions') {
          document.querySelector('.tasks-card').scrollIntoView({ behavior: 'smooth' });
        } else if (text === 'Settings') {
          settingsDialog.showModal();
        }
      });
    });

    // Logout button
    $('#logoutBtn').addEventListener('click', () => {
      window.location.href = 'logout.html';
    });

  })();
  

  // ====== Upload missions + points (drop this into UserDashboard.js) ======
(function () {
  // config: points for upload tasks (aligns with labels above)
  const uploadPointsMap = {
    upload_plant_image: 70,
    upload_ecopark_image: 40,
    upload_nature_video: 120
  };

  // helpers: localStorage keys
  const LS_POINTS = 'ecoPointsValue';
  const LS_COMPLETED = 'ecoCompletedTasks'; // object map
  const LS_UPLOADS = 'ecoUploads'; // array of uploads

  // DOM refs
  const pointsEl = document.getElementById('ecoPoints');
  const gallery = document.getElementById('uploadsGallery');
  const modal = document.getElementById('mediaModal');
  const modalInner = document.getElementById('mediaModalInner');

  // init
  const getNumber = (k, def = 0) => parseInt(localStorage.getItem(k) || def, 10);
  let ecoPoints = getNumber(LS_POINTS, 0);
  pointsEl && (pointsEl.textContent = ecoPoints);

  const completed = JSON.parse(localStorage.getItem(LS_COMPLETED) || '{}');
  const uploads = JSON.parse(localStorage.getItem(LS_UPLOADS) || '[]');

  // render existing uploads to gallery
  function renderGallery() {
    if (!gallery) return;
    gallery.innerHTML = '';
    uploads.forEach((u, idx) => {
      const wrap = document.createElement('div');
      wrap.className = 'thumb';
      wrap.dataset.idx = idx;
      // image
      if (u.type === 'image') {
        const img = document.createElement('img');
        img.src = u.data;
        img.alt = u.name || 'upload';
        wrap.appendChild(img);
      } else if (u.type === 'video') {
        const vid = document.createElement('video');
        vid.src = u.data;
        vid.muted = true;
        vid.playsInline = true;
        vid.preload = 'metadata';
        vid.style.objectFit = 'cover';
        wrap.appendChild(vid);
      }
      // click to open modal
      wrap.addEventListener('click', () => openModal(u));
      gallery.appendChild(wrap);
    });
  }

  // open modal for zoom view
  function openModal(u) {
    modal.style.display = 'flex';
    modalInner.innerHTML = '';
    if (u.type === 'image') {
      const img = document.createElement('img');
      img.src = u.data;
      img.style.maxWidth = '90vw';
      img.style.maxHeight = '90vh';
      img.style.display = 'block';
      img.style.borderRadius = '12px';
      modalInner.appendChild(img);
    } else if (u.type === 'video') {
      const video = document.createElement('video');
      video.src = u.data;
      video.controls = true;
      video.autoplay = false;
      video.style.maxWidth = '90vw';
      video.style.maxHeight = '90vh';
      video.style.borderRadius = '12px';
      modalInner.appendChild(video);
    }
  }

  // close modal on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
      modalInner.innerHTML = '';
    }
  });

  // update ecopoints UI + persist
  function addPoints(n) {
    ecoPoints = (ecoPoints || 0) + Number(n || 0);
    localStorage.setItem(LS_POINTS, ecoPoints);
    if (pointsEl) pointsEl.textContent = ecoPoints;
  }

  // mark-done buttons behavior (for existing tasks)
  document.querySelectorAll('.mark-done').forEach((btn) => {
    const li = btn.closest('li');
    const taskId = li?.dataset?.task || btn.textContent.trim();
    const points = Number(btn.dataset.points || 0);

    // reflect persisted state
    if (completed[taskId]) {
      btn.disabled = true;
      btn.textContent = 'Done ✓';
      btn.classList.add('disabled');
    }

    btn.addEventListener('click', () => {
      if (completed[taskId]) return;
      addPoints(points);
      completed[taskId] = true;
      localStorage.setItem(LS_COMPLETED, JSON.stringify(completed));
      btn.disabled = true;
      btn.textContent = 'Done ✓';
      btn.classList.add('disabled');
    });
  });

  // file upload handlers
  document.querySelectorAll('.hidden-file-input').forEach((input) => {
    const li = input.closest('li');
    const taskId = li?.dataset?.task;
    input.addEventListener('change', async (ev) => {
      const file = ev.target.files && ev.target.files[0];
      if (!file) return;

      // file size guard
      const maxImageMB = 5;
      const maxVideoMB = 30;
      const sizeMB = file.size / (1024 * 1024);
      if (file.type.startsWith('image/') && sizeMB > maxImageMB) {
        alert('Image too big. Please use <= ' + maxImageMB + 'MB.');
        input.value = '';
        return;
      }
      if (file.type.startsWith('video/') && sizeMB > maxVideoMB) {
        alert('Video too big. Please use <= ' + maxVideoMB + 'MB.');
        input.value = '';
        return;
      }

      // disable input UI so user can't double-upload
      input.disabled = true;
      const label = li.querySelector('label');
      if (label) label.textContent = 'Uploading...';

      // read as dataURL (base64)
      const reader = new FileReader();
      reader.onload = function (r) {
        const data = r.target.result;
        const type = file.type.startsWith('video/') ? 'video' : 'image';

        // push to uploads list and persist
        uploads.push({
          id: Date.now(),
          task: taskId,
          type,
          data,
          name: file.name,
          size: file.size
        });
        localStorage.setItem(LS_UPLOADS, JSON.stringify(uploads));

        // award points (only once per task)
        if (!completed[taskId]) {
          const pts = uploadPointsMap[taskId] || 0;
          addPoints(pts);
          completed[taskId] = true;
          localStorage.setItem(LS_COMPLETED, JSON.stringify(completed));
        }

        // update UI
        renderGallery();
        if (label) label.textContent = 'Uploaded ✓';
        input.style.display = 'none'; // hide input after upload
      };
      reader.onerror = function () {
        alert('Failed to read file.');
        input.disabled = false;
        if (label) label.textContent = 'Upload Image';
      };
      reader.readAsDataURL(file);
    });
  });

  // create "click label triggers file input" behavior (since we used <label> with hidden input)
  document.querySelectorAll('label.btn-ghost').forEach((lbl) => {
    const input = lbl.querySelector('input[type=file]');
    if (!input) return;
    lbl.addEventListener('click', (e) => {
      // if already uploaded hide it
      if (input.disabled) return;
      input.click();
    });
  });

  // initial render
  renderGallery();

})();
