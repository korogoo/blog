---
title: "JPA 1:N 관계를 구현하는 방법들"
date: 2026-05-25
area: hard-skill
draft: true
category: "데이터 정합성"
tags:
  - "Spring"
  - "JPA"
  - "DB"
aliases:
  - "04. 쌍둥이와 앱 개발기/SBI/JPA 1:N 관계를 구현하는 방법들/01. 발단"
  - "04. 쌍둥이와 앱 개발기/SBI/JPA 1:N 관계를 구현하는 방법들/02. 양방향 직접 참조"
  - "04. 쌍둥이와 앱 개발기/SBI/JPA 1:N 관계를 구현하는 방법들/03. 단방향 참조 - 부모→자식만"
  - "04. 쌍둥이와 앱 개발기/SBI/JPA 1:N 관계를 구현하는 방법들/04. 단방향 참조 - 자식→부모만"
  - "04. 쌍둥이와 앱 개발기/SBI/JPA 1:N 관계를 구현하는 방법들/05. ID로 간접 참조"
  - "04. 쌍둥이와 앱 개발기/SBI/JPA 1:N 관계를 구현하는 방법들/06. @BatchSize로 N+1 완화"
  - "04. 쌍둥이와 앱 개발기/SBI/JPA 1:N 관계를 구현하는 방법들/07. @EntityGraph"
  - "04. 쌍둥이와 앱 개발기/SBI/JPA 1:N 관계를 구현하는 방법들/08. 내 기준"
  - "하드 스킬/프로젝트/SBI/JPA 1:N 관계를 구현하는 방법들"
---
## 발단

Course 1개에 Pin N개가 존재하는 구조를 구현해야 했다

처음엔 기존에 해오던 것처럼 별 생각 없이 `@OneToMany`로 직접 참조하게 구현했다

그리고 그 유명한 n+1 문제는 fetch join으로 해결한다고들 하길래 관습적으로 구현하려 했다

그런데 딱 코드를 작성하고 나니 이게 순환참조가 아닌가? 하는 생각이 들었다

<br/>

1:N 관계를 구현하는 방법이 한 가지가 아닐텐데, 

어떤 방법들이 있을지, 순환참조는 해결할 수 있을지 궁금해졌다

---

---

## 양방향 직접 참조

### 구조

가장 직관적이라 처음에 떠올랐던 방식이다

Course 가 Pin 목록을 참조하고, Pin 도 Course 를 참조한다

```java
@Entity
class CourseJpaEntity {
    @OneToMany(
        mappedBy = "course",
        fetch = FetchType.LAZY,
        cascade = CascadeType.ALL,
        orphanRemoval = true
    )
    private List<PinJpaEntity> pins;
}

@Entity
class PinJpaEntity {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    private CourseJpaEntity course;
}
```

<br/>

✨ **핀은 코스를 통해서만 관리한다**

`cascade`와 `orphanRemoval`을 쓰면 핀의 생명주기가 코스에 종속된다

핀을 독립적으로 저장하거나 삭제할 일이 없기 때문에 `PinRepository`를 따로 만들지 않는다

`CourseRepository` 하나로 코스와 핀을 함께 관리한다

```java
course.addPin(pin);           // 핀 추가
courseRepository.save(course); // 코스 + 핀 함께 저장

course.getPins().remove(pin); // 핀 제거
// 트랜잭션 종료 시 DB에서 자동 DELETE
```


<br/>

### 각각 요소를 먼저 알아보자

#### 💬 cascade = CascadeType.ALL

부모에게 한 작업이 자식에게 그대로 전파된다

```java
courseRepository.save(course);   // 연결된 pin들도 자동 저장
courseRepository.delete(course); // 연결된 pin들도 자동 삭제
```

⚠️ **주의) cascade 설정 없이 course 만 저장하면 pin 은 저장이 안 된다**

```sql
INSERT INTO course (id, title) VALUES (1, '서울 궁궐 코스');
-- pin INSERT 없음
```

pin 객체가 메모리에 있어도 DB에는 저장이 안 된다

<br/>

❓ **CascadeType.ALL이 포함하는 것들**

`ALL` = `PERSIST + MERGE + REMOVE + REFRESH + DETACH` 전부다

**PERSIST** - 저장 전파

```java
courseRepository.save(course); // → pin들도 자동 INSERT
```

**MERGE** - 수정 전파

```java
course.getPins().get(0).setName("수정된 핀 이름");
courseRepository.save(course); // → pin 이름도 자동 UPDATE
```

**REMOVE** - 삭제 전파

```java
courseRepository.delete(course); // → pin들도 자동 DELETE
```

**REFRESH** - DB 재조회 전파

```java
entityManager.refresh(course); // → pin들도 DB에서 다시 조회해서 덮어씀
```

메모리에서 바꾼 내용을 버리고 DB 상태로 되돌릴 때 쓴다. 거의 쓸 일 없다

**DETACH** - 영속성 컨텍스트 분리 전파

```java
entityManager.detach(course); // → pin들도 JPA 추적에서 분리됨
```

거의 쓸 일 없다

실제로 자주 쓰는 건 PERSIST, MERGE, REMOVE 세 개다

그래서 `CascadeType.ALL` 대신 명시적으로 쓰는 경우도 있다

```java
cascade = {CascadeType.PERSIST, CascadeType.MERGE, CascadeType.REMOVE}
```

---

#### 💬 orphanRemoval = true

부모와 연관관계가 끊긴 자식을 자동으로 삭제한다

```java
course.getPins().remove(pin); // DB에서 pin 자동 DELETE
```

`cascade = CascadeType.REMOVE`는 부모 삭제 시 자식도 삭제하는 것이고

`orphanRemoval`은 연관관계가 끊겼을 때도 삭제한다는 점이 다르다

| 상황 | CascadeType.REMOVE | orphanRemoval |
|---|---|---|
| `courseRepository.delete(course)` | ✅ 삭제 | ✅ 삭제 (어차피 고아가 됨) |
| `course.getPins().remove(pin)` | ❌ 안 됨 | ✅ 삭제 |

둘 다 있으면 어떤 방식으로 제거해도 pin이 DB에서 지워진다

---
#### 💬 mappedBy

연관관계의 주인을 지정한다

FK(`course_id`)는 pin 테이블에 있다

실제로 FK를 관리하는 쪽(주인)은 `PinJpaEntity`다

`mappedBy = "course"`는 "나는 주인이 아니다, `PinJpaEntity.course` 필드가 주인이다"라는 선언이다

주인이 아닌 쪽(`CourseJpaEntity.pins`)에서 값을 바꿔도 DB에 반영되지 않는다

---

### 조회는 어떻게 하면 좋을까?

`fetch = FetchType.LAZY`라서 `course.getPins()`를 호출하는 순간 핀 조회 쿼리가 나간다

코스 10개를 가져오고 각각 `getPins()`를 부르면 쿼리가 11번 나간다. 이게 N+1 문제다

fetch join으로 해결한다

```java
@Query("SELECT c FROM CourseJpaEntity c JOIN FETCH c.pins WHERE c.id = :id")
CourseJpaEntity findByIdWithPins(Long id);
```

코스와 핀을 1번 쿼리에 한 번에 가져오기 때문에 N+1이 발생하지 않는다

`course.getPins()`로 바로 접근할 수 있어서 직관적이다

---

### ⚠️ 페이징과 함께 쓸 수 없다

공유된 코스 구경 목록 조회에 페이징을 붙이면 경고가 뜬다

```
"firstResult/maxResults specified with collection fetch; applying in memory"
```

fetch join으로 조인하면 결과 row가 늘어난다

코스 1개에 핀이 3개면 결과는 3개 row다

```
course_id | pin_id
    1     |   1
    1     |   2     ← 코스는 1개인데 row는 3개
    1     |   3
```

DB 레벨에서 `LIMIT 10`을 걸면 코스 기준이 아니라 row 기준으로 잘린다

JPA는 이를 해결하기 위해 전체 데이터를 메모리에 올린 뒤 잘라낸다

근데 이게 해결이 된게 아니다..

==데이터가 많아지면 OOM 위험이 있다==

---

### ⚠️ 양방향 결합도가 높다

코스가 핀을 알고, 핀도 코스를 안다

JSON 직렬화 시 순환참조를 주의해야 하는데,

사실 상 순환참조는 어플리케이션의 단순함을 위해 애초에 방지하는 편이 좋다

---

### 단점을 감수하고도 필요할 때가 있지 않을까?

페이징 없는 단건 조회에서 연관 데이터를 1번 쿼리로 가져와야 할 때는 써도 좋을 것 같다

---

---

## 단방향 참조 - 부모→자식만

### 구조

Course 가  Pin 목록을 참조하지만, Pin 은 Course 를 모른다

```java
@Entity
class CourseJpaEntity {
    @OneToMany
    @JoinColumn(name = "course_id")  // 자식 테이블의 FK 컬럼 지정
    private List<PinJpaEntity> pins;
}

@Entity
class PinJpaEntity {
    // CourseJpaEntity 참조 없음
}
```

---

### 무슨 일이 일어나나?

`@JoinColumn`을 명시하지 않으면 JPA가 자동으로 조인 테이블을 만든다

```sql
-- JPA가 자동 생성하는 테이블
CREATE TABLE course_pin_jpa_entity (
    course_jpa_entity_id BIGINT,
    pins_id              BIGINT
);
```

비즈니스적으로 아무 의미 없는 테이블이 생긴다

`@JoinColumn`을 명시하면 조인 테이블 없이 pin 테이블에 FK 컬럼이 생긴다

---

### 왜 실무에서 안 쓰나?

⚠️ **저장 시 쿼리가 2번 나간다**

```sql
-- pin 저장
INSERT INTO pin (id, name) VALUES (1, '경복궁');

-- FK 세팅
UPDATE pin SET course_id = 1 WHERE id = 1;
```

양방향이었으면 INSERT 한 번에 `course_id`까지 같이 들어간다

```sql
-- 양방향 참조에서는 INSERT 한 번으로 끝
INSERT INTO pin (id, name, course_id) VALUES (1, '경복궁', 1);
```

삭제도 마찬가지다

pin을 삭제하기 전에 FK를 먼저 null로 업데이트한다

```sql
UPDATE pin SET course_id = NULL WHERE course_id = 1;
DELETE FROM pin WHERE id = 1;
```

---

### 결국

양방향으로 바꾸면 이 문제가 전부 해결된다

자식에 `@ManyToOne`만 추가하면 된다

굳이 부모->자식 단방향은 쓸 이유가 없다

---

---

## 단방향 참조 - 자식→부모만

### 구조

자식만 부모를 참조한다. 부모는 자식 목록을 모른다

```java
@Entity
class CourseJpaEntity {
    // pins 필드 없음
}

@Entity
class PinJpaEntity {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    private CourseJpaEntity course;
}
```

---

### 조회

코스 상세 조회 시 핀 목록을 따로 가져와야 한다

```java
CourseJpaEntity course = courseRepository.findById(id);
List<PinJpaEntity> pins = pinRepository.findByCourse(course);
```

`course.getPins()`가 없으니 핀이 필요한 시점마다 직접 조회해야 한다

---

### ✨ 페이징과 완전히 호환된다

코스 목록 조회 시 코스만 가져오면 되고, 핀은 필요할 때만 따로 가져온다

```java
// 목록 조회: 코스만 페이징
Page<CourseJpaEntity> courses = courseRepository.findAll(pageable);

// 상세 조회: 그때 핀 조회
List<PinJpaEntity> pins = pinRepository.findByCourse(course);
```

양방향보다 결합도가 낮다

코스가 핀을 몰라도 된다

---

### ⚠️ 코스 저장 시 cascade가 없어서 핀을 직접 저장해야 한다

```java
courseRepository.save(course);
pins.forEach(pin -> pinRepository.save(pin));  // 직접 저장
```

코스 삭제 시에도 핀을 먼저 삭제하거나 별도 처리가 필요하다

---

### 언제 쓰나

목록 조회 페이징이 중요하고, 저장/삭제 시 cascade가 필요 없을 때

양방향의 순환참조나 결합도 문제를 피하고 싶을 때

---

---

## ID로 간접 참조

### 구조

자식이 부모 객체 대신 ID만 보유한다. JPA 연관관계가 없다

```java
@Entity
class CourseJpaEntity {
    // pins 필드 없음
}

@Entity
class PinJpaEntity {
    private Long courseId;  // @ManyToOne 없이 ID만 보유
}
```

---

### 조회

레포지토리 구현체에서 직접 조합한다

```java
public Course findById(Long id) {
    CourseJpaEntity course = courseJpaRepository.findById(id)
        .orElseThrow(CourseNotFoundExceptioin::new);
    List<PinJpaEntity> pins = pinJpaRepository.findByCourseId(id);
    return CourseMapper.toDomain(course, pins);
}
```

JPA가 관계를 모르기 때문에 조합 책임이 명시적으로 드러난다

---

### 장점

✨ **페이징과 완전히 호환된다**

<br/>

✨ **도메인 간 결합도가 가장 낮다**

코스와 핀 사이에 JPA 연관관계가 없기 때문에 서로 독립적이다

Course 모듈과 Pin 모듈을 완전히 분리하고 싶을 때 유리하다


---

### 단점

JPA cascade, orphanRemoval 같은 편의 기능을 쓸 수 없다

저장과 삭제를 개발자가 직접 관리해야 한다

```java
// 저장: 직접 순서 맞춰서 저장
courseJpaRepository.save(course);
pinJpaRepository.saveAll(pins);

// 삭제: 직접 순서 맞춰서 삭제
pinJpaRepository.deleteByCourseId(id);
courseJpaRepository.deleteById(id);
```

단건 조회에서도 쿼리가 2번 나간다 (이건 근데 사실상 엄청 큰 리스크는 아니라고 함)

---

### 언제 쓰나

도메인 간 경계를 명확하게 나눠야 할 때

페이징이 중요하고 JPA 연관관계 이점이 필요 없을 때

---

---

## @BatchSize로 N+1 완화

### 먼저, N+1이 뭔가?

코스 목록 10개를 가져왔다

각 코스의 핀을 가져오려면 코스마다 핀 조회 쿼리가 1번씩 나간다

```
SELECT * FROM course LIMIT 10;     -- 1번
SELECT * FROM pin WHERE course_id = 1;  -- 1번
SELECT * FROM pin WHERE course_id = 2;  -- 1번
...                                -- 총 10번
```

코스 10개 조회에 쿼리가 11번 나간다. 코스가 100개면 101번이다

> ==N개를 조회했는데 쿼리가 N+1번 나가는 문제==

---

### @BatchSize가 하는 일

지연 로딩(lazy)으로 핀을 가져올 때 1개씩 조회하는 대신 IN 쿼리로 묶어서 가져온다

```java
@Entity
class CourseJpaEntity {
    @BatchSize(size = 100)
    @OneToMany(mappedBy = "course", fetch = FetchType.LAZY)
    private List<PinJpaEntity> pins;
}
```

```sql
-- @BatchSize 없이
SELECT * FROM pin WHERE course_id = 1;
SELECT * FROM pin WHERE course_id = 2;
...  -- N번

-- @BatchSize(size = 100) 적용 후
SELECT * FROM pin WHERE course_id IN (1, 2, 3, ..., 100);  -- 1번
```

N+1이 N/size+1로 줄어든다

코스 100개, size=10이면 `100/10 + 1 = 11`번이다

```
SELECT * FROM course LIMIT 100                                       -- 1번
SELECT * FROM pin WHERE course_id IN (1,2,...,10)                    -- 1번
SELECT * FROM pin WHERE course_id IN (11,12,...,20)                  -- 1번
...
SELECT * FROM pin WHERE course_id IN (91,92,...,100)                 -- 1번
// 총 11번
```

---

### 전체 설정으로 적용하기

매번 `@BatchSize`를 붙이는 대신 `application.yml`에서 전역 설정도 가능하다

```yaml
spring:
  jpa:
    properties:
      hibernate:
        default_batch_fetch_size: 100
```

---

### 페이징과 함께 쓸 수 있나?

쓸 수 있다

fetch join과 달리 지연 로딩 + batch 방식이라 DB 레벨에서 페이징이 된다

```java
// 1번: 코스 목록 페이징 조회
List<CourseJpaEntity> courses = courseRepository.findAll(pageable);

// 2번: course.getPins() 호출하는 순간 Hibernate가 감지
//      10개 코스의 핀을 IN 쿼리로 한 번에 가져옴
courses.get(0).getPins();
// → SELECT * FROM pin WHERE course_id IN (1,2,3,...,10)
```

---

### 단점

⚠️ **쿼리가 2번 나가는 건 피할 수 없다**

코스 목록 1번, 핀 IN 쿼리 1번이라 fetch join의 1번보다 많다

트래픽이 많거나 응답 속도가 중요한 API에서는 차이가 날 수 있다

<br/>

⚠️ **size를 너무 크게 잡으면 부담이 생긴다**

IN 쿼리 자체가 무거운 건 아니다

IN 안에 들어가는 값의 수가 많아질수록 DB가 파싱하고 처리하는 비용이 커진다

```sql
-- 부담 없음
SELECT * FROM pin WHERE course_id IN (1, 2, 3);

-- 부담 생길 수 있음
SELECT * FROM pin WHERE course_id IN (1, 2, 3, ..., 10000);
```

일반적으로 100~1000 사이로 잡는다

<br/>

⚠️ **정확한 쿼리 수를 제어하기 어렵다**

size=100인데 코스가 150개면 IN 쿼리가 2번 나간다

코스가 200개면 3번이다

쿼리 수가 데이터 개수에 따라 달라지기 때문에 예측이 어렵다

fetch join처럼 무조건 1번이라고 보장할 수 없다

---

### 언제 쓰나

이미 양방향 참조 구조로 짜여 있는데 페이징을 붙여야 할 때 쓰기 좋다

fetch join을 쓰면 OOM 위험이 있고, 구조를 바꾸기엔 범위가 클 때 빠르게 완화할 수 있다

`application.yml`에 `default_batch_fetch_size`만 추가하면 되니까 적용 비용이 낮다

---

---

## @EntityGraph

### 문제 상황

코스 상세 조회는 핀이 필요하다. 코스 목록 조회는 핀이 필요 없다

그런데 엔티티에 설정한 fetch 전략은 전역이라 메서드마다 다르게 적용이 안 된다

```java
// 상세 조회: 핀 필요 -> 즉시 로딩이면 좋겠다
CourseJpaEntity findById(Long id);

// 목록 조회: 핀 불필요 -> 지연 로딩이면 좋겠다
List<CourseJpaEntity> findAll(Pageable pageable);
```

---

### @EntityGraph가 하는 일

특정 메서드에만 즉시 로딩을 적용할 수 있다

```java
// 상세 조회: pins를 즉시 로딩
@EntityGraph(attributePaths = {"pins"})
Optional<CourseJpaEntity> findById(Long id);

// 목록 조회: @EntityGraph 없음 -> 기본 지연 로딩
Page<CourseJpaEntity> findAll(Pageable pageable);
```

엔티티 기본 설정은 `LAZY`로 두고, 필요한 메서드에만 `@EntityGraph`로 즉시 로딩을 추가한다

---

### 내부 동작

fetch join과 동일하게 동작한다

```sql
-- @EntityGraph 적용 시 실제 실행되는 쿼리
SELECT c.*, p.*
FROM course c
LEFT OUTER JOIN pin p ON p.course_id = c.id
WHERE c.id = :id
```

---

### 페이징과 함께 쓰면?

fetch join과 같은 이유로 OOM 위험이 있다

목록 조회에 `@EntityGraph`를 붙이면 같은 경고가 뜬다

```
"firstResult/maxResults specified with collection fetch; applying in memory"
```

목록 조회에는 쓰지 않는다

---

### 언제 쓰나

단건 조회와 목록 조회에서 서로 다른 fetch 전략이 필요할 때

fetch join 쿼리를 직접 작성하지 않고 선언적으로 즉시 로딩을 적용하고 싶을 때

---

---

## 내 기준

### 전체 비교

| 방법               | 페이징    | 쿼리 수 | 결합도   | cascade 지원 | 비고          |
| ---------------- | ------ | ---- | ----- | ---------- | ----------- |
| 양방향 + fetch join | ⚠️ 불가  | 1번   | ⚠️ 높음 | 가능         | 단건 조회에 적합   |
| 단방향 (부모→자식)      | ⚠️ 불가  | 2번   | 중간    | 가능         | 쓸 이유 없음     |
| 단방향 (자식→부모)      | 가능     | 2번   | 낮음    | ⚠️ 불가      | 페이징 + 단순 구조 |
| ID 간접 참조         | 가능     | 2번   | 최저    | ⚠️ 불가      | 도메인 경계 분리   |
| @BatchSize       | 가능     | 2번   | ⚠️ 높음 | 가능         | N+1 완화      |
| @EntityGraph     | 단건만 가능 | 1번   | ⚠️ 높음 | 가능         | 메서드별 전략 분리  |

---

### 언제 뭘 쓰나

**페이징이 필요한 목록 조회**

fetch join, @EntityGraph는 쓸 수 없다

@BatchSize 또는 ID 간접 참조를 쓴다

<br/>

**페이징 없는 단건 조회**

fetch join 또는 @EntityGraph로 1번 쿼리에 가져온다

<br/>

**도메인 간 경계를 명확히 나눠야 할 때**

ID 간접 참조를 쓴다

JPA 연관관계 없이 서로 독립적으로 관리할 수 있다

<br/>

**단방향 (부모 -> 자식만)**

쓸 이유가 없다

자식에 `@ManyToOne`만 추가하면 양방향으로 바꿀 수 있고, 쿼리 효율이 훨씬 좋다

---

### 이번 프로젝트 선택

목록 조회에서 핀은 필요 없다. 코스 제목과 썸네일 정도만 보여주면 된다

핀은 상세보기나 길찾기에서만 필요하다

```java
// 목록: 코스만 페이징, 핀 불필요
Page<CourseJpaEntity> courses = courseRepository.findAll(pageable);

// 상세/길찾기: fetch join으로 코스 + 핀 한 번에
CourseJpaEntity course = courseRepository.findByIdWithPins(id);
```

단건 조회라 fetch join + 페이징 충돌도 없다

> ==양방향 직접 참조 + fetch join 채택==

cascade, orphanRemoval로 저장/삭제도 `courseRepository` 하나로 끝난다

간접 참조로 복잡하게 갈 이유가 없었다
