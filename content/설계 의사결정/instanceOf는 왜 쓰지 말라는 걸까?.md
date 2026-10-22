---
title: "instanceOf는 왜 쓰지 말라는 걸까?"
date: 2026-05-03
area: hard-skill
draft: true
category: "설계 의사결정"
tags:
  - "Java"
  - "객체지향"
aliases:
  - "02. 고민/Java/instanceOf는 왜 쓰지 말라는 걸까?/01. 발단"
  - "02. 고민/Java/instanceOf는 왜 쓰지 말라는 걸까?/02. instanceof가 왜 문제인가"
  - "02. 고민/Java/instanceOf는 왜 쓰지 말라는 걸까?/03. 다형성으로 대체하기"
  - "02. 고민/Java/instanceOf는 왜 쓰지 말라는 걸까?/04. 내 기준"
  - "하드 스킬/Java/instanceOf는 왜 쓰지 말라는 걸까?"
---
## 발단

포 이동 규칙 처리를 위해 `instanceof CannonRule`로 타입을 확인하는 코드를 작성했다

또 `isPo()`로 타입별로 다르게 처리하는 로직도 있었는데, 

리뷰어에게 "구체 타입을 알고 있는 것 아닌가"라는 질문을 받았다

---

### 받았던 피드백들

**jamie9504** — PR #258 (사이클1 - 현미밥)
파일: `src/main/java/domain/board/Board.java`
[원문 링크](https://github.com/woowacourse/java-janggi/pull/258#discussion_r3022911456)

> 다운캐스팅은 사라졌지만, EmptyPiece에서 예외를 던진다면 "호출하면 안 된다" 는 제약은 여전히 남아있는 거 아닐까요?
> 리스코프 치환 원칙(LSP)에 대해서도 공부해보세요.

---

**jamie9504** — PR #279 (사이클2 - 한다)
파일: `src/main/java/janggi/controller/JanggiController.java`
[원문 링크](https://github.com/woowacourse/java-janggi/pull/279#discussion_r3037622218)

> 1. Position의 궁성 책임
> 
> 이 부분도 정답이 있는 문제는 아니지만, Palace를 분리하되 getLegalPath() 시그니처를 건드리지 않고 의존을 피할 수 있는 구조도 고민해볼까요? 기물이 궁성 여부를 직접 판별해야 하는지도 한번 생각해보면 좋겠어요.
> 
> 2. instanceof 사용
> 
> 타입 정보를 노출한다는 점에서 같다는 판단은 맞는데, 변경이 생겼을 때 영향 범위도 같을까요?
> 포의 규칙에 종속되지 않으면서도 타입 분기를 피할 수 있는 방법이 있을지도 같이 고민해보면 좋겠네요.
> 
> 숙제입니다. 위의 1번 or 2번의 내용 중 하나를 골라 다른 의견을 가진 크루들 3명과 토론해보고 내용을 정리한 후, 한다의 토론 전/후의 의견에 대해 짤막하게 정리해주세요. 원하시면 둘 다 진행하셔도 무관합니다.

---

**jamie9504** — PR #279 (사이클2 - 한다)
파일: `src/main/java/janggi/controller/JanggiController.java`
[원문 링크](https://github.com/woowacourse/java-janggi/pull/279#discussion_r3046184337)

> 1. Position의 궁성 책임
> 
> Palace 분리와 Position 내부 참조, 두 가지 방향에 대해 잘 논의하셨네요. 그렇다면 기물도, Position도 아닌 제3의 장소에서 판별하는 방향도 고민해볼 수 있지 않을까요?
> 
> 2. instanceof 사용
> 
> 좋아요.

---

**jamie9504** — PR #305 (사이클2 - 현미밥)
파일: `src/main/java/domain/piece/Piece.java`
[원문 링크](https://github.com/woowacourse/java-janggi/pull/305#discussion_r3068200860)

> `instanceof CannonRule`도 결국 구체 타입을 알고 있는 것 아닐까요?


---

---

## instanceof가 왜 문제인가

> `instanceof`는 ==잘못된 다형성의 신호==이다  
> 
> 타입을 직접 확인하는 순간, 새 타입이 추가될 때마다 그 코드도 수정해야 한다

---

### 문제의 본질

다형성의 목적은 타입마다 다른 처리를 **각 타입 안에** 숨기는 것이다

`instanceof`로 분기하면 그 로직이 **호출하는 쪽**으로 새어나온다

```java
public boolean canJump(Piece piece) {
    if (piece instanceof Cannon) {            // 구체 타입 직접 확인
        return ((Cannon) piece).canJumpOver();
    }
    return false;
}
```

새 기물 `Dragon`이 추가되면 이 분기문을 찾아서 수정해야 한다

---

### OCP 위반

`instanceof` 분기는 **닫혀 있어야 할 코드를 열어둔 것**이다

새 타입마다 `else if`가 하나씩 추가되는 구조 -> OCP(개방-폐쇄 원칙) 위반

```java
// 기물이 하나 추가될 때마다 이 메서드를 수정해야 한다
public int getScore(Piece piece) {
    if (piece instanceof Soldier) return 2;
    if (piece instanceof Cannon) return 7;
    if (piece instanceof Chariot) return 13;
    // Dragon 추가되면 여기에 한 줄 더...
    return 0;
}
```

---

### 변경 범위가 다르다

`isPo()`로 분기하는 것도 `instanceof`와 같은 문제다

이름이 달라도 결국 `이 객체가 특정 구체 타입인가`를 묻는 것이다

```java
// 이름만 다를 뿐 같은 문제
if (piece.isCannon()) {
    // Cannon 전용 처리
}
```

⚠️ **instanceof는 영향 범위가 넓다**

타입 체크 코드가 여러 곳에 흩어지면, 새 타입 추가 시 모든 분기문을 찾아다녀야 한다

`instanceof`를 한 곳에서만 쓰더라도 그 위험을 인식해야 한다

---

### 언제 예외적으로 쓸 수 있는가?

✨ **equals 구현 시**

```java
@Override
public boolean equals(Object o) {
    if (!(o instanceof Position)) return false;
    Position other = (Position) o;
    return this.x == other.x && this.y == other.y;
}
```

Java 16+에서는 패턴 매칭으로 더 깔끔하게 쓸 수 있다

```java
if (o instanceof Position other) {
    return this.x == other.x && this.y == other.y;
}
```

<br/>

✨ **시스템 경계(직렬화, 외부 API)에서 타입 변환이 불가피한 경우**

도메인 코드 안에서는 최대한 피한다


---

---

## 다형성으로 대체하기

> 타입 분기를 없애는 핵심은 ==행위를 각 타입 안으로 집어넣는 것==이다

---

### 행위 메서드를 인터페이스에 정의

⚠️ **분기로 처리**
```java
public int getScore(Piece piece) {
    if (piece instanceof Cannon) return 7;
    if (piece instanceof Chariot) return 13;
    return 0;
}
```

<br/>

✨ **각 타입이 자기 점수를 안다**

```java
public interface Piece {
    int getScore();
}

public class Cannon implements Piece {
    @Override
    public int getScore() { return 7; }
}

public class Chariot implements Piece {
    @Override
    public int getScore() { return 13; }
}

// 호출하는 쪽
public int getScore(Piece piece) {
    return piece.getScore(); // 분기 없음
}
```

---

### 전략 패턴으로 분리

타입별 처리가 복잡하다면 전략 객체로 분리한다

```java
public interface MoveRule {
    List<Position> getMovablePositions(Position from, Board board);
}

public class CannonMoveRule implements MoveRule {
    @Override
    public List<Position> getMovablePositions(Position from, Board board) {
        // 포 전용 이동 로직 (기물 하나를 반드시 넘어야 함)
    }
}

public class Piece {
    private final MoveRule moveRule; // 전략 주입

    public List<Position> getMovablePositions(Position from, Board board) {
        return moveRule.getMovablePositions(from, board); // instanceof 없음
    }
}
```

---

### Null Object 패턴

빈 기물을 표현할 때 `null` 또는 `instanceof EmptyPiece` 대신 빈 동작을 자연스럽게 반환한다

```java
public class EmptyPiece implements Piece {
    @Override
    public List<Position> getMovablePositions(...) {
        return List.of(); // 빈 기물은 이동 가능한 위치가 없다
    }

    @Override
    public int getScore() {
        return 0; // 빈 기물은 점수가 없다
    }
}
```

<br/>

⚠️ **호출하면 예외를 던지는 경우는 LSP 위반이다** 

[[왜 자식 클래스가 부모처럼 동작해야 할까?]] 참고하기

```java
public class EmptyPiece implements Piece {
    @Override
    public List<Position> getMovablePositions(...) {
        throw new UnsupportedOperationException(); // "호출하면 안 된다"는 제약
    }
}
```

---

---

## 내 기준

### 핵심 질문

❓ **새 타입이 추가될 때 이 코드를 수정해야 하는가?**

다형성으로 대체하는 것을 검토한다

---

### 허용 / 금지 기준

| 상황                          | 판단       |
| --------------------------- | -------- |
| `equals` 구현 내부              | 허용       |
| Java 16+ 패턴 매칭              | 허용       |
| 시스템 경계(직렬화, 외부 라이브러리 타입 변환) | 제한적 허용   |
| 도메인 로직 내 타입 분기              | 다형성으로 대체 |
| 새 타입 추가 시마다 분기가 늘어나는 구조     | 설계 냄새    |

---

### 대체 전략 선택

```
instanceof를 제거하려 한다
          │
          ▼
타입마다 다른 "행위"인가?
          │
     ┌────┴────┐
    YES        NO (단순 속성 차이)
     │          │
     ▼          ▼
 인터페이스에   생성자/팩토리로
 행위 메서드   구분값 주입
 추가          (enum, 상수)
```

---

### 실전 체크리스트

❓ **`instanceof` 뒤에 캐스팅이 따라오는가?**

거의 확실히 다형성으로 대체 가능하다

<br/>

❓ **`if (piece.isCannon())` 같은 메서드가 있는가?**

이름만 다를 뿐 `instanceof`와 같다

행위 메서드로 대체한다

<br/>

❓ **`instanceof` 분기가 여러 곳에 흩어져 있는가?**

새 타입 추가 시 모든 곳을 찾아야 한다

가장 위험한 신호이다

<br/>

❓ **EmptyPiece가 호출 시 예외를 던지는가?**

Null Object 패턴으로 빈 행위를 자연스럽게 반환한다 (→ [[왜 자식 클래스가 부모처럼 동작해야 할까?]])
