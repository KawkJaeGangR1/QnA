# 제강 씨, 오늘도 출근하셨나요? — 익명 질문함

## 1. Firebase 프로젝트 준비

1. https://console.firebase.google.com 에서 새 프로젝트 생성
2. 왼쪽 메뉴 **Authentication** → 시작하기 → 로그인 방법에서 **이메일/비밀번호** 활성화
3. **Authentication > Users** 탭에서 사용자 추가
   - 이메일: `gwakjegang@admin.local` (app.js의 `ADMIN_EMAIL`과 반드시 동일해야 함)
   - 비밀번호: 원하는 비밀번호로 설정 (이게 실제 로그인 화면에서 입력할 비밀번호입니다)
4. 왼쪽 메뉴 **Firestore Database** → 데이터베이스 만들기 (프로덕션 모드로 생성)
5. **Firestore > 규칙** 탭에 아래 규칙을 붙여넣고 게시

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /questions/{qid} {
      allow read: if true;
      allow create: if request.resource.data.text is string
                    && request.resource.data.text.size() > 0
                    && request.resource.data.text.size() < 300
                    && request.resource.data.answer == null;
      allow update, delete: if request.auth != null;
    }
    match /site/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

6. **프로젝트 설정(톱니바퀴) > 일반 > 내 앱**에서 웹 앱 추가 후 나오는 설정값을
   `firebase-config.js`에 그대로 붙여넣기

## 2. 프로필/표정 이미지

`assets/` 폴더에 표정 이미지 두 장(`gwakjegang_default.png`, `gwakjegang_thinking.png`)이
이미 들어있고, `app.js`의 `EXPRESSION_IMAGES`에 연결되어 있습니다.
표정을 더 추가하고 싶으면 이미지를 `assets/`에 넣고, `EXPRESSION_IMAGES`에 한 줄
추가한 뒤 `index.html`의 `.expression-picker` 안에 버튼만 하나 더 넣으면 됩니다.

## 3. 배포 (GitHub Pages)

1. 이 폴더 전체를 새 GitHub 저장소에 업로드
2. 저장소 Settings > Pages > Branch를 main(또는 master)으로 설정
3. 몇 분 후 `https://아이디.github.io/저장소이름` 으로 접속 가능

## 4. 아직 안 된 것 (다음에 이어서 할 것)

- 다른 사람도 자기 익명함을 만들 수 있는 다중 계정 기능
- 스티커 꾸미기 기능
- 표정 이미지 추가 확보 (지금은 기본/생각 중 2종)
