---
title: "mockito로 만든 가짜 객체는 어떻게 내가 원하는 값을 리턴할까?"
date: 2026-05-24
area: hard-skill
draft: true
category: "테스트·품질"
tags:
  - "Java"
  - "Mockito"
  - "테스트"
aliases:
  - "02. 고민/Java/mockito로 만든 가짜 객체는 어떻게 내가 원하는 값을 리턴할까?/01. 발단"
  - "02. 고민/Java/mockito로 만든 가짜 객체는 어떻게 내가 원하는 값을 리턴할까?/02. 가짜 객체는 어떻게 만들어지나?"
  - "02. 고민/Java/mockito로 만든 가짜 객체는 어떻게 내가 원하는 값을 리턴할까?/03. Proxy.newProxyInstance()를 직접 뜯어보면?"
  - "02. 고민/Java/mockito로 만든 가짜 객체는 어떻게 내가 원하는 값을 리턴할까?/04. when().thenReturn()은 stub을 어떻게 등록하나?"
  - "02. 고민/Java/mockito로 만든 가짜 객체는 어떻게 내가 원하는 값을 리턴할까?/05. 실제 Mockito 소스와 비교하면?"
  - "02. 고민/Java/mockito로 만든 가짜 객체는 어떻게 내가 원하는 값을 리턴할까?/06. @Spy는 @Mock과 뭐가 다른가?"
  - "02. 고민/Java/mockito로 만든 가짜 객체는 어떻게 내가 원하는 값을 리턴할까?/07. 내 기준"
  - "하드 스킬/Java/mockito로 만든 가짜 객체는 어떻게 내가 원하는 값을 리턴할까?"
---
## 발단

테스트를 작성하면 보통 아래처럼 작성한다

```java
when(reservationRepository.findById(anyLong()))
    .thenReturn(Optional.empty());
```

DB 연결 없이 내가 설정한 값이 반환되게 설정하는 방식이다

근데 어떻게 내가 원하는 값이 반환되는 걸까?


---

---

## 가짜 객체는 어떻게 만들어지나?

### 핵심 목표가 뭔가?

`ReservationRepository`를 주입받는 서비스 로직을 테스트하고 싶다

근데 `ReservationRepository`는 DB에 연결해야 한다

⚠️ **외부 의존성이라 테스트 환경에서 제어하기 어렵다**

네트워크나 설정 오류가 나면 로직을 아무리 잘 짜도 종종 실패하기도 한다

<br/>

그래서 진짜처럼 행동하는 가짜를 만들어서 대신 쓴다

Mockito가 가짜를 만드는 방법은 단순하다

✨ **메서드 호출을 가로채서 진짜 로직 대신 내가 지정한 값을 반환한다**

---

### 메서드를 어떻게 가로채나?

메서드 호출을 가로채는 가장 자연스러운 방법은 **오버라이드**다

```java
class FakeRepository extends ReservationRepository {
    @Override
    public Optional<Reservation> findById(Long id) {
        return Optional.empty();  // 진짜 DB 반환값 대신 내가 원하는 값
    }
}
```

Mockito가 하는 일은 정확히 위와 같다

<br/>

런타임에 서브클래스를 만들고, 모든 메서드를 MockHandler 호출로 교체한다

```
ReservationRepository (원본)
    └── ReservationRepository$MockitoMock (ByteBuddy가 런타임에 생성)
            └── findById() {
                    return MockHandler.handle();  // 진짜 로직 대신
                }
```

---

### 타입마다 방식이 다르다?

| 타입 | 오버라이드 가능? | 방식 |
|------|----------------|------|
| 인터페이스 | 구현 자체가 없어서 뭐든 가능 | Java 표준 `Proxy` |
| 구체 클래스 | 서브클래스에서 가능 | `ByteBuddy`로 서브클래스 생성 |
| `final` 클래스 | 서브클래싱 자체가 불가 | JVM 레벨 바이트코드 조작 |

오버라이드가 가능한지가 타입마다 다르기 때문에 방식이 다르다

<br/>


####  💬 Java 표준 Proxy?

JDK에 내장된 동적 프록시 기능이다 (`java.lang.reflect.Proxy`)

인터페이스를 구현한 가짜 객체를 런타임에 만들어준다

```java
// UserRepository 인터페이스를 구현한 가짜 객체 생성
Proxy.newProxyInstance(
    classLoader,
    new Class[]{UserRepository.class},
    handler  // 메서드 호출 시 실행할 로직
)
```

ByteBuddy랑 역할이 같은데, **인터페이스에만 쓸 수 있다**는 제약이 있다

<br/>

#### 💬 서브클래스?

클래스를 상속해서 만든 자식 클래스이다

```java
class Animal { 
    void speak() { ... } 
}

class Dog extends Animal { ... }  // Dog가 Animal의 서브클래스
```

Mockito는 `extends ReservationRepository`한 자식 클래스를 런타임에 동적으로 만드는 것이다

<br/>

#### 💬 ByteBuddy?

런타임에 바이트코드를 조작해서 새 클래스를 만드는 Java 라이브러리이다

원래 클래스 생성은 컴파일 타임에 `.java` -> `.class`로 되는데, 

ByteBuddy는 실행 중에 `.class`를 직접 생성한다

Mockito가 내부적으로 의존해서 쓰는 도구고, 직접 쓸 일은 거의 없다


---

### `final` 클래스는 왜 안 되나?

`final`은 상속 자체를 막는다

서브클래스를 만들 수 없으니 메서드를 오버라이드할 방법이 없다

```java
@Mock
MyFinalService service;  // ⚠️ 기본 Mockito에서 에러
```

`mockito-inline` 의존성을 추가하면 Java Agent가 JVM 레벨에서 바이트코드를 직접 수정해서 가로챈다

<br/>

💬 **Gradle 기준**

```java
// Mockito 4.x 이하
testImplementation 'org.mockito:mockito-inline:4.11.0'
```


---

---

## Proxy.newProxyInstance()를 직접 뜯어보면?

### Proxy.newProxyInstance()가 하는 일

인터페이스 기반 mock의 핵심이다

인자가 세 개인데 하나씩 보면 이렇다

```java
Proxy.newProxyInstance(
    interfaceClass.getClassLoader(),  // 어느 ClassLoader에서 만들지
    new Class[]{interfaceClass},      // 어떤 인터페이스를 흉내낼지
    new InvocationHandler() { ... }   // 메서드 호출을 어떻게 처리할지
)
```

---

### 인자 1: ClassLoader

`Proxy.newProxyInstance()`의 반환 타입이 `Object`이다

```java
public static Object newProxyInstance(...) { ... }
```

런타임에 만들어진 가짜 클래스는 `$Proxy0` 같은 이름이다

컴파일러는 그게 `UserRepository`를 구현했다는 걸 모른다

```java
Object proxy = Proxy.newProxyInstance(...);

// UserRepository 메서드를 호출할 수 없음
proxy.findById(1L);  // 컴파일 에러
```

그래서 이게 `UserRepository`이라고 컴파일러에게 알려줘야 하는데, 이때 캐스팅을 사용한다

```java
UserRepository repo = (UserRepository) proxy; // 컴파일러에게 타입 알려줌

repo.findById(1L); // 이제 가능
```


<br/>

그래서 캐스팅에 필요한 정보를 인자에 넘겨주어야 한다

```java
interfaceClass.getClassLoader()
```

근데 JVM에서 클래스는 이름이 같아도 다른 ClassLoader가 로딩하면 다른 타입으로 취급한다

```java
// ClassLoader가 다르면 이 캐스팅이 실패한다
UserRepository mock = (UserRepository) proxy;
```

가짜 객체를 만들 때 원본 인터페이스와 같은 ClassLoader를 넘겨야 캐스팅이 가능하다

---

### 인자 2: 인터페이스 목록

```java
new Class[]{interfaceClass}
```

가짜 객체가 어떤 인터페이스를 구현하는 척 할지 알려주는 목록이다

```java
new Class[]{UserRepository.class}
// → UserRepository를 구현한 가짜 클래스가 생성됨
```

배열이라 여러 개를 넣을 수 있다

```java
// 두 인터페이스를 동시에 구현하는 가짜 객체
new Class[]{UserRepository.class, Closeable.class}

UserRepository repo = (UserRepository) proxy;  // 가능
Closeable c = (Closeable) proxy;               // 가능
```

Mockito는 실제로 이걸 활용해서 mock 객체에 `MockAccess`라는 내부 인터페이스를 끼워 넣는다

설정 정보를 꺼낼 때 별도 레지스트리 없이 `(MockAccess) mock` 캐스팅으로 바로 접근하기 위해서다

---

### 인자 3: InvocationHandler

```java
new InvocationHandler() {
    @Override
    public Object invoke(Object proxy, Method method, Object[] args) {
        ...
    }
}
```

> ==메서드가 호출될 때 실제로 뭘 실행할지== 정의하는 핸들러다

`invoke()`의 세 인자는 이렇다

```java
public Object invoke(
    Object proxy,    // 가짜 객체 자신
    Method method,   // 호출된 메서드 (findById)
    Object[] args    // 넘어온 인자들 ([1L])
)

// repo.findById(1L) 호출 시 들어오는 값:
// proxy  = repo 객체
// method = findById 메서드
// args   = [1L]
```

---

### 미니 Mock으로 직접 구현하면?

핵심 원리를 직접 재현했다

```java
// stub 반환값 저장소. [key="findById[1]", value=Optional.of(reservation)]
static Map<String, Object> stubTable = new HashMap<>();

// 호출된 메서드 기록. verify()가 몇 번 호출됐는지 셀 때 사용
static List<String> invocationLog = new ArrayList<>();

static <T> T mock(Class<T> interfaceClass) {
    return (T) Proxy.newProxyInstance(
        // 원본 인터페이스와 같은 ClassLoader, 캐스팅 가능하게 하기 위함
        interfaceClass.getClassLoader(),
        // 이 인터페이스를 구현한 가짜 클래스 생성
        new Class[]{interfaceClass},
        // invoke() 오버라이드 부분. 모든 메서드는 invoke()로 연결됨
        (proxy, method, args) -> {
	        // "findById[1]" 형태로 키 생성
            String key = method.getName() + Arrays.toString(args);
            // 호출 기록 (verify용)
            invocationLog.add(key);
            // stub 있으면 반환, 없으면 null
            return stubTable.getOrDefault(key, null);
        }
    );
}

// when() 인자로 mock 메서드를 호출하면 invoke()가 실행되고, lastCalledKey에 키가 초기화
static String lastCalledKey;

static <T> OngoingStub<T> when(T ignored) {
    // lastCalledKey는 바로 전에 호출된 메서드 키
    return new OngoingStub<>(lastCalledKey); 
}

static class OngoingStub<T> {
    private final String key;
    OngoingStub(String key) { this.key = key; }

    void thenReturn(T value) {
        stubTable.put(key, value); // stub 테이블에 (키 → 반환값) 등록
    }
}

static void verify(String methodKey, int expectedTimes) {
    long actual = invocationLog.stream()
        .filter(k -> k.equals(methodKey)) // 기록에서 해당 키 개수 세기
        .count();
    if (actual != expectedTimes) {
        throw new AssertionError("기대: " + expectedTimes + "회, 실제: " + actual + "회");
    }
}
```

**실행 예시**

```java
public static void main(String[] args) {
    // 가짜 객체 생성
    UserRepository repo = mock(UserRepository.class);

    // stub 등록
    // when() 안에서 repo.findById(1L) 호출
    // invoke() 실행
    // lastCalledKey = "findById[1]"
    lastCalledKey = "findById[1]";
    when(repo.findById(1L))
        .thenReturn(Optional.of(new User("Alice")));

    // 실제 호출
    Optional<User> result = repo.findById(1L);
    System.out.println(result); // Optional[User{name='Alice'}]

    // 검증
    verify("findById[1]", 1); // 1번 호출됐는지 확인 → 통과
}
```

**전체 흐름**

```
mock() 호출
    → Proxy가 가짜 객체 생성
    → 모든 메서드는 invoke()로 연결됨

when().thenReturn() 호출
    → stubTable["findById[1]"] = "Alice" 저장

repo.findById(1L) 호출
    → invoke() 진입
    → invocationLog에 기록
    → stubTable 조회 → "Alice" 반환

verify() 호출
    → invocationLog에서 개수 세기 → 통과
```


<br/>


미니 Mock에서 `lastCalledKey`를 수동으로 넣는 부분이 어색하게 느껴진다면 정상이다

`when(repo.findById(1L))`에서 Java는 인자를 먼저 평가한다

```
when( repo.findById(1L) )
//    ↑ 이게 먼저 실행됨 → invoke() 진입 → null 반환
```

```java
static <T> OngoingStub<T> when(T ignored) {
	// ignored = null, 쓰지 않음
	// lastCalledKey = "findById[1]" (수동으로 넣은 값)
	return new OngoingStub<>(lastCalledKey);
}
```
`when(null)`이 호출되는 셈이라 어떤 메서드에 stub을 등록해야 할지 알 수 없다

그래서 미니 구현시 일단 수동으로 `lastCalledKey`를 넣어줘야 했다

<br/>


실제 Mockito는 `invoke()` 안에서 ThreadLocal에 메서드 정보를 자동으로 기록한다

```java
// 실제 Mockito invoke() 내부
lastInvocation.set(new InvocationMatcher(method, args));  // 호출 시 자동 기록

// when()이 ThreadLocal에서 꺼냄
static <T> OngoingStub<T> when(T ignored) {
    return new OngoingStub<>(lastInvocation.get());  // 수동 설정 불필요
}
```

실제 Mockito가 이걸 자동화하는 방법은 다음 파일에서 다룬다

---

---

## when().thenReturn()은 stub을 어떻게 등록하나?

### 미니 Mock에서 어색했던 부분

미니 Mock에서 stubbing을 이렇게 했다

```java
lastCalledKey = "findById[1]";  // 수동으로 넣어야 함
when(repo.findById(1L)).thenReturn("Alice");
```

`lastCalledKey`를 직접 넣는 게 이상하다

실제 Mockito는 `when(repo.findById(1L))` 한 줄만으로 어떻게 자동으로 감지하나?

---

### when()을 호출하면 무슨 일이 일어나나?

`when(repo.findById(1L))`은 겉보기엔 반환값을 인자로 받는 것처럼 보이지만, 

실제로는 `repo.findById(1L)`이 **먼저 실행된다**

```java
when(repo.findById(1L))
//       ↑ 이게 먼저 실행됨
```

실행되면 `invoke()`가 가로채고, 그 시점에 Mockito가 ThreadLocal에 기록을 남긴다

---

### ThreadLocal이 뭔가?

> ThreadLocal은 ==스레드마다 독립된 저장 공간==이다

```java
ThreadLocal<String> state = new ThreadLocal<>();
state.set("stubbing");  // 현재 스레드에만 저장
state.get();             // 현재 스레드 값만 꺼냄
```

여러 스레드가 동시에 mock을 써도 서로 상태가 섞이지 않는다

static 변수로 저장하면 멀티스레드 환경에서 덮어써지는데, ThreadLocal은 그 문제를 피한다

---

### 실제 stubbing 등록 흐름

```
when(repo.findById(1L))
    1. repo.findById(1L) 실제로 실행됨
    2. MockHandler가 호출을 가로챔
    3. ThreadSafeMockingProgress에 "stubbing 모드" 표시
    4. "마지막으로 호출된 메서드: findById(1L)" ThreadLocal에 기록

.thenReturn("Alice")
    5. ThreadLocal에서 마지막 기록 꺼냄
    6. stubTable["findById[1L]"] = "Alice" 저장
    7. ThreadLocal 초기화 → 일반 모드로 복귀
```

미니 Mock에서 수동으로 넣던 `lastCalledKey`가 3~4번에서 자동으로 처리된다

---

### MockHandlerImpl에서 어디를 보면 되나?

참고로 MockHandlerImpl 는 실제 구현체이다 (다음 페이지)

```java
public Object handle(Invocation invocation) {

    if (invocationContainer.hasAnswersForStubbing()) {
        invocationContainer.setMethodForStubbing(invocation);
        return null;
    }
    // ...
}
```

이 분기는 `doReturn().when()` 패턴을 처리한다

`when().thenReturn()`과 순서가 반대다

```
when().thenReturn() : repo.findById(1L) 실행 → when() → thenReturn()
doReturn().when()   : doReturn("Alice") → when(repo) → .findById(1L) 실행
```

`doReturn("Alice")`가 먼저 호출되면 answer가 저장되지만 어떤 메서드에 stub할지는 아직 모른다

이 상태가 `hasAnswersForStubbing() = true`다

```
doReturn("Alice")
    → answer 저장됨
    → "아직 메서드 지정 안 됨" 상태 → hasAnswersForStubbing() = true
```

그 다음 `.findById(1L)`이 실행되면 MockHandler가 가로채고

`hasAnswersForStubbing() = true`면 "지금 호출된 이 메서드가 stub 대상"이라고 판단해서 연결한다

| 패턴 | 메서드가 언제 실행되나 | stub 연결 시점 |
|------|------|------|
| `when(repo.method()).thenReturn()` | `when()` 인자로 먼저 실행 | `thenReturn()`에서 ThreadLocal로 연결 |
| `doReturn().when(repo).method()` | 맨 마지막에 실행 | `hasAnswersForStubbing()`이 true면 연결 |

---

---

## 실제 Mockito 소스와 비교하면?

### 어디서 소스를 찾나?

IntelliJ 기준으로 External Libraries에서 바로 열 수 있다

```
Project 탭 → External Libraries
    → Gradle: org.mockito:mockito-core:x.x.x
        → mockito-core-x.x.x-sources.jar
            → org/mockito/internal/handler/MockHandlerImpl.java
```

소스 jar가 없으면 IntelliJ가 바이트코드를 자동으로 디컴파일해서 보여준다

---

### 전체 구조 대조

| 미니 Mock | 실제 Mockito | 역할 |
| --------- | ------------ | ---- |
| `Proxy + invoke()` | `ByteBuddy + doIntercept()` | 메서드 가로채기 |
| `stubTable (Map)` | `InvocationContainerImpl` | stub 저장/조회 |
| `invocationLog (List)` | `InvocationContainerImpl` | 호출 기록 |
| `lastCalledKey` (수동) | `ThreadSafeMockingProgress` | stubbing 상태 감지 |
| `defaultValue()` | `mockSettings.getDefaultAnswer()` | 기본 반환값 |

---

### MockHandlerImpl.handle() - 미니 Mock과 1:1 비교

```java
// 미니 Mock invoke()
public Object invoke(Object proxy, Method method, Object[] args) {
    String key = method.getName() + Arrays.toString(args);

    invocationLog.add(key);                     // 호출 기록
    return stubTable.getOrDefault(key, null);   // stub 조회 + 기본값
}
```

```java
// 실제 MockHandlerImpl.handle() - 복잡한 것 제거함
public Object handle(Invocation invocation) {

    // when() 호출 중 감지 → stub 등록 대기
    // 미니 Mock에는 없던 부분 (04 파일에서 설명)
    if (invocationContainer.hasAnswersForStubbing()) {
        invocationContainer.setMethodForStubbing(invocation);
        return null;
    }

    // 호출 기록 저장 (verify용)
    // 미니 Mock: invocationLog.add(key)
    invocationContainer.setInvocationForPotentialStubbing(invocation);

    // stub 테이블 조회
    // 미니 Mock: stubTable.getOrDefault(key, null)
    StubbedInvocationMatcher stubbing = invocationContainer.findAnswerFor(invocation);
    if (stubbing != null) {
        return stubbing.answer(invocation);
    }

    // stub 없으면 기본값 (null, 0, false...)
    // 미니 Mock: defaultValue()
    return mockSettings.getDefaultAnswer().answer(invocation);
}
```

구조가 완전히 동일하다

미니 Mock에 없던 첫 번째 블록(`hasAnswersForStubbing`)이 ThreadLocal 기반 stubbing 감지다

---

### 복잡해 보이는 이유

실제 소스가 어렵게 느껴지는 건 딱 세 가지 때문이다

| 복잡해 보이는 것 | 실제로 하는 일 |
| ---------------- | -------------- |
| `ThreadSafeMockingProgress` | `lastCalledKey`를 ThreadLocal로 자동화한 것 |
| `InvocationMatcher` | `"findById[1]"` 문자열 키를 객체로 만든 것 |
| `StubbingLookupNotifier` 등 리스너 | 디버깅/로깅용 부가 기능 |

> 뼈대는 미니 Mock과 동일하고  
> ==자동화 + 유연성 + 부가 기능==이 쌓인 것뿐이다

---

---

## @Spy는 @Mock과 뭐가 다른가?

### 차이가 뭔가?

> `@Mock`: 모든 메서드가 가짜로 교체됨  
> `@Spy`: ==실제 객체를 감싼 것==, stub 없으면 진짜 메서드가 실행됨

```java
// @Mock - stub 없으면 기본값 반환
@Mock
List<String> mockList;

mockList.add("hello");  // 아무 일도 안 일어남 (가짜)
mockList.size();        // 0 (stub 없으면 기본값)

// @Spy - stub 없으면 진짜 실행
@Spy
List<String> spyList = new ArrayList<>();

spyList.add("hello");  // 실제로 추가됨
spyList.size();        // 1 (진짜 메서드 실행)
```

---

### 어떻게 동작하나?

`@Mock`은 ByteBuddy가 모든 메서드를 MockHandler로 교체한다

`@Spy`는 실제 객체를 감싸서 stub된 메서드만 MockHandler로 교체하고, 나머지는 진짜 메서드를 호출한다

```java
// @Spy에서 stub 안 된 메서드 → 실제 실행
spyList.add("hello");  // ArrayList.add() 진짜 실행

// @Spy에서 stub된 메서드 → 가짜 반환
given(spyList.size()).willReturn(100);
spyList.size();  // 100
```

---

### @Spy에서 stubbing 방식이 다르다

`@Spy`에서 `when(spy.method()).thenReturn()`을 쓰면 진짜 메서드가 먼저 실행된다

```java
// when() 안에서 spy.size()가 실제로 실행됨 → 문제가 생길 수 있음
when(spyList.size()).thenReturn(100);

// 권장: doReturn().when() 형태
doReturn(100).when(spyList).size();  // 진짜 메서드 실행 없이 stub
```

---

### 언제 @Spy를 쓰나?

대부분의 메서드는 실제로 실행하되, 특정 메서드만 stub하고 싶을 때 쓴다

외부 의존성이 없는 클래스에서 일부 메서드만 격리하고 싶을 때 유용하다

---

---

## 내 기준

### 핵심 흐름

```
@Mock 선언
    │
    ▼
ByteBuddy / Proxy 가 런타임에 가짜 클래스 생성
모든 메서드에 MockHandler 삽입
    │
    ▼
given(mock.method(args)).willReturn(value)
    │  → MockHandler가 "지금 stubbing 중" 상태 기록 (ThreadLocal)
    │  → stub 테이블에 (method + args → value) 저장
    │
    ▼
실제 코드에서 mock.method(args) 호출
    │  → MockHandler 가로챔
    │  → 호출 기록 저장 (verify용)
    │  → stub 테이블 조회 → 값 반환
    │
    ▼
verify(mock).method(args)
    │  → 호출 기록에서 조건 충족 여부 확인
```

---

### 핵심

> `given().willReturn()`은 stub 테이블에 대본을 등록하는 것이고  
> 메서드 호출 시 ==MockHandler가 그 대본을 꺼내 반환==하는 것이다

<br/>

> `final` 메서드를 mock 못 하는 이유는  
> ==서브클래싱으로 오버라이드할 수 없기== 때문이다

---

### 미니 Mock vs 실제 Mockito

| | 미니 Mock | 실제 Mockito |
|---|---|---|
| 가짜 객체 생성 | `Proxy.newProxyInstance()` | ByteBuddy 서브클래스 |
| 메서드 가로채기 | `InvocationHandler.invoke()` | `MockMethodInterceptor.doIntercept()` |
| stub 저장 | `HashMap` | `InvocationContainerImpl` |
| stubbing 상태 감지 | 수동 (`lastCalledKey`) | `ThreadSafeMockingProgress` (ThreadLocal) |

---

### 실전 체크리스트

❓ **`given().willReturn()`이 어떻게 동작하는지 궁금한가?**

stub 테이블에 `(메서드 + 인자) → 반환값` 을 저장하는 것이다

실제 호출 시 MockHandler가 테이블을 조회해서 반환한다

<br/>

❓ **`final` 메서드나 `final` 클래스를 mock하려 하는가?**

ByteBuddy는 서브클래싱으로 메서드를 오버라이드한다

`final`은 오버라이드 불가 -> `mockito-inline` 의존성을 추가해야 한다

<br/>

❓ **stub을 안 했는데 null이 반환되는가?**

stub 테이블에 등록이 없으면 기본값을 반환한다

`null`, `0`, `false`, `Collections.emptyList()` 등이 타입에 따라 자동으로 반환된다

<br/>

❓ **대부분은 실제 로직을 실행하되 특정 메서드만 stub하고 싶은가?**

`@Mock` 대신 `@Spy`를 쓴다

stub 안 한 메서드는 진짜 로직이 실행된다

`@Spy`에서 stubbing할 때는 `doReturn().when()` 형태를 쓴다
