# app.py
import streamlit as st
from supabase import create_client, Client
from dotenv import load_dotenv
import os
import hashlib
from typing import Optional

# --------------------
# Config & init
# --------------------
st.set_page_config(page_title="EcoLearn — Login", page_icon="🌱", layout="wide")
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
USE_SUPABASE = bool(SUPABASE_URL and SUPABASE_KEY)

supabase: Optional[Client] = None
if USE_SUPABASE:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        st.warning(f"Could not initialize Supabase client: {e}")
        supabase = None
        USE_SUPABASE = False

# --------------------
# Compatibility: safe rerun wrapper
# --------------------
def safe_rerun():
    try:
        if hasattr(st, "experimental_rerun"):
            st.experimental_rerun()
            return
        if hasattr(st, "script_request_rerun"):
            st.script_request_rerun()
            return
    except Exception:
        return

# --------------------
# Visual: EcoLearn palette
# --------------------
PAGE_CSS = """
<style>
html, body, [class*="css"]  {
    background: linear-gradient(180deg, #f7fff7 0%, #e9fff0 40%, #ffffff 100%);
}
.header-card{
    background: linear-gradient(90deg,#dfffe6,#eafff4);
    border-radius: 16px;
    padding: 18px;
    box-shadow: 0 6px 20px rgba(20,70,50,0.06);
}
.card{ background: white; border-radius: 12px; padding: 14px; box-shadow: 0 6px 18px rgba(20,60,40,0.04);} 
.playful-title { font-size: 1.6rem; margin: 0; }
.small-muted { color: #4b6b6b; font-size: 0.9rem; }

/* ---- quick size knobs ---- */
:root{
    --card-h: 180px;   /* height of each big card */
    --card-fs: 1.4rem; /* font-size inside card */
    --gap: 12px;       /* gap between cards */
}
.grid-2x2{
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-auto-rows: var(--card-h);
    gap: var(--gap);
}
.big-card-btn{
    background: #fff;
    border-radius: 16px;
    padding: 20px;
    box-shadow: 0 6px 18px rgba(20,60,40,.04);
    cursor: pointer;
    transition: transform .15s;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    font-size: var(--card-fs);
    text-align: center;
    border: none;
    width: 100%;
    height: 100%;
}
.big-card-btn:hover{ transform: scale(1.03); }
</style>
"""
st.markdown(PAGE_CSS, unsafe_allow_html=True)

# --------------------
# Helpers
# --------------------
def hash_password(password: str) -> str:
    """SHA256 for DB-stored password. Replace with bcrypt in prod."""
    return hashlib.sha256(password.encode()).hexdigest()

def _extract_user_obj(res) -> Optional[dict]:
    if not res:
        return None
    try:
        if isinstance(res, dict):
            return res.get("user") or res.get("data") or res
    except Exception:
        pass
    try:
        return getattr(res, "user", None)
    except Exception:
        return None

# Local fallback store
if "local_users" not in st.session_state:
    st.session_state.local_users = {}

EDUCATION_LEVELS = ["Junior High", "Secondary Highschool", "College", "Graduate", "Other"]
AVATARS = ["🦋","🌿","🐢","🌱","🦉","🐝","🌞","🍃"]

# --------------------
# Auth + DB ops (final)
# --------------------
def sign_up(username, email, password, age, education, institution, avatar):
    """Create Supabase Auth user, then insert/update UsersDatabase row safely (writes hashed password)."""
    if not username or not email or not password:
        return {"error": "username, email and password are required."}

    hashed_pw = hash_password(password)

    if USE_SUPABASE and supabase:
        # 1) create auth user (Supabase Auth)
        try:
            auth_res = supabase.auth.sign_up({"email": email, "password": password})
            user_obj = _extract_user_obj(auth_res)
            if not user_obj:
                return {"error": "Supabase Auth sign-up did not return a user object. Check console."}
        except Exception as e:
            return {"error": f"Supabase Auth sign_up failed: {e}"}

        # 2) prepare payload for UsersDatabase (store hashed password)
        payload = {
            "username": username,
            "email": email,
            "password": hashed_pw,
            "avatar": avatar or "🌱",
            "eco_points": 0,
            "institution": institution or "",
            "education": education or "",
            "age": int(age) if str(age).isdigit() else None
        }

        # 3) Insert or update user row to avoid unique-constraint failures
        try:
            check = supabase.table("UsersDatabase").select("id").eq("email", email).execute()
            exists = False
            if check and getattr(check, "data", None):
                exists = len(check.data) > 0

            if exists:
                supabase.table("UsersDatabase").update(payload).eq("email", email).execute()
            else:
                supabase.table("UsersDatabase").insert(payload).execute()
        except Exception as e:
            return {"error": f"Auth created but failed writing UsersDatabase: {e}. Check Supabase logs."}

        return {"user": user_obj}

    # Local fallback
    if email in st.session_state.local_users:
        return {"error": "Email already registered (local)."}
    uid = f"local-{len(st.session_state.local_users)+1}"
    st.session_state.local_users[email] = {
        "id": uid,
        "email": email,
        "username": username,
        "password": hashed_pw,
        "avatar": avatar or "🌱",
        "eco_points": 0,
        "institution": institution or "",
        "education": education or "",
        "age": int(age) if str(age).isdigit() else None
    }
    return {"user": st.session_state.local_users[email]}

def sign_in(email, password):
    """Authenticate via Supabase Auth and fetch DB profile (no DB-password checking required)."""
    if USE_SUPABASE and supabase:
        try:
            res = supabase.auth.sign_in_with_password({"email": email, "password": password})
            user = _extract_user_obj(res)
            if not user:
                return {"error": "Supabase auth returned no user object."}
        except Exception as e:
            return {"error": f"Supabase Auth login failed: {e}"}

        # fetch UsersDatabase profile to populate session/UI
        try:
            q = supabase.table("UsersDatabase").select("*").eq("email", email).execute()
            profile = None
            if q and getattr(q, "data", None) and len(q.data) > 0:
                profile = q.data[0]
        except Exception:
            profile = None

        return {"user": user, "profile": profile}

    # Local fallback: check hashed password stored in local_users
    local = st.session_state.local_users.get(email)
    if not local or local.get("password") != hash_password(password):
        return {"error": "Invalid email or password (local)."}
    return {"user": local, "profile": local}

def sign_out():
    if USE_SUPABASE and supabase:
        try:
            supabase.auth.sign_out()
        except Exception:
            pass
    for k in ["user_email", "username", "profile"]:
        if k in st.session_state:
            del st.session_state[k]
    safe_rerun()

# --------------------
# UI: Auth (no captcha)
# --------------------
def auth_screen():
    st.markdown("<div class='header-card card'><h1 class='playful-title'>🌱 EcoLearn — Login / Sign Up</h1>"
                "<p class='small-muted'>Gamified Environmental Education Platform for Schools & Colleges</p></div>", unsafe_allow_html=True)
    st.write("")
    col1, col2 = st.columns([2, 1])
    with col1:
        with st.form(key="auth_form"):
            action = st.radio("Action:", ["Login", "Sign Up"], horizontal=True)
            email = st.text_input("Email", placeholder="you@school.edu")
            password = st.text_input("Password", type="password")

            if action == "Sign Up":
                username = st.text_input("Username (display name)")
                age = st.text_input("Age", placeholder="e.g., 16")
                education = st.selectbox("Education level", EDUCATION_LEVELS)
                institution = st.text_input("School / College name")
                avatar_choice = st.radio("Avatar", AVATARS, horizontal=True)
            else:
                username = None; age = None; education = None; institution = None; avatar_choice = None

            submit = st.form_submit_button("Continue")

            if submit:
                if action == "Sign Up":
                    result = sign_up(username=username, email=email, password=password,
                                    age=age, education=education, institution=institution,
                                    avatar=avatar_choice)
                    if result.get("error"):
                        st.error(result.get("error"))
                    else:
                        st.success("Registration successful. Please log in to continue.")
                else:
                    result = sign_in(email=email, password=password)
                    if result.get("error"):
                        st.error(result.get("error"))
                    else:
                        user = result.get("user")
                        profile = result.get("profile") or {}
                        st.session_state.user_email = email
                        st.session_state.username = profile.get("username") if profile else (email.split("@")[0])
                        st.session_state.profile = profile
                        st.success(f"Welcome back, {st.session_state.username} — to EcoLearn!")
                        safe_rerun()
    with col2:
        st.markdown("<div class='card'><h3>What is EcoLearn?</h3><ul>"
                    "<li>Interactive, gamified environmental learning platform</li>"
                    "<li>School-level leaderboards & eco-points</li>"
                    "<li>Rewards for sustainable practices through digital badges and recognition.</li></ul></div>", unsafe_allow_html=True)

# --------------------
# UI: Main app / Dashboard
# --------------------
def main_app():
    username = st.session_state.get("username", "EcoLearner")
    profile = st.session_state.get("profile") or {}
    st.markdown(f"<div class='header-card card'><h1 class='playful-title'>🎉 Welcome to EcoLearn, {username}!</h1>"
                "<p class='small-muted'>Learning + action = impact. Track your eco-journey.</p></div>", unsafe_allow_html=True)

    left, right = st.columns([2, 3])
    with left:
        st.markdown("<div class='card'>", unsafe_allow_html=True)
        avatar_display = profile.get("avatar", "🌱") if profile else "🌱"
        st.subheader(f"{username} {avatar_display}")
        st.write(f"**Email:** {st.session_state.get('user_email','')}")
        st.write(f"**Institution:** {profile.get('institution', '—')}")
        st.write(f"**Education:** {profile.get('education', '—')}")
        st.write(f"**Age:** {profile.get('age', '—')}")
        st.write(f"**EcoPoints:** {profile.get('eco_points', 0)}")
        if st.button("Logout"):
            sign_out()
        st.markdown("</div>", unsafe_allow_html=True)

    with right:
        st.markdown("<div class='card'>", unsafe_allow_html=True)
        st.subheader("Eco Dashboard")

        # 2×2 big cards
        c1, c2 = st.columns(2)
        c3, c4 = st.columns(2)

        def big_card(col, icon, title, key):
            with col:
                if st.button(f"{icon} {title}", key=key, use_container_width=True):
                    st.info(f"Open {title} — wire your own callback here.")

        big_card(c1, "📘", "Interactive Lessons", "btn_learn")
        big_card(c2, "🧩", "Challenges", "btn_chal")
        big_card(c3, "🚀", "Quizes", "btn_badge")
        big_card(c4, "🦸‍♂️", "Real Life Tasks", "btn_prog")
        st.markdown("</div>", unsafe_allow_html=True)

        # Institution leaderboard
        st.markdown("<div class='card' style='margin-top:12px;padding:12px'>"
                    "<h3>🏫 Institution Leaderboard (combined EcoPoints)</h3>", unsafe_allow_html=True)

        def _format_position(idx: int) -> str:
            """Return medal emoji for top 3 else numeric position."""
            if idx == 1:
                return "🥇"
            if idx == 2:
                return "🥈"
            if idx == 3:
                return "🥉"
            return str(idx)

        if USE_SUPABASE and supabase:
            try:
                q = (
                    supabase.table("Schools")
                    .select("name,total_ecopoints,member_count")
                    .order("total_ecopoints", desc=True)
                    .execute()
                )
                rows = q.data if q and getattr(q, "data", None) else []
                if rows:
                    # Build display list with position column (based on sorted order by total_ecopoints)
                    display = []
                    for idx, r in enumerate(rows, start=1):
                        name = r.get("name") or "Unknown"
                        pts = r.get("total_ecopoints") if r.get("total_ecopoints") is not None else 0
                        members = r.get("member_count") if r.get("member_count") is not None else 0
                        display.append({
                            "Position": _format_position(idx),
                            "Institution": name,
                            "EcoPoints": pts,
                            "Members": members
                        })
                    # Pass list-of-dicts to st.table so Streamlit doesn't render a DataFrame index column
                    st.table(display)
                else:
                    st.info("No institutions or users found yet in the database.")
            except Exception as e:
                st.error(f"Couldn't fetch leaderboard: {e}")
        else:
            # Local fallback: aggregate eco_points per institution, sort desc
            school_agg = {}
            for u in st.session_state.local_users.values():
                inst = u.get("institution") or "Unknown"
                pts = u.get("eco_points", 0) or 0
                school_agg[inst] = school_agg.get(inst, 0) + pts
            leaderboard = sorted(school_agg.items(), key=lambda x: x[1], reverse=True)
            if leaderboard:
                display = []
                for idx, (inst, pts) in enumerate(leaderboard, start=1):
                    display.append({
                        "Position": _format_position(idx),
                        "Institution": inst,
                        "EcoPoints": pts,
                        "Members": "—"  # local fallback doesn't track members easily
                    })
                st.table(display)
            else:
                st.info("No local users yet. Sign up to see your institution's total EcoPoints.")
        st.markdown("</div>", unsafe_allow_html=True)

    # Demo: Add EcoPoints
    with st.expander("Demo: Add EcoPoints to your account"):
        add_pts = st.number_input("Points to add", min_value=1, step=1, value=5)
        if st.button("Add EcoPoints (demo)"):
            email = st.session_state.get("user_email")
            if USE_SUPABASE and supabase:
                try:
                    q = supabase.table("UsersDatabase").select("eco_points").eq("email", email).execute()
                    cur = q.data[0].get("eco_points", 0) if q and getattr(q, "data", None) else 0
                    new = cur + add_pts
                    supabase.table("UsersDatabase").update({"eco_points": new}).eq("email", email).execute()
                    st.success(f"Added {add_pts} EcoPoints. New total: {new}")
                    latest = supabase.table("UsersDatabase").select("*").eq("email", email).execute()
                    if latest and getattr(latest, "data", None):
                        st.session_state.profile = latest.data[0]
                    safe_rerun()
                except Exception as e:
                    st.error(f"Couldn't update points in Supabase: {e}")
            else:
                u = st.session_state.local_users.get(email)
                if u:
                    u['eco_points'] = u.get('eco_points', 0) + add_pts
                    st.success(f"Added {add_pts} EcoPoints. New total: {u['eco_points']}")
                    st.session_state.profile = u
                    safe_rerun()
                else:
                    st.error("Local user not found")

    # Edit profile
    with st.expander("Edit profile"):
        with st.form("edit_profile_form"):
            cur_profile = st.session_state.get("profile") or {}
            new_username = st.text_input("Username", value=cur_profile.get("username") or st.session_state.get("username", ""))
            new_age = st.text_input("Age", value=str(cur_profile.get("age") or ""))
            new_education = st.selectbox("Education level", EDUCATION_LEVELS,
                                         index=EDUCATION_LEVELS.index(cur_profile.get("education"))
                                         if cur_profile.get("education") in EDUCATION_LEVELS else 0)
            new_institution = st.text_input("Institution name", value=cur_profile.get("institution", ""))
            new_avatar = st.radio("Avatar", AVATARS,
                                  index=AVATARS.index(cur_profile.get("avatar"))
                                  if cur_profile.get("avatar") in AVATARS else 0,
                                  horizontal=True)
            save = st.form_submit_button("Save profile")
            if save:
                payload = {
                    "username": new_username,
                    "age": int(new_age) if str(new_age).isdigit() else None,
                    "education": new_education,
                    "institution": new_institution,
                    "avatar": new_avatar
                }
                email = st.session_state.get("user_email")
                if USE_SUPABASE and supabase:
                    try:
                        supabase.table("UsersDatabase").update(payload).eq("email", email).execute()
                        st.success("Profile updated")
                        latest = supabase.table("UsersDatabase").select("*").eq("email", email).execute()
                        if latest and getattr(latest, "data", None):
                            st.session_state.profile = latest.data[0]
                        safe_rerun()
                    except Exception as e:
                        st.error(f"Couldn't update profile: {e}")
                else:
                    u = st.session_state.local_users.get(email)
                    if u:
                        u.update(payload)
                        st.session_state.profile = u
                        st.success("Profile updated (local)")
                        safe_rerun()

# --------------------
# Entrypoint
# --------------------
if "user_email" not in st.session_state:
    st.session_state.user_email = None

if st.session_state.user_email:
    main_app()
else:
    auth_screen()
