const EMAIL_DOMAIN = "user.local";

firebase.initializeApp(window.firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const el = (id) => document.getElementById(id);

const params = new URLSearchParams(location.search);
const boxId = params.get("id");

let isAdmin = false;
let boxData = null;
let cachedQuestions = [];

if (!boxId) {
  document.body.innerHTML = '<p style="padding:40px 20px; text-align:center; color:#78766F;">잘못된 링크예요. 익명함 주소를 다시 확인해주세요.</p>';
  throw new Error("no box id");
}

const boxRef = db.collection("boxes").doc(boxId);

/* ===== 박스 정보(닉네임/테마/색/상태/아바타) ===== */
boxRef.onSnapshot((doc) => {
  boxData = doc.data();
  if (!boxData) {
    el("boxNickname").textContent = "불러오는 중...";
    maybeSelfHeal();
    return;
  }
  applyTheme(boxData);

  el("boxNickname").textContent = boxData.nickname || "이름 없음";

  const status = boxData.status || { preset: "근무중", note: "" };
  let statusLine = status.note ? `${status.preset} · ${status.note}` : status.preset;
  if (status.location) statusLine += ` · ${status.location}`;
  el("statusLine").textContent = statusLine;

  if (boxData.avatarUrl) {
    el("mainAvatar").style.backgroundImage = `url(${boxData.avatarUrl})`;
    el("mainAvatar").textContent = "";
  } else {
    el("mainAvatar").style.backgroundImage = "none";
    el("mainAvatar").textContent = (boxData.nickname || "?").charAt(0);
  }

  if (boxData.twitterUrl) {
    el("mainAvatar").style.cursor = "pointer";
    el("mainAvatar").onclick = () => window.open(boxData.twitterUrl, "_blank", "noopener");
  } else {
    el("mainAvatar").style.cursor = "default";
    el("mainAvatar").onclick = null;
  }

  if (boxData.bgUrl) {
    el("app").style.backgroundImage = `linear-gradient(rgba(255,255,255,0.82), rgba(255,255,255,0.82)), url(${boxData.bgUrl})`;
    el("app").style.backgroundSize = "cover, cover";
    el("app").style.backgroundPosition = "center, center";
  } else {
    el("app").style.backgroundImage = "none";
  }

  el("attachBtn").hidden = !boxData.allowImageAttach;

  renderQuestions();
});

function applyTheme(box) {
  const root = document.documentElement.style;
  root.setProperty("--accent", box.color || "#185FA5");
  if (box.theme === "disaster") {
    root.setProperty("--page", "#E4EBF1");
    root.setProperty("--surface", "#FBFDFE");
    root.setProperty("--surface-2", "#DCE6EE");
    root.setProperty("--line", "#C3D2DC");
  } else {
    root.removeProperty("--page");
    root.removeProperty("--surface");
    root.removeProperty("--surface-2");
    root.removeProperty("--line");
  }
  if (box.theme === "disaster") {
    el("workspaceLogo").src = "disaster_logo.png";
    el("workspaceName").textContent = "초자연 재난관리국";
    el("workspaceSub").textContent = "긴급 대응 채널";
  } else {
    el("workspaceLogo").src = "daydream_logo.png";
    el("workspaceName").textContent = "Daydream Inc.";
    el("workspaceSub").textContent = "백일몽 주식회사";
  }
}

/* ===== 로그인 상태 (이 박스의 주인인지 확인) ===== */
let healed = false;
async function maybeSelfHeal() {
  if (healed) return;
  const user = auth.currentUser;
  if (!user || user.uid !== boxId) return;
  if (boxData) return;
  healed = true;
  await boxRef.set({
    nickname: "이름 없음",
    theme: "daydream",
    color: "#185FA5",
    status: { preset: "근무중", note: "" },
    showTime: true,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

auth.onAuthStateChanged((user) => {
  isAdmin = !!user && user.uid === boxId;
  el("loginMenuItem").hidden = isAdmin;
  el("profileMenuItem").hidden = !isAdmin;
  el("logoutMenuItem").hidden = !isAdmin;
  renderQuestions();
});

/* ===== 질문 피드 ===== */
boxRef.collection("questions").orderBy("createdAt", "asc").onSnapshot((snap) => {
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

  if (!boxData) return;

  if (cachedQuestions.length === 0) {
    feed.innerHTML = '<p class="empty-state">아직 아무도 흥미로운 걸 안 물어봤군요.</p>';
    return;
  }

  const showTime = boxData.showTime !== false;

  cachedQuestions.forEach((q) => {
    const block = document.createElement("div");
    block.className = "qa-block";

    const qBubble = document.createElement("div");
    qBubble.className = "bubble question";
    if (q.imageUrl) {
      const img = document.createElement("img");
      img.className = "bubble-image";
      img.src = q.imageUrl;
      img.alt = "첨부한 사진";
      qBubble.appendChild(img);
    }
    const qText = document.createElement("span");
    qText.textContent = q.text;
    qBubble.appendChild(qText);
    block.appendChild(qBubble);

    if (showTime) {
      const qMeta = document.createElement("p");
      qMeta.className = "meta right";
      qMeta.textContent = `익명 · ${formatTime(q.createdAt)}`;
      block.appendChild(qMeta);
    }

    if (q.answer) {
      const row = document.createElement("div");
      row.className = "answer-row";

      let img;
      if (q.expressionImageUrl) {
        img = document.createElement("img");
        img.className = "char-avatar-img";
        img.src = q.expressionImageUrl;
        img.alt = boxData.nickname || "";
      } else {
        img = document.createElement("div");
        img.className = "char-avatar";
        if (boxData.avatarUrl) {
          img.style.backgroundImage = `url(${boxData.avatarUrl})`;
        } else {
          img.textContent = (boxData.nickname || "?").charAt(0);
        }
      }
      row.appendChild(img);

      const aBubble = document.createElement("div");
      aBubble.className = "bubble answer";
      aBubble.textContent = q.answer;
      row.appendChild(aBubble);

      block.appendChild(row);

      if (showTime) {
        const aMeta = document.createElement("p");
        aMeta.className = "meta left";
        aMeta.textContent = formatTime(q.answeredAt);
        block.appendChild(aMeta);
      }

      if (isAdmin) {
        const actions = document.createElement("div");
        actions.className = "admin-actions";

        const editBtn = document.createElement("button");
        editBtn.className = "answer-cta";
        editBtn.textContent = "수정";
        editBtn.addEventListener("click", () => openAnswerModal(q.id, q.text, q.answer, q.expressionImageUrl));
        actions.appendChild(editBtn);

        const undoBtn = document.createElement("button");
        undoBtn.className = "answer-cta";
        undoBtn.textContent = "답변 취소";
        undoBtn.addEventListener("click", () => retractAnswer(q.id));
        actions.appendChild(undoBtn);
        actions.appendChild(createDeleteButton(q.id));

        block.appendChild(actions);
      }
    } else if (isAdmin) {
      const actions = document.createElement("div");
      actions.className = "admin-actions";

      const btn = document.createElement("button");
      btn.className = "answer-cta";
      btn.textContent = "답변하기";
      btn.addEventListener("click", () => openAnswerModal(q.id, q.text));
      actions.appendChild(btn);
      actions.appendChild(createDeleteButton(q.id));

      block.appendChild(actions);
    }

    feed.appendChild(block);
  });

  feed.scrollTop = feed.scrollHeight;
}

function createDeleteButton(id) {
  const btn = document.createElement("button");
  btn.className = "icon-btn";
  btn.setAttribute("aria-label", "삭제");
  btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';
  btn.addEventListener("click", () => {
    if (confirm("이 질문을 삭제할까요? 답변도 함께 사라져요.")) {
      boxRef.collection("questions").doc(id).delete();
    }
  });
  return btn;
}

async function retractAnswer(id) {
  if (!confirm("답변을 취소하고 미답변 상태로 되돌릴까요?")) return;
  await boxRef.collection("questions").doc(id).update({
    answer: null,
    answeredAt: null,
    expressionImageUrl: null,
  });
}

/* ===== 질문 제출 (사진 첨부 포함) ===== */
let composerImageFile = null;

el("attachBtn").addEventListener("click", () => el("composerImageInput").click());

el("composerImageInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  composerImageFile = file;
  el("composerImageThumb").src = URL.createObjectURL(file);
  el("composerImagePreview").hidden = false;
});

el("composerImageRemove").addEventListener("click", () => {
  composerImageFile = null;
  el("composerImageInput").value = "";
  el("composerImagePreview").hidden = true;
});

el("composerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = el("questionInput");
  const text = input.value.trim();
  if (!text) return;

  const payload = {
    text,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    answer: null,
    answeredAt: null,
  };

  try {
    if (composerImageFile) {
      payload.imageUrl = await resizeImageToDataUrl(composerImageFile, 640, 0.7);
    }

    await boxRef.collection("questions").add(payload);

    input.value = "";
    composerImageFile = null;
    el("composerImageInput").value = "";
    el("composerImagePreview").hidden = true;
  } catch (err) {
    alert("전송에 실패했어요: " + err.message);
  }
});

/* ===== 슬라이드 메뉴 ===== */
el("menuBtn").addEventListener("click", () => el("menuBackdrop").classList.add("open"));
el("menuBackdrop").addEventListener("click", (e) => {
  if (e.target === el("menuBackdrop")) el("menuBackdrop").classList.remove("open");
});

el("copyLinkMenuItem").addEventListener("click", async () => {
  el("menuBackdrop").classList.remove("open");
  const url = `${location.origin}${location.pathname}?id=${boxId}`;
  try {
    await navigator.clipboard.writeText(url);
    alert("링크를 복사했어요.");
  } catch (err) {
    prompt("아래 링크를 복사하세요", url);
  }
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
  const id = prompt("아이디를 입력하세요");
  if (!id) return;
  try {
    const cred = await auth.signInWithEmailAndPassword(`${id}@${EMAIL_DOMAIN}`, password);
    if (cred.user.uid !== boxId) {
      await auth.signOut();
      el("loginError").textContent = "이 익명함의 주인이 아니에요.";
      el("loginError").hidden = false;
      return;
    }
    el("loginBackdrop").classList.remove("open");
  } catch (err) {
    el("loginError").textContent = "아이디 또는 비밀번호가 올바르지 않아요.";
    el("loginError").hidden = false;
  }
});

/* ===== 프로필 설정 모달 ===== */
let selectedAvatarFile = null;
let selectedBgFile = null;
let clearBg = false;
let workingExpressions = [];

function renderExprList() {
  const list = el("exprList");
  list.innerHTML = "";
  workingExpressions.forEach((expr) => {
    const chip = document.createElement("span");
    chip.className = "expr-chip";
    const img = document.createElement("img");
    img.src = expr.imageUrl;
    img.alt = expr.label;
    chip.appendChild(img);
    const label = document.createElement("span");
    label.textContent = expr.label;
    chip.appendChild(label);
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.setAttribute("aria-label", "표정 삭제");
    removeBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>';
    removeBtn.addEventListener("click", () => {
      workingExpressions = workingExpressions.filter((e) => e.id !== expr.id);
      renderExprList();
    });
    chip.appendChild(removeBtn);
    list.appendChild(chip);
  });
}

el("exprAddBtn").addEventListener("click", async () => {
  const label = el("exprLabelInput").value.trim();
  const file = el("exprFileInput").files[0];
  if (!label || !file) {
    alert("표정 이름과 사진을 둘 다 넣어주세요.");
    return;
  }
  try {
    const imageUrl = await resizeImageToDataUrl(file, 200, 0.85, "png");
    workingExpressions.push({ id: `${Date.now()}`, label, imageUrl });
    el("exprLabelInput").value = "";
    el("exprFileInput").value = "";
    renderExprList();
  } catch (err) {
    alert(err.message || "사진 처리에 실패했어요.");
  }
});

function resizeImageToDataUrl(file, maxSize = 240, quality = 0.85, format = "jpeg") {
  if (file.type === "image/gif") {
    return new Promise((resolve, reject) => {
      if (file.size > 700 * 1024) {
        reject(new Error("움짤 용량이 너무 커요. 700KB 이하로 줄여서 다시 시도해주세요."));
        return;
      }
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }
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
        if (format === "png") {
          resolve(canvas.toDataURL("image/png"));
        } else {
          resolve(canvas.toDataURL("image/jpeg", quality));
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

el("profileMenuItem").addEventListener("click", () => {
  el("menuBackdrop").classList.remove("open");
  if (!boxData) return;

  selectedAvatarFile = null;
  selectedBgFile = null;
  clearBg = false;
  el("avatarFileInput").value = "";
  el("bgFileInput").value = "";
  el("profileError").hidden = true;

  el("avatarPreview").style.backgroundImage = el("mainAvatar").style.backgroundImage;
  el("bgPreview").style.backgroundImage = boxData.bgUrl ? `url(${boxData.bgUrl})` : "none";
  el("nicknameInput").value = boxData.nickname || "";
  el("twitterInput").value = boxData.twitterUrl || "";

  workingExpressions = (boxData.expressions || []).slice();
  el("exprLabelInput").value = "";
  el("exprFileInput").value = "";
  renderExprList();

  const status = boxData.status || { preset: "근무중", note: "", location: "" };
  document.querySelectorAll(".preset-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.preset === status.preset);
  });
  el("statusNoteInput").value = status.note || "";
  el("locationInput").value = status.location || "";

  document.querySelectorAll(".color-swatch").forEach((b) => {
    b.classList.toggle("active", b.dataset.color === (boxData.color || "#185FA5"));
  });

  const showTime = boxData.showTime !== false;
  el("showTimeToggle").setAttribute("aria-pressed", showTime ? "true" : "false");
  el("allowImageToggle").setAttribute("aria-pressed", boxData.allowImageAttach ? "true" : "false");

  el("profileBackdrop").classList.add("open");
});

el("profileCancel").addEventListener("click", () => el("profileBackdrop").classList.remove("open"));
el("profileBackdrop").addEventListener("click", (e) => {
  if (e.target === el("profileBackdrop")) el("profileBackdrop").classList.remove("open");
});

document.querySelectorAll(".preset-btn").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".preset-btn").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
  });
});

document.querySelectorAll(".color-swatch").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".color-swatch").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
  });
});

el("showTimeToggle").addEventListener("click", () => {
  const pressed = el("showTimeToggle").getAttribute("aria-pressed") === "true";
  el("showTimeToggle").setAttribute("aria-pressed", pressed ? "false" : "true");
});

el("allowImageToggle").addEventListener("click", () => {
  const pressed = el("allowImageToggle").getAttribute("aria-pressed") === "true";
  el("allowImageToggle").setAttribute("aria-pressed", pressed ? "false" : "true");
});

el("avatarFileInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  selectedAvatarFile = file;
  el("avatarPreview").style.backgroundImage = `url(${URL.createObjectURL(file)})`;
});

el("bgFileInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  selectedBgFile = file;
  clearBg = false;
  el("bgPreview").style.backgroundImage = `url(${URL.createObjectURL(file)})`;
});

el("bgClearBtn").addEventListener("click", () => {
  selectedBgFile = null;
  clearBg = true;
  el("bgFileInput").value = "";
  el("bgPreview").style.backgroundImage = "none";
});

el("profileSubmit").addEventListener("click", async () => {
  el("profileError").hidden = true;
  el("profileSubmit").disabled = true;
  el("profileSubmit").textContent = "저장 중...";

  try {
    const nickname = el("nicknameInput").value.trim() || "이름 없음";
    const twitterUrl = el("twitterInput").value.trim();
    const activePreset = document.querySelector(".preset-btn.active");
    const activeColor = document.querySelector(".color-swatch.active");
    const showTime = el("showTimeToggle").getAttribute("aria-pressed") === "true";
    const allowImageAttach = el("allowImageToggle").getAttribute("aria-pressed") === "true";

    const update = {
      nickname,
      twitterUrl,
      color: activeColor ? activeColor.dataset.color : (boxData.color || "#185FA5"),
      status: {
        preset: activePreset ? activePreset.dataset.preset : "근무중",
        note: el("statusNoteInput").value.trim(),
        location: el("locationInput").value.trim(),
      },
      showTime,
      allowImageAttach,
      expressions: workingExpressions,
    };

    if (selectedAvatarFile) {
      update.avatarUrl = await resizeImageToDataUrl(selectedAvatarFile, 240, 0.85, "png");
    }
    if (selectedBgFile) {
      update.bgUrl = await resizeImageToDataUrl(selectedBgFile, 480, 0.7);
    } else if (clearBg) {
      update.bgUrl = firebase.firestore.FieldValue.delete();
    }

    await boxRef.update(update);
    el("profileBackdrop").classList.remove("open");
  } catch (err) {
    el("profileError").textContent = "저장에 실패했어요. 다시 시도해주세요.";
    el("profileError").hidden = false;
  } finally {
    el("profileSubmit").disabled = false;
    el("profileSubmit").textContent = "저장";
  }
});

/* ===== 답변 작성 모달 ===== */
let answeringId = null;
let selectedExpressionImageUrl = null;
let editingExistingAnswer = false;

function openAnswerModal(id, questionText, existingAnswer, existingExpressionImageUrl) {
  answeringId = id;
  el("answerQuestionText").textContent = questionText;
  el("answerInput").value = existingAnswer || "";
  editingExistingAnswer = !!existingAnswer;
  el("answerModalTitle").textContent = editingExistingAnswer ? "답변 수정" : "답변 작성";
  selectedExpressionImageUrl = existingExpressionImageUrl || null;
  updateExpressionButton();
  renderExpressionPicker();
  el("expressionPicker").hidden = true;
  el("answerBackdrop").classList.add("open");
}

function updateExpressionButton() {
  const url = selectedExpressionImageUrl || (boxData && boxData.avatarUrl);
  el("expressionBtn").style.backgroundImage = url ? `url(${url})` : "none";
  const match = (boxData && boxData.expressions || []).find((e) => e.imageUrl === selectedExpressionImageUrl);
  el("expressionLabel").textContent = match ? match.label : "기본";
}

function renderExpressionPicker() {
  const picker = el("expressionPicker");
  picker.innerHTML = "";

  const defaultBtn = document.createElement("button");
  defaultBtn.type = "button";
  defaultBtn.textContent = "기본";
  defaultBtn.classList.toggle("active", !selectedExpressionImageUrl);
  defaultBtn.addEventListener("click", () => {
    selectedExpressionImageUrl = null;
    updateExpressionButton();
    renderExpressionPicker();
    picker.hidden = true;
  });
  picker.appendChild(defaultBtn);

  (( boxData && boxData.expressions) || []).forEach((expr) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.classList.toggle("active", selectedExpressionImageUrl === expr.imageUrl);
    const img = document.createElement("img");
    img.src = expr.imageUrl;
    img.alt = expr.label;
    btn.appendChild(img);
    const span = document.createElement("span");
    span.textContent = expr.label;
    btn.appendChild(span);
    btn.addEventListener("click", () => {
      selectedExpressionImageUrl = expr.imageUrl;
      updateExpressionButton();
      renderExpressionPicker();
      picker.hidden = true;
    });
    picker.appendChild(btn);
  });
}

el("expressionBtn").addEventListener("click", () => {
  el("expressionPicker").hidden = !el("expressionPicker").hidden;
});

el("answerCancel").addEventListener("click", () => el("answerBackdrop").classList.remove("open"));
el("answerBackdrop").addEventListener("click", (e) => {
  if (e.target === el("answerBackdrop")) el("answerBackdrop").classList.remove("open");
});

el("answerSubmit").addEventListener("click", async () => {
  const answer = el("answerInput").value.trim();
  if (!answer || !answeringId) return;
  const update = {
    answer,
    expressionImageUrl: selectedExpressionImageUrl,
  };
  if (!editingExistingAnswer) {
    update.answeredAt = firebase.firestore.FieldValue.serverTimestamp();
  }
  await boxRef.collection("questions").doc(answeringId).update(update);
  el("answerBackdrop").classList.remove("open");
});
