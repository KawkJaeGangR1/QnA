const EMAIL_DOMAIN = "user.local";

firebase.initializeApp(window.firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const el = (id) => document.getElementById(id);

el("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = el("loginId").value.trim();
  const pw = el("loginPw").value;
  el("loginErrorLanding").hidden = true;
  try {
    await auth.signInWithEmailAndPassword(`${id}@${EMAIL_DOMAIN}`, pw);
    el("loginForm").hidden = true;
    await loadOldQuestions();
    el("migrateSection").hidden = false;
  } catch (err) {
    el("loginErrorLanding").textContent = "아이디 또는 비밀번호가 올바르지 않아요.";
    el("loginErrorLanding").hidden = false;
  }
});

let oldDocs = [];

async function loadOldQuestions() {
  const snap = await db.collection("questions").get();
  oldDocs = snap.docs;
  el("oldCount").textContent = oldDocs.length;
}

el("migrateBtn").addEventListener("click", async () => {
  el("migrateError").hidden = true;
  el("migrateBtn").disabled = true;
  el("migrateBtn").textContent = "복사 중...";

  const uid = auth.currentUser.uid;
  const boxRef = db.collection("boxes").doc(uid).collection("questions");

  try {
    let count = 0;
    for (const doc of oldDocs) {
      const data = doc.data();
      await boxRef.add({
        text: data.text || "",
        createdAt: data.createdAt || firebase.firestore.FieldValue.serverTimestamp(),
        answer: data.answer || null,
        answeredAt: data.answeredAt || null,
      });
      count += 1;
    }
    el("migrateDone").hidden = false;
    el("doneCount").textContent = count;
    el("migrateBtn").hidden = true;
  } catch (err) {
    el("migrateError").textContent = "복사 중 문제가 생겼어요: " + err.message;
    el("migrateError").hidden = false;
    el("migrateBtn").disabled = false;
    el("migrateBtn").textContent = "내 익명함으로 복사하기";
  }
});
