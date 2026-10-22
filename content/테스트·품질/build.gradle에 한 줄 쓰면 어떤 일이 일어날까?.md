---
title: "build.gradle에 한 줄 쓰면 어떤 일이 일어날까?"
date: 2026-05-11
area: hard-skill
draft: true
category: "테스트·품질"
tags:
  - "Java"
  - "Gradle"
aliases:
  - "02. 고민/Java/build.gradle에 한 줄 쓰면 어떤 일이 일어날까?/01. 발단"
  - "02. 고민/Java/build.gradle에 한 줄 쓰면 어떤 일이 일어날까?/02. 의존성이란"
  - "02. 고민/Java/build.gradle에 한 줄 쓰면 어떤 일이 일어날까?/03. 의존성 추가 시 일어나는 일"
  - "02. 고민/Java/build.gradle에 한 줄 쓰면 어떤 일이 일어날까?/04. 의존성 스코프"
  - "02. 고민/Java/build.gradle에 한 줄 쓰면 어떤 일이 일어날까?/05. classpath"
  - "02. 고민/Java/build.gradle에 한 줄 쓰면 어떤 일이 일어날까?/06. gradle build와 clean"
  - "02. 고민/Java/build.gradle에 한 줄 쓰면 어떤 일이 일어날까?/07. 내 기준"
  - "하드 스킬/Java/build.gradle에 한 줄 쓰면 어떤 일이 일어날까?"
---
## 발단

Spring Boot 프로젝트를 처음 배웠을 때 때 `build.gradle`을 하도 많이 들었다

`implementation`이라는 키워드도 있었고, 의존성을 추가하라는 말도 들었다

그런데 그게 정확히 무슨 의미인지, 어떤 일이 벌어지는지 이해하지 못한 채 복붙만 하고 있었다

---

### 생겼던 질문들

- `build.gradle`에 한 줄을 쓰면 실제로 어떤 일이 발생하는가?
- `implementation`, `runtimeOnly`, `testImplementation`은 뭐가 다른가?
- `compileOnly`, `annotationProcessor`이 뭐고 언제 쓰는가?
- `build`와 `clean`은 각각 무엇을 하는가?
- Java classpath가 뭐고, Gradle이 어떻게 관여하는가?

---

### 왜 중요한가?

> 이유를 모르고 따라 쓰는 것은 ==오류가 났을 때 아무것도 할 수 없다는 뜻==이다

`ClassNotFoundException`이 뜨거나 의존성이 인식되지 않을 때,

Gradle이 어떻게 동작하는지 알아야 원인을 찾을 수 있다

스코프를 잘못 선언하면 배포 jar에 불필요한 라이브러리가 포함되거나,

런타임에 필요한 클래스가 없어서 실행이 실패할 수 있다


---

---

## 의존성이란

> 의존성을 추가한다는 것은  
> 
> ==내가 만들지 않은 코드를 가져다 쓰는 것을 선언하는 행위다==

---

### 개념

솔직히 처음엔 같은 자바 생태계면 `import`만 하면 다 쓸 수 있는 줄 알았다

Lombok 임포트 해서 쓰라고 해서 따라 쳤더니 컴파일 에러가 났고,

`build.gradle`에 선언을 한 후에야 `import`가 가능했다

<br/>

이렇게 날짜 계산, HTTP 요청 처리, JSON 파싱 같은 기능을 직접 구현하는 대신,

이미 만들어진 라이브러리를 가져다 쓰는 것이 의존성이다

---

### 의존성 vs import

|                   | 역할                                      |
| ----------------- | --------------------------------------- |
| `build.gradle` 선언 | 특정 라이브러리가 필요하다는 선언. Gradle이 `.jar`를 받아옴 |
| `import`          | 받아온 `.jar`에서 특정 클래스를 꺼내 쓰겠다는 표현         |

선언 없이 `import`하면 컴파일 에러가 난다

선언이 `import`보다 먼저다

---

### 의존성이 없다면?

👎 HTTP 요청 하나를 받기 위해 소켓 프로그래밍부터 직접 구현해야 한다

👎 JSON 한 줄을 파싱하기 위해 문자열 파서를 직접 짜야 한다

👎 Spring Boot 없이 웹 서버 하나를 올리려면 수천 줄의 코드가 필요하다

---

### 의존성이 있다면?

✨ **핵심 로직에만 집중할 수 있다**

검증된 코드를 재사용하기 때문에 안정성도 높다

<br/>

⚠️ **하지만 트레이드오프가 있다**

의존하는 라이브러리에 보안 취약점이 생기면 내 코드도 영향을 받는다

버전이 올라가면서 API가 바뀌면 내 코드도 함께 수정해야 한다

라이브러리가 많아질수록 내 코드가 외부에 노출되는 면이 넓어진다

---

### 실수했던 것

블로그 내용을 긁어다 쓰면서 의존성 선언 스코프를 아무 생각 없이 복붙했다

`import`가 되면 된다고만 생각했고, 무엇을 선언하는지보다 기능 쓸 수 있다는 결과에만 집중했다


---

---

## 의존성 추가 시 일어나는 일

> 한 줄을 추가하는 것처럼 보이지만 
> 
> ==인터넷에서 파일을 받아 프로젝트에 연결하는 전체 과정이 수반된다==

---

### 발생하는 일

```groovy
implementation 'org.springframework.boot:spring-boot-starter-web:3.0.0'
```

이 한 줄이 추가되는 순간 Gradle이 다음 순서로 움직인다

<br/>

✨ **Gradle이 선언을 읽는다**

`dependencies {}` 블럭을 읽고 어떤 라이브러리가 필요한지 파악한다

<br/>

✨ **Maven Central에서 `.jar` 파일을 다운로드한다**

Maven Central은 전 세계 개발자들이 라이브러리를 올려두는 공개 저장소다

<br/>

✨ **로컬 캐시에 저장한다**

`~/.gradle/caches/` 경로에 저장되어, 다음 빌드부터는 다운로드 없이 재사용한다

<br/>

✨ **전이 의존성(transitive dependency)도 함께 받는다**

`spring-boot-starter-web`이 필요로 하는 라이브러리들도 자동으로 따라온다

한 줄이지만 실제로는 수십 개의 `.jar` 파일이 프로젝트에 포함된다

<br/>

✨ **프로젝트 classpath에 추가된다**

이제 코드에서 해당 클래스를 `import`할 수 있게 된다


---

### 전이 의존성이란?

A가 B를 필요로 하고, B가 C를 필요로 할 때, A를 추가하면 B와 C까지 자동으로 따라온다

Gradle이 이 의존성 트리를 계산하고 알아서 처리해준다

```bash
./gradlew dependencies
```

이 명령으로 실제로 어떤 라이브러리들이 따라왔는지 확인할 수 있다

---

### 버전 관리

직접 명시하거나, Spring Boot BOM이 호환 버전을 대신 정해준다

```groovy
// 버전 직접 명시
implementation 'com.fasterxml.jackson.core:jackson-databind:2.15.0'

// 버전 생략 — BOM이 호환 버전을 자동으로 정해줌
implementation 'com.fasterxml.jackson.core:jackson-databind'
```

💬 **BOM: 이 스프링 버전엔 이 라이브러리 버전 쓰라는 목록표**

---

### 단점도 있지 않을까?

✨ **전이 의존성이 많아지면 추적이 어렵다**

어떤 라이브러리가 왜 포함됐는지 파악하기 어려워진다

`./gradlew dependencies --configuration compileClasspath` 로 확인할 수 있다

<br/>

✨ **버전 충돌이 생길 수 있다**

A와 B가 서로 다른 버전의 C를 필요로 하면 충돌이 발생한다

Gradle은 기본적으로 더 높은 버전을 선택하지만, 예상치 못한 동작이 생길 수 있다


---

---

## 의존성 스코프

> 블로그에서 긁어다 쓰다 보니 `implementation`만 쓰고 있었다  
> 
> ==의존성마다 언제 필요한지가 다르고, 스코프는 그 시점을 선언하는 것이다==

---

### 개념

의존성마다 필요한 시점이 다르다

이걸 모르고 전부 `implementation`으로 썼는데,

이 경우 테스트 프레임워크가 프로덕션 배포 파일에 같이 묶이거나,

컴파일 시점에만 필요한 라이브러리가 런타임에도 포함될 수 있다

---

### 스코프 비교표

| 스코프 | 컴파일 | 런타임 | 테스트 | 배포 jar |
|--------|--------|--------|--------|---------|
| `implementation` | O | O | O | O |
| `runtimeOnly` | X | O | O | O |
| `compileOnly` | O | X | X | X |
| `testImplementation` | O(테스트) | O(테스트) | O | X |
| `testRuntimeOnly` | X | O(테스트) | O | X |
| `annotationProcessor` | 컴파일 전 처리 | X | X | X |

---

### 각 스코프

#### implementation

```groovy
implementation 'org.springframework.boot:spring-boot-starter-web'
```

컴파일 시점과 런타임 시점 모두에서 필요한 라이브러리다

소스코드에서 `import`해서 직접 쓰는 라이브러리라면 `implementation`이다

---

#### runtimeOnly

```groovy
runtimeOnly 'com.h2database:h2'
```

런타임 시점에만 필요한 라이브러리다

코드에서 직접 `import`하지 않지만, 실행할 때 내부적으로 필요한 것이다

✨ **JDBC 드라이버가 대표적이다**

코드에 `import com.h2database...` 없이 설정 파일에 URL만 써줘도 Spring이 알아서 드라이버를 찾는다

컴파일 시에는 없어도 되므로 컴파일 속도에 영향을 주지 않는다

---

#### testImplementation

```groovy
testImplementation 'org.springframework.boot:spring-boot-starter-test'
```

테스트 코드에서만 필요한 라이브러리다

실제 배포되는 `.jar` 파일에는 포함되지 않는다

JUnit, Mockito, AssertJ, RestAssured 같은 테스트 도구들이 여기 속한다

---

#### compileOnly

```groovy
compileOnly 'org.projectlombok:lombok'
```

컴파일 시점에만 필요하고, 런타임에는 없어도 되는 라이브러리다

✨ **Lombok이 대표적이다**

`@Getter`, `@Setter` 같은 어노테이션을 컴파일 시점에 코드로 생성해준다

런타임에는 이미 생성된 코드가 있으므로 Lombok 자체는 필요 없다

---

#### annotationProcessor

```groovy
// Lombok 사용 시 두 줄이 한 세트다
compileOnly 'org.projectlombok:lombok'
annotationProcessor 'org.projectlombok:lombok'
```

컴파일 전에 어노테이션을 읽어서 코드를 생성하거나 처리하는 프로세서다

Lombok을 쓸 때 `compileOnly`와 함께 반드시 선언해야 한다

QueryDSL의 `QClass` 생성도 `annotationProcessor`가 담당한다

---

#### testRuntimeOnly

```groovy
testRuntimeOnly 'org.junit.platform:junit-platform-launcher'
```

테스트 실행 시점에만 필요한 라이브러리다

테스트 코드에서 직접 `import`해서 쓰지는 않지만, 테스트 엔진을 돌리는 데 필요한 것들이 여기 속한다

---

### 왜 구분하는가?

✨ **프로덕션 배포 파일 크기를 줄인다**

테스트 프레임워크, 코드 생성 도구를 제외하면 배포 파일이 가벼워진다

<br/>

✨ **의존성의 목적이 코드로 명확히 드러난다**

`testImplementation`을 보면 테스트에서만 쓰는 것임을 바로 알 수 있다

<br/>

✨ **잘못된 스코프는 컴파일 에러나 런타임 에러로 즉시 발견된다**

예: `runtimeOnly`로 선언한 라이브러리를 소스코드에서 `import`하면 컴파일 에러가 난다

---

---

## classpath

> JVM이 클래스를 찾을 때 어디를 뒤져야 하는지 알려주는 경로 목록이다  
> 
> ==Gradle이 의존성을 다운로드하고 classpath에 추가해주기 때문에 평소에는 직접 설정할 일이 없다==

---

### 개념

Java 프로그램을 실행하면 JVM은 필요한 클래스 파일(`.class`)을 찾아야 한다

classpath는 JVM에게 '여기서 클래스를 찾아라'고 알려주는 경로들의 목록이다

```java
import org.springframework.boot.SpringApplication;
```

이 코드를 실행하려면 JVM이 `SpringApplication.class` 파일을 찾아야 한다

classpath에 `spring-boot-*.jar` 경로가 등록되어 있어야 JVM이 그 파일을 발견할 수 있다

---

### Gradle과 classpath의 관계

`build.gradle`에 의존성을 선언하면 Gradle이 두 가지를 해준다

✨ **라이브러리를 다운로드한다**

Maven Central에서 `.jar` 파일을 `~/.gradle/caches/`에 저장한다

<br/>

✨ **classpath에 자동으로 추가해준다**

컴파일할 때는 `compileClasspath`, 실행할 때는 `runtimeClasspath`에 등록한다

이 덕분에 개발자는 classpath를 직접 설정하지 않아도 된다

---

### classpath 직접 확인하기

```bash
./gradlew dependencies --configuration compileClasspath
```

현재 컴파일 classpath에 어떤 라이브러리들이 포함되어 있는지 확인할 수 있다

전이 의존성까지 어떻게 연결되어 있는지 트리 형태로 보여준다

---

### ClassNotFoundException이 뜰 때

```
java.lang.ClassNotFoundException: com.example.SomeClass
```

이 오류는 대부분 해당 클래스의 `.jar`가 classpath에 없다는 의미다

<br/>

✨ **확인할 것들**

`build.gradle`에 의존성이 올바르게 선언되어 있는지 확인한다

스코프가 맞는지 확인한다  
`testImplementation`으로 선언한 것을 프로덕션 코드에서 쓰면 런타임에 없다

IntelliJ Gradle 새로고침(코끼리 버튼)을 눌렀는지 확인한다


---

---

## gradle build와 clean

> build가 의존성을 불러오는 거라고 생각했는데  
> 
> ==build는 컴파일부터 jar 생성까지, clean은 이전 결과물을 지우는 것이다==

---

### gradle build

```bash
./gradlew build
```

소스코드를 컴파일하고, 테스트를 실행하고, 배포 가능한 `.jar` 파일을 만드는 전체 과정이다

✨ **순서**

  1. 소스코드 컴파일 → `.class` 파일 생성
  2. 테스트 코드 전체 실행
  3. 테스트 통과 시 `.jar` 파일 생성 → `build/libs/`

테스트가 하나라도 실패하면 `.jar` 파일이 만들어지지 않는다

---

### build/ 폴더 구조

`./gradlew build` 실행 후 생성되는 폴더 구조다

```
build/
  classes/       ← 컴파일된 .class 파일
  libs/          ← 최종 .jar 파일
  test-results/  ← 테스트 결과 XML
  reports/       ← 테스트 HTML 리포트
```

---

### .jar가 필요한 때

로컬에서 IntelliJ로 실행할 때는 IntelliJ가 알아서 해줘서 `.jar`가 필요 없다

 `.jar`가 필요한 건 **서버에 배포할 때**이다 (IntelliJ가 없는 환경에서 실행해야 하므로)

```bash
java -jar myapp.jar   # 서버에서 이렇게 실행
```

---

### gradle clean

```bash
./gradlew clean
```

`build/` 폴더를 통째로 삭제한다

이전 빌드 결과물을 완전히 지우고 새로 시작하고 싶을 때 쓴다

---

### 증분 빌드 vs clean

Gradle은 평소에 변경된 파일만 재컴파일한다

`clean`은 평소엔 불필요하다

아래 상황에서만 쓰는 비상 수단이다

```bash
./gradlew clean build
```

| 상황                        | 이유                         |
| ------------------------- | -------------------------- |
| 클래스 이름을 바꾸거나 파일을 삭제했을 때   | stale `.class` 파일이 남을 수 있다 |
| `build.gradle` 자체를 수정했을 때 | 의존성 변경이 반영 안 될 수 있다        |
| 분명히 고쳤는데 반영이 안 될 때        | 증분 빌드가 변경을 감지 못한 것         |
| 원인 모를 컴파일 에러              | 일단 깨끗하게 초기화하고 다시 빌드        |

---

---

## 내 기준

### 스코프 결정 흐름

```
이 라이브러리가 필요한가?
         │
    ┌────┴──────────────────────┐
  컴파일 시점                런타임에만
    │                           │
    ├─ 소스코드에서 import?        └─ runtimeOnly
    │    │
    │    ├─ 테스트에서만? → testImplementation
    │    │
    │    ├─ 컴파일에만 필요 (런타임엔 불필요)?
    │    │    └─ compileOnly (+ annotationProcessor)
    │    │
    │    └─ 컴파일 + 런타임 모두? → implementation
    │
    └─ 어노테이션 처리만? → annotationProcessor
```


---

### build / clean 기준표

| 상황 | 명령 |
|------|------|
| 처음 빌드하거나 코드 변경 후 실행 | `./gradlew build` |
| 이상한 빌드 오류가 날 때 | `./gradlew clean build` |
| jar 없이 테스트만 실행하고 싶을 때 | `./gradlew test` |
| 빌드 산출물만 지우고 싶을 때 | `./gradlew clean` |

---

### 실전 체크리스트

❓ **`ClassNotFoundException`이 뜨는가?**

해당 클래스의 jar가 classpath에 없다

의존성 선언과 스코프를 확인한다

<br/>

❓ **배포 jar가 너무 큰가?**

테스트 도구가 `implementation`으로 선언됐는지 확인한다

`testImplementation`으로 옮긴다

<br/>

❓ **Lombok이 동작하지 않는가?**

`compileOnly`와 `annotationProcessor` 두 줄이 함께 선언됐는지 확인한다

<br/>

❓ **의존성 추가 후에도 에러가 나는가?**

IntelliJ Gradle 새로고침(코끼리 버튼)을 눌렀는지 확인한다

<br/>

❓ **"고쳤는데 반영이 안 돼" 상황인가?**

`./gradlew clean build`로 이전 결과물을 지우고 처음부터 다시 빌드한다

<br/>

❓ **전이 의존성을 확인하고 싶은가?**

`./gradlew dependencies --configuration compileClasspath`로 의존성 트리를 확인한다
