---
title: "Mock, Fake, 진짜 구현체 중 뭘 써야 할까?"
date: 2026-05-25
area: hard-skill
category: "테스트·품질"
tags:
  - "Spring"
  - "테스트"
  - "Mockito"
aliases:
  - "02. 고민/Spring/Mock, Fake, 진짜 구현체 중 뭘 써야 할까?/01. 발단"
  - "02. 고민/Spring/Mock, Fake, 진짜 구현체 중 뭘 써야 할까?/02. Mockito mock의 단점은?"
  - "02. 고민/Spring/Mock, Fake, 진짜 구현체 중 뭘 써야 할까?/03. Fake 구현체를 직접 만들면?"
  - "02. 고민/Spring/Mock, Fake, 진짜 구현체 중 뭘 써야 할까?/04. 진짜 구현체를 쓰면?"
  - "02. 고민/Spring/Mock, Fake, 진짜 구현체 중 뭘 써야 할까?/05. 내 기준"
draft: true
---

## 발단

서비스 테스트를 작성할 때 레포지토리를 어떻게 처리할지 선택해야 한다

선택지는 세 가지다

1. Mockito로 만든 가짜 구현체
2. 직접 만든 Fake 구현체
3. 진짜 구현체

각각 장단점이 다르다

---

다음으로 이동 → [[02. Mockito mock의 단점은?]]

## Mockito mock의 단점은?

## 구체 구현 사항을 알게 된다

Mockito mock을 쓰면 stub을 직접 설정해야 한다

```java
when(reservationRepository.findById(1L)).thenReturn(Optional.of(reservation));
when(reservationRepository.existsByTimeId(anyLong())).thenReturn(false);
```

서비스 내부에서 어떤 메서드가 몇 번 호출되는지 알아야 stub을 작성할 수 있다

> ==테스트가 구현 흐름에 결합된다==

서비스 내부 구현이 바뀌면 stub도 같이 바꿔야 한다

---

## 실제 흐름과 달라질 때 조용히 넘어간다

mock은 stub에 설정한 값만 반환한다

실제 DB에서 일어나는 일들, 예를 들면 트랜잭션 경계, 쿼리 결과 순서, 제약 조건 위반 같은 건 재현하지 않는다

서비스 로직이 실제로 잘못 동작하더라도 stub 설정이 맞으면 테스트는 통과한다

> ==버그가 조용히 쌓일 수 있다==

---

다음으로 이동 → [[03. Fake 구현체를 직접 만들면?]]

## Fake 구현체를 직접 만들면?

## Fake가 뭔가?

실제 구현체와 동일한 인터페이스를 구현하지만, 내부는 단순하게 만든 가짜 구현체다

```java
class FakeReservationRepository implements ReservationRepository {
    private final Map<Long, Reservation> store = new HashMap<>();
    private long idSequence = 1L;

    @Override
    public Reservation save(Reservation reservation) {
        store.put(idSequence, reservation);
        return reservation;
    }

    @Override
    public Optional<Reservation> findById(Long id) {
        return Optional.ofNullable(store.get(id));
    }
}
```

---

## 단점 1: 중복 구현이 생긴다

실제 레포지토리가 있고, Fake도 따로 만들어야 한다

메서드가 추가될 때마다 Fake도 같이 업데이트해야 한다

귀찮은 작업이 반복된다

---

## 단점 2: Fake도 테스트해야 한다

Fake 자체가 잘못 구현됐을 수 있다

`findById`가 엉뚱한 값을 반환하면 서비스 테스트가 통과해도 실제로는 버그다

Fake를 믿으려면 Fake도 검증이 필요하다

---

## 단점 3: 실제 구현과 달라질 수 있다

HashMap 기반 Fake는 실제 DB와 다르게 동작하는 경우가 있다

트랜잭션 롤백, 유니크 제약 조건, 쿼리 결과 정렬 같은 건 Fake에서 재현하기 어렵다

---

다음으로 이동 → [[04. 진짜 구현체를 쓰면?]]

## 진짜 구현체를 쓰면?

## 장점

관리 포인트가 적다

Fake 구현체를 따로 만들 필요도 없고, stub을 설정할 필요도 없다

실제 동작하는 환경을 같이 테스트하기 때문에 트랜잭션, 제약 조건, 쿼리 동작까지 검증된다

---

## 단점

실제 DB가 필요하다

테스트마다 데이터를 심고 지우는 작업이 필요하고, 테스트 간 데이터가 오염될 수 있다

전체 컨텍스트를 올려야 하는 경우 테스트 실행이 느려진다

---

## H2 같은 인메모리 DB로 절충하기

테스트 환경에서 실제 DB 대신 H2 같은 인메모리 DB를 쓰는 방법도 있다

속도는 빠르면서 실제 구현체를 그대로 쓸 수 있다

다만 H2와 실제 DB의 방언 차이로 특정 쿼리가 다르게 동작할 수 있다

---

다음으로 이동 → [[02. 고민/Spring/Mock, Fake, 진짜 구현체 중 뭘 써야 할까?/05. 내 기준]]

## 내 기준

## 세 가지 비교

| | Mockito mock | Fake 구현체 | 진짜 구현체 |
|---|---|---|---|
| 구현 비용 | 낮음 | 높음 | 낮음 |
| 관리 포인트 | stub 관리 | Fake 유지보수 | 적음 |
| 실제 동작 신뢰도 | 낮음 | 중간 | 높음 |
| 테스트 속도 | 빠름 | 빠름 | 상대적으로 느림 |
| 구현 결합도 | 높음 | 낮음 | 낮음 |

---

## 언제 뭘 쓰나

**Mockito mock**

서비스가 레포지토리를 어떻게 쓰는지 단순하고 명확할 때

쿼리 동작보다 서비스 로직 자체를 검증하는 게 목적일 때

<br/>

**Fake 구현체**

여러 테스트에서 같은 레포지토리를 반복해서 써야 할 때

stub 설정이 복잡하고 중복이 많아질 때

<br/>

**진짜 구현체**

쿼리 동작, 트랜잭션, 제약 조건까지 검증이 필요할 때

레포지토리 자체가 테스트 대상일 때
