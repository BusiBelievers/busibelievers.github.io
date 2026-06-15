(function () {
  const DEFAULT_ROLES = ["founder", "coordinator"];
  let styleAdded = false;

  function addAuthStyles() {
    if (styleAdded || !document.head) return;
    styleAdded = true;
    const style = document.createElement("style");
    style.textContent = `
html.busi-auth-pending body{visibility:hidden;}
body.busi-auth-blocked{visibility:visible;background:#0b1220;color:white;}
.busi-auth-panel{max-width:560px;margin:12vh auto;padding:28px;border-radius:12px;background:#111827;border:1px solid rgba(212,175,55,.45);box-shadow:0 18px 60px rgba(0,0,0,.35);font-family:Arial,sans-serif;color:white;}
.busi-auth-panel h1{margin:0 0 10px;font-size:28px;color:#f6e7b0;}
.busi-auth-panel p{line-height:1.55;color:#d7dce9;}
.busi-auth-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px;}
.busi-auth-button{display:inline-block;padding:11px 16px;border-radius:8px;background:#d4af37;color:#08111f;text-decoration:none;font-weight:bold;border:0;cursor:pointer;}
.busi-staff-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 16px;background:#101827;border-bottom:1px solid rgba(212,175,55,.45);font-family:Arial,sans-serif;color:#f7e6b0;font-size:13px;}
.busi-staff-bar button{padding:7px 11px;border-radius:999px;border:1px solid rgba(212,175,55,.55);background:rgba(212,175,55,.1);color:#f7e6b0;font-weight:bold;cursor:pointer;}
@media print{.busi-staff-bar{display:none!important;}}
`;
    document.head.appendChild(style);
  }

  function onReady(callback) {
    if (document.body) {
      callback();
      return;
    }
    document.addEventListener("DOMContentLoaded", callback, { once: true });
  }

  function getClient() {
    if (!window.BUSI_SUPABASE || !window.BUSI_SUPABASE.createClient) return null;
    return window.BUSI_SUPABASE.createClient();
  }

  function loginUrl(reason) {
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const params = new URLSearchParams({ redirect: current });
    if (reason) params.set("reason", reason);
    return `staff-login.html?${params.toString()}`;
  }

  function redirectToLogin(reason) {
    window.location.replace(loginUrl(reason));
  }

  function showBlocked(title, message) {
    document.documentElement.classList.remove("busi-auth-pending");
    onReady(() => {
      document.body.classList.add("busi-auth-blocked");
      document.body.innerHTML = `
<main class="busi-auth-panel" role="alert">
<h1>${title}</h1>
<p>${message}</p>
<div class="busi-auth-actions">
<a class="busi-auth-button" href="${loginUrl("signin")}">Go to Staff Login</a>
<a class="busi-auth-button" href="index.html">Return Home</a>
</div>
</main>`;
    });
  }

  async function getStaffProfile(client, session) {
    if (!client || !session || !session.user || !session.user.email) return null;

    const rpc = await client.rpc("current_staff_profile");
    if (!rpc.error) {
      const row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
      if (row && row.role) return row;
    }

    const selected = await client
      .from("users")
      .select("full_name,email,role")
      .ilike("email", session.user.email)
      .maybeSingle();

    if (!selected.error && selected.data && selected.data.role) return selected.data;

    return null;
  }

  function roleAllowed(profile, allowedRoles) {
    const allowed = Array.isArray(allowedRoles) && allowedRoles.length ? allowedRoles : DEFAULT_ROLES;
    return Boolean(profile && allowed.includes(profile.role));
  }

  function renderStaffBar(profile, client) {
    onReady(() => {
      if (document.querySelector(".busi-staff-bar")) return;
      const bar = document.createElement("div");
      bar.className = "busi-staff-bar";
      bar.innerHTML = `
<span>BUSI staff session: <strong>${profile.full_name || profile.email}</strong> (${profile.role})</span>
<button type="button">Sign Out</button>`;
      bar.querySelector("button").addEventListener("click", async () => {
        await client.auth.signOut();
        window.location.replace("staff-login.html?reason=signed-out");
      });
      document.body.insertBefore(bar, document.body.firstChild);
    });
  }

  async function requireStaffAccess(options) {
    addAuthStyles();
    document.documentElement.classList.add("busi-auth-pending");

    const allowedRoles = options && options.allowedRoles ? options.allowedRoles : DEFAULT_ROLES;
    const client = getClient();

    if (!client) {
      showBlocked("Staff Login Unavailable", "Supabase is not configured, so BUSI cannot verify staff access on this page.");
      return null;
    }

    const sessionResult = await client.auth.getSession();
    const session = sessionResult && sessionResult.data ? sessionResult.data.session : null;

    if (!session) {
      redirectToLogin("signin");
      return null;
    }

    const profile = await getStaffProfile(client, session);

    if (!profile) {
      showBlocked("Access Not Approved", "You are signed in, but this email is not approved in the BUSI staff users table. Ask a founder/admin to add your staff role in Supabase.");
      return null;
    }

    if (!roleAllowed(profile, allowedRoles)) {
      showBlocked("Access Denied", "Your BUSI staff role does not have permission to open this internal tool.");
      return null;
    }

    window.BUSI_AUTH_PROFILE = profile;
    window.BUSI_AUTH_VERIFIED = true;
    localStorage.setItem("busiStaffMode", "1");
    document.documentElement.classList.remove("busi-auth-pending");
    renderStaffBar(profile, client);

    client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") redirectToLogin("signed-out");
    });

    return profile;
  }

  window.BUSIAuth = {
    requireStaffAccess,
    getStaffProfile,
    getClient
  };
})();
