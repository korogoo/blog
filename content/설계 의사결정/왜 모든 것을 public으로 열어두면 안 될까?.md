---
title: "왜 모든 것을 public으로 열어두면 안 될까?"
date: 2026-05-03
area: hard-skill
draft: true
category: "설계 의사결정"
tags:
  - "Java"
  - "캡슐화"
aliases:
  - "02. 고민/Java/왜 모든 것을 public으로 열어두면 안 될까?/01. 발단"
  - "02. 고민/Java/왜 모든 것을 public으로 열어두면 안 될까?/02. 접근 제어자의 종류"
  - "02. 고민/Java/왜 모든 것을 public으로 열어두면 안 될까?/03. 접근 제어자와 변경 범위"
  - "02. 고민/Java/왜 모든 것을 public으로 열어두면 안 될까?/04. 내 기준"
  - "하드 스킬/Java/왜 모든 것을 public으로 열어두면 안 될까?"
---
## 발단

private 으로 두면 테스트하기도 어렵다

물론, 책임 분리의 부족함이겠지만, 그냥 단순 궁금증으로 '그냥 다 public 으로 열면 뭐가 문젠데?' 하는 생각이 들었다

<br/>

그리고 `protected`와 `default(package-private)`를 언제 써야 하는지 기준이 없어서  

`public`이 아닌 건 다 `private`로 썼었는데, 이 구분도 궁금하다

---

### 받았던 피드백들

**jamie9504** — PR #279 (사이클2 - 한다)

파일: `src/main/java/janggi/repository/jdbc/JdbcGameRepository.java`
[원문 링크](https://github.com/woowacourse/java-janggi/pull/279#discussion_r3052940414)

> 접근제어자가 어디갔을까요? 전반적으로 검토해보세요.

이렇게 언급되는 거 보면 분명 중요한데, 그 이유를 알아보고자 한다


---

---

## 접근 제어자의 종류

> 접근 제어자는 ==의도를 코드로 표현하는 방법==이다  
> "누가 이 코드를 쓸 수 있는가"를 명시한다

---

### 네 가지 접근 제어자

| 접근 제어자         | 같은 클래스 | 같은 패키지 | 자식 클래스 | 외부  |
| -------------- | :----: | :----: | :----: | :-: |
| `private`      |   O    |   X    |   X    |  X  |
| `default` (생략) |   O    |   O    |   X    |  X  |
| `protected`    |   O    |   O    |   O    |  X  |
| `public`       |   O    |   O    |   O    |  O  |

---

### 각각의 의미

✨ **`private` - 이 클래스만 쓴다**

외부에서 이 멤버를 알 필요가 없다는 선언

구현 세부사항이며 언제든 바꿀 수 있다

<br/>

✨ **`default` (package-private) - 같은 패키지 안에서 공유한다**

패키지를 하나의 모듈처럼 취급할 때 패키지 내부 협력에 사용

외부 패키지에서는 접근 불가

<br/>

✨ **`protected` - 상속 관계에서는 쓸 수 있다**

자식 클래스에게 공개하되, 외부에는 숨긴다

부모-자식 관계의 협력에 사용

<br/>

✨ **`public` - 모두가 쓸 수 있다**

변경 시 이를 사용하는 모든 코드에 영향을 줄 수 있다

API 계약이 된다

---

### 접근 제어자 없이 쓰면?

Java에서 접근 제어자를 생략하면 `default(package-private)`가 된다

```java
class MyClass {        // default — 패키지 외부에서 접근 불가
    void doSomething() { ... }  // default — 패키지 외부에서 접근 불가
}
```

단, 개발자 의도를 알기 어렵다

이렇게 의도를 명시하지 않으면 읽는 사람이 "실수인가, 의도인가"를 판단해야 한다

---

### 원칙

> 개발자 의도를 전달하기 위해 가능한 한 가장 좁은 접근 범위를 선택한다

`private` → `default` → `protected` → `public` 순으로 필요한 만큼만 열어준다


---

---

## 접근 제어자와 변경 범위

> `public`이 많을수록 ==변경의 영향 범위를 예측하기 어렵다==

---

### public으로 열어두면 생기는 문제

```java
public class Board {
    public Map<Position, Piece> pieces;
}
```

❓ **이 필드를 `List`로 바꾸거나 이름을 바꾸면?**


이 필드를 쓰는 모든 코드를 찾아서 수정해야 한다

---

### private으로 닫으면?

```java
public class Board {
    private Map<Position, Piece> pieces;

    public boolean canMove(Position from, Position to) { ... } // 공개 API만 노출
}
```

`pieces`의 구현이 바뀌어도 `Board` 안에서만 수정하면 된다

---

### 접근 제어자별 변경 영향 범위

| 접근 제어자      | 변경 시 영향 범위      |
| ----------- | --------------- |
| `private`   | 같은 클래스 안        |
| `default`   | 같은 패키지 안        |
| `protected` | 같은 패키지 + 자식 클래스 |
| `public`    | 어디서든 예측 불가      |

---

### 메서드도 마찬가지

```java
public class Board {

    public void move(Position from, Position to) { ... }       // 공개 API
    public boolean canMove(Position from, Position to) { ... } // 공개 API

    private void validate(Position from, Position to) { ... }   // 내부 구현
    private Piece getPieceAt(Position pos) { ... }              // 내부 구현
}
```

`validate`가 `public`이면 외부에서 직접 호출하는 코드가 생길 수 있다

그 상황에서 `validate`의 시그니처를 바꾸면 외부 코드까지 깨진다

---

### 테스트를 위해 public으로 열어야 할까?

private 를 테스트하고 싶다는 것은 그 기능이 하나의 책임이라는 뜻이다

객체에 책임이 과도하게 분배되었다는 신호로 볼 수 있다

테스트를 위해 `private` 메서드를 `public`으로 바꾸고 싶다면

==그 메서드를 별도 클래스로 분리하고 public으로 테스트한다==  


<br/>

또는 같은 책임이라는 판단이 서면 클래스를 분리하지 않는다

==기존 객체의 public 메서드의 결과로 간접 검증한다==


---

---

## 내 기준

### 결정 흐름

```
새 멤버(필드/메서드)를 만든다
          │
          ▼
이 클래스 안에서만 쓰는가?
          │
     ┌────┴────┐
    YES        NO
     │          │
     ▼          ▼
  private    같은 패키지 안에서만 쓰는가?
                   │
              ┌────┴────┐
             YES        NO
              │          │
              ▼          ▼
           default    자식 클래스에서 쓰는가?
                           │
                      ┌────┴────┐
                     YES        NO
                      │          │
                      ▼          ▼
                  protected    public
```

---

### 상황별 기준표

| 상황 | 접근 제어자 |
|---|---|
| 구현 세부사항 (내부 변수, 헬퍼 메서드) | `private` |
| 같은 패키지 내 협력 | `default` |
| 상속 구조에서 자식에게만 공개 | `protected` |
| 공개 API, 외부에서 사용 | `public` |
| 테스트를 위해 열어두고 싶다 | 별도 클래스 분리 or 간접 검증 |

---

### 실전 체크리스트

❓ **접근 제어자가 아예 없는 멤버가 있는가?**

의도인지 실수인지 명시한다

의도라면 주석으로 이유를 남긴다

<br/>

❓ **`public` 필드가 있는가?**

거의 항상 `private` + getter/setter 또는 메서드로 대체한다

<br/>

❓ **테스트를 위해 `public`으로 바꿨는가?**

분리하거나 공개 API를 통해 간접 검증한다

<br/>

❓ **변경 시 어디까지 영향 받는지 바로 알 수 있는가?**

`private`이 많을수록 이 질문에 자신 있게 답할 수 있다
