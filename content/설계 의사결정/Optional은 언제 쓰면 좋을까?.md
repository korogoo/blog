---
title: "Optional은 언제 쓰면 좋을까?"
date: 2026-05-03
area: hard-skill
draft: true
category: "설계 의사결정"
tags:
  - "Java"
  - "Optional"
aliases:
  - "02. 고민/Java/Optional은 언제 쓰면 좋을까?/01. 발단"
  - "02. 고민/Java/Optional은 언제 쓰면 좋을까?/02. Optional이란?"
  - "02. 고민/Java/Optional은 언제 쓰면 좋을까?/03. Optional 안티패턴"
  - "02. 고민/Java/Optional은 언제 쓰면 좋을까?/04. 내 기준"
  - "하드 스킬/Java/Optional은 언제 쓰면 좋을까?"
---
## 발단

다른 크루의 PR 에서 아래와 같은 리뷰 코멘트를 보았다

> `Side winner` VS `Optional<Side> winner` 어떠한 차이가 있을까요?
> 
> https://github.com/woowacourse/java-janggi/pull/334#discussion_r3055059503


<br/>

나 또한 DB에서 게임을 조회할 때 `Optional`로 반환하는 코드를 작성했다

그리고 `Optional`을 필드에 두거나, 파라미터로 넘기는 것이 안티패턴이라는 이야기를 어디선가 들었다

언제 쓰면 좋고 언제 쓰면 안 되는지 기준이 필요하다


---

---

## Optional이란?

> ==반환 타입에 값이 있을 수도 없을 수도 있음을 명시적으로 표현하는 타입==이다  
> 
> null을 직접 반환하는 대신, 그 불확실성을 타입 수준에서 알린다

---

### 개념

`null`을 반환하면 호출자가 null 체크를 빠뜨릴 수 있다

`Optional`을 반환하면 컴파일 타임에 `이 값이 없을 수 있다`는 사실이 드러난다

✨ **null 반환 방식 - 호출자가 null 체크를 빠뜨리면 NPE**

```java
public Game findByName(String name) {
    return games.getOrDefault(name, null);
}
```

✨ **Optional 방식 - 없을 수 있다는 사실이 타입에서 보인다**

```java
public Optional<Game> findByName(String name) {
    return Optional.ofNullable(games.get(name));
}
```

---

### Optional 생성 방식

✨ **value가 null이면 NPE (null 아닌 것이 확실할 때)**

```java
Optional.of(value)
```

<br/>

✨ **null이면 빈 Optional 반환**

```java
Optional.ofNullable(value)
```

<br/>

✨ **빈 Optional 직접 생성**


```java
Optional.empty()
```

---

### Optional에서 값 꺼내기

✨ **빈 Optional이면 NoSuchElementException**

```java
game.get();
```

<br/>


✨ **없으면 기본값 반환 (기본값을 항상 평가함)**

```java
game.orElse(new Game("기본"));
```

<br/>


✨ **없을 때만 람다 실행 (지연 평가)**

```java
game.orElseGet(() -> new Game("기본"));
```

<br/>


✨ **없으면 예외 던지기**

```java
game.orElseThrow(() -> new IllegalArgumentException("게임 없음"));
```

<br/>


✨ **있을 때만 실행**

```java
game.ifPresent(g -> System.out.println(g.getName()));
```

<br/>


✨ **있으면 변환, 없으면 빈 Optional**

```java
Optional<String> name = game.map(Game::getName);
```

---

### isPresent() vs ifPresent()

⚠️ **isPresent() + get()**
```java
if (game.isPresent()) {
    doSomething(game.get());
}
```

`null` 체크 + 사용과 사실상 같다

Optional을 쓰는 이유가 없어진다

<br/>

✨ **ifPresent()**

```java
game.ifPresent(g -> doSomething(g));
```

한 줄로 표현 가능한 `ifPresent`, `map`, `orElse` 계열을 적극 활용한다


---

---

## Optional 안티패턴

> Optional을 ==아무 데나 쓰면== null보다 나쁜 코드가 된다

---

### 안티패턴 목록

#### 필드로 선언

```java
public class Game {
    private Optional<String> description;
}
```

엔티티/DTO의 필드에 쓰는 경우 Optional은 직렬화를 지원하지 않는다


<br/>

따라서 필드는 그냥 null 허용 or 기본값 사용한다

```java
public class Game {
    private String description; // null 가능
}
```

---

#### 파라미터로 전달

```java
public void save(Optional<Game> game) { ... }
```

이 파라미터가 올 수도 있고 안 올 수도 있다는 의도를 충분히 표현하고 있다면 충분히 사용해도 된다


<br/>

만약 Spring 컨트롤러 메서드라면 더 직관적인 `required`, `defaultValue` 파라미터를 활용한다

```java
@RequestParam(required = false, defaultValue = "world") String name
```

---

#### get() 남발

```java
String name = findByName("장기").get(); // 없으면 예외
```

빈 Optional에 `get()`을 호출하면 NoSuchElementException (NPE) 와 다를 게 없다

<br/>

따라서 orElseThrow로 의도를 명시한다

```java
String name = findByName("장기")
    .orElseThrow(() -> new GameNotFoundException("장기 게임 없음"));
```

---

#### 컬렉션을 Optional로 감싸기

```java
public Optional<List<Game>> findAll() { ... }
```

컬랙션 이중 래핑은 쓸모 없다


<br/>

따라서 빈 리스트가 "없음"을 표현하도록 한다

```java
public List<Game> findAll() {
    return List.of(); // 없으면 빈 리스트
}
```

---

#### 단순히 null 체크를 피하려는 목적으로 남용

```java
Optional.of(piece).ifPresent(p -> move(p));
```

이미 값이 있는 걸 알면서 Optional로 감싸지 말자

Optional은 ==반환 타입==이 목적이다

null 체크 회피 도구가 아니다

<br/>

따라서 그냥 호출하도록 한다

```java
move(piece);
```


---

---

## 내 기준

### 전체 결정 흐름

❓ **이 메서드의 반환값이 없는 경우를 호출자에게 알려야 하는가?**


```
값이 없을 수 있는 상황이다
         │
         ▼
어디에 쓰는가?
         │
 ┌───────┼────────┐
반환 타입  필드    파라미터
   │       │        │
   ▼       ▼        ▼
Optional  ❌        ❌
 고려    null or  오버로딩
         기본값   or 조건
```

---

### 기준표

| 상황 | 선택 |
|---|---|
| DB 조회 — 없을 수 있다 | `Optional<T>` 반환 |
| 컬렉션 조회 | 빈 컬렉션 반환 |
| 반드시 있어야 하는 값 — 없으면 버그 | 예외 던지기 |
| 두 가지 상태를 표현 (있다/없다) | `Optional<T>` or 상태 분리 설계 |

---

### 실전 체크리스트

❓ **Optional을 필드로 선언했는가?**

필드는 그냥 null을 허용하거나 기본값을 설정한다

<br/>

❓ **Optional 파라미터가 있는가?**

오버로딩이나 Null Object 패턴으로 대체한다

<br/>

❓ **`isPresent()` + `get()` 조합을 쓰고 있는가?**

`ifPresent`, `map`, `orElseThrow` 로 바꾼다

<br/>

❓ **Optional<List<>>를 반환하는가?**

빈 리스트를 반환한다

<br/>

❓ **없는 상태가 정상적인 도메인 상태인가?**

`Side winner` vs `Optional<Side> winner`

승자가 없는 상태가 정상적인 도메인 상태라면 -> `Optional<Side>`  

승자는 항상 있어야 한다면 -> `Side` (없으면 예외)
