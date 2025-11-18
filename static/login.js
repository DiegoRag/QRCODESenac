/* ======================
   Login: AES-CBC + fetch("/login") + carrossel + Easter Egg
   ====================== */
"use strict";

/* AES config (mesma do backend) */
const SECRET_KEY = CryptoJS.enc.Utf8.parse("1234567890abcdef");
const IV         = CryptoJS.enc.Utf8.parse("abcdef1234567890");

function encryptString(plain) {
  const enc = CryptoJS.AES.encrypt(plain, SECRET_KEY, {
    iv: IV,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  return CryptoJS.enc.Base64.stringify(enc.ciphertext);
}

/* UI helpers */
function togglePassword() {
  const input = document.getElementById("password");
  const eye   = document.getElementById("eye");
  if (!input || !eye) return;

  const isPwd = input.type === "password";
  input.type = isPwd ? "text" : "password";
  eye.innerHTML = isPwd
    ? '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" stroke-width="1.8"/><path d="M3 3l18 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
    : '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/>';
}

function showEggModal() {
  const backdrop = document.getElementById("egg-backdrop");
  const frame    = document.getElementById("egg-frame");
  if (!backdrop || !frame) return;

  backdrop.style.display = "grid";
  requestAnimationFrame(() => backdrop.classList.add("is-open"));
  frame.src = "https://www.youtube.com/embed/s-FXdauGeVA?autoplay=1&rel=0&modestbranding=1&controls=1";
}

function closeEggModal() {
  const backdrop = document.getElementById("egg-backdrop");
  const frame    = document.getElementById("egg-frame");
  if (backdrop) {
    backdrop.classList.remove("is-open");
    setTimeout(() => { backdrop.style.display = "none"; }, 200);
  }
  if (frame) frame.src = "about:blank";
}

/* Submit da autenticação */
async function handleSubmit(e) {
  e.preventDefault();
  const btn       = document.getElementById("submit-btn");
  const username  = document.getElementById("username").value.trim().toLowerCase();
  const pwdPlain  = document.getElementById("password").value;
  const remember  = document.getElementById("remember").checked;
  const errorEl   = document.getElementById("error-msg");

  // Easter Egg
  if (username === "easter egg") {
    showEggModal();
    return;
  }

  const original = btn.textContent;
  btn.disabled = true; btn.textContent = "Entrando…";
  if (errorEl) errorEl.style.display = "none";

  try {
    const payload = { username, password: encryptString(pwdPlain) };

    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const js = await res.json();

    if (res.ok && js.ok) {
      localStorage.setItem("userType", js.userType || (username === "admin" ? "admin" : "visitor"));
      if (remember) localStorage.setItem("rememberUser", username);
      else localStorage.removeItem("rememberUser");
const userType = js.userType || (username === "admin" ? "admin" : "visitor");

if (userType === "admin") {
    // redireciona o admin para a página atual de admin
    location.href = "/home";
} else {
    // redireciona o visitante para sua homepage
    location.href = "/visitor-homepage.html";
}

    } else {
      if (errorEl) {
        errorEl.textContent = js.error || js.msg || "Usuário ou senha incorretos.";
        errorEl.style.display = "block";
      }
    }
  } catch (err) {
    if (errorEl) {
      errorEl.textContent = "Erro na comunicação com o servidor.";
      errorEl.style.display = "block";
    }
  } finally {
    btn.disabled = false; btn.textContent = original;
  }
}

/* Boot da página */
document.addEventListener("DOMContentLoaded", () => {
  // Carrossel
  const slides = Array.from(document.querySelectorAll(".slide"));
  const dots   = Array.from(document.querySelectorAll(".dot"));

  if (slides.length && dots.length) {
    let i = 0, timer = null;

    function go(n) {
      if (!slides[i] || !dots[i]) return;
      slides[i].classList.remove("is-active");
      dots[i].classList.remove("is-active");
      i = (n + slides.length) % slides.length;
      slides[i].classList.add("is-active");
      dots[i].classList.add("is-active");
      restartProgress();
    }
    function next(){ go(i + 1); }
    function restartProgress(){ clearInterval(timer); timer = setInterval(next, 5000); }

    dots.forEach((d, idx) => d.addEventListener("click", () => go(idx)));
    restartProgress();
  } else {
    console.warn("[WARN] Carrossel desativado: .slide/.dot não encontrados.");
  }

  // Modal
  const backdrop = document.getElementById("egg-backdrop");
  const btnClose = document.getElementById("egg-close");
  if (backdrop) backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeEggModal(); });
  if (btnClose) btnClose.addEventListener("click", closeEggModal);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeEggModal(); });

  // Form
  const form = document.getElementById("login-form");
  if (form) form.addEventListener("submit", handleSubmit);

  // Lembrar usuário
  const remembered = localStorage.getItem("rememberUser");
  if (remembered) {
    const u = document.getElementById("username");
    if (u) u.value = remembered;
  }
});

/* Theming helper */
window.__setBrand = (hex) => {
  document.documentElement.style.setProperty("--brand-1", hex);
};

function switchToSignup(e){
  e?.preventDefault?.();
  alert("Fluxo de cadastro ainda não implementado.");
}
