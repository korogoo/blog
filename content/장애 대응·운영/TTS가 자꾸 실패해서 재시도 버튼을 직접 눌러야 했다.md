---
title: "TTS가 자꾸 실패해서 재시도 버튼을 직접 눌러야 했다"
date: 2026-07-04
area: hard-skill
category: "장애 대응·운영"
project: "Koroglish"
tags:
  - "TTS"
  - "외부 API"
  - "재시도"
aliases:
  - "06. 영어 연습 앱 개발기/SBI/TTS가 자꾸 실패해서 재시도 버튼을 직접 눌러야 했다/01. 발단"
  - "06. 영어 연습 앱 개발기/SBI/TTS가 자꾸 실패해서 재시도 버튼을 직접 눌러야 했다/02. POST인데 재시도를 해도 될까?"
  - "06. 영어 연습 앱 개발기/SBI/TTS가 자꾸 실패해서 재시도 버튼을 직접 눌러야 했다/03. 그럼 비멱등한 POST는 어떻게 안전하게 재시도할까?"
  - "06. 영어 연습 앱 개발기/SBI/TTS가 자꾸 실패해서 재시도 버튼을 직접 눌러야 했다/04. 실패하자마자 바로 다시 부르면 되나?"
  - "06. 영어 연습 앱 개발기/SBI/TTS가 자꾸 실패해서 재시도 버튼을 직접 눌러야 했다/05. Retry 를 구현해보자..근데 왜 안 되지?"
  - "06. 영어 연습 앱 개발기/SBI/TTS가 자꾸 실패해서 재시도 버튼을 직접 눌러야 했다/06. 응답이 안 오면 이 요청은 언제 끝나지?"
  - "06. 영어 연습 앱 개발기/SBI/TTS가 자꾸 실패해서 재시도 버튼을 직접 눌러야 했다/07. 그럼 언제까지 계속 재시도해야 하지?"
  - "06. 영어 연습 앱 개발기/SBI/TTS가 자꾸 실패해서 재시도 버튼을 직접 눌러야 했다/08. 재시도랑 서킷을 같이 걸었더니 숫자가 안 맞는다?"
  - "06. 영어 연습 앱 개발기/SBI/TTS가 자꾸 실패해서 재시도 버튼을 직접 눌러야 했다/09. 서킷이 진짜 열리는 걸 눈으로 볼 수 있을까?"
  - "06. 영어 연습 앱 개발기/SBI/TTS가 자꾸 실패해서 재시도 버튼을 직접 눌러야 했다/10. 버튼을 연타하면 그만큼 다 과금되는 거 아냐?"
  - "06. 영어 연습 앱 개발기/SBI/TTS가 자꾸 실패해서 재시도 버튼을 직접 눌러야 했다/11. 실패했을 때 사용자한테 뭐라고 응답하지?"
  - "06. 영어 연습 앱 개발기/SBI/TTS가 자꾸 실패해서 재시도 버튼을 직접 눌러야 했다/12. 이 타임아웃 값, 얼마가 맞는지 어떻게 알지?"
  - "06. 영어 연습 앱 개발기/SBI/TTS가 자꾸 실패해서 재시도 버튼을 직접 눌러야 했다/13. 내 기준"
  - "06. 영어 연습 앱 개발기/SBI/TTS가 자꾸 실패해서 재시도 버튼을 직접 눌러야 했다/14. 다 됐다고 했지만, 그래도 걸리는 것들"
draft: true
---

## 발단

1차 MVP 의 핵심 기능 중 하나는 영문 문장을 영국 악센트의 오디오로 변환하는 것이다

근데 문제는 이 변환 로직이 자꾸 실패한다는 것이었다  
그리고 실패하면 화면에서 재시도 버튼을 직접 막 연타를 하게 된다는 것이다

첫 외부 API 연동이라 그런지 아직 불안정한데다가 여러번 연타하면 과금 때문에 거지가 될 것이다..

<br/>

`TtsService.callElevenLabs` 코드를 까봤다

```java
private final HttpClient httpClient = HttpClient.newHttpClient();

private byte[] callElevenLabs(String text) {
    ...
    HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
    if (response.statusCode() != 200) {
        throw new RuntimeException("ElevenLabs API 오류: " + response.statusCode());
    }
    return response.body();
}
```

실패하면 예외만 던져주고 있다

<br/>


❓ **사용자 경험을 위해 실패는 최대한 막아야 하는데,,,내가 어떤 걸 해줄 수 있을까?**

---

다음으로 이동 -> [[02. POST인데 재시도를 해도 될까?]]

## POST인데 재시도를 해도 될까?

## 재시도 로직은 멱등해야한다

어디서 주워들은 바,, 재시도 로직은 멱등해야 한다고 한다..?

왜 멱등해야 할까?  
잘 이해가 안 될 땐 반대 상황을 상상해보면 된다

```
1. 외부 api 로 결제 요청 (timeout 2초)
2. 2초 후 실패 처리 - 근데 상대 서버에서는 결제됨
3. 응답 못 받았으니까 결제 재요청
4. 또 결제됨 (총 2번 결제)
```

사용자는 결제를 1번만 요청했는데, 재시도 로직 때문에 실제로는 2번 결제됐다

<br/>

그래서 몇 번을 반복해도 결과가 똑같이 유지되는 요청에만 재시도를 걸어야 한다  
이 성질을 **멱등성**이라고 한다

GET, PUT 같은 요청은 여러 번 다시 보내도 처음 기대했던 상태 그대로다

<br/>

⚠️ **근데 지금 외부 api 요청인 ElevenLabs 호출은 POST 다**


```java
HttpRequest.newBuilder()
    .uri(URI.create(baseUrl + "/v1/text-to-speech/" + voiceId))
    .POST(HttpRequest.BodyPublishers.ofString(body))
    .build();
```

위에서 얘기한 대로면 POST는 비멱등이라 Retry를 걸면 위험하다


---

<br/>

## POST 요청인데 왜 재시도를 구현했나?

멱등성 판단 기준은 메서드(GET/POST)가 아니라 **연산이 매번 서버 상태를 바꾸는지**다

💬 **연산마다 매번 서버 상태를 바꾸는 경우**

`POST /orders`

- 호출마다 새 주문이 생긴다
- 사용자는 1개의 주문을 했는데, 주문 목록에 n개의 주문이 생긴다
- 서버 상태(주문 목록)가 바뀐다
- 비멱등

<br/>

💬 **연산마다 매번 서버 상태를 바꾸지 않는 경우**

==`POST /text-to-speech`==

==클라이언트 -> 내 서버 기준==

==클라이언트 -> 서버 << 이건 상대적인 것, 이 관계 안에서 멱등성이 보장되어야 함==

==비동기/동기 할 때 우리 서버 안에서의 멱등성 고려해야 함==

- 같은 텍스트를 몇 번 보내든 음성 파일 하나 생성하는 걸로 끝난다
- 사용자는 1개의 오디오를 요청했고, 1개의 오디오가 저장된다
- ElevenLabs 쪽에 남는 상태가 없다
- 우리 서버는 멱등

<br/>

---

## 진짜 아무 문제 없을까..?

사실 여기까지 들으면 아~ 그렇구나~ 할 수 있다  
나도 문제 없다고 생각했었다

<br/>

⚠️ **첫번째 간과한 점은 재시도 토큰 비용**

영문 오디오 상태에 변경이 일어나진 않지만  
**문제는 호출 자체가 토큰이 발생한다**

실패해서 재시도하면 그만큼 ElevenLabs 크레딧이 더 나간다

정확성 관점에서는 안전한데 비용 관점에서는 대가가 있다

<br/>

⚠️ **두번째 간과한 점은 호출 횟수 제한**

생각해보면 나중엔 1명당 요청 횟수 제한을 걸게 될텐데,  
그러면 호출 횟수도 서버 어딘가에 저장될 것이다

언젠가 POST의 비멱등성이 문제가 될 것이다

<br/>

❓ **그러면 비멱등한 요청의 Retry 로직을 어떻게 구현하는데?**

---

다음으로 이동 -> [[03. 그럼 비멱등한 POST는 어떻게 안전하게 재시도할까?]]

## 그럼 비멱등한 POST는 어떻게 안전하게 재시도할까?

## 언젠간 터질 문제들..!

⚠️ 재시도할 때마다 ElevenLabs 크레딧이 더 나간다 (비용) : 우리서버 - 외부서버

⚠️ 호출 횟수를 어딘가에서 세게 되면, 그 카운터도 결국 매번 바뀌는 서버 상태다 (비멱등) : 클라 - 우리서버

<br/>

다른 사람들 혹은 실무에서는 어떻게 해결하고 있을까?


멱등성이란? 

==같은 요청을 반복해도 서버 상태는 1번만 변하고, 그 이후의 요청에는 서버 상태가 변하지 않는 것==


<br/>

---
## 재시도가 같은 요청임을 외부 서버가 알아채게 하자

결제 API들이 실제로 쓰는 방식을 찾아봤다

✨ **Idempotency-Key**

```
1. 클라이언트가 요청 하나당 고유 키를 만든다 (예: UUID)
2. 서버는 그 키로 이미 처리한 요청인지 확인한다
   - 처음 보는 키 -> 실제로 처리하고, 결과를 그 키에 저장해둔다
   - 이미 본 키(=같은 요청의 재시도) -> 다시 처리하지 않고, 저장해둔 결과를 그대로 돌려준다
```

외부 서버가 이미 한 번 처리한 요청인지를 기억하고 있는다면 가능하다

그러면 재시도가 몇 번 오든 실제 처리(결제, 과금)는 딱 한 번만 일어난다

<br/>

### ElevenLabs는 이걸 지원할까?

ElevenLabs 공식 블로그를 확인했다

> "Cache the result keyed by a hash of the inputs that affect the audio, and the same key doubles as an idempotency token on retries."

그냥 대충 해석해보면 서버가 알아서 걸러주는 기능은 없다~  
니네 서버가 해시키 같은 거 만들어서 직접 중복을 방지해라~

<br/>

방법을 정리해보면 아래와 같다

```
- 오디오 결과에 영향을 주는 값(text, voice ID, model ID, voice settings)을 전부 모은다
- 그걸 해시해서 하나의 키로 만든다
- 그 키로 캐시를 조회 - 있으면 그대로 반환, 없으면 그때 처음 만든다
```

같은 입력이면 항상 같은 키가 나오니, 재시도가 몇 번 오든 실제로 만드는 건 한 번뿐이다

<br/>

---
## 내 코드에도 적용해보자

```java
String key = md5(text + voiceId) + ".mp3";
```

오? 근데 코드를 다시 까보니 캐시 키를 만들어서 재시도 방지를 하고있었다  
근데 해시키에 `text`, `voiceId`만 들어간다

공식 권장은 **오디오에 영향을 주는 모든 값**(model ID, voice settings까지)을 넣으라는 건데, 우리는 두 개가 빠져 있었다

지금 당장은 model ID랑 voice settings(stability, similarity_boost)가 코드에 고정값이라 문제가 안 된다  
근데 나중에 이 값들을 설정 가능하게 바꾸면 - 캐시 키는 그대로인데 실제 파라미터는 달라져서, **엉뚱한(오래된) 캐시가 나가는 버그**가 생길 수 있다

그래서 키를 고쳤다

```java
private String cacheKey(String text) {
    String raw = String.join("|", text, voiceId, modelId,
            String.valueOf(ElevenLabsClient.VOICE_STABILITY),
            String.valueOf(ElevenLabsClient.VOICE_SIMILARITY_BOOST));

    MessageDigest md = MessageDigest.getInstance("SHA-256");
    byte[] hash = md.digest(raw.getBytes(StandardCharsets.UTF_8));
    return HexFormat.of().formatHex(hash) + ".mp3";
}
```

- 오디오에 영향을 주는 값을 전부 모아서 해시
- MD5 -> SHA-256으로 바꿨다 (공식 권장 그대로 - 사실 여기선 보안 목적이 아니라 키 유일성 목적이라 MD5도 실질적 문제는 없었지만, 굳이 다르게 갈 이유도 없었다)
- voice settings 상수는 실제로 요청을 만드는 `ElevenLabsClient` 쪽에 두고, 캐시 키를 만드는 `TtsService`가 그 상수를 그대로 가져다 쓰게 했다 - 값이 두 곳에 따로 적혀 있으면 한쪽만 바뀌었을 때 또 똑같은 버그가 나니까

<br/>

## 근데 이 키, 재시도 자체를 막아버리는 거 아닌가?

이 키로 "이미 처리한 요청"을 걸러낸다고 했는데, 그럼 **첫 시도가 실패했을 때도** 재시도가 막히는 거 아닌가 싶었다

찾아보니 답은 "**언제 캐시에 저장하냐**"에 달려 있었다

```
1번째 시도 실패
  -> 캐시: 저장 안 됨 (성공했을 때만 저장하는 코드라 실패하면 그 줄까지 안 감)
  -> 즉 이 key는 "한 번도 안 만든 것"과 똑같은 상태로 되돌아감

2번째 시도(재시도) 도착
  -> 캐시 조회: 없음 (miss) -> 새로 실행 -> 진짜로 다시 호출됨
```

이 키는 "**성공한 결과만** 기억하는" 캐시다 - 실패는 아예 기록에 안 남으니, 다음 요청은 처음 온 요청과 구분이 안 되고 정상적으로 재시도된다

<br/>

⚠️ **Idempotency-Key를 순진하게 만들면 진짜로 이 문제가 생긴다**

"이 키, 나 이미 본 적 있어"를 **시도했다는 사실만으로** 기록해버리면, 실패한 요청도 "이미 처리함"으로 잘못 취급돼서 진짜 재시도까지 막혀버린다

그래서 이 키는 상태를 세 가지로 구분해야 한다

```
1. 이 key, 한 번도 시도 안 함    -> 새로 실행
2. 이 key, 지금 처리 중          -> 합류해서 같이 기다림
3. 이 key, 이미 성공적으로 끝남  -> 캐시된 결과 그대로 반환
```

"실패했음"은 이 셋 중 어디에도 안 들어간다 - 그냥 1번(안 한 것)으로 되돌아가는 것이다  
결제 API들이 Idempotency-Key를 설계할 때도 같은 원칙을 쓴다 - 성공한 요청만 캐시하고, 실패한 요청은 재시도를 허용한다

<br/>

❓ **키는 안전하게 만들었다. 근데 이 키를 실제로 어떻게 활용해서 재시도/중복을 막을지는 뒤(10번)에서 마저 다룬다. 일단 재시도 자체를 어떻게 구현할지부터 보자**

---

다음으로 이동 -> [[04. 실패하자마자 바로 다시 부르면 되나?]]

## 실패하자마자 바로 다시 부르면 되나?

## 그냥 바로 다시 요청하면 안 되나?

> 재시도(Retry) = 실패한 요청을 프로그램이 알아서 한 번 더 보내는 것

처음엔 단순하게 생각했다  
실패하면 바로 다시 보내면 되는 거 아닌가?

```
요청 실패 -> 즉시 재요청 -> 또 실패 -> 즉시 재요청 -> ...
```

근데 이러면 문제가 생긴다

상대 서버(ElevenLabs)가 지금 부하로 힘들어서 실패한 거라면,  
쉴 틈도 없이 요청을 또 퍼붓는 꼴이다  
안 그래도 버거운 서버를 내가 더 밀어붙이는 셈

<br/>

여러 사용자가 동시에 실패한 상황을 생각하면 더 심각하다  
다들 "실패 -> 즉시 재시도"를 하면, 똑같은 순간에 재요청이 우르르 몰린다

✨ **이렇게 한꺼번에 몰려드는 걸 thundering herd(몰려드는 소떼)라고 부른다**

<br/>

## 그래서 두 가지를 같이 쓴다

**1. Exponential Backoff — 기다리는 시간을 점점 늘리기**

재시도 간격을 조금씩 벌린다

```
0.5초 뒤 재시도 -> (실패) -> 1초 뒤 -> (실패) -> 2초 뒤 -> ...
```

실패할수록 더 오래 기다려준다  
상대 서버에게 회복할 시간을 주는 것

<br/>

**2. Jitter — 기다리는 시간에 랜덤을 섞기**

간격을 정확히 0.5초, 1초로 딱 맞추면  
동시에 실패한 요청들이 또 똑같은 타이밍에 재시도돼서 다시 부딪힌다

그래서 대기 시간에 약간의 랜덤을 섞어서 재시도 타이밍을 흩어놓는다

<br/>

## 실제 설정

```properties
resilience4j.retry.instances.elevenlabs.max-attempts=2
resilience4j.retry.instances.elevenlabs.wait-duration=500ms
resilience4j.retry.instances.elevenlabs.enable-exponential-backoff=true
resilience4j.retry.instances.elevenlabs.exponential-backoff-multiplier=2
resilience4j.retry.instances.elevenlabs.enable-randomized-wait=true
resilience4j.retry.instances.elevenlabs.randomized-wait-factor=0.5
```

> resilience4j = 재시도, 차단 같은 장애 대응 기능을 코드에 쉽게 붙이게 해주는 라이브러리

<br/>

⚠️ **재시도 횟수를 2로 잡은 이유**

`max-attempts=2` - 원래 요청 1번 + 재시도 1번, 딱 한 번만 더 시도한다

ElevenLabs는 호출할 때마다 돈이 나가는 API다  
재시도를 늘릴수록 실패할 때 비용도 그만큼 배로 나간다  
그래서 안정성과 비용 사이에서 2번으로 타협했다

<br/>

❓ **재시도를 어떻게 할지는 정했다. 이제 코드로 붙여보자**

---

다음으로 이동 -> [[05. Retry 를 구현해보자..근데 왜 안 되지?]]

## Retry 를 구현해보자..근데 왜 안 되지?

## 재시도, 어노테이션 하나면 되는 거 아닌가?

resilience4j는 메서드 위에 `@Retry`만 붙이면 재시도가 걸린다  
그래서 실제 호출 코드에 바로 붙이려고 했다

근데 지금 코드 구조를 다시 보니 이상했다

```java
public byte[] getAudio(String text) {
    ...
    byte[] audio = callElevenLabs(text);   // 같은 클래스 안의 메서드를 부른다
    ...
}

private byte[] callElevenLabs(String text) {
    ...
}
```

`getAudio`가 같은 클래스 안에 있는 `callElevenLabs`를 `this`로 부르는 구조다

<br/>

## 왜 이러면 재시도가 안 먹히나?

`@Retry`, `@CircuitBreaker` 같은 어노테이션은 **프록시(proxy)** 라는 방식으로 동작한다

> 프록시 = 진짜 객체를 감싸는 대리 객체  
> 스프링이 내 객체를 한 겹 감싸서, 바깥에서 들어오는 호출을 가로채 재시도 같은 걸 몰래 끼워 넣는다

문제는 **바깥에서 프록시를 거쳐 들어온 호출만** 가로챌 수 있다는 것이다

같은 클래스 안에서 `this.callElevenLabs()`로 자기 자신을 부르면  
프록시를 거치지 않고 진짜 객체를 곧바로 부르는 셈이라, 어노테이션이 그냥 무시된다  
게다가 `private` 메서드는 프록시가 감쌀 수조차 없다

✨ **이렇게 자기 클래스 내부에서 자기를 호출해서 프록시가 우회되는 걸 self-invocation 이라고 한다**

제일 무서운 건 에러가 안 난다는 거다  
그냥 조용히 재시도가 작동을 안 하는 상태로 남는다

<br/>

## 해결 A - 호출을 별도 빈으로 분리

외부 API 호출만 담당하는 새 클래스로 떼어낸다  
그러면 `TtsService`가 이 빈을 거쳐서(=프록시를 거쳐서) 부르니까 어노테이션이 정상 동작한다

```java
@Component
@RequiredArgsConstructor
public class ElevenLabsClient {

    @CircuitBreaker(name = "elevenlabs")   // (이건 06에서 다룬다)
    @Retry(name = "elevenlabs")
    public byte[] textToSpeech(String text) {
        ...
    }
}
```

<br/>

## 해결 B - 어노테이션 없이 코드로 직접 감싸기

resilience4j는 어노테이션 말고, 코드 안에서 직접 감싸는 방법도 준다

```java
Supplier<byte[]> decorated = Decorators.ofSupplier(() -> callElevenLabs(text))
    .withCircuitBreaker(circuitBreaker)
    .withRetry(retry)
    .decorate();

byte[] audio = decorated.get();
```

이 방식은 프록시를 아예 안 쓰기 때문에 self-invocation 문제가 처음부터 생기지 않는다  
대신 호출하는 곳마다 이 조립 코드를 직접 써줘야 해서 코드가 지저분해진다

<br/>

## 나는 A를 골랐다

호출 지점이 하나뿐이라 B도 나쁘지 않았다  
그런데 "외부 API를 호출하는 일"과 "캐시를 조회/저장하는 일"은 원래 성격이 다른 책임이다  
어차피 나눠야 할 것들이라, 별도 빈으로 분리하는 A가 구조상 더 맞다고 봤다

<br/>

❓ **재시도는 붙였다. 근데 재시도가 발동하려면 일단 '실패'로 판정이 나야 하는데... 응답이 아예 안 오면 어떻게 되지?**

---

다음으로 이동 -> [[06. 응답이 안 오면 이 요청은 언제 끝나지?]]

## 응답이 안 오면 이 요청은 언제 끝나지?

## 재시도보다 먼저 걸리는 문제

재시도는 "실패했을 때" 발동한다  
근데 상대 서버가 실패 응답조차 안 주고 그냥 침묵하면?

내 코드는 응답을 기다리며 그 자리에 멈춰 있는다

```java
private final HttpClient httpClient = HttpClient.newHttpClient();
...
HttpResponse<byte[]> response = httpClient.send(request, ...);   // 응답 올 때까지 여기서 대기
```

`HttpClient`에 제한 시간을 안 걸어놨더니  
ElevenLabs가 응답을 안 주면 이 호출이 **언제 끝나는지가 정해져 있지 않다**

<br/>

## 이게 왜 위험한가?

> 서버는 요청 하나를 처리할 때 스레드(thread) 하나를 쓴다  
> 스레드 = 일을 처리하는 일꾼, 개수가 정해져 있다

응답을 무한정 기다리는 요청은, 일꾼 하나를 붙잡고 안 놓아준다  
이런 요청이 쌓이면 일꾼이 전부 대기 상태로 묶여버린다

그러면 TTS만이 아니라 서비스 전체가 새 요청을 못 받는다  
외부 API 하나의 지연이 내 서버 전체를 멈추게 하는 것

<br/>

## Timeout - "이 시간 넘으면 그냥 실패로 치자"

> Timeout = 정해둔 시간이 지나면 기다리기를 포기하고 실패 처리하는 것

Timeout은 어디서 멈췄냐에 따라 원래 3종류로 나눈다

- **Connection Timeout** - 연결 자체가 안 맺어짐 (상대가 죽었거나 길이 막힘)
- **Read Timeout** - 연결은 됐는데 응답이 안 옴 (상대가 살아있지만 처리가 느림)
- **Write Timeout** - 내 요청을 보내는 중에 멈춤 (업로드가 느림)

셋을 나누는 이유는 원인이 다 다르기 때문이다 - 로그만 봐도 어디서 막혔는지 구분되니까

<br/>

### 💬 근데 Java 기본 HttpClient는 2개만 준다

Java 표준 `HttpClient`는 3종을 다 나눠주지 않는다

- `HttpClient.connectTimeout(...)` - 연결 (Connection)
- `HttpRequest.timeout(...)` - 요청 보낸 뒤 응답 다 받을 때까지 전체 시간 (Read + Write가 합쳐진 개념)

Read/Write를 완전히 따로 떼려면 OkHttp 같은 다른 라이브러리를 써야 하는데,  
지금 규모에 그렇게까지는 과하다고 봐서 표준 HttpClient의 2종을 그대로 썼다

```java
httpClient = HttpClient.newBuilder()
        .connectTimeout(connectTimeout)   // 5초
        .build();

HttpRequest request = HttpRequest.newBuilder()
        .uri(...)
        .timeout(requestTimeout)          // 20초
        .POST(...)
        .build();
```

==외부 서버랑 tcp handshake 를 미리 해두고 커낵션풀을 미리 만들어두는지?==



<br/>

## 값을 정한 근거

- **연결 5초** - 연결만 맺는 거라 이보다 오래 걸리면 뭔가 잘못된 것
- **요청 전체 20초** - TTS는 문장이 길면 음성 합성 자체에 시간이 걸린다, 그래서 넉넉하게

⚠️ **이 값들은 아직 감으로 잡은 추정치다** - 실제로 얼마가 맞는지는 뒤(11번)에서 다시 이야기한다

<br/>

❓ **이제 실패는 잘 끊는다. 근데 계속 실패만 하면, 언제까지 재시도를 해야 하지?**

---

다음으로 이동 -> [[07. 그럼 언제까지 계속 재시도해야 하지?]]

## 그럼 언제까지 계속 재시도해야 하지?

## 재시도가 만능은 아니다

재시도는 "잠깐 삐끗한" 실패엔 좋다  
근데 ElevenLabs가 아예 뻗어서 계속 실패만 한다면?

그러면 모든 요청이 "실패 -> 재시도 -> 또 실패"를 반복한다  
죽은 서버를 계속 두드리면서, 사용자는 매번 오래 기다렸다가 실패만 받는다

이럴 땐 차라리 **"지금은 안 되니까 빨리 포기하자"** 가 낫다

<br/>

## Circuit Breaker - 두꺼비집 같은 것

> Circuit Breaker(회로 차단기) = 실패가 일정 수준을 넘으면, 아예 요청을 보내지 않고 즉시 실패시키는 장치

이름 그대로 집에 있는 두꺼비집을 떠올리면 된다  
전기가 과부하되면 두꺼비집이 회로를 끊어서 집 전체를 보호하듯,  
외부 API가 맛이 가면 회로를 끊어서 내 서버를 보호한다

<br/>

## 3가지 상태

- **Closed (닫힘)** - 평소 상태. 요청을 그대로 통과시키면서 실패율을 지켜본다
- **Open (열림)** - 실패가 너무 많아지면 전환. 이후 요청은 상대에게 보내지도 않고 곧바로 실패시킨다
- **Half-Open (반쯤 열림)** - 일정 시간 뒤, 요청 몇 개만 살짝 흘려보내서 상대가 회복됐는지 떠본다. 성공하면 Closed로 돌아가고, 또 실패하면 다시 Open

<br/>

### 💬 즉시 거부인데 왜 "Open(열림)"이지?

나는 처음에 헷갈렸다  
요청을 막는 상태니까 "닫혔다(Closed)"가 더 어울리는 거 아닌가?

근데 이건 요청이 아니라 **전기 회로** 기준의 이름이다

```
Closed = 회로가 연결됨 = 전류(요청)가 흐름   -> 정상 통과
Open   = 회로가 끊김   = 전류(요청)가 끊김   -> 즉시 차단
```

"문이 닫혔다(막혔다)"는 일상 직관과, "회로가 열렸다(끊겼다)"는 실제 이름이 반대라서 헷갈렸던 것

<br/>

## 실제 설정

```properties
resilience4j.circuitbreaker.instances.elevenlabs.sliding-window-size=10
resilience4j.circuitbreaker.instances.elevenlabs.minimum-number-of-calls=5
resilience4j.circuitbreaker.instances.elevenlabs.failure-rate-threshold=50
resilience4j.circuitbreaker.instances.elevenlabs.slow-call-duration-threshold=15s
resilience4j.circuitbreaker.instances.elevenlabs.slow-call-rate-threshold=50
resilience4j.circuitbreaker.instances.elevenlabs.wait-duration-in-open-state=30s
resilience4j.circuitbreaker.instances.elevenlabs.permitted-number-of-calls-in-half-open-state=3
```

- 최근 10번(`sliding-window-size`) 호출을 보되, 최소 5번(`minimum-number-of-calls`)은 쌓여야 판단을 시작한다 (몇 번 안 되는데 성급하게 끊지 않도록)
- 그중 실패율이 50%(`failure-rate-threshold`)를 넘으면 Open
- Open이 되면 30초(`wait-duration-in-open-state`) 기다렸다가 Half-Open으로

<br/>

### 💬 에러가 없어도 Open이 될 수 있다 - 느린 호출

`slow-call-duration-threshold=15s`  
이건 "15초를 넘게 걸린 호출은 실패는 아니어도 '느린 호출'로 센다"는 뜻이다

응답이 오긴 오는데 계속 느리기만 해도, 그 비율이 높아지면(`slow-call-rate-threshold`) 회로가 열린다

여기서 15초는 앞서 잡은 하드 타임아웃(20초)보다 일부러 짧게 뒀다  
완전히 터지기(20초 타임아웃) 전에, "느려지고 있다"는 신호를 먼저 잡아서 미리 끊으려는 것

✨ **그래서 Timeout 값과 Circuit Breaker 설정은 따로 노는 게 아니라 같이 설계돼야 한다**

<br/>

❓ **재시도랑 서킷, 둘 다 붙였다. 근데 테스트를 짜보니 숫자가 이상하게 안 맞는다?**

---

다음으로 이동 -> [[08. 재시도랑 서킷을 같이 걸었더니 숫자가 안 맞는다?]]

## 재시도랑 서킷을 같이 걸었더니 숫자가 안 맞는다?

## 테스트를 짜다가 만난 이상한 예외

서킷이 제대로 열리는지 확인하려고, 일부러 4번 연속 실패시키는 테스트를 짰다  
(설정: 4번은 실패가 쌓여야 서킷이 열리도록 해둠)

```java
for (int i = 0; i < 4; i++) {
    assertThatThrownBy(() -> elevenLabsClient.textToSpeech("hello"))
        .isInstanceOf(ElevenLabsException.class);
}
```

근데 3번째 반복에서 벌써 실패했다  
기대한 `ElevenLabsException`이 아니라 엉뚱한 예외가 튀어나왔다

```
Expecting: ElevenLabsException
but was:   CallNotPermittedException: CircuitBreaker 'elevenlabs' is OPEN
```

`CallNotPermittedException` = 서킷이 이미 열려서 요청을 막았다는 예외다  
아직 4번을 다 못 채웠는데 왜 벌써 열렸지?

<br/>

## 범인은 재시도와 서킷이 겹쳐지는 순서였다

```java
@CircuitBreaker(name = "elevenlabs")
@Retry(name = "elevenlabs")
public byte[] textToSpeech(String text) { ... }
```

나는 당연히 바깥쪽이 CircuitBreaker일 거라 생각했다  
근데 resilience4j의 기본 순서는 반대였다 - **Retry가 바깥, CircuitBreaker가 안쪽**

이 순서면 이렇게 된다

```
내가 textToSpeech() 1번 호출
  -> Retry가 실제 호출을 2번(원요청+재시도) 시도
    -> 그 2번이 각각 따로 CircuitBreaker를 통과
```

즉 내가 4번 부른 게, 서킷 입장에선 최대 8번으로 세어진다  
그래서 "4번 쌓이면 열림" 기준을 예상보다 훨씬 빨리 넘겨버린 것

<br/>

## 어느 순서가 맞나?

내가 원한 건 "재시도까지 다 끝난 뒤의 **최종 결과 1개**"만 성공/실패로 세는 것이었다

그래야 서킷 설정값(최근 10번, 최소 5번...)이 "실제 비즈니스 호출 횟수"랑 딱 맞는다  
재시도 하나하나를 다 세면, 그 숫자들이 "호출 x 재시도"로 부풀어서 의미가 헷갈려진다

그래서 CircuitBreaker를 바깥으로 두는 게 맞다  
= 재시도 한 뭉텅이 전체를 서킷이 감싸고, 그 결과 1개만 기록

<br/>

## 순서를 직접 고정했다

```properties
resilience4j.circuitbreaker.circuitBreakerAspectOrder=1
resilience4j.retry.retryAspectOrder=2
```

숫자가 작을수록 바깥이다  
CircuitBreaker를 1(바깥), Retry를 2(안쪽)로 잡아서, 서킷이 재시도 전체를 감싸도록 만들었다

<br/>

⚠️ **어노테이션 순서 = 실행 순서가 아니다**

코드에서 위에 쓴 어노테이션이 먼저 실행될 거라고 착각하기 쉽다  
근데 실제 순서는 각자에게 정해진 우선순위 값으로 결정된다  
두 개 이상 겹쳐 쓸 땐 꼭 순서를 확인하거나 테스트로 찍어봐야 한다

<br/>

❓ **순서는 고쳤다. 그럼 이제 서킷이 진짜 의도대로 열리는지, 눈으로 확인할 수 있을까?**

---

다음으로 이동 -> [[09. 서킷이 진짜 열리는 걸 눈으로 볼 수 있을까?]]

## 서킷이 진짜 열리는 걸 눈으로 볼 수 있을까?

## 진짜 열리는지 어떻게 확인하지?

설정만 해놓고 "잘 되겠지" 하고 넘어가면 찜찜하다  
서킷이 정말 열리는지, 열리면 정말 요청을 안 보내는지 눈으로 보고 싶었다

문제는 진짜 ElevenLabs를 일부러 죽일 순 없다는 것  
그래서 **가짜 서버**를 세워서 마음대로 실패시키기로 했다

> WireMock = 원하는 대로 응답(성공/실패/지연)을 흉내 내주는 테스트용 가짜 HTTP 서버

<br/>

## Open으로 전이되는 순간 확인

가짜 서버가 계속 500(서버 에러)을 뱉게 해놓고, 실패를 쌓았다

```java
wireMock.stubFor(post(urlEqualTo(PATH)).willReturn(aResponse().withStatus(500)));

for (int i = 0; i < 4; i++) {
    assertThatThrownBy(() -> elevenLabsClient.textToSpeech("hello"))
        .isInstanceOf(ElevenLabsException.class);
}

assertThat(circuitBreaker.getState()).isEqualTo(CircuitBreaker.State.OPEN);   // 열렸다

int callsBeforeOpen = wireMock.getServeEvents().getServeEvents().size();

// 서킷이 열린 뒤 한 번 더 호출
assertThatThrownBy(() -> elevenLabsClient.textToSpeech("hello"))
    .isInstanceOf(CallNotPermittedException.class);

// 가짜 서버에 도달한 요청 수가 그대로다 = 마지막 호출은 서버까지 가지도 않았다
assertThat(wireMock.getServeEvents().getServeEvents()).hasSize(callsBeforeOpen);
```

✨ **서킷이 열린 뒤의 호출은 가짜 서버에 아예 도착조차 안 했다**  
"상대를 두드리지도 않고 즉시 실패"가 말이 아니라 진짜라는 걸 호출 수로 확인한 것

<br/>

## Half-Open까지 재현하려니 시간이 문제였다

서킷은 열린 뒤 30초를 기다렸다가 Half-Open으로 넘어간다  
근데 테스트가 매번 30초씩 기다릴 순 없다

그래서 테스트에서만 이 시간을 짧게 바꿨다

```properties
### 테스트 전용 설정
resilience4j.circuitbreaker.instances.elevenlabs.wait-duration-in-open-state=1s
resilience4j.circuitbreaker.instances.elevenlabs.permitted-number-of-calls-in-half-open-state=2
```

```java
Thread.sleep(1100);   // 1초 살짝 넘게 대기 -> Half-Open으로 넘어감

// 이번엔 가짜 서버가 성공(200)을 주도록 바꾸고
wireMock.stubFor(post(urlEqualTo(PATH)).willReturn(aResponse().withStatus(200).withBody(audio)));

elevenLabsClient.textToSpeech("hello");   // 떠보기용 호출들
elevenLabsClient.textToSpeech("hello");

assertThat(circuitBreaker.getState()).isEqualTo(CircuitBreaker.State.CLOSED);   // 회복됐다
```

Open -> (대기) -> Half-Open -> (성공) -> Closed 로 돌아오는 전체 흐름을 눈으로 확인했다

<br/>

### 💬 Thread.sleep을 테스트에 넣어도 되나

진짜 시간을 기다리는 테스트라 찜찜하긴 했다  
근데 1초 정도면 감수할 만하다고 판단했고, 시간을 강제로 흐르게 하는 방법은 테스트가 더 늘면 그때 찾아보기로 했다

<br/>

❓ **자동 재시도·차단은 갖췄다. 근데 발단으로 돌아가서 - 사용자가 버튼을 연타하면 그건 어떻게 되지?**

---

다음으로 이동 -> [[10. 버튼을 연타하면 그만큼 다 과금되는 거 아냐?]]

## 버튼을 연타하면 그만큼 다 과금되는 거 아냐?

## 발단으로 돌아와서

01에서 이런 걱정을 했었다  
실패하면 사용자가 재생 버튼을 막 연타하는데, 그때마다 과금되는 거 아닌가?

프론트에는 이미 방어가 있긴 했다 - 버튼을 누르면 바로 비활성화(disabled)

근데 이걸로는 못 막는 구멍이 있다

```
- 실패하면 버튼이 곧바로 다시 활성화된다 -> 실패할 때마다 계속 누를 수 있음
- 탭을 두 개 열거나 새로고침하면 -> 프론트의 disabled 상태는 초기화됨
```

프론트의 방어는 그 브라우저 화면 안에서만 유효하다  
결국 **서버 쪽에서도 막아야** 확실하다

<br/>

## 핵심 아이디어 - "이미 만들고 있으면 같이 기다려라"

같은 문장에 대한 요청이 거의 동시에 여러 개 들어왔다고 하자  
이걸 순진하게 처리하면 ElevenLabs를 요청 수만큼 부른다

```
요청A (hello) -> ElevenLabs 호출
요청B (hello) -> ElevenLabs 호출   (똑같은 걸 또!)
요청C (hello) -> ElevenLabs 호출   (또!)
```

내가 원하는 건 이거다

```
요청A (hello) -> ElevenLabs 호출 시작...
요청B (hello) -> A가 이미 만드는 중이네? 그 결과를 같이 기다리자
요청C (hello) -> 마찬가지로 A의 결과를 같이 기다리자
              -> ElevenLabs는 딱 1번만 호출
```

✨ **이렇게 같은 작업을 하나로 합쳐 한 번만 실행하는 걸 single-flight 라고 한다**

<br/>

이 "같은 요청인지"를 구분하는 게 바로 03에서 다듬은 그 키다  
텍스트, voice ID, model ID, voice settings를 전부 해시한 키 - 같은 조건이면 항상 같은 키가 나오니, 이 키 하나로 "캐시에 이미 있는지"도, "지금 만드는 중인지"도 둘 다 판단할 수 있다

<br/>

## 구현

"지금 이 문장을 만드는 중"인 작업을 map에 기록해두고, 뒤에 온 요청은 그 작업에 올라타게 했다

```java
private final ConcurrentHashMap<String, CompletableFuture<byte[]>> inFlight = new ConcurrentHashMap<>();

public byte[] getAudio(String text) {
    String key = cacheKey(text);   // 03에서 만든 해시 키

    var cached = audioCacheStore.get(key);
    if (cached.isPresent()) return cached.get();   // 이미 만들어진 건 캐시에서 바로

    // 이 key로 진행 중인 작업이 없으면 새로 만들고, 있으면 그걸 그대로 받는다
    CompletableFuture<byte[]> future = inFlight.computeIfAbsent(key, k -> generate(text, key));

    return future.join();   // 그 작업이 끝날 때까지 같이 기다림
}
```

> `computeIfAbsent` = "이 key가 없을 때만 새로 만들어라"를 원자적으로(중간에 안 끼어들게) 처리해주는 map 메서드  
> 그래서 여러 스레드가 동시에 들어와도 실제 작업(=ElevenLabs 호출)은 딱 한 번만 만들어진다

<br/>

작업이 끝나면 map에서 지워줘야 다음번 새 요청이 또 정상적으로 만들어진다

```java
private CompletableFuture<byte[]> generate(String text, String key) {
    return CompletableFuture.supplyAsync(() -> {
        byte[] audio = elevenLabsClient.textToSpeech(text);
        audioCacheStore.put(key, audio);
        return audio;
    }, ttsExecutor).whenComplete((result, error) -> inFlight.remove(key));   // 성공/실패 상관없이 정리
}
```

> 실제 호출을 `supplyAsync`로 비동기로 뺀 데는 이유가 있다 (그리고 `ttsExecutor`를 왜 따로 넘기는지도) - [[14. 다 됐다고 했지만, 그래도 걸리는 것들]]에서 이어서 다룬다

<br/>

## 프론트도 살짝 손봤다

서버가 막아주더라도, 실패 직후 버튼이 곧바로 살아나서 연타되는 건 사용자 경험상 좋지 않다  
그래서 실패하면 1.5초 뒤에 버튼이 다시 눌리게 했다

```js
// 실패 시
setTimeout(() => { btn.disabled = false; }, 1500);
```

✨ **프론트(빠른 1차 방어)와 백엔드(확실한 최종 방어)를 겹쳐서, 어느 쪽으로 새도 실제 호출은 한 번만 나가게 했다**

<br/>

❓ **호출은 한 번만 나가게 됐다. 근데 그 한 번이 결국 실패하면, 사용자한테 뭐라고 응답하지?**

---

다음으로 이동 -> [[11. 실패했을 때 사용자한테 뭐라고 응답하지?]]

## 실패했을 때 사용자한테 뭐라고 응답하지?

## 실패를 막는 것과, 실패를 알리는 것은 다르다

지금까지는 "실패를 최대한 줄이는" 이야기였다  
근데 재시도도 소진하고 서킷도 열려서 결국 실패하는 순간은 반드시 온다

그때 사용자(프론트)한테 뭐라고 응답할지도 정해야 한다  
안 정하면 어떻게 되나 봤더니, 스프링이 알아서 전부 **500 (서버 내부 오류)** 로 뭉뚱그려 내보내고 있었다

<br/>

## 실패도 종류가 다르다

우리 코드에서 나오는 실패는 크게 셋이다

```
1. ElevenLabsException        - 재시도까지 다 했는데 외부 API가 끝내 실패
2. ElevenLabsTimeoutException - 외부 API가 제 시간에 응답을 못 줌 (응답 지연)
3. CallNotPermittedException  - 서킷이 열려서, 우리가 스스로 요청을 막은 것
```

셋 다 원인도 다르고, 사용자에게 줄 의미도 다르다  
그래서 상태 코드를 나눴다

<br/>

## 어디서 처리하나 - ControllerAdvice

예외를 컨트롤러마다 try-catch로 잡으면 지저분하다  
스프링에는 예외를 한곳에서 모아 처리하는 자리가 있다

> `@RestControllerAdvice` = 여기저기서 던져진 예외를 한 클래스에서 받아 응답으로 바꿔주는 곳

```java
@RestControllerAdvice
public class ApiExceptionHandler {

    // 서킷이 열려 우리가 선제적으로 막은 상태 -> 503 + 잠시 후 다시 시도
    @ExceptionHandler(CallNotPermittedException.class)
    public ResponseEntity<String> handleCircuitOpen(CallNotPermittedException e) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)   // 503
                .header(HttpHeaders.RETRY_AFTER, "30")
                .body("TTS 서비스가 일시적으로 중단되었습니다. 잠시 후 다시 시도해주세요.");
    }

    // 외부 API가 제 시간에 응답을 못 준 상태 -> 504
    @ExceptionHandler(ElevenLabsTimeoutException.class)
    public ResponseEntity<String> handleUpstreamTimeout(ElevenLabsTimeoutException e) {
        return ResponseEntity.status(HttpStatus.GATEWAY_TIMEOUT)       // 504
                .body("TTS 생성이 지연되고 있습니다. 잠시 후 다시 시도해주세요.");
    }

    // 재시도까지 소진하고 외부 API가 실패한 상태 -> 502
    @ExceptionHandler(ElevenLabsException.class)
    public ResponseEntity<String> handleUpstreamFailure(ElevenLabsException e) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)           // 502
                .body("TTS 생성에 실패했습니다.");
    }
}
```

> `ElevenLabsTimeoutException`이 `ElevenLabsException`을 상속하는데, 스프링은 **더 구체적인 핸들러**를 먼저 고른다  
> 그래서 타임아웃은 504로, 나머지 실패는 502로 각각 잡힌다

<br/>

## 왜 502 / 503 / 504로 나눴나

처음엔 다 503으로 퉁치려 했는데, 의미를 나누는 게 더 정확했다

- **502 Bad Gateway** - "나는 중간 다리인데, 뒤에 있는 외부 서버가 잘못됐다"  
  -> ElevenLabs가 에러(5xx 등)로 실패한 상황
- **504 Gateway Timeout** - "뒤에 있는 외부 서버가 제 시간에 응답을 안 줬다"  
  -> ElevenLabs 응답이 타임아웃 난 상황 (그냥 실패가 아니라 '느림'이라는 원인을 드러냄)
- **503 Service Unavailable** - "지금은 일시적으로 서비스를 못 한다, 이따 다시 와라"  
  -> 서킷이 열려서 우리가 잠깐 막아둔 상황

특히 503에는 `Retry-After: 30` 헤더를 같이 붙였다  
"30초 뒤에 다시 시도하면 돼요"를 클라이언트에게 알려주는 것 (서킷이 30초 뒤 Half-Open 되는 것과 맞췄다)

✨ **같은 '실패'라도, 원인이 다르면 상태 코드로 구분해줘야 클라이언트가 다르게 대응할 수 있다**

<br/>

❓ **여기까지 흐름은 다 만들었다. 근데 앞에서 잡은 값들(타임아웃 20초, 서킷 임계치...)은 대체 얼마가 맞는 걸까?**

---

다음으로 이동 -> [[12. 이 타임아웃 값, 얼마가 맞는지 어떻게 알지?]]

## 이 타임아웃 값, 얼마가 맞는지 어떻게 알지?

## 값들이 전부 감으로 잡은 거였다

돌아보면 지금까지 정한 숫자들이 다 추정치였다

```
타임아웃  : 연결 5초 / 요청 20초
서킷      : 최근 10번, 최소 5번, 실패율 50%, 느린 호출 15초 ...
```

"TTS면 이 정도 걸리겠지" 하는 감으로 잡았을 뿐,  
실제로 ElevenLabs가 평소 몇 초 걸리는지 재본 적이 없다

그렇다고 값을 안 넣을 순 없으니, 대신 **나중에 실측값으로 고칠 수 있는 장치**를 같이 넣기로 했다

<br/>

## 응답 시간을 기록부터 시작

> Micrometer = 애플리케이션의 각종 수치(응답 시간, 호출 수 등)를 재서 쌓아주는 계측 라이브러리

호출이 얼마나 걸리는지를 성공/실패로 나눠서 기록하게 했다

```java
long start = System.nanoTime();
boolean success = false;
try {
    byte[] audio = call(text);
    success = true;
    return audio;
} finally {
    meterRegistry.timer("elevenlabs.tts.latency", "result", success ? "success" : "failure")
            .record(Duration.ofNanos(System.nanoTime() - start));
}
```

이 값이 쌓이면 나중에 이런 걸 볼 수 있다

- 실제 응답 시간의 분포 (예: 대부분 3초 안에 끝나는데 가끔 12초짜리가 있다)
- 그걸 보고 타임아웃 20초 -> 더 짧게, 서킷의 "느린 호출 15초" 기준도 실측에 맞게 조정

<br/>

### 💬 그냥 로그로 찍으면 안 되나

로그로도 남길 순 있다  
근데 나중에 "상위 5%가 몇 초냐(p95)" 같은 걸 뽑으려면 로그를 다시 일일이 파싱해야 한다  
Micrometer는 이런 분포 계산을 알아서 해주니, 어차피 서킷까지 붙인 김에 계측도 제대로 넣는 게 낫다고 봤다

<br/>

⚠️ **계측을 넣었다고 지금 당장 값이 정확해지는 건 아니다**

데이터가 쌓여야 값을 고칠 수 있으니, 그전까진 넉넉한 추정치(20초)로 버틴다  
중요한 건, 추정치를 아무 생각 없이 박아두고 잊는 것과  
추정치인 걸 알면서 "나중에 이 데이터로 고친다"는 장치를 걸어두는 건 다른 상태라는 것

<br/>

❓ **여기까지 하고 나서, 내가 내린 판단들을 정리해보자**

---

다음으로 이동 -> [[13. 내 기준]]

## 내 기준

## 전체 흐름

```
TTS가 자꾸 실패하고, 사용자는 버튼을 연타함 (과금 위험)
    |
[Retry] 일시적 실패는 자동으로 한 번 더 시도 (POST지만 멱등이라 안전, 비용 때문에 2회로 제한)
    |  Backoff + Jitter로 상대를 몰아붙이지 않게
    |
[별도 빈 분리] self-invocation 함정을 처음부터 회피
    |
[Timeout] 응답이 안 오면 무한 대기하지 않도록 (연결 5s / 요청 20s)
    |
[Circuit Breaker] 계속 실패하면 아예 차단해서 서버 보호
    |  Retry와 순서 꼬임(서킷이 재시도마다 카운트) 발견 -> 순서 고정
    |  WireMock으로 Open/Half-Open 전이를 직접 재현
    |
[single-flight] 같은 문장 동시 요청은 하나로 합쳐 호출 1번만 (연타 과금 차단)
    |
[예외 흐름] 실패 원인별로 502 / 503(+Retry-After) 구분 응답
    |
[Micrometer] 값이 다 추정치라, 실측으로 고칠 계측을 심어둠
```

<br/>

> 재시도 버튼을 내가 직접 누르던 걸 시스템이 대신하게 만드는 게 이번 목표였다  
> Retry가 그 버튼을 대신 눌러주고, Circuit Breaker가 "계속 눌러봐야 소용없을 때"를 대신 판단해주고, single-flight가 "이미 누른 걸 또 누르는" 낭비를 막아준다

<br/>

## 실전 체크리스트

**Q. 재시도 버튼을 직접 누르던 불편은 해결됐나**  
일시적인 실패(순간 5xx, 느린 응답)는 시스템이 알아서 한 번 더 시도한다  
다만 ElevenLabs가 계속 죽어있으면 서킷이 열려 빨리 실패로 끝난다 - "누를 필요"는 줄지만 "TTS가 아예 안 나오는 상황"까지 없애주진 않는다

**Q. 연타 과금은 막았나**  
프론트(1.5초 쿨다운)와 백엔드(single-flight)를 겹쳐서, 어느 쪽으로 새도 실제 호출은 한 번만 나간다  
재시도로 인한 비용은 실패할 때만 최대 2배(재시도 1회)이고, 평소 성공 호출엔 영향 없다

**Q. 값들은 믿을 만한가**  
아니다, 전부 추정치다 - Micrometer로 측정은 시작했지만 아직 값을 고칠 만큼 데이터가 안 쌓였다  
"정상이면 원래 얼마나 걸려야 하는가"로 잡은 1차값이라는 걸 분명히 해둔다

**Q. 첫 연동이라 불안정하던 느낌은 근본적으로 사라졌나**  
아니다, 이번에 한 건 "불안정한 API를 다루는 방식"이지 "API 자체를 안정시킨 것"은 아니다  
정말 불안하면 TTS 공급자를 하나 더 두는 이중화(서킷이 열렸을 때 다른 공급자로 fallback)도 방법인데, 그쪽도 키/과금이 또 생긴다 - 이건 지금 심은 측정값에서 나올 실패율을 보고 정할 문제라, 이번엔 구조만 열어두고 미룬다

**Q. 다시 나올 함정은**  
어노테이션 두 개 이상(@Retry, @CircuitBreaker)을 겹쳐 쓸 땐 실행 순서를 꼭 확인할 것  
그리고 프록시 기반 어노테이션은 self-invocation(자기 클래스 내부 호출)에서 조용히 안 먹힌다는 것 - 다음에 또 만날 패턴이다

<br/>

❓ **완료 기준은 다 채웠다. 근데 코드를 다시 뜯어보니 그래도 걸리는 것들이 있다**

---

다음으로 이동 -> [[14. 다 됐다고 했지만, 그래도 걸리는 것들]]

## 다 됐다고 했지만, 그래도 걸리는 것들

완료 기준은 다 채웠다  
근데 만든 코드를 다시 뜯어보니 걸리는 것들이 나왔다 - 둘은 바로 고쳤고, 둘은 지금은 미뤘다

<br/>

## 1. 타임아웃에도 재시도를 걸고 있었다 -> 뺐다

원래 재시도는 **모든 실패**에 걸려 있었다  
타임아웃(20초)도 실패니까 재시도 대상이었는데, 그러면 최악의 경우 사용자는 이만큼 기다린다

```
20초 (첫 요청 타임아웃) + 0.5초 (backoff) + 20초 (재시도 타임아웃) ≈ 40초
```

버튼 앞에서 40초를 기다렸다가 실패를 받는 셈이다  
게다가 타임아웃은 "상대가 지금 느리다"는 신호라, 곧바로 또 20초짜리 재시도를 거는 게 성공 확률이 높지도 않다

그래서 타임아웃 전용 예외(`ElevenLabsTimeoutException`)를 따로 만들고, 재시도 대상에서 뺐다

```properties
### 5xx, 연결 오류는 재시도하되
resilience4j.retry.instances.elevenlabs.retry-exceptions=com.koroglish.client.ElevenLabsException
### 타임아웃은 재시도하지 않는다
resilience4j.retry.instances.elevenlabs.ignore-exceptions=com.koroglish.client.ElevenLabsTimeoutException
```

✨ **덤으로, 타임아웃은 이제 502가 아니라 504(Gateway Timeout)로 응답한다** - "실패"가 아니라 "느려서 못 받음"이라는 원인을 상태 코드로도 구분한 것

<br/>

## 2. single-flight 작업이 공용 풀에서 돌고 있었다 -> 전용 풀로 뺐다

09에서 진행 중인 작업을 `computeIfAbsent`로 관리하면서, 실제 호출은 `supplyAsync`로 비동기로 뺐다  
왜 굳이 비동기였을까?

> `computeIfAbsent`은 map의 일부에 잠깐 잠금을 건다  
> 그 안에서 20초짜리 API 호출을 직접 해버리면, 그동안 다른 key의 작업까지 이 잠금에 막힌다

그래서 "작업을 만드는 것"만 빠르게 끝내고 무거운 호출은 밖으로 뺀 것이다

✨ **테스트하다 이게 '선택'이 아니라 '필수'라는 걸 알게 됐다**  
작업이 끝나면 `whenComplete`에서 map을 정리(`inFlight.remove`)하는데,  
만약 작업을 동기로 실행하면 이 정리가 `computeIfAbsent` 한복판에서 실행된다  
그러면 같은 map을 자기 안에서 또 건드리는 꼴이라 `ConcurrentHashMap`이 "recursive update" 예외를 던진다  
즉 이 구조는 애초에 비동기 실행이 아니면 성립하지 않는다

<br/>

근데 문제가 하나 더 있었다  
`supplyAsync`에 스레드풀을 안 주면 **JVM 공용 풀(ForkJoinPool.commonPool)** 에서 돈다  
이 풀은 앱 전체가 같이 쓰는 작은 공용 자원이라, 느린 TTS I/O가 여길 오래 물면 다른 작업까지 굶는다

그래서 TTS 전용 스레드풀을 따로 만들어 넘겼다

```java
@Bean
public ThreadPoolTaskExecutor ttsExecutor() {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(4);
    executor.setMaxPoolSize(16);
    executor.setQueueCapacity(50);
    executor.setThreadNamePrefix("tts-");
    executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
    return executor;
}
```

느린 외부 I/O는 공용 풀이 아니라 격리된 전용 풀에서 돌린다 - 한 기능의 지연이 앱 전체로 번지지 않게

<br/>

---

여기부터는 알지만 지금은 미룬 것들

<br/>

## 3. single-flight는 서버 한 대 안에서만 통한다

진행 중인 작업을 담아둔 map은 그 서버의 메모리(JVM) 안에만 있다

지금 koroglish는 서버 1대라 괜찮다  
근데 서버를 여러 대로 늘리면(로드밸런서 뒤에 여러 인스턴스), 같은 문장 요청이 서버마다 따로 들어가 ElevenLabs를 각각 호출할 수 있다

✨ **사실 이건 Cache Stampede와 같은 뿌리의 문제다**  
(Cache Stampede = 캐시가 비는 순간 요청이 한꺼번에 몰려 원본 서버를 동시에 때리는 현상)

single-flight는 "한 서버 안에서" 몰리는 요청을 합치는 방어다  
여러 서버까지 하나로 묶으려면 Redis 같은 공용 저장소에 락을 걸어야 한다 - 그건 규모가 커졌을 때의 이야기

<br/>

## 4. 멱등성의 진짜 빈틈 - 성공했는데 응답만 유실되면?

03에서 오디오에 영향을 주는 값을 전부 해시해서 캐시 키(=멱등성 토큰)로 쓰기로 했다  
근데 이 키는 "우리 서버가 이미 응답을 받은 경우"에만 힘을 발휘한다  
아래 순서라면 이 키도 못 막는다

```
1. ElevenLabs가 음성을 다 만들고 과금까지 함
2. 근데 그 응답이 네트워크에서 유실됨
3. 우리는 응답을 못 받았으니 실패로 판정 -> 재시도
4. ElevenLabs가 또 만들고 또 과금 (음성은 같지만 돈은 두 번)
```

우리 쪽 캐시는 애초에 "응답을 받아서 저장까지 끝난" 결과에만 히트한다  
근데 이 시나리오는 저장할 응답 자체를 못 받은 경우라서, 캐시가 있든 없든 소용이 없다  
결과가 같다는 의미의 멱등성과, 부수효과(과금)까지 같다는 의미의 멱등성은 다른 것이다

이걸 진짜로 막으려면 ElevenLabs가 "이 키로는 이미 처리했으니 새로 만들지 마"라고 판단해주는 서버 측 Idempotency-Key를 지원해야 한다  
03에서 ElevenLabs 공식 문서까지 찾아봤는데, 이런 서버 측 지원은 없었다 - 공식 문서도 "클라이언트가 알아서 해시 키로 캐싱하라"고 권할 뿐이었다  
즉 이 마지막 빈틈은 **상대 API가 기능을 열어주지 않는 한 우리 쪽 코드만으로는 닫을 수 없다**

그래서 `max-attempts=2`로 최악의 경우를 "2배까지"로 묶어두는 선에서 타협했다  
(참고로 위 1번에서 타임아웃 재시도를 빼면서, 이 이중 과금 위험도 같이 줄었다 - "응답을 못 받아서 성공인지 몰랐던" 애매한 상황이 정확히 타임아웃이고, 그게 이제 재시도 대상에서 빠졌기 때문이다)

<br/>

> 완료 기준은 "됐다/안 됐다"로 끊지만, 실제 코드에는 늘 이렇게 "지금은 괜찮지만" 딱지가 붙은 것들이 남는다  
> 이걸 모르고 안 한 것과, 알고서 지금은 미룬 것은 다르다고 본다
