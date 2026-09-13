const EMAIL_DOMAIN = "user.local";

firebase.initializeApp(window.firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const el = (id) => document.getElementById(id);

/* 탭 전환 */
el("tabCreate").addEventListener("click", () => switchTab("create"));
el("tabLogin").addEventListener("click", () => switchTab("login"));
function switchTab(which) {
  el("tabCreate").classList.toggle("active", which === "create");
  el("tabLogin").classList.toggle("active", which === "login");
  el("createForm").hidden = which !== "create";
  el("loginForm").hidden = which !== "login";
}

/* 테마 선택 */
document.querySelectorAll(".theme-btn").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".theme-btn").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    el("createTheme").value = b.dataset.theme;
  });
});

function errorMessage(err) {
  if (err.code === "auth/email-already-in-use") return "이미 사용 중인 아이디예요.";
  if (err.code === "auth/weak-password") return "비밀번호는 6자 이상이어야 해요.";
  if (err.code === "auth/invalid-email") return "아이디에 쓸 수 없는 문자가 있어요.";
  return "문제가 생겼어요. 다시 시도해주세요.";
}

/* 익명함 생성 */
el("createForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = el("createId").value.trim();
  const pw = el("createPw").value;
  const nickname = el("createNickname").value.trim();
  const theme = el("createTheme").value;
  const activeThemeBtn = document.querySelector(".theme-btn.active");
  const color = activeThemeBtn ? activeThemeBtn.dataset.color : "#185FA5";
  el("createError").hidden = true;

  if (!/^[a-zA-Z0-9_]{3,20}$/.test(id)) {
    el("createError").textContent = "아이디는 영문/숫자/밑줄 3~20자로 입력해주세요.";
    el("createError").hidden = false;
    return;
  }

  try {
    const cred = await auth.createUserWithEmailAndPassword(`${id}@${EMAIL_DOMAIN}`, pw);
    await db.collection("boxes").doc(cred.user.uid).set({
      nickname,
      theme,
      color,
      status: { preset: "근무중", note: "" },
      showTime: true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    location.href = `box.html?id=${cred.user.uid}`;
  } catch (err) {
    el("createError").textContent = errorMessage(err);
    el("createError").hidden = false;
  }
});

/* 로그인 */
el("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = el("loginId").value.trim();
  const pw = el("loginPw").value;
  el("loginErrorLanding").hidden = true;
  try {
    const cred = await auth.signInWithEmailAndPassword(`${id}@${EMAIL_DOMAIN}`, pw);
    location.href = `box.html?id=${cred.user.uid}`;
  } catch (err) {
    el("loginErrorLanding").textContent = "아이디 또는 비밀번호가 올바르지 않아요.";
    el("loginErrorLanding").hidden = false;
  }
});
