---
title: "EAGER 로딩과 N+1, 예상과 달랐던 이유"
description: JPA의 EAGER와 LAZY 로딩이 단건·목록 조회에서 어떻게 다르게 동작하는지 실제 SQL을 기준으로 정리했습니다.
date: 2026-06-19
area: hard-skill
category: "성능·확장성"
series: "JPA 로딩 전략"
order: 1
draft: true
tags:
  - "DB"
  - "JPA"
  - "Hibernate"
aliases:
  - "04. 쌍둥이와 앱 개발기/SBI/Lazy vs Eager 로딩/01. 발단"
  - "04. 쌍둥이와 앱 개발기/SBI/Lazy vs Eager 로딩/02. EAGER란 무엇인가"
  - "04. 쌍둥이와 앱 개발기/SBI/Lazy vs Eager 로딩/03. EAGER의 동작 방식 - 생각과 다른 점"
  - "04. 쌍둥이와 앱 개발기/SBI/Lazy vs Eager 로딩/05. EAGER가 적합한 상황"
  - "04. 쌍둥이와 앱 개발기/SBI/Lazy vs Eager 로딩"
  - "하드 스킬/프로젝트/SBI/Lazy vs Eager 로딩"
---
## 문제 상황

바리바리 피드 화면에서 코스 목록을 보여줘야 했다. 각 코스 카드에는 제목, 대표 이미지, 핀 개수(경유지 수)가 필요했다.

`courseJpaRepository.findAll()`로 전체 코스를 가져온 뒤 각 코스마다 `course.getPins().size()`를 호출했다. 그런데 쿼리가 코스 수 + 1번씩 나가고 있었다.

```sql
Hibernate: select c1_0.id,c1_0.title,c1_0.thumbnail_url from course c1_0
Hibernate: select p1_0.course_id,p1_0.id,p1_0.name from pin p1_0 where p1_0.course_id=?
Hibernate: select p1_0.course_id,p1_0.id,p1_0.name from pin p1_0 where p1_0.course_id=?
Hibernate: select p1_0.course_id,p1_0.id,p1_0.name from pin p1_0 where p1_0.course_id=?
```

`CourseEntity`의 `List<PinEntity>`는 컬렉션이기 때문에 기본 fetch 타입이 LAZY다. `course.getPins()`를 호출하는 순간 추가 SELECT가 실행된다.

처음에는 이 문제를 해결하기 위해 `CourseJpaEntity`의 `@OneToMany`에 `fetch = FetchType.EAGER`를 추가했다. 하지만 SQL 로그에는 코스 수만큼 추가 쿼리가 다시 기록됐다.

핵심 질문은 하나였다. **왜 EAGER로 바꿨는데도 N+1 문제가 발생했을까?**

## EAGER는 무엇을 보장하는가

EAGER는 엔티티를 로드하는 시점에 연관 객체도 함께 로드하는 전략이다.

```java
@OneToMany(
    mappedBy = "course",
    fetch = FetchType.EAGER
)
private List<PinJpaEntity> pins = new ArrayList<>();
```

여기서 중요한 점은 EAGER가 **한 번의 JOIN 쿼리**를 보장하지 않는다는 것이다. 연관 데이터를 즉시 사용할 수 있게 로딩하는 것이 기준이며, JOIN을 사용할지 추가 SELECT를 사용할지는 Hibernate가 조회 방식에 따라 결정한다.

### `@ManyToOne`이 EAGER가 기본인 이유

`@ManyToOne`은 단건 연관이다. `PinJpaEntity`를 가져올 때 `CourseJpaEntity` 하나를 함께 로드하는 것은 JOIN 한 번으로 처리할 수 있다.

```java
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "course_id", nullable = false)
private CourseJpaEntity course;
```

반면 `@OneToMany` 컬렉션은 포함하는 데이터 수가 커질 수 있다. 코스 하나에 핀이 20개 있고 코스 100개를 조회한다면 EAGER는 핀 2,000개를 바로 메모리에 올릴 수 있다. 사용하지 않을 데이터까지 항상 조회할 수 있으므로 기본값이 LAZY다.

LAZY에서는 실제 접근 전까지 프록시 객체를 두고 `course.getPins()`를 호출할 때 SELECT를 실행한다. 이 접근 시점에는 트랜잭션이 열려 있어야 하며, 트랜잭션 밖에서 접근하면 `LazyInitializationException`이 발생한다.

## 단건 조회와 목록 조회의 차이

### `findById`는 JOIN을 사용했다

`courseJpaRepository.findById(1L)`을 호출하면 Hibernate가 다음과 같은 JOIN 쿼리를 만들었다.

```sql
Hibernate: select c1_0.id,c1_0.title,c1_0.thumbnail_url,p1_0.course_id,p1_0.id,p1_0.name
           from course c1_0
           left outer join pin p1_0 on c1_0.id=p1_0.course_id
           where c1_0.id=?
```

코스 단건 조회에서는 예상대로 한 번의 쿼리로 연관 데이터를 가져왔다.

### `findAll`은 추가 SELECT를 사용했다

`courseJpaRepository.findAll()`은 먼저 전체 코스를 조회하고, 각 코스의 핀을 추가 SELECT로 가져왔다.

```sql
Hibernate: select c1_0.id,c1_0.title,c1_0.thumbnail_url from course c1_0
Hibernate: select p1_0.course_id,p1_0.id,p1_0.name from pin p1_0 where p1_0.course_id=?
Hibernate: select p1_0.course_id,p1_0.id,p1_0.name from pin p1_0 where p1_0.course_id=?
Hibernate: select p1_0.course_id,p1_0.id,p1_0.name from pin p1_0 where p1_0.course_id=?
-- 코스 수(N)만큼 반복
```

즉시 로딩의 ‘즉시’는 쿼리 한 번을 의미하지 않는다. 쿼리 개수와 관계없이 엔티티 로딩 시점에 연관 데이터를 사용할 수 있게 만든다는 뜻이다.

커스텀 메서드에서도 반환 형태에 따라 같은 차이를 확인했다.

```sql
-- findByPinsId(1L) → Optional<CourseEntity> → JOIN
Hibernate: select c1_0.id,c1_0.title from course c1_0
           inner join pin p1_0 on c1_0.id=p1_0.course_id
           where p1_0.id=?

-- findByPinsSequence(3) → List<CourseEntity> → 추가 SELECT 발생
Hibernate: select c1_0.id,c1_0.title from course c1_0
           inner join pin p1_0 on c1_0.id=p1_0.course_id
           where p1_0.sequence=?
```

WHERE 절의 조건보다 단건을 반환하는지 컬렉션을 반환하는지가 실제 동작에 더 큰 영향을 줬다.

## JPQL에서는 fetch 전략을 따로 확인해야 한다

다음 JPQL은 코스만 조회한다.

```java
@Query("SELECT c FROM CourseJpaEntity c")
List<CourseEntity> findAllWithJpql();
```

연관 객체까지 같은 쿼리에서 가져오려면 JOIN FETCH를 직접 명시해야 한다.

```java
@Query("SELECT c FROM CourseJpaEntity c JOIN FETCH c.pins")
List<CourseEntity> findAllWithPins();
```

같은 EAGER 설정에서도 조회 방식에 따라 결과가 달랐다.

- 단건 메서드(`findById`, 단건 `findByXxx`)는 JOIN을 사용할 수 있다.
- 컬렉션 메서드(`findAll`, `List`를 반환하는 `findByXxx`)는 N+1이 발생할 수 있다.
- JPQL은 필요한 연관 관계를 JOIN FETCH로 명시하는 편이 예측하기 쉽다.

## EAGER가 적합한 조건

EAGER가 합리적인 경우는 다음 세 조건이 동시에 맞을 때다.

1. `@ManyToOne` 같은 단건 연관이다.
2. 응답을 만들 때 연관 객체가 항상 필요하다.
3. `findAll()` 형태의 목록 조회가 없다.

바리바리의 핀 상세 화면에서는 항상 코스 제목과 코스 썸네일이 필요했다.

```java
@ManyToOne(fetch = FetchType.EAGER)
@JoinColumn(name = "course_id", nullable = false)
private CourseJpaEntity course;
```

`pinJpaRepository.findById(pinId)`를 호출하면 다음 JOIN으로 해결된다.

```sql
Hibernate:
select p1_0.id,p1_0.name,c1_0.id,c1_0.title,c1_0.thumbnail_url
from pin p1_0
left outer join course c1_0 on c1_0.id=p1_0.course_id
where p1_0.id=?
```

하지만 핀 목록 조회가 추가되면 다시 N+1을 확인해야 한다.

```sql
Hibernate: select p1_0.id,p1_0.name,p1_0.course_id from pin p1_0
Hibernate: select c1_0.id,c1_0.title from course c1_0 where c1_0.id=?
Hibernate: select c1_0.id,c1_0.title from course c1_0 where c1_0.id=?
Hibernate: select c1_0.id,c1_0.title from course c1_0 where c1_0.id=?
```

이 경우에는 LAZY로 바꾸고 필요한 조회에 JOIN FETCH를 명시하는 편이 안전하다.

## 최종 기준

EAGER를 유지할 수 있는 조건은 다음과 같이 정리했다.

- 해당 엔티티의 조회 진입점이 단건뿐이다.
- 연관 객체 없이 응답을 만들 수 있는 화면이 없다.
- 팀이 해당 연관 데이터가 항상 함께 로드된다는 사실을 알고 있다.

반대로 다음 조건이 생기면 LAZY와 명시적인 조회 쿼리를 검토한다.

- 목록 조회 API가 추가됐다.
- SQL 로그에서 같은 테이블 SELECT가 반복된다.
- 연관 객체가 필요 없는 응답이 생겼다.

`@ManyToOne`과 단건 조회만 존재한다면 EAGER가 코드를 단순하게 만들 수 있다. 하지만 목록 조회가 추가되는 순간 실제 SQL을 다시 확인해야 한다. fetch 설정만으로 쿼리 수를 판단해서는 안 된다.
