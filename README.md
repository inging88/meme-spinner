# meme-spinner

Claude Code 가 일하는 동안 스피너 문구(`Thinking…`, `Cooking…`)를 한국 개발자 밈 + 이모티콘으로 바꾸는 mod 입니다.

```
킹받는 중 😤…   →   가보자고 🚀…   →   원영적 사고 중 · 완전 럭키비키잖아 🍀…
```

- 작업 중 **4초마다** 다른 밈으로 바뀝니다. 셔플 방식이라 목록을 한 바퀴 다 돌기 전에는 같은 밈이 다시 나오지 않습니다(재시작해도 이어 감).
- 밈 목록은 이 저장소의 [`memes.json`](memes.json) 입니다. 설치한 사람은 **6시간마다** 새 목록을 받아 오므로, 여기에 밈을 추가하면 재설치 없이 반영됩니다.
- 오프라인이면 마지막으로 받은 목록, 그것도 없으면 플러그인에 든 목록을 씁니다.
- 압축 중 같은 상태 문구는 바꾸지 않습니다.

## 설치

터미널 세션의 프롬프트에서:

```
/plugin install meme-spinner --marketplace inging88/meme-spinner
```

셸에서:

```
claude plugin install meme-spinner --marketplace inging88/meme-spinner
```

## 밈 추가

`memes.json` 의 `memes` 배열에 `{ "text": "문구", "emoji": "😎" }` 를 넣고 PR 을 보내 주세요. 문구는 40자까지입니다.

## 요구 사항

mod(함수 훅 플러그인)를 지원하는 Claude Code. 2.1.299 에서 확인했습니다.

## 지금 바로 받기

`/meme-refresh` 를 입력하면 6시간을 기다리지 않고 바로 새 목록을 받습니다.

## 업데이트

`/meme-refresh` 가 안 보이면 예전 판(0.1.0)입니다. 셸에서:

```
claude plugin marketplace update meme-spinner
claude plugin update meme-spinner@meme-spinner
```

그다음 Claude Code 를 다시 시작하거나 `/reload-plugins` 를 실행하세요.
