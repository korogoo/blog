---
date: 2026-05-03
---
# 발단

예약 삭제 API를 구현하면서 `@PathVariable`로 경로 변수를 받으려 했다

```java
@DeleteMapping("/reservations/{id}")
public ResponseEntity<Void> delete(@PathVariable Long id) { ... }
```

실행하니 아래 에러가 발생했다

```
java.lang.IllegalArgumentException: Name for argument of type [java.lang.Long] not specified,
and parameter name information not available via reflection.
Ensure that the compiler uses the '-parameters' flag.
```


---

# 원인 분석

> 자바 컴파일러는 기본적으로 바이트코드에 파라미터 이름을 저장하지 않는다

스프링은 리플렉션으로 `id`라는 파라미터 이름을 읽으려 했지만, 바이트코드에 그 정보가 없어서 실패한 것이다

---

## 해결 방법

파라미터 이름 정보를 바이트코드에 포함시키려면 컴파일 시 `-parameters` 플래그가 필요하다

```groovy
// build.gradle
compileJava {
    options.compilerArgs << '-parameters'
}
```

또는 이름을 직접 명시하면 컴파일러 설정 없이도 동작한다

```java
@PathVariable("id") Long id
```


---

# 해결 과정

## 시도 1 - build.gradle에 컴파일러 플래그 추가 (실패)

```groovy
compileJava {
    options.compilerArgs << '-parameters'
}
```

에러가 동일하게 발생했다

<br/>

IntelliJ는 기본적으로 Gradle 컴파일러가 아닌 ==자체 컴파일러==를 사용한다

`build.gradle` 설정은 Gradle 컴파일러에만 적용되므로, IntelliJ 실행 버튼으로 돌리면 무시된다

---

## 시도 2 - IntelliJ 빌드를 Gradle에 위임 (성공)

```
Settings → Build, Execution, Deployment → Build Tools → Gradle
→ Build and run using: Gradle
```

에러가 사라졌다



---

# 결론

> `build.gradle`의 컴파일러 설정을 반영하려면 IntelliJ 빌드를 Gradle에 위임해야 한다

| | IntelliJ 기본 | Gradle 위임 |
|---|---|---|
| 컴파일러 | IntelliJ 자체 | Gradle (javac) |
| build.gradle 적용 | X | O |
| `-parameters` 플래그 | 미적용 | 적용 |

---

## 체크리스트

✨ **`@PathVariable`에서 이름 인식 실패가 발생한다면?**

`build.gradle`에 `-parameters` 플래그를 추가하고, IntelliJ 빌드를 Gradle에 위임한다

<br/>

✨ **컴파일러 설정 없이 빠르게 해결하고 싶다면?**

`@PathVariable("id") Long id`처럼 이름을 직접 명시한다

<br/>

✨ **IntelliJ 실행 버튼과 Gradle 빌드 결과가 다르다면?**

IntelliJ가 자체 컴파일러를 사용하고 있을 가능성이 높다

`Build and run using: Gradle` 설정을 확인한다
