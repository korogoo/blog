---
title: "서비스까지 넘어온 DTO가 왜 문제일까?"
date: 2026-05-25
area: hard-skill
category: "설계 의사결정"
tags:
  - "Spring"
  - "DTO"
  - "레이어드 아키텍처"
aliases:
  - "02. 고민/Spring/서비스까지 넘어온 DTO가 왜 문제일까?/01. 발단"
  - "02. 고민/Spring/서비스까지 넘어온 DTO가 왜 문제일까?/02. 뷰가 바뀌면 서비스 테스트가 왜 깨지나?"
  - "02. 고민/Spring/서비스까지 넘어온 DTO가 왜 문제일까?/03. 내 기준"
draft: true
---

## 발단

`addReservation` 서비스 메서드의 시그니처를 보면 이렇다

```java
public Reservation addReservation(ReservationRequest requestDto) {
```

`ReservationRequest`는 컨트롤러에서 클라이언트 요청을 받을 때 쓰는 DTO다

뷰 계층의 객체가 서비스까지 그대로 들어오고 있다

---

다음으로 이동 → [[02. 뷰가 바뀌면 서비스 테스트가 왜 깨지나?]]

## 뷰가 바뀌면 서비스 테스트가 왜 깨지나?

## 구체적인 상황

다음 미션에서 `ReservationRequest`에 `memberId` 필드가 추가됐다

서비스는 `request.memberId()`를 써야 하니까 일단 동작은 한다

그런데 서비스 테스트의 픽스처를 보면 이렇다

```java
private ReservationRequest requestDtoFrom(Reservation reservation) {
    return new ReservationRequest(
        reservation.getName().value(),
        reservation.getDateValue(),
        reservation.getTime().getId(),
        reservation.getThemeId());
}
```

`memberId`가 추가되면 `ReservationRequest` 생성자 시그니처가 바뀐다

이 픽스처도 바꿔야 한다

---

## 뭐가 문제인가?

서비스 비즈니스 로직은 바뀐 게 없다

그런데 서비스 테스트가 깨진다

> ==뷰 계층의 변경이 서비스 테스트까지 전파된 것==이다

변경이 전파되는 건 문제가 아니다

변경의 이유와 무관한 레이어까지 전파되는 게 문제다

---

## 자연스러운 전파 vs 부자연스러운 전파

```
비즈니스 요구사항 변경
    → 서비스 파라미터 추가
    → 컨트롤러도 바뀜
```

이건 자연스럽다

도메인 로직이 바뀌면 그 변경이 위아래로 퍼지는 건 당연하다


<br/>


```
ReservationRequest에 memberId 필드 추가 (뷰 변경)
    → 서비스 테스트 픽스처 깨짐
```

이건 부자연스럽다. 서비스 로직은 아무것도 안 바뀌었다

---

다음으로 이동 → [[02. 고민/Spring/서비스까지 넘어온 DTO가 왜 문제일까?/03. 내 기준]]

## 내 기준

## SRP: 변경의 이유는 하나여야 한다

Robert Martin이 SRP를 정의할 때 이렇게 말했다

> "클래스를 변경하는 이유는 하나여야 한다"

코드가 길어서 분리하는 게 아니다

변경 이유가 두 개 이상이면 분리해야 한다는 거다

---

## 지금 서비스의 변경 이유

DTO를 서비스까지 그대로 넘기면 서비스가 바뀌는 이유가 두 가지다

1. `ReservationRequest` 스펙이 바뀔 때 (뷰 변경)
2. 비즈니스 로직이 바뀔 때

> ==변경 이유가 두 개면 SRP 위반==이다

---

## 어떻게 고치나?

서비스가 필요한 값만 직접 파라미터로 받는다

```java
// DTO를 통째로 받는 대신
public Reservation addReservation(ReservationRequest requestDto)

// 필요한 값만 받는다
public Reservation addReservation(String name, LocalDate date, Long timeId, Long themeId)
```

이렇게 하면 `ReservationRequest` 스펙이 바뀌어도 서비스는 영향을 받지 않는다

컨트롤러가 DTO에서 값을 꺼내서 서비스에 넘기는 책임을 진다

```java
// 컨트롤러
public ResponseEntity<...> addReservation(ReservationRequest request) {
    service.addReservation(
        request.name(),
        request.date(),
        request.timeId(),
        request.themeId()
    );
}
```

뷰가 바뀌면 컨트롤러만 바꾸면 된다. 서비스 테스트는 그대로다
