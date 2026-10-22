---
title: "Post 단건 조회, 매번 DB까지 가야 하나"
date: 2026-07-02
area: hard-skill
category: "성능·확장성"
project: "Salmonbus"
tags:
  - "Redis"
  - "캐시"
  - "Spring"
aliases:
  - "04. 쌍둥이와 앱 개발기/SBI/Post 단건 조회, 매번 DB까지 가야 하나/01. 발단"
  - "04. 쌍둥이와 앱 개발기/SBI/Post 단건 조회, 매번 DB까지 가야 하나/02. Cache-Aside, Write-Through, Write-Behind"
  - "04. 쌍둥이와 앱 개발기/SBI/Post 단건 조회, 매번 DB까지 가야 하나/03. TTL이냐 이벤트 기반 무효화냐"
  - "04. 쌍둥이와 앱 개발기/SBI/Post 단건 조회, 매번 DB까지 가야 하나/04. Redis는 싱글 스레드인데 왜 빠른가"
  - "04. 쌍둥이와 앱 개발기/SBI/Post 단건 조회, 매번 DB까지 가야 하나/05. Cache Stampede란 무엇인가"
  - "04. 쌍둥이와 앱 개발기/SBI/Post 단건 조회, 매번 DB까지 가야 하나/06. 내 기준"
draft: true
---

## 발단

RDD 공부 일정대로 오늘은 캐시 차례였다

지난주 인덱스([[04. 쌍둥이와 앱 개발기/SBI/로그인할 때마다 db full scan을 하고있다?/01. 발단|로그인할 때마다 db full scan을 하고있다?]])는 이미 있는 쿼리를 최적화하는 문제였는데, 캐시는 방향이 달랐다 - 아예 DB를 안 가고 끝내는 문제였다

<br/>

바리바리에서 캐싱하기 가장 만만한 후보를 찾아봤다  
`GET /posts/{id}` - 단건 조회, 키가 명확하고 무효화 시점도 뚜렷하다

```java
@GetMapping("/{id}")
public ResponseEntity<ApiResponse<PostDetailResponse>> getById(@PathVariable long id) {
    return ResponseEntity.ok(ApiResponse.of(postApplicationService.getById(id)));
}
```

이 엔드포인트는 호출될 때마다 무조건 DB까지 간다

<br/>

이론만 알고 "Cache-Aside가 뭔지 압니다"라고 말하는 것과, 실제로 짜보고 테스트로 hit/miss 시간까지 재본 것은 다르다는 생각이 들었다  
그래서 Cache-Aside 하나만 만들고 끝내지 않고, Write-Through/Write-Behind까지 같은 인터페이스로 구현해서 코드로 비교해보기로 했다

<br/>

❓ Cache-Aside, Write-Through, Write-Behind - 셋 다 "캐시 전략"인데 뭐가 다른가

다음으로 이동 -> [[02. Cache-Aside, Write-Through, Write-Behind]]

## Cache-Aside, Write-Through, Write-Behind

## 캐시 전략이 왜 세 가지로 나뉘나?

캐시는 결국 "원본(DB)이랑 캐시(Redis) 둘 다 최신 상태로 맞추는 문제"다

언제 캐시를 채우고, 언제 지우고, 언제 DB에 반영하느냐에 따라 세 가지로 나뉜다

<br/>

## Cache-Aside - 캐시는 애플리케이션이 직접 관리

읽기 전략임
read-through 는 애플리케이션에서 캐시만 의존하는 전략 << 어셔가 말해줬음..

읽기: 캐시 먼저 보고 없으면 DB 가서 캐시를 채운다  
쓰기: DB만 쓰고 캐시는 지운다 (업데이트가 아니라 삭제) << 상성이 잘 맞는 쓰기 전략임

```java
@Override
public Post getById(final long id) {
    final PostCacheEntry cached = redisTemplate.opsForValue().get(cacheKey(id));
    if (cached != null) {
        return cached.toDomain();
    }
    final Post post = delegate.getById(id);
    redisTemplate.opsForValue().set(cacheKey(id), PostCacheEntry.from(post), TTL);
    return post;
}

@Override
public void update(final Post post) {
    delegate.update(post);
    redisTemplate.delete(cacheKey(post.getId())); // 지운다, 안 채운다
}
```

테스트로 성능 확인:

```
[캐시 성능] miss=238ms, hit=20ms
```

가장 많이 쓰는 이유 - 구현이 단순하고, 캐시가 날아가도 다음 조회 때 다시 채워지니까 장애에 강하다

<br/>

02-450-4235

## Write-Through - 쓸 때 캐시도 같이 동기로 갱신

상성이 잘 맞는 read-through

Cache-Aside랑 코드가 거의 똑같은데 `update()`만 다르다 - 지우는 대신 새 값으로 덮어쓴다

```java
@Override
public void update(final Post post) {
    delegate.update(post);
    redisTemplate.opsForValue().set(cacheKey(post.getId()), PostCacheEntry.from(post), TTL); // 덮어쓴다
}
```

수정 직후 바로 조회해도 캐시에 이미 최신값이 있어서 DB를 안 탄다

```java
sut.update(updated);
final Post afterUpdate = sut.getById(1L);

verify(delegate, times(1)).getById(1L); // 최초 1번뿐, 수정 후 조회는 캐시로 해결
```

Cache-Aside였다면 이 시점에 `delegate.getById`가 한 번 더 불렸어야 한다 - 무효화했으니까

<br/>

⚠️ 캐시 쓰기가 매번 동기로 일어나서, 쓰기 자체 지연은 Cache-Aside보다 약간 늘어난다

<br/>

## Write-Behind - 캐시만 동기, DB는 비동기

```java
@Override
public void update(final Post post) {
    redisTemplate.opsForValue().set(cacheKey(post.getId()), PostCacheEntry.from(post), TTL); // 캐시부터
    dbWriteExecutor.submit(() -> delegate.update(post)); // DB는 나중에
}
```

DB에 300ms 지연을 걸어놓고 테스트해보니, `update()` 자체는 훨씬 빨리 리턴됐다

```
[Write-Behind] update() 리턴까지 36ms 걸림
```

<br/>

⚠️ 이 36ms와 300ms 사이, DB엔 아직 반영 안 된 상태다

이 사이에 캐시(Redis) 프로세스가 죽으면 그 쓰기는 영영 사라진다 - Write-Behind의 가장 큰 리스크

<br/>

### write-around

db에 먼저쓰고, 캐시 나중에


<br/>

## 언제 뭘 쓰나

| 상황 | 전략 |
|---|---|
| 읽기가 압도적으로 많고 쓰기는 가끔 (게시글 조회 같은 경우) | Cache-Aside |
| 쓰기 직후 바로 최신값을 읽어야 하는 화면이 있다 | Write-Through |
| 쓰기 폭주를 버텨야 하고 약간의 유실은 감수 가능 (조회수 카운트 같은 경우) | Write-Behind |

<br/>

### 💬 셋 다 구현은 했는데, 셋 다 앱에 적용했나?

아니다 - `@Profile("cache-demo-manual")`처럼 프로필로 묶어서 학습용으로만 켜지게 해뒀다

Post 단건 조회는 읽기 위주라 Cache-Aside가 제일 맞아서, 실제로 붙인다면 이걸 고를 것 같다

<br/>

❓ 근데 캐시를 언제 지울지(TTL) vs 언제 이벤트로 지울지, 이것도 트레이드오프가 있나

다음으로 이동 -> [[03. TTL이냐 이벤트 기반 무효화냐]]

## TTL이냐 이벤트 기반 무효화냐

## 왜 두 개를 같이 쓰나?

이벤트 기반 무효화만 쓰면 될 것 같은데, 실제 코드엔 TTL도 같이 넣었다

```java
private static final Duration TTL = Duration.ofMinutes(5);
...
redisTemplate.opsForValue().set(key, PostCacheEntry.from(post), TTL);
```

<br/>

## 이벤트 기반 무효화만으로 안 되는 이유

쓰기가 생기면 그 즉시 캐시를 지우는 게 이벤트 기반 무효화다 - 대부분의 경우 이걸로 충분하다

문제는 순서가 꼬이는 경우다

1. A가 조회 요청 -> 캐시 miss -> DB에서 옛날 값을 읽는 중
2. 그 사이 B가 값을 수정 -> DB엔 새 값, 캐시는 지움
3. A가 뒤늦게 "아까 읽은 옛날 값"으로 캐시를 다시 채움

결과: DB는 최신인데 캐시엔 옛날 값이 계속 남는다 - 이벤트가 발생했는데도 못 막는 경우다

<br/>

✨ 이걸 완벽히 막을 방법은 없다 - 대신 TTL을 안전망으로 깐다

최악의 경우에도 TTL(5분)이 지나면 스스로 사라지고, 다음 조회 때 다시 최신값으로 채워진다

<br/>

### 💬 그럼 TTL만 쓰고 이벤트 기반 무효화는 안 써도 되지 않나?

TTL만 쓰면 최대 TTL 시간만큼은 무조건 옛날 값을 보여준다는 뜻이다

이벤트 기반 무효화는 대부분의 경우 즉시 반영해주니까, 평소엔 빠르게 갱신되고 꼬였을 때만 TTL이 늦게라도 고쳐주는 조합이 낫다

<br/>

❓ 근데 Redis는 왜 하필 싱글 스레드로 만들었을까 - 느릴 것 같은데 왜 빠른가

다음으로 이동 -> [[04. Redis는 싱글 스레드인데 왜 빠른가]]

## Redis는 싱글 스레드인데 왜 빠른가

## 싱글 스레드인데 왜 빠른가

여러 스레드가 같은 데이터를 만지면 락(lock)이 필요하다 - 락은 곧 기다리는 시간이다

Redis는 애초에 한 스레드만 데이터를 만지니까 락 자체가 없다

<br/>

## 그럼 요청은 어떻게 동시에 처리하나 - I/O 멀티플렉싱

한 명이 손님을 한 명씩 붙잡고 "다 될 때까지 기다려"하지 않는다

OS가 "지금 이 요청 준비됐어요"라고 알려주는 걸(epoll) 보고, 준비된 것만 골라서 처리하고 바로 다음으로 넘어간다

기다리느라 노는 시간 없이 계속 처리만 하는 구조라, 처리 자체가 메모리 조회(나노초 단위)라서 초당 수만 건도 감당한다

<br/>

### 💬 CPU 캐시랑도 관련 있다

싱글 스레드라 스레드 전환(컨텍스트 스위칭)이 없다

멀티스레드였으면 스레드가 바뀔 때마다 CPU L1/L2 캐시에 있던 데이터가 다른 스레드 것으로 교체(캐시 스래싱)돼서 다시 RAM까지 가야 한다

Redis는 한 스레드만 계속 도니까 캐시가 계속 "따뜻한" 상태를 유지한다

<br/>

### 💬 그럼 Redis는 항상 싱글 스레드인가?

정확히는 커맨드 처리(실제 GET/SET 연산)만 싱글 스레드다

Redis 6부터는 네트워크 I/O 자체는 멀티스레드로 처리할 수 있게 됐다 - 다만 데이터를 실제로 읽고 쓰는 부분은 여전히 싱글 스레드라 락이 없다는 핵심은 그대로다

<br/>

❓ 근데 캐시가 통째로 비는 순간, 인기글이면 무슨 일이 생기나

다음으로 이동 -> [[05. Cache Stampede란 무엇인가]]

## Cache Stampede란 무엇인가

## 캐시가 사라지는 순간, 다 같이 DB로 몰려간다

TTL이 만료되거나 무효화된 직후, 마침 그 키를 찾는 요청이 여러 개 동시에 들어오면 전부 캐시 miss가 뜬다

전부 DB로 몰려가서 DB가 순간적으로 평소의 몇 배 부하를 받는다 - 이게 Cache Stampede다 (Thundering Herd라고도 부른다)

<br/>

## 막는 방법

1. **Mutex** - 캐시가 비었을 때 딱 한 명만 DB에 가게 하고, 나머지는 그 결과를 기다렸다가 같이 씀 (구현+테스트 완료)
2. **조기 갱신** - 만료 직전에 미리 한 명이 슬쩍 갱신해서 "완전히 비는 순간" 자체를 없앰 (이론만)
3. **stale-while-revalidate** - 캐시를 지우지 않고 "오래된 값"이라 표시만 해둔 채 계속 보여주면서 뒤에서 몰래 갱신 (이론만)
4. **TTL에 랜덤 지터(jitter) 추가** - TTL을 정확히 5분이 아니라 5분 ± 30초처럼 흔들어서, 같은 시각에 발급된 키들이 한 번에 몰려서 만료되는 걸 막음 (구현 완료, Mutex 코드에 같이 넣음)

<br/>

## Mutex, 실제로 만들어서 동시성으로 검증

Redis의 `SET key value NX EX ttl`이 원자적이라는 걸 이용했다 - `NX`(없을 때만 저장)라서 여러 요청이 동시에 쏴도 정확히 하나만 성공한다

```java
final boolean acquired = Boolean.TRUE.equals(
    lockRedisTemplate.opsForValue().setIfAbsent(lockKey, "1", LOCK_TTL)
);

if (acquired) {
    try {
        final Post post = delegate.getById(id);
        redisTemplate.opsForValue().set(key, PostCacheEntry.from(post), randomizedTtl());
        return post;
    } finally {
        lockRedisTemplate.delete(lockKey);
    }
}
// 락을 못 딴 나머지는 락을 딴 애가 채울 때까지 짧게 기다렸다가 캐시를 다시 본다
```

스레드 20개로 동시에 캐시 miss 상황을 재현하는 테스트로 확인:

```
[Stampede 방어] 동시 요청 20개 -> DB 조회 1번
```

<br/>

### 💬 락 TTL(`LOCK_TTL`)은 왜 또 필요한가

락을 딴 애가 DB 갱신 도중 죽어버리면 락을 지우는 코드까지 못 가서 락이 영원히 안 풀린다 - 그럼 나머지는 영원히 대기하는 데드락이 생긴다

그래서 락 키에도 TTL(5초)을 걸어서, 최악의 경우에도 스스로 풀리게 안전망을 뒀다 - 오늘 계속 나온 "TTL은 이벤트 기반이 놓친 경우의 안전망"이라는 원칙이 락에도 똑같이 적용된다

<br/>

### 💬 조기 갱신, stale-while-revalidate는 왜 코드로 안 만들었나

Mutex 하나로 오늘 배운 이론(원자적 연산, TTL 안전망, 동시성 테스트)을 다 보여줄 수 있어서 우선순위를 낮췄다

개념과 트레이드오프는 설명 가능하지만, 이 둘은 실제 구현 경험은 아직 없다는 걸 발표에서 그대로 말할 생각이다

<br/>

❓ 그래서 오늘 배운 걸 어떤 기준으로 정리할까

다음으로 이동 -> [[04. 쌍둥이와 앱 개발기/SBI/Post 단건 조회, 매번 DB까지 가야 하나/06. 내 기준|06. 내 기준]]

## 내 기준

```
조회 요청 발생
    |
읽기 위주인가? (쓰기 대비 압도적으로 많음)
    |
   YES -> Cache-Aside
    |
    NO -> 쓰기 직후 최신값을 바로 봐야 하는가?
              |
             YES -> Write-Through
              |
              NO -> 쓰기 폭주를 버텨야 하고 약간의 유실 감수 가능한가?
                        |
                       YES -> Write-Behind
                        |
                        NO -> Cache-Aside (기본값)

무효화는 항상: 이벤트 기반(즉시 삭제) + TTL(안전망) 같이
```

<br/>

> Cache-Aside가 기본값이고, TTL은 이벤트 기반 무효화가 놓치는 경우를 위한 안전망이다
>
> 구현해본 것과 이론만 아는 것을 구분해서 말한다 - Cache-Aside/Write-Through/Write-Behind, TTL+이벤트 무효화, Stampede 방어 중 Mutex+TTL Jitter는 코드와 동시성 테스트로 확인했고, 조기 갱신/stale-while-revalidate는 개념만 안다

<br/>

❓ 실전 체크리스트

- Cache-Aside 쓰기 경로에서 캐시를 "지우는지" "덮어쓰는지" 헷갈리면 안 된다 - 지우면 Cache-Aside, 덮어쓰면 Write-Through
- TTL만 믿고 이벤트 기반 무효화를 생략하면 최대 TTL만큼 무조건 stale 상태를 보여준다
- Write-Behind는 "빠르다"가 아니라 "유실 위험과 맞바꾼 빠름"이다 - 카운트류처럼 유실을 감수할 수 있는 데이터에만 쓴다
- Redis가 빠른 이유를 "메모리라서"로만 답하면 반쯤 틀렸다 - 락이 없다는 것과 I/O 멀티플렉싱을 쓴다는 것까지 말해야 한다
- Cache Stampede는 "캐시가 없어서" 생기는 게 아니라 "캐시가 동시에 없어져서" 생긴다 - TTL에 지터를 주는 것만으로도 완화된다
- Redis의 `SET NX EX` 원자성이 분산 락의 근거다 - 싱글 스레드라 두 클라이언트가 동시에 같은 키를 못 만든다
- 발표에서 "구현했다"와 "이론으로 설명 가능하다"를 섞지 않는다 - 조기갱신/stale-while-revalidate는 코드 없이 개념만 말한다
