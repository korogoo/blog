---
title: "@Nested에서 @Sql 실행 순서가 꼬이면?"
date: 2026-05-25
area: hard-skill
category: "테스트·품질"
tags:
  - "Spring"
  - "JUnit"
  - "SQL"
aliases:
  - "02. 고민/Spring/@Nested에서 @Sql 실행 순서가 꼬이면?/01. 발단"
  - "02. 고민/Spring/@Nested에서 @Sql 실행 순서가 꼬이면?/02. @Sql은 어떤 순서로 실행되나?"
  - "02. 고민/Spring/@Nested에서 @Sql 실행 순서가 꼬이면?/03. @Sql이 롤백 트랜잭션 안에서 실행되나?"
  - "02. 고민/Spring/@Nested에서 @Sql 실행 순서가 꼬이면?/04. Auto Increment는 롤백되지 않는다"
  - "02. 고민/Spring/@Nested에서 @Sql 실행 순서가 꼬이면?/05. 내 기준"
draft: true
---

## 발단

테스트를 돌렸는데 FK 위반 에러가 났다

```
에러: time_id=2에 대한 FK 위반
→ reservation_time에 id=2가 없는 상태에서 waiting INSERT 시도
```

테스트 구조는 이렇다

```java
@JdbcTest
@Sql("/clear.sql")                                              // 클래스 레벨
class JdbcWaitingRepositoryTest {

    @Nested
    @Sql("/find_own_waitings_after_today_test_data.sql")        // Nested 클래스 레벨
    class FindAllWithRank { ... }
}
```

예상은 `clear.sql` → `test_data.sql` 순서인데, 의심 포인트가 세 가지다

---

다음으로 이동 → [[02. @Sql은 어떤 순서로 실행되나?]]

## @Sql은 어떤 순서로 실행되나?

## 예상 순서

```
clear.sql (클래스 레벨) → test_data.sql (Nested 클래스 레벨)
```

데이터를 지우고 → 테스트 데이터를 넣는다

직관적으로 자연스러운 흐름이다

---

## 실제로 보장되나?

Spring은 `SqlScriptsTestExecutionListener`가 `@Sql`을 처리한다

클래스 레벨 `@Sql`은 `beforeTestMethod` 단계에 실행된다

Nested 클래스 레벨 `@Sql`도 같은 단계에 실행되는데, 처리 순서가 명시적으로 보장되지 않는다

> ==반대로 실행됐을 가능성이 있다==

```
test_data.sql → clear.sql
→ 데이터를 넣었는데 바로 지워버림
→ FK 참조 대상이 없는 상태에서 INSERT 시도
```

---

## 확인 방법

`find_own_waitings_after_today_test_data.sql` 맨 위에 일부러 에러 나는 SQL을 넣는다

```sql
SELECT * FROM 없는_테이블;  -- 에러 유발
```

에러가 `clear.sql` 실행 전에 터지면 `test_data.sql`이 먼저 실행된 것이다

---

## 명시적으로 순서를 고정하는 방법

`@Sql`을 하나로 합치거나, `executionPhase`를 명시해서 순서를 고정한다

```java
@Nested
@Sql(scripts = {"/clear.sql", "/find_own_waitings_after_today_test_data.sql"})
class FindAllWithRank { ... }
```

---

다음으로 이동 → [[03. @Sql이 롤백 트랜잭션 안에서 실행되나?]]

## @Sql이 롤백 트랜잭션 안에서 실행되나?

## @JdbcTest의 기본 동작

`@JdbcTest`는 기본으로 `@Transactional`이 활성화돼 있다

각 테스트가 끝나면 자동으로 롤백된다

---

## @Sql은 어떤 트랜잭션에서 실행되나?

기본 설정에서 `@Sql` 스크립트는 테스트와 같은 트랜잭션 안에서 실행된다

```
트랜잭션 시작
    → @Sql 실행 (clear.sql, test_data.sql)
    → 테스트 실행
트랜잭션 롤백
```

그런데 `clear.sql`에서 테이블을 TRUNCATE하거나 DELETE하는 경우, 직전 테스트 데이터가 롤백된 상태인지 아닌지에 따라 동작이 달라진다

---

## 트랜잭션을 분리하면?

`@Sql`에 `transactionMode = ISOLATED`를 주면 별도 트랜잭션에서 실행된다

```java
@Sql(
    scripts = "/clear.sql",
    config = @SqlConfig(transactionMode = SqlConfig.TransactionMode.ISOLATED)
)
```

```
별도 트랜잭션에서 clear.sql 실행 → 커밋
별도 트랜잭션에서 test_data.sql 실행 → 커밋
테스트 트랜잭션 시작
    → 테스트 실행
테스트 트랜잭션 롤백
```

이렇게 하면 SQL 스크립트가 테스트 롤백에 영향받지 않는다

---

다음으로 이동 → [[04. Auto Increment는 롤백되지 않는다]]

## Auto Increment는 롤백되지 않는다

## 트랜잭션 롤백과 Auto Increment

트랜잭션이 롤백되면 INSERT된 데이터는 사라진다

그런데 H2의 AUTO_INCREMENT 카운터는 롤백되지 않는다

```
1번 테스트: id=1, 2, 3 INSERT → 롤백 (데이터 사라짐)
2번 테스트: 다음 INSERT → id=4부터 시작
```

---

## 어디서 문제가 생기나?

`clear.sql`에서 `RESTART WITH 1`로 카운터를 리셋한다고 해도, 실행 순서가 꼬이면 id가 예상과 다를 수 있다

테스트 데이터 SQL이 id를 명시하지 않고 AUTO_INCREMENT에 맡기면

```sql
INSERT INTO reservation_time (start_at) VALUES ('09:00:00');  -- id가 뭐가 될지 모름
INSERT INTO reservation_time (start_at) VALUES ('11:00:00');
```

FK를 참조하는 SQL은 id=2가 있다고 가정하는데, 실제 id가 달라진다

---

## 해결 방법

테스트 데이터에서 id를 명시적으로 지정한다

```sql
INSERT INTO reservation_time (id, start_at) VALUES (1, '09:00:00');
INSERT INTO reservation_time (id, start_at) VALUES (2, '11:00:00');
INSERT INTO reservation_time (id, start_at) VALUES (3, '10:00:00');
```

id를 고정하면 AUTO_INCREMENT 카운터 상태에 관계없이 FK 참조가 안정적이다

---

다음으로 이동 → [[02. 고민/Spring/@Nested에서 @Sql 실행 순서가 꼬이면?/05. 내 기준]]

## 내 기준

## FK 위반 에러가 났을 때 확인 순서

**1. @Sql 실행 순서 확인**

test_data.sql 맨 위에 에러 유발 SQL을 넣어서 어느 시점에 터지는지 확인한다

clear.sql 실행 전에 터지면 순서가 반대인 것이다

<br/>

**2. @Sql 트랜잭션 모드 확인**

`@Sql`이 테스트와 같은 트랜잭션에서 실행되고 있는지 확인한다

의도와 다르면 `transactionMode = ISOLATED`로 명시한다

<br/>

**3. Auto Increment 카운터 확인**

테스트 데이터 SQL에서 id를 AUTO_INCREMENT에 맡기고 있다면 명시적으로 지정한다

---

## 근본 해결

```java
// @Nested에서 @Sql을 분리하지 말고 하나로 합친다
@Nested
@Sql(scripts = {"/clear.sql", "/test_data.sql"})
class FindAllWithRank { ... }
```

```sql
-- 테스트 데이터는 id를 명시한다
INSERT INTO reservation_time (id, start_at) VALUES (1, '09:00:00');
INSERT INTO reservation_time (id, start_at) VALUES (2, '11:00:00');
```

---

## 딥다이브가 필요하다면

Spring `SqlScriptsTestExecutionListener` 소스를 보면 `@Nested`에서 `@Sql`을 처리하는 방식을 확인할 수 있다

`beforeTestMethod` 단계에서 클래스 레벨과 Nested 클래스 레벨 `@Sql`을 어떤 순서로 처리하는지가 핵심이다
