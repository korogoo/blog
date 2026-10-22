---
title: "JPA 미션 학습 기록"
date: 2026-06-15
area: hard-skill
category: "데이터 정합성"
tags:
  - "Spring"
  - "JPA"
  - "학습 기록"
aliases:
  - "02. 고민/Spring/[초안] JPA 미션 학습 기록"
draft: true
---

### JPA 미션 학습 기록 (roomescape-waiting)

> 초안 — 나중에 obsidian.md 기준으로 SBI 정리 예정

---

## 현재 프로젝트 구조 파악

**도메인**: reservation, reservationtime, theme, waiting
**현재**: JDBC 기반 (JdbcTemplate)
**목표**: JPA 전환

### 예약 생성 SQL 베이스라인 (JDBC 기준)

`ReservationApplicationService.create()` 흐름에서 SQL 4개:

1. `reservation_time` SELECT (WHERE id) — 시간 조회
2. `theme` SELECT (WHERE id) — 테마 조회
3. `waiting` SELECT COUNT (WHERE date, time_id, theme_id) — 대기 중복 체크
4. `reservation` INSERT

> 중복 예약 방지: SELECT 없이 INSERT 시도 -> DuplicateKeyException -> ReservationAlreadyExistsException 변환
> = 유니크 제약 + 예외 변환으로 멱등성 확보

---

## 사전학습 Q&A (기준점용)

### Q1. JPA가 자동화하는 것 vs 감추는 것

**자동화**
- SQL 생성 자체 (save -> INSERT, findById -> SELECT, 수정 감지 -> UPDATE)
- 커넥션 관리 / 트랜잭션 @어노테이션 제어
- 영속성 컨텍스트: 1차 캐시, dirty checking, lazy loading

**감추는 것**
- 어떤 SQL이, 몇 번, 언제 나가는지 (show-sql=true 없으면 모름)
- N+1 문제가 대표적

### Q2. 영속성 컨텍스트를 의식해야 하는 코드 시점

- **1차 캐시**: 엔티티가 영속 상태(managed)가 되는 순간 올라감 — save(), findById(), JPQL 조회 모두 해당
- **트랜잭션 1개당 영속성 컨텍스트 1개** (커넥션 1개당 X)
- **테스트 함정**: @Transactional 테스트에서 save 후 findById가 캐시에서 와서 실제 DB 저장 여부 확인 불가
- **dirty checking 함정**: update 후 save 중복 호출 -> 불필요한 쿼리 2번
- **LazyInitializationException**: 트랜잭션 밖에서 LAZY 필드 getter 호출 시 세션 없어서 에러

### Q3. SQL JOIN을 객체 그래프로 옮기면 어디에 부담이 옮겨가는가

객체 그래프 = 객체 참조 타고 가는 구조 (`reservation.getTheme().getName()`)

JDBC: SQL에 JOIN 명시 -> 한 번에 가져옴
JPA: 페치 전략 결정 + 객체 참조 탐색 시점으로 부담 이동
- LAZY면 getTheme() 호출할 때마다 쿼리 -> N+1

### Q4. 어노테이션 한 줄이 만드는 SQL 추적 가능한가

show-sql=true, format_sql=true 세팅 완료 -> 가능

---

## 설계 결정 기록

### 도메인 / JPA 엔티티 분리 여부

**결정: 분리 유지 (B)**

- 근거: 앱의 핵심은 도메인. 도메인이 JPA 제약(@Entity, @Id 등)에 의존하면 도메인이 오염됨
- 물리적 의존성은 제거 가능, 논리적 의존성은 완전히 제거 불가 (트레이드오프 인지)
- Mapper boilerplate(toEntity, toDomain) 발생 -> 감수

### ddl-auto 설정

- 현재: `spring.jpa.hibernate.ddl-auto=none` (schema.sql 사용)
- 미션 권장: `create-drop` (엔티티에서 DDL 생성, 차이 관찰 목적)
- **미결**: 전환 시 schema.sql 처리 방식 확정 필요

---

## 키워드 정리

### 패러다임 차이

| 키워드 | 1줄 정의 | 미션1 연결 |
|---|---|---|
| ORM | 객체와 관계형 DB 테이블을 자동으로 매핑해주는 기술 | mapToDomain(), toEntity() 변환 코드가 사라지는 자리 |
| 객체-관계 임피던스 불일치 | 객체지향 모델과 관계형 모델 사이의 구조적 차이 | mapToDomain(), toEntity()가 존재해야 하는 이유 자체 |
| 영속성 | 데이터가 프로그램 종료 후에도 사라지지 않고 유지되는 성질 | @Entity를 붙이는 행위 = DB에 영속시키겠다는 선언 |

### 핵심 개념

| 키워드 | 1줄 정의 | 미션1 연결 |
|---|---|---|
| 영속성 컨텍스트 | 트랜잭션 1개당 생기는 엔티티 관리 공간 | save/find/update 동작 전반 |
| 1차 캐시 | 영속 상태 엔티티를 저장하는 컨텍스트 내 저장소 | findById 두 번 호출 시 DB 안 감 |
| dirty checking | 영속 상태 엔티티 변경 감지 후 flush 시 자동 UPDATE | update 시 save 미호출해도 반영됨 |
| 쓰기 지연 | INSERT/UPDATE SQL을 flush 전까지 모아뒀다가 한꺼번에 내보내는 것 | save() 직후 SQL 안 찍힘 |
| flush | 영속성 컨텍스트 변경사항을 DB에 SQL로 전송 (커밋 X) | 커밋/JPQL 실행 직전 자동 발동 |

### 매핑

| 키워드 | 1줄 정의 |
|---|---|
| @Entity | 이 클래스가 DB 테이블과 매핑되는 JPA 엔티티임을 선언 |
| @Id | PK 필드 지정 |
| @GeneratedValue(IDENTITY) | DB auto_increment로 PK 생성 |
| @Column | 필드-컬럼 매핑 + nullable/unique 등 제약조건 지정 |
| @Table | 테이블명·스키마 속성 지정 (클래스명 ≠ 테이블명일 때) |

### 연관관계

| 키워드 | 1줄 정의 |
|---|---|
| @ManyToOne | Many쪽에 붙임. FK 생성. 연관관계 주인 |
| @OneToMany | One쪽에 붙임. mappedBy로 주인 아님 선언. 읽기 전용 |
| 단방향 | 한쪽만 참조. 미션 기본 시작점 |
| 양방향 | 양쪽 모두 참조. 연관관계 주인 명시 필수 |
| 연관관계 주인 | FK 있는 쪽(Many쪽). DB 반영은 주인만 함 |
| cascade | 부모 엔티티의 JPA 작업(persist/merge/remove)을 자식에게 전파 |
| orphanRemoval | 부모 컬렉션에서 제거된 자식(고아)을 자동으로 DB에서도 삭제 |

> cascade vs orphanRemoval 차이: REMOVE는 부모 삭제 시만 자식 삭제. orphanRemoval은 컬렉션에서 제거될 때도 삭제.

### 페치

| 키워드 | 1줄 정의 | 비고 |
|---|---|---|
| EAGER | 연관 엔티티를 항상 즉시 로딩 | JPQL과 쓰면 N+1 발생 가능 |
| LAZY | 연관 엔티티를 실제 접근 시점까지 로딩 미룸 | 기본값 권장. 접근 시 N+1 가능 |
| fetch join | JPQL에서 연관 엔티티를 한 쿼리로 묶어 로딩 | N+1 해결. 페이징 OOM 주의 |
| @EntityGraph | 특정 메서드에서만 LAZY를 즉시 로딩처럼 동작시킴 | fetch join과 동일 한계 |

> EAGER + JPQL = N+1인 이유: JPQL은 쓴 그대로 실행. JOIN 없으면 JOIN 안 함. 이후 EAGER 설정에 따라 N번 추가 SELECT.

### 쿼리

| 키워드 | 1줄 정의 | 비고 |
|---|---|---|
| JPQL | 엔티티 클래스/필드명 기반 쿼리 언어. Hibernate가 SQL로 변환 | DB 독립적 |
| Native Query | SQL 직접 작성 | DB 종속적. H2 -> MySQL 바꾸면 깨질 수 있음 |

### JOIN 종류 (CS 기초)

| JOIN | 결과 | 언제 |
|---|---|---|
| INNER JOIN | 양쪽 모두 있는 것만 | 연관 데이터 반드시 있을 때 |
| LEFT JOIN | 왼쪽 전부 + 오른쪽 없으면 NULL | 없어도 왼쪽은 다 보고 싶을 때 |

> fetch join 기본값 = INNER JOIN. LEFT JOIN FETCH로 변경 가능.

---

## TODO (미션 진행 중 채울 것)

- [ ] 0단계: 브랜치 따기
- [ ] 1-1: Theme, ReservationTime 엔티티 매핑
- [ ] 1-2: Reservation 연관관계 (@ManyToOne)
- [ ] 1-3: 영속성 컨텍스트 6개 관찰 (코드 + 예측 + 실제 + 이유)
- [ ] 2단계: 내 예약 목록 API
- [ ] 3단계: 대기 + N+1 + JPQL
- [ ] 4단계: 자동 승인 + 동시성 (딥다이브 연결)
