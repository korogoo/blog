---
title: "메서드 선언 순서는 public 부터?"
date: 2026-05-03
area: hard-skill
draft: true
category: "테스트·품질"
tags:
  - "Java"
  - "코드 스타일"
aliases:
  - "02. 고민/Java/메서드 선언 순서는 public 부터?/01. 발단"
  - "02. 고민/Java/메서드 선언 순서는 public 부터?/02. public 위에 모아두기"
  - "02. 고민/Java/메서드 선언 순서는 public 부터?/03. 연관 연산끼리 모아두기"
  - "02. 고민/Java/메서드 선언 순서는 public 부터?/04. 그 외의 방법들"
  - "02. 고민/Java/메서드 선언 순서는 public 부터?/05. 업계 표준은?"
  - "02. 고민/Java/메서드 선언 순서는 public 부터?/06. 내 기준"
  - "하드 스킬/Java/메서드 선언 순서는 public 부터?"
---
## 발단

> 팀원들과 메서드 선언 순서에 대해 토론했고, 의견이 갈렸다
> 
> 그래서 ==나만의 기준을 세워보고자== 정리한다

---

### 토론 내용

팀원들과 코드 리뷰를 하다가 메서드 선언 순서 얘기가 나왔다

왓슨, 루크는 `public` 을 위에 몰아야 한다고 했고,

나랑 루덴스는 `public` 메서드와 그 안에서 호출되는 `private` 를 가까이 두어야 한다고 했다

둘 다 나름의 이유가 있었고, 딱 하나가 맞다고 말하기 어려웠다


---

---

## public 위에 모아두기

> ==접근 제어자를 기준==으로 정렬한다
> 
> `public` → `protected` → `package-private` → `private` 순서로 배치

---

### 개념

```java
public class OrderService {

    public void placeOrder(Order order) { ... }
    public void cancelOrder(Long orderId) { ... }

    private void validateOrder(Order order) { ... }
    private void sendConfirmationEmail(Order order) { ... }
}
```

---

### 장점

✨ **외부 인터페이스를 한눈에 파악할 수 있다**

이 클래스가 외부에 무엇을 제공하는지 위쪽만 봐도 된다

<br/>

✨ **접근 제어자 파악이 직관적이다**

`public` 영역과 `private` 영역이 명확히 분리되어 있어 경계가 뚜렷하다

---

### 단점

✨ **호출 흐름을 따라가기 어렵다**

`public` 메서드가 어떤 `private` 메서드를 쓰는지 보려면 파일 위아래를 계속 오가야 한다

<br/>

✨ **논리적 연결이 시각적으로 끊긴다**

`placeOrder()` 가 `validateOrder()` 를 호출하더라도, 두 메서드는 멀리 떨어져 있다

<br/>

✨ **클래스가 커질수록 단점이 커진다**

`public` 이 10개, `private` 이 20개라면 파악하기 더 어려워진다


---

---

## 연관 연산끼리 모아두기

> ==호출 관계를 기준==으로 정렬한다
> `public` 메서드 바로 아래에 그것이 내부적으로 사용하는 `private` 를 배치한다
> 
> Clean Code의 ==Step-down Rule== 이 이 방식이다

---

### 개념

```java
public class OrderService {

    public void placeOrder(Order order) { ... }
    private void validateOrder(Order order) { ... }      // placeOrder가 사용
    private void sendConfirmationEmail(Order order) { ... } // placeOrder가 사용

    public void cancelOrder(Long orderId) { ... }
    private void refundPayment(Long orderId) { ... }     // cancelOrder가 사용
}
```

---

### 장점

✨ **흐름을 따라 읽힌다**

신문 기사처럼, 위에서 아래로 자연스럽게 읽어 내려갈 수 있다

<br/>

✨ **호출 관계가 바로 보인다**

`public` 메서드와 그것이 의존하는 `private` 메서드가 시각적으로 가깝다

<br/>

✨ **추상화 수준이 단계적으로 내려간다**

고수준 로직 → 세부 구현 순서로 읽히기 때문에 이해가 쉽다

---

### 단점

✨ **외부 인터페이스를 한눈에 파악하기 어렵다**

`public` 메서드가 파일 곳곳에 흩어져 있어서, 이 클래스가 무엇을 제공하는지 바로 알기 어렵다

<br/>

✨ **접근 제어자 기준의 파악이 번거롭다**

`private` 과 `public` 이 교차 배치되어, 시각적으로 덜 명확하다

<br/>

✨ **연관의 기준이 주관적일 수 있다**

어떤 메서드를 어떤 `public` 에 묶을지 판단이 어려울 때도 있다


---

---

## 그 외의 방법들

> 앞선 두 방식 외에도 다양한 기준이 존재한다

---

### 인터페이스 구현 순서 우선

> `implements` 한 메서드를 먼저 배치하고, 나머지를 뒤에 둔다

```java
public class OrderService implements Orderable, Cancellable {

    @Override
    public void placeOrder(Order order) { ... }   // Orderable 구현

    @Override
    public void cancelOrder(Long orderId) { ... } // Cancellable 구현

    private void validateOrder(Order order) { ... }
}
```

인터페이스 계약을 강조하고 싶을 때 유용하다

인터페이스가 여러 개라면 오히려 복잡해질 수 있다

---

### 기능/관심사 묶기

> ==도메인 개념이나 기능 단위==로 묶는다

```java
public class OrderService {

    // 주문 생성
    public void placeOrder(Order order) { ... }
    private void validateOrder(Order order) { ... }

    // 주문 조회
    public Order findOrder(Long orderId) { ... }

    // 주문 취소
    public void cancelOrder(Long orderId) { ... }
    private void refundPayment(Long orderId) { ... }
}
```

CRUD 순서(Create → Read → Update → Delete)로 정렬하는 방식도 여기에 해당한다

도메인 관점에서 읽기 좋지만, 암묵적 컨벤션이라 팀원 간 합의가 필요하다

---

### IDE region

> `// region` ~ `// endregion` 으로 논리적 블록을 구분한다

```java
// region 주문 생성
public void placeOrder(Order order) { ... }
private void validateOrder(Order order) { ... }
// endregion

// region 주문 취소
public void cancelOrder(Long orderId) { ... }
private void refundPayment(Long orderId) { ... }
// endregion
```

IntelliJ, VS Code 등에서 접기/펼치기가 가능하다

C# 문화권에서 더 일반적이고, Java에서는 비주류다

==IDE에 의존적==이라는 점도 아쉽다

---

### 클래스 분리 (SRP)

> 메서드 순서 고민 자체를 없애버리는 접근

```java
// OrderService를 역할별로 분리
public class OrderPlacementService { ... }
public class OrderCancellationService { ... }
```

💬  **메서드가 너무 많아서 순서를 고민해야 한다면,  ==그 클래스가 이미 너무 많은 일을 하고 있는 게 아닐까?==**

SRP 관점에서 가장 이상적인 해결책이지만, 현실적으로 모든 클래스를 이렇게 유지하기는 어렵다

장기적 방향으로는 맞다


---

---

## 업계 표준은?

> Google Style Guide는 ==자유==, 
> 
> Clean Code는 ==Step-down Rule 권장==

---

### Google Java Style Guide

[Google Java Style Guide](https://google.github.io/styleguide/javaguide.html) 는 메서드 순서에 대해 **특정 순서를 강제하지 않는다**

> "What is important is that each class uses **some logical order**, which its maintainer could explain if asked."

핵심은 ==논리적 순서가 있어야 한다==는 것

`날짜 순으로 추가했다`는 논리적 순서가 아니다

유일한 강제 규칙은 ==오버로드 메서드는 반드시 연속 배치==해야 한다는 것이다

---

### Clean Code — Step-down Rule (Robert C. Martin)

> "코드는 위에서 아래로, ==추상화 수준이 단계적으로 내려가야== 한다
> caller는 항상 callee 위에 있어야 한다"

`public` 메서드 바로 아래에 그것이 호출하는 `private` 메서드를 배치하는 방식이 이에 해당한다

==신문 기사처럼 읽히는 코드==를 목표로 한다


---

---

## 내 기준

> ==두 방식 중 하나가 절대적으로 옳지 않다==
> 
> 상황에 따라 더 나은 선택이 있다

---

### 기준표

| 상황                        | 추천 방식            | 이유           |
| ------------------------- | ---------------- | ------------ |
| 클래스가 작고 메서드 수가 적다         | 어느 쪽이든 무방        | 차이가 크지 않음    |
| 클래스가 크고 외부에서 많이 참조된다      | `public` 위에 모아두기 | 인터페이스 파악이 우선 |
| 비즈니스 로직이 복잡하고 흐름 파악이 중요하다 | 연관 연산 모아두기       | 읽히는 흐름이 중요   |
| 인터페이스 계약이 명확하다            | 인터페이스 구현 순서 우선   | 계약 강조        |
| 메서드가 너무 많다                | 클래스 분리 고려        | SRP 점검 신호    |

---

### 현재 나의 결론

지금은 ==연관 연산끼리 모아두기== 쪽에 기울어져 있다

이게 무슨 일을 하는 코드인가? 라는 질문에 빠르게 답하고 싶기 때문이다

`public` 목록을 먼저 보는 것보다, 하나의 흐름을 끝까지 따라가는 게 더 직관적으로 느껴진다

다만 실무 경험이 더 쌓이면 생각이 바뀔 수 있다

> 특히 여러 사람이 협업하는 코드베이스에서는  
> `public` 을 위에 모아두는 방식이 더 유리할 수도 있다는 걸 열어두고 있다

> 이 기준표는 계속 업데이트 예정
