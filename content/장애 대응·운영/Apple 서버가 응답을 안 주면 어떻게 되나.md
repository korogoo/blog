---
title: "Apple 서버가 응답을 안 주면 어떻게 되나"
date: 2026-07-03
area: hard-skill
category: "장애 대응·운영"
project: "Salmonbus"
tags:
  - "외부 API"
  - "타임아웃"
  - "장애 대응"
aliases:
  - "04. 쌍둥이와 앱 개발기/SBI/Apple 서버가 응답을 안 주면 어떻게 되나/01. 발단"
  - "04. 쌍둥이와 앱 개발기/SBI/Apple 서버가 응답을 안 주면 어떻게 되나/02. Timeout 3종"
  - "04. 쌍둥이와 앱 개발기/SBI/Apple 서버가 응답을 안 주면 어떻게 되나/03. Retry와 멱등성"
  - "04. 쌍둥이와 앱 개발기/SBI/Apple 서버가 응답을 안 주면 어떻게 되나/04. Circuit Breaker의 3가지 상태"
  - "04. 쌍둥이와 앱 개발기/SBI/Apple 서버가 응답을 안 주면 어떻게 되나/05. 슬라이딩 윈도우와 임계치 측정"
  - "04. 쌍둥이와 앱 개발기/SBI/Apple 서버가 응답을 안 주면 어떻게 되나/06. Spring AOP는 왜 이 메서드를 못 감쌌나"
  - "04. 쌍둥이와 앱 개발기/SBI/Apple 서버가 응답을 안 주면 어떻게 되나/07. 내 기준"
draft: true
---

## 발단

RDD 공부 일정대로 오늘은 외부 API 차례다

지난주 캐시([[04. 쌍둥이와 앱 개발기/SBI/Post 단건 조회, 매번 DB까지 가야 하나/01. 발단|Post 단건 조회, 매번 DB까지 가야 하나]]) 때는 "아예 DB에 안 가는" 문제였는데, 오늘은 "나갔는데 안 돌아오면" 문제다

<br/>

Apple 로그인 코드(`AppleTokenValidator`)에서 JWKS를 가져오는 부분을 다시 봤다

```java
this.httpClient = HttpClient.newHttpClient();
...
final HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create(jwksUrl))
    .GET()
    .build();
final String responseBody = httpClient
    .send(request, HttpResponse.BodyHandlers.ofString())
    .body();
```

`newHttpClient()` 기본 팩토리로 만들었고, 요청 쪽에도 `.timeout(...)`이 없다

Apple 서버가 응답을 늦게 주면 이 호출은 끝나는 시점이 정해져 있지 않다는 뜻이다

<br/>

❓ 이 호출 하나가 안 끝나면 실제로 뭐가 문제인가

다음으로 이동 -> [[02. Timeout 3종]]


연동 서비스 이중화

## Timeout 3종

## 왜 하나가 아니라 3개로 나누나

외부 API 호출이 "언제 어디서" 멈췄는지에 따라 원인이 다르다

- Connection Timeout - TCP handshake가 안 끝남, 상대가 죽었거나 경로 자체가 막힘
- Read Timeout - 연결은 됐는데 응답이 안 옴, 상대가 살아있지만 처리가 느림
- Write Timeout - 요청 body를 보내는 중에 멈춤, 업로드가 느리거나 상대가 못 받음

"Timeout 5초" 하나로 뭉치면 어느 단계에서 멈췄는지 로그로 구분이 안 된다

<br/>

## 우리 서버에 적용하면

스레드가 이 호출 하나를 붙잡고 안 돌아오는 상태가 계속되면, 로그인 요청이 몰릴 때 Tomcat 스레드풀이 이 대기 중인 스레드들로 다 차버릴 수 있다

스레드풀이 고갈되면 Apple 로그인만이 아니라 서비스 전체가 응답을 못 하게 된다

<br/>

### 💬 근데 Java 표준 HttpClient는 2개만 준다

`HttpClient.Builder.connectTimeout(Duration)` - Connection Timeout
`HttpRequest.Builder.timeout(Duration)` - 요청 보낸 시점부터 응답 다 받을 때까지의 시간, Read와 Write가 합쳐진 개념

Read/Write를 완전히 분리하려면 OkHttp 같은 라이브러리로 바꿔야 하는데, 지금 규모에서 그렇게까지 가는 건 오버엔지니어링이라 표준 HttpClient를 그대로 썼다

```java
this.httpClient = HttpClient.newBuilder()
    .connectTimeout(Duration.ofSeconds(2))
    .build();

final HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create(jwksUrl))
    .timeout(Duration.ofSeconds(3))
    .GET()
    .build();
```

Connection 2초 / 요청 전체 3초로 잡았다 - Apple JWKS는 단순 정적 키 목록이라 오래 걸릴 이유가 없다

<br/>

❓ Timeout이 걸려서 실패했을 때, 그냥 한 번 실패로 끝내도 되나

다음으로 이동 -> [[03. Retry와 멱등성]]

## Retry와 멱등성

## 즉시 재시도가 왜 위험한가

실패하자마자 바로 다시 보내면, 상대가 이미 부하로 힘든 상황일 때 요청을 더 쏟아붓는 꼴이다 (thundering herd)

Exponential Backoff로 1초 -> 2초 -> 4초로 대기 시간을 늘리고, 여러 클라이언트가 동시에 실패했을 때 다 같은 타이밍에 재시도해서 또 부딪히지 않도록 Jitter(랜덤 값)를 섞는다

<br/>

## 멱등성 - 처음엔 Retry 로직 자체인 줄 알았다

Retry 실패 시 다시 시도하는 처리를 "멱등성"이라고 착각하고 있었다

멱등성은 재시도 메커니즘이 아니라 **연산 자체의 성질**이다 - 같은 요청을 몇 번을 보내든 결과가 한 번 보낸 것과 같아야 멱등이다

- `GET /users/1` - 몇 번 호출해도 결과가 같다, 멱등
- `DELETE /users/1` - 첫 호출에 삭제되고 두 번째는 "이미 없음"이라 결과가 같다, 멱등
- `POST /orders` - 호출할 때마다 새 주문이 생긴다, 비멱등

<br/>

## 왜 이게 Retry와 연결되나

응답만 유실되고 서버는 이미 처리를 끝낸 상황에서 클라이언트가 실패로 착각해 재시도하면, 비멱등 연산은 두 번 실행된다 (주문 두 개 생성 같은 사고)

그래서 Retry는 멱등한 연산에서만 안전하다 - 비멱등 연산에 Retry를 걸어야 하면 Idempotency-Key로 별도 방어해야 한다

<br/>

## 우리 케이스는

Apple JWKS 조회는 `GET`이라 원래 멱등이라 Retry를 걸어도 안전하다

다만 오늘은 Retry는 적용하지 않기로 했다 - Circuit Breaker와 같이 넣으면 "재시도 하나하나를 실패로 셀지, 통째로 하나의 결과로 셀지" 순서 설계가 하나 더 필요해서, 오늘은 Timeout + Circuit Breaker까지만 완결하고 Retry는 다음으로 미뤘다

<br/>

❓ 그럼 실패가 반복될 때 상대 서버를 계속 두드리기만 하는 것도 문제 아닌가

다음으로 이동 -> [[04. Circuit Breaker의 3가지 상태]]

## Circuit Breaker의 3가지 상태

## 3가지 상태

- Closed - 정상, 요청을 그대로 통과시키면서 실패율을 감시
- Open - 실패율이 임계치를 넘으면 전환, 이후 요청은 상대 서버에 보내지도 않고 바로 실패 처리
- Half-Open - 일정 시간 후 소수의 요청만 흘려보내서 회복됐는지 확인

<br/>

### 💬 근데 왜 즉시 거부가 Open인가

즉시 거부니까 "닫혀있다(Closed)"가 더 어울린다고 생각했는데, 반대였다

이 이름은 요청 처리 여부가 아니라 **전기 회로** 은유다 - 가정집 두꺼비집처럼, 회로가 닫혀(Closed)있어야 전류가 흐르고, 과부하 감지되면 회로를 열어서(Open) 전류를 끊는다

Closed = 회로 연결됨 = 요청이 상대까지 흘러감
Open = 회로 끊김 = 요청이 중간에서 차단됨

"게이트가 닫혔다"는 직관과 "회로가 열렸다"는 실제 이름이 반대 방향이라 헷갈렸던 것

resilience4j 소스(`CircuitBreakerStateMachine`)를 까보니 `OpenState.tryAcquirePermission()`이 `waitDuration`이 지나기 전까지 무조건 `false`를 반환한다 - 실제 보호 대상 메서드는 호출조차 안 되고 차단된다

```java
public boolean tryAcquirePermission() {
    if (clock.instant().isAfter(this.retryAfterWaitDuration)) {
        this.toHalfOpenState();
        ...
    } else {
        this.circuitBreakerMetrics.onCallNotPermitted();
        return false;
    }
}
```

<br/>

❓ "실패율이 임계치를 넘으면"이라고 했는데, 그 임계치는 정확히 어떻게 재나

다음으로 이동 -> [[05. 슬라이딩 윈도우와 임계치 측정]]

## 슬라이딩 윈도우와 임계치 측정

## 최근 N개만 기억한다

최근 N개(또는 최근 N초)의 호출 결과만 남기는 자료구조를 슬라이딩 윈도우라고 한다

크기 N짜리 원형 배열(ring buffer)에 성공/실패를 계속 기록하고, 배열이 차면 가장 오래된 칸을 덮어쓴다 - 전체 개수는 매번 다시 세지 않고 새로 들어온 값은 더하고 밀려나는 값은 빼는 식으로 O(1)로 관리한다

<br/>

### 💬 근데 O(1)이 꼭 원형 배열이어야 하나

연결 리스트(Queue)로 앞에서 빼고 뒤에 넣어도 O(1)은 된다 - O(1)의 조건은 "전체를 안 훑는 것"이지 원형이냐 아니냐가 아니다

원형 배열을 쓰는 진짜 이유는 다른 데 있다

- 호출마다 큐 노드를 새로 힙에 할당할 필요가 없다 (GC 압박 없음)
- 배열이 메모리에 연속으로 붙어있어서 캐시 지역성이 좋다 (연결 리스트는 포인터를 따라가며 캐시 미스가 나기 쉽다)
- 그냥 고정 배열이면 오래된 걸 지울 때 나머지를 밀어야(O(N) shift) 하는데, 인덱스를 `% N`으로 감으면 밀지 않고 같은 메모리를 재사용할 수 있다

O(1) 자체는 자료구조 선택과 별개고, "핫패스에서 할당 없이 고정 메모리로 처리하려고" 원형 배열을 고른 것

<br/>

## 실제 코드로 확인한 임계치 측정

resilience4j `CircuitBreakerMetrics`를 까보니 표본이 너무 적을 때 판단을 보류하는 안전장치가 그대로 있었다

```java
this.minimumNumberOfCalls = Math.min(circuitBreakerConfig.getMinimumNumberOfCalls(), slidingWindowSize);
...
return bufferedCalls != 0 && bufferedCalls >= this.minimumNumberOfCalls
    ? snapshot.getFailureRate() : -1.0F;
```

호출 수가 `minimumNumberOfCalls` 미만이면 `-1.0`(무효값)을 반환해서 `BELOW_MINIMUM_CALLS_THRESHOLD`로 판정하고 Open 전환 자체가 안 일어난다

<br/>

### 💬 이론에 없던 발견 - Slow Call Rate

실패율만이 아니라 "느린 호출 비율"도 별도로 Open 트리거가 된다

```java
if (durationUnit.toNanos(duration) > this.slowCallDurationThresholdInNanos) {
    snapshot = this.metrics.record(duration, durationUnit, Outcome.SLOW_SUCCESS);
}
```

에러가 하나도 없어도, 응답이 계속 느리기만 하면 그 자체로 회로가 열릴 수 있다 - 이게 Timeout 값이랑 Circuit Breaker 설정이 같이 설계돼야 하는 이유다 (`slow-call-duration-threshold`를 하드 타임아웃보다 짧게 잡아서 "느려지는 중" 신호를 먼저 잡음)

<br/>

## Half-Open이 소수만 흘려보내는 방식

`HalfOpenState`를 까보니 `AtomicInteger` 카운터가 CAS로 하나씩 소진되는 방식이었다 - 랜덤으로 몇 개 통과가 아니라 딱 정해진 개수만 통과시키는 게이트다

```java
public boolean tryAcquirePermission() {
    if (this.permittedNumberOfCalls.getAndUpdate(current ->
        current == 0 ? current : current - 1) > 0) {
        return true;
    } else {
        this.circuitBreakerMetrics.onCallNotPermitted();
        return false;
    }
}
```

`getAndUpdate`가 갱신 전 값을 반환하는 걸 이용해서 "깎기 전에 남아있었는지"로 permit 여부를 판단한다

<br/>

❓ 이 Circuit Breaker를 실제 코드 어디에 붙여야 하나

다음으로 이동 -> [[06. Spring AOP는 왜 이 메서드를 못 감쌌나]]

## Spring AOP는 왜 이 메서드를 못 감쌌나

## 처음 붙인 자리

`AppleTokenValidator.fetchPublicKey`에 `@CircuitBreaker`를 바로 붙였다

```java
@CircuitBreaker()
private PublicKey fetchPublicKey(final Header header) {
    ...
}
```

컴파일부터 안 됐다 - `name`이 필수 속성인데 안 넣었다

<br/>

## 근데 고쳐도 조용히 안 먹혔을 것

`fetchPublicKey`는 `private`이고, 같은 클래스 안에서 `this::fetchPublicKey`로 호출된다

Spring AOP는 프록시 기반이다 - Spring이 진짜 객체를 감싸는 프록시를 만들어서, **외부에서 프록시를 거쳐** 들어오는 호출만 가로챌 수 있다

이 클래스 내부에서 `this`로 자기 자신을 호출하면 프록시를 거치지 않고 실제 객체(target)를 바로 호출하는 셈이라 우회된다 - `private`은 애초에 프록시가 오버라이드할 수도 없어서 이중으로 안 된다

에러가 안 나고 그냥 조용히 Circuit Breaker가 작동을 안 하는 상태로 남는 게 제일 위험했다

<br/>

## 대안 두 가지

**A. 호출을 별도 빈으로 분리** - 외부 빈을 거치는 진짜 프록시 호출이라 정상 동작, 관심사 분리 원칙에도 맞음
**B. resilience4j 프로그래매틱 API로 코드 안에서 직접 감싸기** - AOP를 아예 안 써서 private/self-invocation 문제 자체가 없음

호출 지점이 하나뿐이라 B가 보일러플레이트는 덜하지만, A로 선택했다 - JWKS 호출(외부 API 호출)과 kid 조회/RSA 키 조립(로컬 로직)이 원래 다른 책임이라 분리하는 게 맞다고 판단했다

<br/>

## 적용한 구조

```java
@Component
public class AppleJwksClient {
    @CircuitBreaker(name = "appleJwks")
    public String fetchJwks() {
        // HTTP 호출만
    }
}
```

`AppleTokenValidator`는 이 빈을 주입받아 호출한다 - 외부 빈 경유라 프록시가 정상적으로 가로챈다

<br/>

❓ 오늘 판단 기준은

다음으로 이동 -> [[04. 쌍둥이와 앱 개발기/SBI/Apple 서버가 응답을 안 주면 어떻게 되나/07. 내 기준|07. 내 기준]]

## 내 기준

```
Apple JWKS 호출 (HttpClient.newHttpClient(), timeout 없음)
    |
Connection Timeout(2s) / Request Timeout(3s) 추가
    |
Circuit Breaker 붙일 자리 고민
    |
AuthApplicationService.login() 전체? -> DB 호출까지 같이 묶여서 실패 원인 섞임, 기각
    |
AppleTokenValidator.fetchPublicKey (private, self-invocation)? -> 프록시 우회돼서 조용히 안 먹힘, 기각
    |
AppleJwksClient(신규 빈).fetchJwks() -> 외부 빈 경유라 프록시 정상 동작, 채택
    |
Retry는 이번엔 제외 (CB와 순서 설계 필요, 다음으로 미룸)
```

<br/>

> 아직 고정된 판단 기준을 세우기엔 이르다고 봤다 - 오늘은 Timeout + Circuit Breaker를 "왜 이 값인지, 왜 이 자리인지"까지는 설명할 수 있게 됐지만, Retry/캐싱까지 붙여보고 실제로 장애 상황을 흉내 내본 다음에 정리하는 게 더 정직한 기준이 될 것 같다
>
> 지금 말할 수 있는 건 하나뿐이다 - 외부 API를 붙일 때 "언제 끝나는지"가 정해져 있지 않으면, 그 API의 장애가 우리 서비스 전체의 장애가 된다는 것

<br/>

❓ 실전 체크리스트

- Timeout 값(2s/3s)은 이유는 있지만 실측 기반은 아니다 - 실제 Apple 응답 시간 분포를 재본 적은 없다
- Circuit Breaker 설정값(slidingWindowSize=10, minimumNumberOfCalls=5 등)도 트래픽 실측 없이 잡은 추정치다 - 로그인 트래픽이 실제로 얼마나 되는지 알면 다시 잡아야 한다
- Retry는 이론(멱등성 확인 완료)만 있고 코드는 없다 - "왜 안 넣었는지"는 설명 가능하지만 "넣었을 때 어떻게 동작하는지"는 아직 모른다
- Circuit Breaker가 실제로 Open 되는 상황을 코드로 재현해본 적은 없다 - WireMock으로 연속 실패를 흉내 내서 상태 전이를 눈으로 확인하는 테스트가 남아있다
- Spring AOP self-invocation 문제는 이번 프로젝트 전체에 다시 나올 수 있는 패턴이다 - `@Transactional`도 같은 이유로 내부 호출에선 안 먹힌다는 걸 기억해둘 것
