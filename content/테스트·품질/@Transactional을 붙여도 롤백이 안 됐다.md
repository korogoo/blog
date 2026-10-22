---
title: "@Transactional을 붙여도 롤백이 안 됐다"
date: 2026-06-02
area: hard-skill
category: "테스트·품질"
tags:
  - "Spring"
  - "트랜잭션"
  - "테스트"
aliases:
  - "02. 고민/Spring/@Transactional을 붙여도 롤백이 안 됐다/01. 발단"
  - "02. 고민/Spring/@Transactional을 붙여도 롤백이 안 됐다/02. @Transactional은 테스트에서 어떻게 동작하나?"
  - "02. 고민/Spring/@Transactional을 붙여도 롤백이 안 됐다/03. RANDOM_PORT는 뭐가 다른가?"
  - "02. 고민/Spring/@Transactional을 붙여도 롤백이 안 됐다/04. 내 기준"
draft: true
---

## 발단

## 발단

페어가 작성한 코드에 `@Sql("/clear.sql")`이 붙어 있었다

```java
@Sql("/clear.sql")
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
class WaitingControllerTest {
```

왜 붙어있는지 물어보지 않았고, 그냥 따라 썼다

---

## 리뷰어 질문

> `@Transactional`을 테스트 클래스에 붙이면 자동 롤백되니까 `@Sql` 없이도 되는 거 아닌가?
> `@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)` 이거랑 연관지어서 생각해보시면 좋을 것 같아요!

두 가지를 동시에 몰랐다

- `@Transactional`을 테스트에 붙이면 자동 롤백된다는 것
- 그게 `RANDOM_PORT` 환경에서는 통하지 않는다는 것

---

다음으로 이동 → [[02. 고민/Spring/@Transactional을 붙여도 롤백이 안 됐다/02. @Transactional은 테스트에서 어떻게 동작하나?]]

## @Transactional은 테스트에서 어떻게 동작하나?

## 프로덕션 vs 테스트

`@Transactional`은 환경에 따라 다르게 동작한다

| 환경     | 동작                       |
| ------ | ------------------------ |
| 프로덕션   | 성공 시 커밋, 실패(예외) 시 롤백     |
| 테스트 클래스 | 성공/실패 상관없이 항상 롤백 |

테스트에서 항상 롤백되는 이유는 Spring이 `TransactionalTestExecutionListener`를 끼워 넣기 때문이다

---

## TransactionalTestExecutionListener

JUnit이 테스트를 실행할 때 리스너들을 통해 전처리/후처리를 한다

`TransactionalTestExecutionListener`는 그 중 하나로, 테스트 실행 전에 트랜잭션을 열고 테스트가 끝나면 결과에 상관없이 롤백한다

```
beforeTestMethod  → 트랜잭션 시작
테스트 실행
afterTestMethod   → 항상 롤백
```

덕분에 테스트마다 DB 상태가 깨끗하게 유지된다

---

## MOCK 환경에서는 잘 동작한다

```java
@Transactional
@SpringBootTest(webEnvironment = WebEnvironment.MOCK)
class ReservationServiceTest {
```

`WebEnvironment.MOCK`은 실제 HTTP 서버를 띄우지 않는다

테스트 메서드와 서비스 로직이 같은 스레드에서 실행되기 때문에 리스너가 트랜잭션을 온전히 관리할 수 있다

---

다음으로 이동 → [[02. 고민/Spring/@Transactional을 붙여도 롤백이 안 됐다/03. RANDOM_PORT는 뭐가 다른가?]]

## RANDOM_PORT는 뭐가 다른가?

## 실제 HTTP 서버가 뜬다

`WebEnvironment.RANDOM_PORT`는 랜덤 포트에 실제 톰캣 서버를 띄운다

RestAssured로 요청을 보내면 네트워크를 실제로 타고 들어간다

```
테스트 메서드 (스레드 A)
    → RestAssured.given().post("/waitings")
    → HTTP 네트워크
    → 톰캣 (스레드 B 생성)
    → 컨트롤러 → 서비스 → DB
```

---

## 리스너는 스레드 A에만 붙는다

`TransactionalTestExecutionListener`는 테스트 메서드가 실행되는 스레드 A에 붙는다

그런데 실제 DB 조작은 톰캣이 만든 스레드 B에서 일어난다

스레드 B는 리스너의 영향을 받지 않는다

스레드 B가 처리를 마치면 그대로 커밋된다

```
스레드 A: 리스너 붙어 있음, 롤백 시도 → 하지만 DB 조작을 하지 않았음
스레드 B: 실제 DB 조작 → 커밋됨, 리스너 없음
```

스레드 A에서 롤백이 일어나도 스레드 B가 커밋한 데이터는 남는다

---

## 그래서 @Sql이 필요하다

`@Transactional`로는 스레드 B의 커밋을 막을 수 없다

다음 테스트 실행 전에 `@Sql("/clear.sql")`로 직접 데이터를 지워야 한다

```java
@Sql("/clear.sql")
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
class WaitingControllerTest {
```

---

다음으로 이동 → [[02. 고민/Spring/@Transactional을 붙여도 롤백이 안 됐다/04. 내 기준]]

## 내 기준

## 환경별 정리

| 환경                        | @Transactional 롤백 | DB 정리 방법      |
| ------------------------- | ----------------- | ------------- |
| `WebEnvironment.MOCK`     | 동작함               | @Transactional로 충분 |
| `WebEnvironment.RANDOM_PORT` | 동작 안 함            | @Sql로 직접 정리   |

---

## 왜 동작 안 하나

`RANDOM_PORT`는 실제 HTTP 서버를 띄운다

요청을 처리하는 스레드와 테스트를 실행하는 스레드가 다르다

리스너는 테스트 스레드에만 붙기 때문에, 실제 DB 조작을 하는 톰캣 스레드의 커밋을 막을 수 없다

---

## 이번 프로젝트 선택

`@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)` + RestAssured로 컨트롤러를 테스트하고 있다

`@Transactional`을 붙여도 의미가 없으므로 `@Sql("/clear.sql")`로 각 테스트 전에 데이터를 정리한다
