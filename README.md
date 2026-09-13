# 출근해도 익명으로 대화해야 하는구나 — 익명 질문함

누구나 자기 익명 질문함을 만들 수 있는 멀티 유저 구조입니다.
`index.html`(랜딩 페이지)에서 계정을 만들면 `box.html?id=본인UID`가 그 사람의 익명함이 됩니다.

## 1. Firebase 프로젝트 준비

1. https://console.firebase.google.com 에서 새 프로젝트 생성 (또는 기존 프로젝트 사용)
2. **Authentication** → 시작하기 → 로그인 방법에서 **이메일/비밀번호** 활성화
   (계정 생성은 이제 콘솔에서 수동으로 안 하고, 랜딩 페이지에서 사람들이 직접 만듭니다.)
3. **Firestore Database** → 데이터베이스 만들기 (프로덕션 모드)
4. **Firestore > 규칙** 탭에 아래 규칙을 붙여넣고 게시

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /boxes/{boxId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == boxId;

      match /questions/{qid} {
        allow read: if true;
        allow create: if (request.auth != null && request.auth.uid == boxId)
                      || (
                        request.resource.data.text is string
                        && request.resource.data.text.size() > 0
                        && request.resource.data.text.size() < 300
                        && request.resource.data.answer == null
                      );
        allow update, delete: if request.auth != null && request.auth.uid == boxId;
      }
    }

    // 예전 단일 사용자 버전의 테스트 데이터를 옮겨오기 위한 임시 규칙.
    // migrate.html로 이관 다 끝났으면 이 블록은 지워도 됩니다.
    match /questions/{qid} {
      allow read: if request.auth != null;
    }
  }
}
```

5. **프로젝트 설정(톱니바퀴) > 일반 > 내 앱**에서 나오는 설정값을 `firebase-config.js`에 붙여넣기

## 2. 파일 구성

- `index.html` + `landing-app.js`: 소개, 익명함 생성(아이디/비밀번호/닉네임/테마), 로그인
- `box.html` + `box-app.js`: 실제 익명 질문함 화면 (`?id=` 파라미터로 어느 박스인지 구분)
- `style.css`: 공용 스타일 (두 페이지가 같이 씀)
- `firebase-config.js`: Firebase 프로젝트 설정값

## 3. 계정/아이디 방식

가입할 때 입력한 "아이디"는 내부적으로 `아이디@user.local`이라는 가짜 이메일로 변환되어
Firebase Authentication에 저장됩니다. 화면에는 아이디/비밀번호만 보이고, 실제 메일이
오가지 않는 방식이라 별도 이메일 인증 없이 바로 가입/로그인됩니다.

## 4. 지금 상태 / 아직 안 된 것

- 프로필 사진은 로그인 후 메뉴 > 프로필 사진 변경에서 업로드 가능 (Storage 없이 Firestore에 축소 저장하는 방식)
- 표정별 이미지, 배경화면, 위치란, 트위터 프로필 링크, 스티커 등은 다음 단계 "프로필 설정창 통합"에서 추가 예정
- 예전 단일 사용자 버전 테스트 데이터는 `migrate.html`로 옮길 수 있습니다 (아래 6번 참고)

## 5. 배포 (GitHub Pages)

1. 이 폴더 전체를 저장소에 업로드 (기존 파일 덮어쓰기)
2. 저장소 Settings > Pages > Branch를 main으로 설정
3. `https://아이디.github.io/저장소이름/` 이 랜딩 페이지가 됩니다

## 6. 예전 데이터 이관 (1회용)

1. 먼저 랜딩 페이지(`index.html`)에서 본인 계정을 새로 만드세요
2. `.../migrate.html`에 접속해서 그 계정으로 로그인
3. 예전 `questions` 컬렉션에 있던 걸 자동으로 찾아서 개수를 보여줘요 — "내 익명함으로 복사하기" 누르면 지금 로그인한 계정의 익명함으로 전부 복사됩니다
4. 다 옮겼으면 `migrate.html`, `migrate-app.js` 파일은 저장소에서 지우고, Firestore 규칙에서 "예전 questions 컬렉션 임시 규칙" 블록도 지우는 걸 추천해요 (더 이상 안 쓰는 문이라 열어둘 필요 없음)

## 7. 이미지 출처

- 초자연 재난관리국 테마 로고(`disaster_logo.png`): pngtree.com의 이미지
