/* ===== 설정 ===== */
// 관리자 계정은 이메일/비밀번호가 필요한 Firebase Auth 구조를 그대로 쓰되,
// 화면에는 비밀번호만 물어보도록 이메일을 고정값으로 둡니다.
// Firebase 콘솔 > Authentication에서 이 이메일로 계정을 하나 만들고 비밀번호를 설정하세요.
const ADMIN_EMAIL = "kawkjaegang@admin.local";

// 헤더에 표시할 기본 프로필 사진
const AVATAR_URL = "gwakjegang_default.png";

// 답변 옆에 표시할 표정별 이미지. 나중에 표정이 늘어나면 여기에 추가하면 됩니다.
const EXPRESSION_IMAGES = {
  default: "gwakjegang_default.png",
  thinking: "gwakjegang_thinking.png",
};

/* ===== 초기화 ===== */
firebase.initializeApp(window.firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let isAdmin = false;
let currentExpression = "default";

const el = (id) => document.getElementById(id);

db.collection("site").doc("profile").onSnapshot((doc) => {
  const data = doc.data();
  const url = (data && data.avatarUrl) || AVATAR_URL;
  el("mainAvatar").style.backgroundImage = `url(${url})`;
});

/* ===== 상태(스탠딩) 표시 ===== */
db.collection("site").doc("status").onSnapshot((doc) => {
  const data = doc.data() || { preset: "근무중", note: "" };
  const line = data.note ? `${data.preset} · ${data.note}` : data.preset;
  el("statusLine").textContent = line;
});

/* ===== 로그인 상태 ===== */
auth.onAuthStateChanged((user) => {
  isAdmin = !!user && user.email === ADMIN_EMAIL;
  el("loginMenuItem").hidden = isAdmin;
  el("statusMenuItem").hidden = !isAdmin;
  el("avatarMenuItem").hidden = !isAdmin;
  el("logoutMenuItem").hidden = !isAdmin;
  renderQuestions();
});

/* ===== 질문 피드 ===== */
let cachedQuestions = [];

db.collection("questions").orderBy("createdAt", "asc").onSnapshot((snap) => {
  cachedQuestions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  renderQuestions();
});

function formatTime(ts) {
  if (!ts) return "방금";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function renderQuestions() {
  const feed = el("chatFeed");
  feed.innerHTML = "";

  if (cachedQuestions.length === 0) {
    feed.innerHTML = '<p class="empty-state">아직 아무도 흥미로운 걸 안 물어봤군요.</p>';
    return;
  }

  cachedQuestions.forEach((q) => {
    const block = document.createElement("div");
    block.className = "qa-block";

    const qBubble = document.createElement("div");
    qBubble.className = "bubble question";
    qBubble.textContent = q.text;
    block.appendChild(qBubble);

    const qMeta = document.createElement("p");
    qMeta.className = "meta right";
    qMeta.textContent = `익명 · ${formatTime(q.createdAt)}`;
    block.appendChild(qMeta);

    if (q.answer) {
      const row = document.createElement("div");
      row.className = "answer-row";

      const img = document.createElement("img");
      img.className = "char-avatar";
      img.src = EXPRESSION_IMAGES[q.expression] || EXPRESSION_IMAGES.default;
      img.alt = "곽제강";
      row.appendChild(img);

      const aBubble = document.createElement("div");
      aBubble.className = "bubble answer";
      aBubble.textContent = q.answer;
      row.appendChild(aBubble);

      block.appendChild(row);

      const aMeta = document.createElement("p");
      aMeta.className = "meta left";
      aMeta.textContent = formatTime(q.answeredAt);
      block.appendChild(aMeta);
    } else if (isAdmin) {
      const btn = document.createElement("button");
      btn.className = "answer-cta";
      btn.textContent = "답변하기";
      btn.addEventListener("click", () => openAnswerModal(q.id, q.text));
      block.appendChild(btn);
    }

    feed.appendChild(block);
  });

  feed.scrollTop = feed.scrollHeight;
}

/* ===== 질문 제출 ===== */
el("composerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = el("questionInput");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  await db.collection("questions").add({
    text,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    answer: null,
    answeredAt: null,
    expression: null,
  });
});

/* ===== 슬라이드 메뉴 ===== */
el("menuBtn").addEventListener("click", () => el("menuBackdrop").classList.add("open"));
el("menuBackdrop").addEventListener("click", (e) => {
  if (e.target === el("menuBackdrop")) el("menuBackdrop").classList.remove("open");
});

el("loginMenuItem").addEventListener("click", () => {
  el("menuBackdrop").classList.remove("open");
  el("loginError").hidden = true;
  el("passwordInput").value = "";
  el("loginBackdrop").classList.add("open");
});

el("logoutMenuItem").addEventListener("click", async () => {
  el("menuBackdrop").classList.remove("open");
  await auth.signOut();
});

/* ===== 로그인 모달 ===== */
el("loginCancel").addEventListener("click", () => el("loginBackdrop").classList.remove("open"));
el("loginBackdrop").addEventListener("click", (e) => {
  if (e.target === el("loginBackdrop")) el("loginBackdrop").classList.remove("open");
});
el("loginSubmit").addEventListener("click", async () => {
  const password = el("passwordInput").value;
  if (!password) return;
  try {
    await auth.signInWithEmailAndPassword(ADMIN_EMAIL, password);
    el("loginBackdrop").classList.remove("open");
  } catch (err) {
    el("loginError").textContent = "비밀번호가 올바르지 않아요.";
    el("loginError").hidden = false;
  }
});

/* ===== 상태 변경 모달 ===== */
el("statusMenuItem").addEventListener("click", async () => {
  el("menuBackdrop").classList.remove("open");
  const doc = await db.collection("site").doc("status").get();
  const data = doc.data() || { preset: "근무중", note: "" };
  document.querySelectorAll(".preset-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.preset === data.preset);
  });
  el("statusNoteInput").value = data.note || "";
  el("statusBackdrop").classList.add("open");
});
el("statusCancel").addEventListener("click", () => el("statusBackdrop").classList.remove("open"));
el("statusBackdrop").addEventListener("click", (e) => {
  if (e.target === el("statusBackdrop")) el("statusBackdrop").classList.remove("open");
});
document.querySelectorAll(".preset-btn").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".preset-btn").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
  });
});
el("statusSubmit").addEventListener("click", async () => {
  const activeBtn = document.querySelector(".preset-btn.active");
  const preset = activeBtn ? activeBtn.dataset.preset : "근무중";
  const note = el("statusNoteInput").value.trim();
  await db.collection("site").doc("status").set({
    preset,
    note,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  el("statusBackdrop").classList.remove("open");
});

/* ===== 프로필 사진 변경 모달 ===== */
let selectedAvatarFile = null;

function resizeImageToDataUrl(file, maxSize = 240) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

el("avatarMenuItem").addEventListener("click", () => {
  el("menuBackdrop").classList.remove("open");
  selectedAvatarFile = null;
  el("avatarFileInput").value = "";
  el("avatarError").hidden = true;
  el("avatarPreview").style.backgroundImage = el("mainAvatar").style.backgroundImage;
  el("avatarBackdrop").classList.add("open");
});
el("avatarCancel").addEventListener("click", () => el("avatarBackdrop").classList.remove("open"));
el("avatarBackdrop").addEventListener("click", (e) => {
  if (e.target === el("avatarBackdrop")) el("avatarBackdrop").classList.remove("open");
});
el("avatarFileInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  selectedAvatarFile = file;
  el("avatarPreview").style.backgroundImage = `url(${URL.createObjectURL(file)})`;
});
el("avatarSubmit").addEventListener("click", async () => {
  if (!selectedAvatarFile) {
    el("avatarBackdrop").classList.remove("open");
    return;
  }
  try {
    const dataUrl = await resizeImageToDataUrl(selectedAvatarFile, 240);
    await db.collection("site").doc("profile").set({
      avatarUrl: dataUrl,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    el("avatarBackdrop").classList.remove("open");
  } catch (err) {
    el("avatarError").textContent = "업로드에 실패했어요. 다시 시도해주세요.";
    el("avatarError").hidden = false;
  }
});

/* ===== 답변 작성 모달 ===== */
let answeringId = null;

function openAnswerModal(id, questionText) {
  answeringId = id;
  el("answerQuestionText").textContent = questionText;
  el("answerInput").value = "";
  currentExpression = "default";
  el("expressionLabel").textContent = "기본 표정";
  el("expressionPicker").hidden = true;
  el("answerBackdrop").classList.add("open");
}

el("answerCancel").addEventListener("click", () => el("answerBackdrop").classList.remove("open"));
el("answerBackdrop").addEventListener("click", (e) => {
  if (e.target === el("answerBackdrop")) el("answerBackdrop").classList.remove("open");
});

el("expressionBtn").addEventListener("click", () => {
  el("expressionPicker").hidden = !el("expressionPicker").hidden;
});
document.querySelectorAll(".expression-picker button").forEach((b) => {
  b.addEventListener("click", () => {
    currentExpression = b.dataset.expr;
    el("expressionLabel").textContent = b.textContent;
    document.querySelectorAll(".expression-picker button").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    el("expressionPicker").hidden = true;
  });
});

el("answerSubmit").addEventListener("click", async () => {
  const answer = el("answerInput").value.trim();
  if (!answer || !answeringId) return;
  await db.collection("questions").doc(answeringId).update({
    answer,
    answeredAt: firebase.firestore.FieldValue.serverTimestamp(),
    expression: currentExpression,
  });
  el("answerBackdrop").classList.remove("open");
});
