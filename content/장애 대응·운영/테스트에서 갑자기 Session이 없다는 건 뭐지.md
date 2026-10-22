---
title: "테스트에서 갑자기 Session이 없다는 건 뭐지"
date: 2026-06-08
area: hard-skill
draft: true
category: "장애 대응·운영"
tags:
  - "Spring"
  - "JPA"
  - "Hibernate"
  - "테스트"
aliases:
  - "04. 쌍둥이와 앱 개발기/SBI/테스트에서 갑자기 Session이 없다는 건 뭐지/01. 발단"
  - "04. 쌍둥이와 앱 개발기/SBI/테스트에서 갑자기 Session이 없다는 건 뭐지/02. 영속성 컨텍스트와 엔티티 생명주기"
  - "04. 쌍둥이와 앱 개발기/SBI/테스트에서 갑자기 Session이 없다는 건 뭐지/03. 1차 캐시"
  - "04. 쌍둥이와 앱 개발기/SBI/테스트에서 갑자기 Session이 없다는 건 뭐지/04. Dirty Checking과 Flush"
  - "04. 쌍둥이와 앱 개발기/SBI/테스트에서 갑자기 Session이 없다는 건 뭐지/05. 트랜잭션 밖에서 접근하면"
  - "04. 쌍둥이와 앱 개발기/SBI/테스트에서 갑자기 Session이 없다는 건 뭐지/06. 2차 캐시"
  - "04. 쌍둥이와 앱 개발기/SBI/테스트에서 갑자기 Session이 없다는 건 뭐지/07. 내 기준"
  - "하드 스킬/프로젝트/SBI/테스트에서 갑자기 Session이 없다는 건 뭐지"
---
## 발단

### 발단

### LazyInitializationException

PostController 테스트를 작성했다

```java
@Test  
void 게시물을_업로드한다() throws Exception {  
    // given  
    final CreatePostRequest request = PostFixture.createRequest();  
  
    // when
    final ResultActions response = mockMvc.perform(post("/posts")  
        .queryParam("memberId", "1")  
        .contentType(MediaType.APPLICATION_JSON)  
        .content(objectMapper.writeValueAsString(request)));  
  
    // then
    response.andExpect(status().isCreated());  
  
    final List<CourseJpaEntity> courses = courseJpaRepository.findAll();  
    assertThat(courses).hasSize(1);  
    assertThat(courses.get(0).getPins().size()).isEqualTo(2);  
}
```

mockMvc 로 게시물을 업로드하는 POST 요청을 보냈고,  
Post 에 포함되는 Course 를 findAll 로 조회하여 Course 와 Pin 이 잘 저장되었는지 JPA 로 확인한다

그냥 보기에는 별로 문제가 없어보인다

<br/>

그런데 이런 예외가 발생했다

```
org.hibernate.LazyInitializationException:
  failed to lazily initialize a collection of role:
com.twin.baribari.course.infrastructure.entity.CourseJpaEntity.pins:
  could not initialize proxy - no Session
```

Pins 가 현재 FetchType 이 LAZY 로 설정되어 있는데,  
에러 메시지도 `lazily` 라는 단어가 있고, `proxy` 라는 단어가 있으니

뭔가 LAZY 타입이랑 관련된 트랜잭션 문제인가? 싶었다

<br/>

또, 에러 메시지를 보면 `no Session`이라고 나온다

`pins`는 LAZY라서 `getPins()`로 접근하는 시점에 DB 로 SQL을 날린다  
근데 이때 Session이 이미 닫혀있으니까 JPA가 SQL을 실행할 수 없어서 터진 거다

<br/>

❓ **그럼 Session은 언제 생기고 언제 사라지길래 저 시점에서 터진걸까?**

❓ **이게 트랜잭션이랑 또 관련이 있나?**

---

### 수정 테스트에서 findById 동작

```java
@Test
@Transactional // 테스트 트랜잭션 열림
void PATCH_요청_후_수정_여부를_확인한다() {
	
	CourseJpaEntity saved = courseJpaRepository.save(new CourseJpaEntity("한강 코스"));
	
	// 서비스에 @Transactional 없음
	courseService.update(saved.getId(), "수정된 코스");
	
	// findById -> 같은 트랜잭션 안 -> 1차 캐시에서 반환 -> "수정된 코스" 보임
	CourseJpaEntity result = courseJpaRepository.findById(saved.getId()).orElseThrow();
	
	// ⚠️ 통과. 근데 DB엔 쓰였을까?
	assertThat(result.getTitle()).isEqualTo("수정된 코스");

}
```

PATCH 요청 후 `findById`로 수정 여부를 확인하는 테스트를 작성했다

같은 트랜잭션 안에서 조회하면 실제 DB가 아닌 메모리에서 반환될 수 있다는 걸 알게 됐다

DB에 실제로 반영됐는지 확신하기 어려웠다

---

---

## 영속성 컨텍스트와 엔티티 생명주기

### EntityManager

EntityManager 를 Hibernate 에서는 Session 이라고 부른다

❓ **그럼 EntityManager 는 뭘까?**

<br/>

`EntityManager`는 `save`, `find`, `delete` 같은 JPA 작업을 실제로 수행하는 주체이다

Spring에서는 `JpaRepository`가 내부적으로 `EntityManager`를 감싸서 대신 써준다

```java
// 우리가 쓰는 것
courseRepository.findById(1L);

// 내부에서 실제로 하는 것
entityManager.find(CourseJpaEntity.class, 1L);
```

즉, 에러 메시지에 `no Session`이 뜨면 EntityManager가 닫혔다는 뜻과 같다

---

### 영속성 컨텍스트란

`EntityManager`가 관리하는 엔티티 저장 공간이다

DB가 아닌 메모리에 존재한다

```
[ 애플리케이션 ] -> [ 영속성 컨텍스트 (메모리) ] -> [ DB ]
```

<br/>

❓ **왜 영속성 컨텍스트가 필요할까?**

매번 DB에 직접 가면 느리고 비효율적이기 때문이다

```java
// 영속성 컨텍스트 없이
courseRepository.findById(1L); // DB 조회
courseRepository.findById(1L); // DB 조회
courseRepository.findById(1L); // DB 조회

// 영속성 컨텍스트 있으면
courseRepository.findById(1L); // DB 조회 -> 메모리에 저장
courseRepository.findById(1L); // 메모리에서 반환
courseRepository.findById(1L); // 메모리에서 반환
```

메모리에 저장해두기 때문에 같은 트랜잭션 안에서 같은 엔티티를 여러 번 조회해도 DB는 한 번만 간다

---

### 영속성 컨텍스트 생명주기

트랜잭션이 시작되면 영속성 컨텍스트가 새로 생기고,  
트랜잭션이 끝나면 같이 사라진다

여러 트랜잭션이 하나의 영속성 컨텍스트를 공유하지 않는다

각 트랜잭션은 자신만의 컨텍스트를 가진다

```
트랜잭션 A 시작 -> 영속성 컨텍스트 A 생성
    findById(1L) -> 컨텍스트 A에 저장
    findById(1L) -> 컨텍스트 A에서 반환 (SQL 없음, 같은 객체)
트랜잭션 A 종료 -> 영속성 컨텍스트 A 소멸

트랜잭션 B 시작 -> 영속성 컨텍스트 B 생성 (A와 완전히 별개)
    findById(1L) -> 컨텍스트 B에 저장 (새로 DB 조회)
트랜잭션 B 종료 -> 영속성 컨텍스트 B 소멸
```

`findAll()`을 두 번 호출해도 트랜잭션이 다르면 두 번 다 DB에 간다

---

### JPA 엔티티 생명주기

엔티티가 영속성 컨텍스트와 어떤 관계인지에 따라 네 가지 상태로 나뉜다

✨ **Transient** - JPA가 전혀 모르는 상태

```java
CourseJpaEntity course = new CourseJpaEntity("한강 코스");
// 그냥 자바 객체. 영속성 컨텍스트와 무관
```

<br/>

✨ **Managed** - 컨텍스트가 관리하는 상태. 변경을 감지해서 커밋 시 DB에 반영

```java
courseRepository.save(course);       // 저장하면 Managed
courseRepository.findById(1L);       // 조회해도 Managed
// 이 상태에서 수정하면 커밋 시 자동으로 UPDATE SQL 나감
```

<br/>

✨ **Detached** - 트랜잭션이 끝나서 컨텍스트에서 분리된 상태. 수정해도 DB에 반영 안됨

```java
// 테스트 메서드에 @Transactional 없는 경우
CourseJpaEntity course = courseRepository.findById(1L).orElseThrow();
// findById 내부 트랜잭션 열고 닫음 -> course는 이미 Detached


// 수정해도 DB 반영 안됨
course.updateTitle("새 제목");
// lazy 컬렉션 접근 -> LazyInitializationException
course.getPins();
```

<br/>

✨ **Removed** - 삭제 예약 상태. `delete()` 호출 시점에 DB에서 바로 지워지지 않음

```java
courseRepository.delete(course);
// 아직 DB에 있음. Removed 상태로 표시만 됨

// 트랜잭션 커밋 시 -> DELETE SQL 나감 -> DB에서 삭제
```

JPA는 SQL을 바로 날리지 않고 트랜잭션 커밋 시 한꺼번에 보낸다  
그래서 `delete()` 호출과 실제 DB 삭제 사이에 Removed라는 상태가 존재한다

---

---

## 1차 캐시

### 1차 캐시란

영속성 컨텍스트 내부의 Map이다

```
{ id -> 엔티티 객체 }
```

같은 트랜잭션 안에서 같은 id로 조회하면 DB에 가지 않고 Map에서 꺼내 반환한다

```java
// 같은 트랜잭션 안에서
PostJpaEntity a = postJpaRepository.findById(1L).orElseThrow(); // DB 조회 -> 캐시 저장
PostJpaEntity b = postJpaRepository.findById(1L).orElseThrow(); // 캐시 반환 (SQL 없음)

a == b; // true, 동일 객체
```

---

### 두 번째 발단과 연결

다시 두번째 발단을 확인해보자

PATCH 요청 후 같은 테스트 트랜잭션 안에서 `findById`로 확인하면

```java
// 테스트에 @Transactional 있는 상태
courseService.update(1L, newTitle); // UPDATE SQL (영속성 컨텍스트에 반영)
CourseJpaEntity result = courseRepository.findById(1L); // 캐시 반환
```

DB에 실제로 반영됐는지 검증하는 게 아니라 메모리의 수정된 객체를 그대로 돌려받는 것이다

---

### 왜 문제가 되나

그냥 객체 필드를 update 하면 JPA 인터페이스가 알아서 Dirty Checking 해주고,  
커밋이 되면 알아서 영속성 컨텍스트 상태와 DB 상태가 동일해지는데

이 JPA 인터페이스의 동작을 믿지 않아야 한다는 걸까?

<br/>

근데 이건 개발자가 설정한 트랜잭션 경계에 따라 결과가 달라진다

만약 `@Transactional` 을 잘못 설계하면 제대로 DB에 반영이 안 됐는데, 통과하는 테스트가 작성될 수 잇다

<br/>

아래가 그 예시이다

```java
// 프로덕션에서 @Transactional 빠뜨린 상황
public void update(Long id, String title) {
    CourseJpaEntity entity = courseRepository.findById(id).orElseThrow();
    entity.updateTitle(title);
    // 트랜잭션 없으니까 커밋 안 됨 -> DB 반영 안 됨
}
```

그런데 테스트에는 `@Transactional` 을 붙임

```java
// @Transactional 이 붙은 테스트
service.update(1L, "새 제목"); // 메모리에서 entity 수정 (Managed 상태)
courseRepository.findById(1L); // 1차 캐시에서 반환 -> "새 제목" 보임
// 테스트 통과
// ⚠️ 근데 실제로는 DB에 안 쓰인 상태
```

1차 캐시에서 반환되면 DB에 실제로 썼는지 안 썼는지 구분이 안 된다

즉, 1차 캐시 검증은 트랜잭션 경계가 올바른지까지는 검증하지 못한다

<br/>

❓ **그럼 어떻게 해결하지?**

DB에 제대로 반영됐는지 확인하려면 트랜잭션을 분리하거나 `entityManager.clear()`로 캐시를 비워야 한다

<br/>

✨ **트랜잭션 분리하기**

**트랜잭션을 분리한다**는 건 테스트에서 `@Transactional`을 빼는 거다

그러면 service.update()가 자기 트랜잭션을 열고 커밋하고 닫는다

이후 findById도 별도 트랜잭션으로 실행되면서 1차 캐시가 없으니까 DB에서 직접 가져온다

```java
@Test
// @Transactional 없음
void 수정_후_검증() {
    courseService.update(1L, "수정된 코스"); // 자체 트랜잭션 -> 커밋

    CourseJpaEntity result = courseJpaRepository.findById(1L).orElseThrow(); // 새 트랜잭션 -> DB 조회
    assertThat(result.getTitle()).isEqualTo("수정된 코스"); // 실제 DB 값 검증
}
```

<br/>

✨ `entityManager.clear()` 사용하기

1차 캐시를 아예 비워버린다

다음 findById가 캐시에서 못 찾고 DB에 직접 간다

```java
@Test
@Transactional
void 수정_후_검증() {
    courseService.update(1L, "수정된 코스");

    entityManager.clear(); // 캐시 비움

    CourseJpaEntity result = courseJpaRepository.findById(1L).orElseThrow(); // DB 조회
    assertThat(result.getTitle()).isEqualTo("수정된 코스");
}
```

---

---

## Dirty Checking과 Flush

### save() 없이 수정이 반영된다

❓ **그래서 아까부터 자주 등장한  Dirty Checking 은 뭘까?**

<br/>


Managed 상태의 엔티티를 수정하면 `save()`를 호출하지 않아도 트랜잭션 커밋 시 DB에 반영된다

```java
@Transactional
public void update(Long id, String newTitle) {
    CourseJpaEntity entity = courseRepository.findById(id).orElseThrow();
    entity.updateTitle(newTitle); // save() 없음
    // 트랜잭션 커밋 시 자동 UPDATE
}
```

이게 가능한 이유는 스냅샷 때문이다

---

### 스냅샷과 Dirty Checking

1차 캐시에 엔티티를 저장할 때 최초 조회 상태를 복사해서 함께 보관한다

```
1차 캐시
  ├── 엔티티 (현재 상태)
  └── 스냅샷 (최초 조회 상태)
```

커밋 직전에 현재 상태와 스냅샷을 비교해서 달라진 필드가 있으면 자동으로 UPDATE SQL을 생성한다

이걸 Dirty Checking이라고 한다

---

### Flush

영속성 컨텍스트에 쌓인 변경사항을 실제 DB로 SQL을 보내는 시점이다

⚠️ **커밋이 아니다**

flush는 SQL만 전송하고, 커밋은 그 SQL을 DB에 확정한다

```
flush  -> SQL을 DB에 전송, 실행됨. 하지만 아직 이 트랜잭션 안에서만 유효
commit -> 트랜잭션 확정. 모두에게 영구 반영
```

좀 더 구체적으로 보면

```
flush 후:
  - 내 트랜잭션 안에서는 변경사항이 보임
  - 다른 트랜잭션에서는 아직 안 보임 *
  - 예외 발생하면 rollback -> DB에 아무 흔적 없음

commit 후:
  - 다른 트랜잭션에서도 변경사항 보임
  - 되돌릴 수 없음
```

- `다른 트랜잭션에서는 아직 안 보임`

정확히는 격리 수준에 따라 다르다  
`READ COMMITTED` 이상이면 커밋 전 변경사항은 다른 트랜잭션에서 안 보인다. `READ UNCOMMITTED`라면 flush 후 커밋 전에도 보인다 (dirty read)

---

### flush가 commit이랑 다를게 뭔가?

둘 다 DB에 반영하는 거 아닌가 싶을 수 있다

✨ **핵심은 롤백 가능 여부다**

flush는 DB에 SQL을 보내긴 하지만, 트랜잭션이 아직 열려있는 상태다

트랜잭션이 열려있는 동안은 rollback으로 되돌릴 수 있다

```java
@Transactional
void example() {
    entity.updateTitle("새 제목");

    // flush 발생 -> DB에 UPDATE SQL 실행됨
    // 근데 트랜잭션은 아직 열려있음

    throw new RuntimeException(); // 예외 발생

    // -> rollback -> DB에서 UPDATE 취소됨 -> 없던 일
}
```

commit은 트랜잭션을 닫는 것이다. 닫히면 rollback 못 한다

---

### Flush 타이밍

| FlushMode    | 발생 시점                          |
| ------------ | -------------------------------- |
| AUTO (기본)  | JPQL 실행 직전, 트랜잭션 커밋 직전 |
| COMMIT       | 트랜잭션 커밋 직전만              |

---

### JPQL이 뭔가

JPA에서 쓰는 쿼리 언어다. SQL이랑 거의 같은데 테이블 대신 엔티티 클래스를 대상으로 쓴다

```java
// SQL
SELECT * FROM course WHERE title = '한강'

// JPQL
SELECT c FROM CourseJpaEntity c WHERE c.title = '한강'
```

Spring Data JPA에서 `@Query` 어노테이션에 쓰는 게 JPQL이다

---

### 왜 JPQL 실행 전에 flush가 필요한가

JPQL은 1차 캐시를 보지 않고 DB에 직접 쿼리를 날린다

메모리에서 뭔가 바꿨는데 DB에 반영이 안 된 상태라면, JPQL 결과가 메모리 상태랑 달라진다

```java
@Transactional
void example() {
    CourseJpaEntity entity = courseRepository.findById(1L).orElseThrow();

    // 메모리에서만 변경. 아직 DB에는 "한강 코스"
    entity.updateTitle("수정된 코스");

    // flush 없이 JPQL 실행하면
    // DB에는 아직 "한강 코스" -> 결과가 비어있음
    List<CourseJpaEntity> result = em.createQuery(
        "select c from CourseJpaEntity c where c.title = '수정된 코스'"
    ).getResultList();
    // result.size() == 0  (메모리엔 있는데 DB엔 없으니까)
}
```

AUTO 모드에서는 JPQL 실행 직전에 자동으로 flush해서 메모리 내용을 DB에 먼저 반영해준다

```java
entity.updateTitle("수정된 코스"); // 메모리에서 변경

// AUTO: flush 발생 -> DB에 UPDATE -> JPQL 실행 -> "수정된 코스" 찾음
List<CourseJpaEntity> result = em.createQuery(...).getResultList();
```

---

### @Transactional(readOnly = true)

조회 전용임을 선언하면 불필요한 작업을 건너뛴다

- 스냅샷 저장 생략 -> 메모리 절약
- Dirty Checking 스킵 -> 커밋 전 비교 연산 없음
- flush 생략

DB 드라이버나 DataSource 설정에 따라 read replica로 라우팅되기도 한다

목록 조회, 단건 조회처럼 수정이 없는 메서드에 붙이면 좋다

```java
@Transactional(readOnly = true)
public List<Course> findAll() {
    return courseJpaRepository.findAll()
        .stream()
        .map(CourseJpaEntity::toDomain)
        .toList();
}
```

---

---

## 트랜잭션 밖에서 접근하면

### 트랜잭션이 끝나면 Detached가 된다

트랜잭션이 종료되면 영속성 컨텍스트가 닫힌다

컨텍스트에 있던 엔티티들은 Detached 상태가 된다

Detached 엔티티의 lazy 컬렉션에 접근하면 예외가 발생한다

```
LazyInitializationException: could not initialize proxy - no Session
```

세션(영속성 컨텍스트)이 없는 상태에서 lazy loading을 시도했기 때문이다

---

### repository 메서드는 자기 트랜잭션을 열고 닫는다

`@Transactional`이 없는 테스트 메서드에서 repository를 호출하면

```java
List<CourseJpaEntity> courses = courseJpaRepository.findAll();
// findAll() 내부 트랜잭션 열고 닫음 -> 반환된 엔티티는 Detached
```

반환된 순간 이미 Detached 상태다

```java
courses.get(0).getPins().size(); // 세션 없음 -> LazyInitializationException 💥
```

RANDOM_PORT든 MOCK이든 상관없다. `@Transactional`이 없으면 똑같이 터진다

---

### 실제로 재현해봤다

MockMvc로 POST 요청을 보내 데이터를 만들고,  
이후 `findAll()`로 조회한 뒤 lazy 컬렉션에 접근하는 테스트다

```java
@Test
void MockMvc_요청_후_Lazy_컬렉션에_접근하면_예외가_발생한다() throws Exception {
    // MockMvc 요청 -> DispatcherServlet 직접 호출 (in-process)
    // -> 서비스 @Transactional 시작/종료 -> 커밋
    mockMvc.perform(post("/posts")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isCreated());

    // findAll() 자체 트랜잭션 열고 닫음 -> 반환된 엔티티 Detached
    List<CourseJpaEntity> courses = courseJpaRepository.findAll();

    // Detached 상태에서 lazy 컬렉션 접근 -> LazyInitializationException
    assertThatThrownBy(() -> courses.get(0).getPins().size())
        .isInstanceOf(LazyInitializationException.class);
}
```

반면 테스트 메서드에 `@Transactional`을 달면

```java
@Test
@Transactional
void 테스트_메서드에_Transactional을_붙이면_Lazy_로딩이_가능하다() throws Exception {
    mockMvc.perform(post("/posts")...)
        .andExpect(status().isCreated());

    // findAll()이 테스트 트랜잭션에 합류 -> 엔티티 Managed 유지
    List<CourseJpaEntity> courses = courseJpaRepository.findAll();

    // 세션 살아있음 -> lazy loading 성공
    assertThat(courses.get(0).getPins()).hasSize(2);
}
```

---

### 쿼리 로그로 확인

실제로 실행된 쿼리를 흐름에 따라 매핑하면 이렇다

```
── MockMvc POST /posts (서비스 트랜잭션) ────────────────────────────

insert into course          ← 서비스에서 코스 저장
insert into pin             ← cascade로 핀 저장
insert into pin             ← cascade로 핀 저장
insert into post            ← 포스트 저장

커밋 후 트랜잭션 종료

── courseJpaRepository.findAll() (자체 트랜잭션) ────────────────────

select from course          ← findAll() 실행 후 트랜잭션 종료 -> Detached
                              ← 여기서 getPins() 하면 LazyInitializationException

── @AfterEach: postJpaRepository.deleteAll() ───────────────────────

select from post            ← deleteAll() 내부에서 먼저 전체 조회
delete from post where id=? ← 하나씩 삭제

── @AfterEach: courseJpaRepository.deleteAll() ─────────────────────

select from course          ← deleteAll() 내부에서 먼저 전체 조회
select from pin             ← orphanRemoval이 pins 컬렉션 로딩
delete from pin where id=?  ← 핀 먼저 삭제
delete from pin where id=?
delete from course where id=? ← 코스 삭제
```

💬 **deleteAll()이 SELECT를 먼저 하는 이유?** (잠깐 딴 얘기)

`DELETE FROM course WHERE ...`처럼 SQL 한 방으로 처리하지 않는다

JPA는 내부적으로 이렇게 동작한다

```
1. SELECT 전체 조회 -> 엔티티들을 영속성 컨텍스트에 로드 (Managed 상태)
2. 각 엔티티에 em.remove() 호출 -> Removed 상태로 표시
3. flush -> 각 엔티티마다 DELETE SQL 생성 -> 하나씩 실행
```

`em.remove()`는 SQL이 아니라 객체를 받는다. 그래서 객체가 먼저 있어야 한다

이렇게 하는 이유는 JPA가 엔티티 객체를 직접 다뤄야 `cascade`, `orphanRemoval` 같은 처리가 가능하기 때문이다

`courseJpaRepository.deleteAll()`에서 pin SELECT가 나오는 것도 같은 이유다

course를 삭제하기 전에 연결된 pins 컬렉션을 로딩해서 orphanRemoval로 먼저 지운다

<br/>

 ✨ **JPQL로 bulk delete를 쓰면 SELECT 없이 한 방에 처리할 수 있다**

```java
em.createQuery("DELETE FROM CourseJpaEntity c").executeUpdate();
// SELECT 없이 DELETE FROM course 한 방
// 단, cascade/orphanRemoval 동작 안 함
```

`deleteAll()`은 편하지만 데이터가 많으면 쿼리가 N개 나가는 단점이 있다

---

### @Transactional 테스트가 만능은 아니다

`@Transactional`을 달면 테스트 종료 시 롤백된다

<br/>

⚠️ **그런데 MockMvc 요청으로 만든 데이터는 롤백이 안 된다**

MockMvc 요청 안에서 서비스 `@Transactional`이 별도로 열리고 닫히면서 이미 커밋됐기 때문이다

```
테스트 트랜잭션 (롤백 예정)

mockMvc.perform() -> 서비스 @Transactional 시작 -> 커밋 (테스트 트랜잭션과 별개)

테스트 트랜잭션 종료 -> 롤백 (findAll 읽기만 롤백, POST 데이터는 그대로 남음)
```

그래서 `@AfterEach`로 직접 정리해야 한다

---

### 해결 방법 비교

| 방법                        | 동작                          | 비고                       |
| ------------------------- | --------------------------- | ------------------------ |
| 테스트에 `@Transactional`     | `findAll()` 등이 같은 트랜잭션에 합류 | MockMvc 요청 데이터는 별도 정리 필요 |
| `@AfterEach` + `@Sql`     | 매 테스트 후 직접 데이터 삭제           | RANDOM_PORT 환경에서 일반적     |
| fetch join으로 미리 로딩        | lazy 접근 자체가 없음              | 직렬화 전에 모두 로딩             |

이번 프로젝트에서는 `@AfterEach`로 정리하고 있다

lazy 컬렉션이 필요한 시점에는 fetch join을 사용하는 방향으로 갈 예정이다

---

---

## 2차 캐시

❓ **1차 캐시..? 그럼 2차 캐시도 있을까?**

<br/>

### 1차 캐시의 한계

트랜잭션 1개당 하나의 영속성 컨텍스트를 쓴다는 건, 트랜잭션이 끝나면 캐시도 사라진다는 뜻이다

```
트랜잭션 A: findById(1L) -> DB 조회 -> 캐시 저장 -> 트랜잭션 종료 -> 캐시 소멸
트랜잭션 B: findById(1L) -> 캐시 없음 -> 또 DB 조회
```

요청마다 같은 데이터를 계속 DB에서 읽어오는 상황이 생긴다

---

### 2차 캐시

애플리케이션 전체에서 공유하는 캐시다

트랜잭션이 끝나도 살아있다

```
트랜잭션 A: findById(1L) -> DB 조회 -> 2차 캐시 저장
트랜잭션 B: findById(1L) -> 2차 캐시 HIT -> DB 조회 없음
```

---

### 어떻게 설정하나

Spring의 `@Cacheable`을 쓸 수 있다

메서드의 결과를 기억해뒀다가, 같은 인자로 다시 부르면 DB 안 가고 바로 반환할 수 있는 기능이다

```java
@Cacheable(value = "courses", key = "#id")
public Course findById(Long id) {
    return courseJpaRepository.findById(id)
        .orElseThrow()
        .toDomain();
}
```

처음 `findById(1L)` 호출하면 DB에서 조회하고 캐시에 저장한다

이후 `findById(1L)`을 부르면 DB에 가지 않고 캐시에서 바로 반환한다

<br/>

`@Cacheable`을 쓰려면 저장소가 필요하다. EhCache나 Redis를 붙여서 사용한다

```gradle
// Redis 사용 시
implementation 'org.springframework.boot:spring-boot-starter-data-redis'
implementation 'org.springframework.boot:spring-boot-starter-cache'
```

```yaml
spring:
  cache:
    type: redis
  redis:
    host: localhost
    port: 6379
```

```java
@EnableCaching  // 애플리케이션에 한 번 선언
@SpringBootApplication
public class Application { ... }
```

---

### 수정하면 캐시도 지워야 한다

캐시가 살아있는 동안 DB 값이 바뀌어도 캐시는 옛날 값을 그대로 들고 있다

```
DB: "수정된 코스"  (update 후)
캐시: "한강 코스"  (아직 옛날 값)

findById(1L) -> 캐시 HIT -> "한강 코스" 반환  (틀린 값)
```

이걸 stale data 문제라고 한다

`@CacheEvict`로 수정/삭제 시 캐시를 비워줘야 한다

```java
@CacheEvict(value = "courses", key = "#id")
public void update(Long id, String title) {
    // 수정 시 캐시 무효화 -> 다음 조회 때 DB에서 새로 가져옴
}
```

---

### 언제 쓰나

수정이 잦은 데이터엔 맞지 않는다

수정할 때마다 캐시도 관리해야 하고, 깜빡하면 stale data 문제가 생긴다

카테고리, 설정값처럼 거의 바뀌지 않는 데이터에 주로 쓴다

---

---

## 내 기준

### 정리

| 개념              | 범위        | 설명                                   |
| --------------- | --------- | ------------------------------------ |
| 영속성 컨텍스트        | 트랜잭션      | 엔티티를 메모리에서 관리하는 공간                   |
| 1차 캐시           | 트랜잭션      | 같은 id 재조회 시 DB 안 가고 반환               |
| Dirty Checking  | 트랜잭션 커밋 전 | 스냅샷 비교 -> 변경된 필드 자동 UPDATE            |
| Flush           | 커밋 전, JPQL 전 | 영속성 컨텍스트 -> DB로 SQL 전송              |
| Detached        | 트랜잭션 종료 후 | 수정 반영 안됨, lazy 접근 시 예외              |
| 2차 캐시           | 애플리케이션    | 트랜잭션 넘어서 공유, 코드성 데이터에 적합            |

---

### 이번 프로젝트 선택

**LazyInitializationException** -> `MOCK` + `@Transactional`로 해결

직렬화 시점에도 트랜잭션이 유지되어 세션이 살아있다

<br/>

**PATCH 후 findById 검증** -> 트랜잭션을 분리해서 조회

같은 트랜잭션 안에서 조회하면 1차 캐시에서 반환되므로 별도 트랜잭션으로 DB를 직접 확인한다

<br/>

**조회 전용 서비스 메서드** -> `@Transactional(readOnly = true)` 적용

스냅샷 저장, Dirty Checking, flush를 모두 건너뛰어 성능을 높인다
