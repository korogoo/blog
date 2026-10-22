---
title: "왜 인터페이스에 default를 쓰면 안 될까?"
date: 2026-05-03
area: hard-skill
draft: true
category: "설계 의사결정"
tags:
  - "Java"
  - "인터페이스"
aliases:
  - "02. 고민/Java/왜 인터페이스에 default를 쓰면 안 될까?/01. 발단"
  - "02. 고민/Java/왜 인터페이스에 default를 쓰면 안 될까?/02. 인터페이스의 역할"
  - "02. 고민/Java/왜 인터페이스에 default를 쓰면 안 될까?/03. default 메서드란?"
  - "02. 고민/Java/왜 인터페이스에 default를 쓰면 안 될까?/04. 내 기준"
  - "하드 스킬/Java/왜 인터페이스에 default를 쓰면 안 될까?"
---
## 발단

장기 게임을 구현하는 미션을 진행하던 중에 크루가 와서 나의 의견을 물어봤다

기물 `Piece` 인터페이스를 두고 실제 기물이 있는 경우 `FullPiece`, 비어있는 경우 `EmptyPiece`로 표현했다고 한다

근데 그렇게 구현하다보니 `Piece`에서 공통적으로 사용하는 메서드가 필요했고, 이를 `default` 로 선언하는 방식을 선택했다고 한다

<br/>

인터페이스에 `default` 메서드를 사용하는 것에 대해 어떻게 생각하냐고 물었다

---

### 받았던 피드백들

**jamie9504** — PR #258 (사이클1 - 현미밥)
파일: `src/main/java/controller/JanggiController.java`
[원문 링크](https://github.com/woowacourse/java-janggi/pull/258#discussion_r3022903512)


> Board가 검증 방법을 직접 알지 않아도 된다는 방향은 좋아요.
> 
> 그런데 CannonRule 인터페이스의 메서드들이 예외를 던지는 방식으로 고정되어 있는데, 인터페이스는 "무엇을 할 수 있는가" 를 정의하는 게 맞을까요, "어떻게 처리하는가" 를 정의하는 게 맞을까요?
> 
> validate~ 메서드는 구현체가 예외를 던져야 한다는 걸 암묵적으로 강제하고 있는 건 아닐까요?


---

---

## 인터페이스의 역할

> 인터페이스는 ==무엇을 할 수 있는가==를 정의한다  
> 
> 어떻게 하는지는 구현체가 결정한다

---

### 개념

인터페이스는 **계약**이다

이 타입은 이 메서드를 제공한다는 약속이다

```java
public interface MoveRule {
    List<Position> getPathPositions(Position from, Position to);
}
```

`MoveRule`을 구현하는 클래스는 반드시 `getPathPositions`를 구현해야 한다

호출하는 쪽은 구현체가 어떻게 계산하는지 알 필요 없다

---

### 인터페이스에 들어가면 안 되는 것

⚠️ **예외를 던지는 방식**

```java
public interface CannonRule {
    void validatePath(List<Piece> path) throws IllegalArgumentException;
}
```

validate하면 예외를 던진다는 구현 방식이 강제된다

구현체가 예외 대신 `boolean`을 반환하거나, 다른 방식으로 처리하고 싶어도 인터페이스가 발목을 잡는다

<br/>

⚠️ **기술 세부사항 (Connection, SQL 등)**

```java
public interface GameRepository {
    void save(Connection conn, Game game);
}
```

JDBC 기술이 인터페이스에 노출되어있다

JPA로 바꾸면 `Connection`이 없으므로 인터페이스 자체를 수정해야 한다

<br/>

⚠️ **구현 세부사항을 강제하는 메서드 이름**

`validateAndThrow`, `saveWithTransaction` 등 이름 자체가 구현 방식을 강제한다

---

### 올바른 인터페이스 설계

✨ **무엇을 할 수 있는지만 정의한다**

```java
public interface MoveRule {
    boolean canMove(Position from, Position to); // boolean으로 결과만
}
```

```java
public interface GameRepository {
    void save(Game game);          // Connection 없음
    Optional<Game> findById(Long id);
}
```


---

---

## default 메서드란?

> `default` 메서드는 인터페이스에 ==구현이 있는 메서드==를 추가할 수 있게 한다  
> 
> Java 8에서 하위 호환성을 위해 도입됐다

---

### 개념

```java
public interface Collection<E> {

    // 기존 추상 메서드
    boolean add(E element);
    int size();

    // Java 8에서 추가된 default 메서드
    default void forEach(Consumer<? super E> action) {
        for (E element : this) {
            action.accept(element);
        }
    }
}
```

`Collection`을 구현하는 모든 기존 클래스를 수정하지 않고 `forEach`를 추가할 수 있었다

---

### 왜 도입됐는가

Java 8에서 Stream API를 추가하면서 `Collection`, `List`, `Iterable` 등에

`stream()`, `forEach()`, `spliterator()` 같은 메서드가 필요했다

기존 구현체 수백 개를 모두 수정하는 것은 불가능했다


<br/>

그래서 라이브러리 개발자들을 위해 `default`로 기본 구현 제공하게 됐다

---

### default 메서드의 문제점

✨ **인터페이스가 구현을 갖게 된다**

"무엇을"만 정의하는 인터페이스의 본래 역할을 벗어난다

<br/>

✨ **다중 구현 시 다이아몬드 문제**

```java
interface A {
    default void hello() { System.out.println("A"); }
}
interface B {
    default void hello() { System.out.println("B"); }
}

class C implements A, B {
    // 어떤 hello()를 써야 하는가? 컴파일 에러
}
```

충돌 해결을 위해 구현체에서 오버라이드해야 한다

<br/>

✨ **구현체를 몰래 바꿀 수 있다**

인터페이스를 변경하면 기존 구현체들이 의도치않게 새 동작을 갖게 될 수 있다


---

---

## 내 기준

### 인터페이스 설계 핵심 질문

❓ **이 메서드는 "무엇을" 하는지를 정의하는가?**

만약 `어떻게`를 강제한다면 제거 하거나 또는 추상 클래스로 이동한다

<br/>


❓ **구현체가 바뀌어도 인터페이스는 바뀌지 않아야 하는가?**

인터페이스가 기술에 종속되지 않도록 기술 세부사항(Connection 등)을 제거한다

---

### 인터페이스 vs 추상 클래스 선택

| 상황               | 선택     |
| ---------------- | ------ |
| 행위 계약만 정의        | 인터페이스  |
| 공통 상태와 공통 로직이 있다 | 추상 클래스 |
| 다중 구현이 필요하다      | 인터페이스  |
| 상속 계층을 고정하고 싶다   | 추상 클래스 |

---

### 실전 체크리스트

❓ **인터페이스 메서드 파라미터에 기술 관련 타입이 있는가?**

`Connection`, `Session`, `EntityManager` 등 제거

<br/>

❓ **인터페이스 메서드 이름이 구현 방식을 강제하는가?**

`validateAndThrow`, `saveWithCommit` 등 행위 기반 이름으로 변경

<br/>

❓ **`default` 메서드 안에 비즈니스 로직이 있는가?**

추상 클래스로 옮기거나 별도 유틸 클래스로 분리한다

<br/>

❓ **구현체가 인터페이스의 일부 메서드에서 예외를 던지는가?**

LSP 위반 가능성이 있다

인터페이스 설계를 재검토한다
