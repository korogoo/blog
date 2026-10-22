---
title: "entity 연관관계 매핑 ID vs 객체"
date: 2026-05-08
area: hard-skill
draft: true
category: "설계 의사결정"
tags:
  - "Spring"
  - "JPA"
  - "DDD"
aliases:
  - "02. 고민/Spring/entity 연관관계 매핑 ID vs 객체/01. 발단"
  - "02. 고민/Spring/entity 연관관계 매핑 ID vs 객체/02. ID만 갖기 vs 객체 갖기"
  - "02. 고민/Spring/entity 연관관계 매핑 ID vs 객체/03. JOIN 쿼리 위치"
  - "02. 고민/Spring/entity 연관관계 매핑 ID vs 객체/04. 집계 루트(Aggregate Root)"
  - "02. 고민/Spring/entity 연관관계 매핑 ID vs 객체/05. DB와 도메인 표현은 달라도 된다"
  - "02. 고민/Spring/entity 연관관계 매핑 ID vs 객체/06. JPA 로딩 전략과 N+1 문제"
  - "02. 고민/Spring/entity 연관관계 매핑 ID vs 객체/07. 나만의 기준표"
  - "하드 스킬/Spring/entity 연관관계 매핑 ID vs 객체"
---
## 발단

JPA로 엔티티를 설계할 때,

`ReservationTime` 객체를 직접 갖는 방식과 

`ReservationTimeId`만 갖는 방식 중 무엇을 써야 할지 고민이 생겼다


<br/>

`Reservation` 객체는 테이블의 row와 객체의 필드가 1:1 매핑되는 `DB 엔티티`로 설계했다

그런데 실제 `reservation` 테이블의 row는 `time_id`를 갖는데,

`Reservation` 객체가 `ReservationTime` 객체를 통째로 가지고 있는 순간

1:1 매핑이 아니게 되므로 정의에 어긋나는 구현체가 된다


```sql
CREATE TABLE IF NOT EXISTS reservation_time (
    id       BIGINT       NOT NULL AUTO_INCREMENT,
    start_at VARCHAR(255) NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS reservation (
    id       BIGINT       NOT NULL AUTO_INCREMENT,
    name     VARCHAR(255) NOT NULL,
    res_date DATE         NOT NULL,
    time_id  BIGINT       NOT NULL,  -- <<<<<<
    PRIMARY KEY (id),
    FOREIGN KEY (time_id) REFERENCES reservation_time (id)
);
```

```java
public class Reservation {

    private final Long id;
    private final MemberName memberName;
    private final ReservationLocalDate date;
    private final ReservationTime time;  // <<<<<<
}
```


<br/>

그런데 정작 서비스 단에서는 `Reservation`과 `ReservationTime`을 보통 같이 조회하기 때문에

`Reservation`이 `ReservationTime`을 통째로 가지고 있고, 

SQL에서 JOIN을 사용하도록 하는 게 훨씬 편리했다

그렇지 않으면 SELECT 쿼리를 2번 날려야 한다

---

### 생겼던 질문

❓ **DB 엔티티가 FK의 ID가 아닌 객체를 통째로 가져도 되는걸까?**

❓ **ID만 갖기 vs 객체 갖기, 어떤 것이 좋을까?**

### 부가적인 질문들

❓ **JOIN은 Repository에서 해야 하는가, Service에서 조립해야 하는가?**

❓ **N+1 문제는 어떤 방식에서 발생하는가?**

❓ **집계 루트(Aggregate Root) 개념과 연관이 있는가?**

---

### 왜 중요한가?

> 매핑 방식 선택이 ==쿼리 전략과 도메인 경계 설계 전체에 영향==을 준다

나중에 바꾸기 어렵고, 잘못 선택하면 N+1이 터지거나 도메인이 얽혀버린다


---

---

## ID만 갖기 vs 객체 갖기

> 연관관계를 어떻게 매핑할지는 설계 결정이다  
> 
> ==ID만 갖느냐, 객체를 갖느냐에 따라 쿼리 방식과 도메인 경계가 달라진다==

---

### ID만 갖기

```java
public class Reservation {
    private Long id;
    private Long timeId;  // 객체가 아닌 ID
}
```

✨ **도메인 경계가 명확하다**

`Reservation`와 `ReservationTime`는 서로를 직접 알지 않아 결합도가 낮아진다

조회가 필요하면 Service 계층에서 각각 조회해서 조립한다

<br/>

✨ **장점**

연산 속도 비용이 있는 JOIN이 발생하지 않는다

도메인 객체가 가벼워진다

집계 루트(Aggregate Root) 경계를 명확히 표현하기 좋다

<br/>

✨ **단점**

`time.getStartAt()` 같은 getter 조회가 불가능하다

예약과 예약 시간 데이터가 동시에 필요할 때 Service에서 두 번 조회해야 한다

---

### 객체 갖기

```java
public class Reservation {
    private Long id;
    
    @FEtc
    private ReservationTime time;  // 객체 참조
}
```

✨ **탐색이 자연스럽다**

`reservation.getTime().getStartAt()`처럼 객체 그래프로 접근할 수 있다

<br/>

✨ **장점**

JPQL에서 JOIN을 통해 한 번에 원하는 데이터를 가져올 수 있다

코드 표현력이 높다

<br/>

✨ **단점**

(ORM) LAZY 로딩을 잘못 사용하면 N+1 문제가 발생한다

도메인 경계가 흐려질 수 있다

---

### 핵심

어느 것이 항상 옳다는 기준은 없다

현재 서비스가 단일 DB를 공유하는지, 도메인 경계를 강하게 나눌 필요가 있는지를 기준으로 판단한다


---

---

## JOIN 쿼리 위치

> JOIN을 어디서 하느냐는 연관 데이터를 누가 조립하는지의 문제다
> 
> ==Repository냐 Service냐, 선택은 매핑 방식에 따라 달라진다==

---

### 상황

`Reservation`을 조회할 때 `ReservationTime`도 항상 같이 필요하다

`reservation` 테이블은 `time_id`(FK)만 가지고 있으므로, `ReservationTime` 데이터는 따로 가져와야 한다

---

### Repository에서 JOIN

```sql
SELECT r.id, r.name, r.res_date, t.id AS time_id, t.start_at
    FROM reservation r
    JOIN reservation_time t ON r.time_id = t.id
    WHERE r.id = ?
```

✨ **한 번의 쿼리로 Reservation과 ReservationTime을 함께 가져온다**

N+1 문제를 원천 차단할 수 있다

<br/>

✨ **단점**

`ReservationRepository`가 `reservation_time` 테이블을 알아야 한다

조회 목적마다 다른 JOIN 메서드가 생겨 Repository가 비대해질 수 있다

---

### Service에서 각각 조회 후 조립

```java
// ReservationService
Reservation reservation = reservationRepository.findById(id);
ReservationTime time = reservationTimeRepository.findById(reservation.getTimeId());
// time을 사용해 응답 조립
```

✨ **각 Repository는 자신의 테이블만 책임진다**

`ReservationRepository`는 `reservation` 테이블만, `ReservationTimeRepository`는 `reservation_time` 테이블만 다룬다

<br/>

✨ **단점**

쿼리가 두 번 나간다

리스트 조회 시 N+1 문제가 발생할 수 있다

---

### 어디에 두는 것이 좋은가?

✨ **ID만 갖는 설계**

Service에서 각각 조회하고 조립하는 게 자연스럽다

<br/>

✨ **객체를 갖는 설계**

Repository에서 JOIN으로 한 번에 가져오는 게 자연스럽다

<br/>

✨ **리스트 조회가 빈번**

N+1을 고려해 Repository JOIN을 선택한다


---

---

## 집계 루트(Aggregate Root)

> 집계 루트는 ==이 객체들은 하나의 단위로 함께 다뤄진다==는 설계 결정이다  
> 
> ==집계 루트 경계 안에 있으면 객체로, 경계 밖이면 ID로 참조한다==

---

### 집계 루트란?

DDD(도메인 주도 설계)에서 나온 개념이다

여러 객체를 하나의 묶음으로 관리할 때, 그 묶음의 대표 객체를 집계 루트(Aggregate Root)라고 한다

집계 루트를 통해서만 내부 객체에 접근하고, 생명주기도 함께 관리된다

---

### 다른 집계 — Reservation과 ReservationTime

`Reservation`과 `ReservationTime`은 각각 독립적인 집계다

```
Reservation (집계 루트 A)         ReservationTime (집계 루트 B)
    id                                id
    name                              start_at
    res_date
    time_id  ──────────────────────▶  (ID로만 참조)
```

- `ReservationTime`은 `Reservation` 없이도 단독으로 존재한다
- `ReservationTime`을 삭제한다고 해서 `Reservation`이 자동으로 삭제되지 않는다
- 예약 시간표는 예약이 없어도 미리 등록되고 관리된다
- 생명주기가 다르다

<br/>

✨ **다른 집계 루트이므로 ID로 참조한다**

```java
public class Reservation {
    private final Long timeId;  // ReservationTime의 ID만 갖는다
}
```

---

### 같은 집계 — 만약 Reservation이 내부 객체를 소유한다면

만약 `Reservation`이 `ReservationMemo`(예약 메모)를 가진다면 얘기가 달라진다

```
Reservation (집계 루트)
    └── ReservationMemo (집계 내부 객체)
    └── ReservationMemo
```

- `ReservationMemo`는 `Reservation` 없이는 존재 의미가 없다
- `Reservation`이 삭제되면 `ReservationMemo`도 함께 삭제된다
- 생명주기가 같다

<br/>

✨ **같은 집계 내부이므로 객체로 참조한다**

```java
public class Reservation {
    private final List<ReservationMemo> memos;  // 객체로 직접 소유
}
```

---

### ID로 참조하면 경계가 명확해지는 이유

```java
// ID만 갖기 — 경계가 명확하다
public class Reservation {
    private final Long timeId;  // ReservationTime의 ID만 알고 있다
}
```

`Reservation`은 `ReservationTime`의 내부를 모른다

`ReservationTime`을 수정하려면 반드시 `ReservationTimeRepository`를 통해야 한다

<br/>

```java
// 객체를 통째로 갖기 — 경계가 흐려질 수 있다
public class Reservation {
    private final ReservationTime time;  // ReservationTime 전체에 접근 가능
}

reservation.getTime().changeStartAt(...);  // Reservation을 통해 Time을 직접 수정 가능
```

`Reservation`을 통해 `ReservationTime`을 직접 수정하게 되면 경계가 무너진다

---

### 핵심 질문

> "이 두 객체는 같은 생명주기를 공유하는가?"

- 같이 저장되고, 같이 삭제된다 → 같은 집계 → 객체 참조
- 독립적으로 존재할 수 있다 → 다른 집계 → ID 참조

`Reservation`과 `ReservationTime`은 생명주기가 다르다  
→ **ID로 참조한다**


---

---

## DB와 도메인 표현은 달라도 된다

> DB는 FK 숫자로 관계를 표현하고, 도메인은 객체로 관계를 표현한다  
> 
> ==둘의 표현 방식이 다른 것은 자연스럽다. 문제가 아니다==

---

### 발단

방탈출 예약을 구현하다가 이런 상황이 있었다

DB 테이블에는 `time_id`라는 숫자 하나만 있는데, 

도메인 객체에는 `ReservationTime` 객체 전체를 들고 있었다

```
DB:     reservation (id, user_id, theme_id, ...)
도메인:  Reservation { User user, Theme theme, ... }
```

❓ **Row 와 필드가 달라도 되나?**

---

### DB의 표현 방식

```sql
CREATE TABLE reservation (
    id       BIGINT PRIMARY KEY,
    time_id  BIGINT,   -- FK: 숫자 하나로 관계를 표현
    ...
);
```

DB는 테이블 간 관계를 FK 숫자 하나로 표현한다

`time_id`가 어느 ReservationTime 을 가리키는지는 JOIN으로 알 수 있다

---

### 도메인의 표현 방식

```java
public class Reservation {
    private Long id;
    private ReservationTime time; // 객체 전체로 관계를 표현
}
```

도메인 객체는 연관 데이터를 객체 참조로 표현할 수 있다

`reservation.getTime().getStartAt()`처럼 자연스럽게 탐색된다

---

### JdbcTemplate에서는 어떻게 매핑하는가?

JdbcTemplate은 이 매핑을 자동으로 해주지 않는다

직접 코드로 처리해야 한다

```java
// ResultSet에서 time_id를 꺼내서 ReservationTime을 직접 조회해 조립한다
public Reservation mapRow(ResultSet rs, int rowNum) throws SQLException {
    Long timeId = rs.getLong("time_id");
    ReservationTime time = timeRepository.findById(timeId);  // 별도 조회
    return new Reservation(rs.getLong("id"), time, ...);
}
```

매핑 책임이 개발자에게 있다

---

### 앞으로 JPA를 쓰면?

JPA는 이 매핑을 자동으로 처리해준다

```java
@ManyToOne
@JoinColumn(name = "time_id")
private ReservationTime time;
```

`time_id` FK와 `ReservationTime` 객체 사이의 변환을 JPA가 담당한다


---

---

## JPA 로딩 전략과 N+1 문제

> JPA를 쓰면 객체 참조 매핑을 자동으로 해주는 대신  
> 
> ==언제 쿼리를 날릴지 전략을 잘 못 짜면 N+1 문제가 터진다==

---

### JPA의 두 가지 로딩 전략

JPA는 연관 객체를 두 가지 방식으로 가져올 수 있다

✨ **EAGER — 즉시 로딩**

```java
@ManyToOne(fetch = FetchType.EAGER)
private User user;
```

Reservation을 조회하는 순간 User도 함께 조회한다

JOIN 쿼리가 자동으로 나간다

필요 없을 때도 항상 User를 가져오므로 낭비가 생길 수 있다

<br/>

✨ **LAZY — 지연 로딩**

```java
@ManyToOne(fetch = FetchType.LAZY)
private User user;
```

`reservation.getUser()`를 실제로 호출하기 전까지 User 쿼리를 날리지 않는다

필요할 때만 조회하므로 성능에 유리하다

하지만 잘못 쓰면 N+1 문제가 발생한다

---

### N+1 문제

```java
// 예약 10개 조회 → 쿼리 1번
List<Reservation> reservations = reservationRepository.findAll();

// 루프를 돌면서 getUser() 호출 → 쿼리 10번 추가
for (Reservation r : reservations) {
    System.out.println(r.getUser().getName());  // 매번 User 쿼리 발생
}

// 총 쿼리: 1 + 10 = 11번
// 예약 1000개면: 1 + 1000 = 1001번
```

예약을 N개 조회했을 때, 연관된 User를 각각 따로 조회하면 N번의 추가 쿼리가 발생한다

실서비스에서 데이터가 많으면 장애로 이어진다

---

### 해결 방법 — fetch join

```java
// JPQL에서 fetch join으로 한 번에 가져온다
@Query("SELECT r FROM Reservation r JOIN FETCH r.user")
List<Reservation> findAllWithUser();

// 쿼리 1번으로 Reservation + User 모두 조회
```

`JOIN FETCH`를 쓰면 Reservation과 User를 한 번의 쿼리로 가져온다

---

### 현재(JdbcTemplate)와 비교

| | JdbcTemplate | JPA |
|--|--------------|-----|
| 매핑 처리 | 직접 코드로 | 프레임워크가 자동 |
| N+1 위험 | 직접 관리 (명시적 쿼리) | LAZY 설정 시 주의 필요 |
| 해결 방법 | JOIN SQL 직접 작성 | fetch join |

JdbcTemplate에서는 SQL을 직접 쓰기 때문에 언제 JOIN을 하는지 코드에 명확하게 드러난다

JPA로 전환하면 편리해지는 대신, 이 개념을 모르면 눈에 보이지 않는 쿼리 폭탄을 맞는다


---

---

## 나만의 기준표

> 매핑 방식 선택이 쿼리 전략과 도메인 경계 설계 전체에 영향을 준다  
> ==집계 루트 경계를 기준으로 판단하고, 나머지는 그 선택에서 따라온다==

---

### 결정 흐름

```
두 엔티티는 같은 집계 루트인가?
              │
     ┌────────┴────────┐
    Yes                No
(생명주기가 같다)    (독립적으로 존재)
     │                  │
  객체 참조           ID만 갖기
  Repository JOIN    Service 조립
```

---

### 기준표

| 상황 | 선택 | 이유 |
|------|------|------|
| 같이 저장되고 같이 삭제된다 | 객체 참조 | 생명주기가 같은 집계 내부 |
| 독립적으로 존재할 수 있다 | ID만 갖기 | 다른 집계, 도메인 경계를 지킨다 |
| 리스트 조회 시 함께 필요하다 | Repository JOIN | N+1 방지 |
| 각자 조회되는 경우가 많다 | Service 조립 | 각 Repository가 자기 책임만 진다 |

---

### JOIN 쿼리 위치 기준표

| 매핑 방식 | JOIN 위치 |
|-----------|-----------|
| 객체 참조 | Repository에서 JOIN (한 번의 쿼리) |
| ID만 갖기 | Service에서 각각 조회 후 조립 |

---

### 방탈출 예약에 적용한다면

`Reservation`과 `ReservationTime`은 독립적인 집계다

`ReservationTime`은 `Reservation` 없이도 단독으로 존재하고 관리된다

**→ ID만 갖기를 선택한다**

```java
public class Reservation {
    private final Long id;
    private final MemberName memberName;
    private final ReservationLocalDate date;
    private final Long timeId;  // ID만 갖는다
}
```

`ReservationTime`이 필요하면 Service에서 별도로 조회해 조립한다

---

### 실전 체크리스트

✨ **두 엔티티를 항상 같이 저장/삭제하는가?**

Yes → 같은 집계 → 객체 참조

No → 다른 집계 → ID만 갖기

<br/>

✨ **리스트 조회에서 N+1이 발생하는가?**

객체 참조 방식이라면 Repository에서 JOIN FETCH로 해결

ID만 갖기 방식이라면 Service에서 IN 쿼리로 일괄 조회

<br/>

✨ **객체 참조를 통해 연관 엔티티를 직접 수정하는가?**

경계가 무너진 신호다. ID만 갖기로 전환을 고려한다
