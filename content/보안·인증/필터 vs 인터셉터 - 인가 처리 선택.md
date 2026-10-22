---
title: "필터 vs 인터셉터 - 인가 처리 선택"
date: 2026-06-29
area: hard-skill
category: "보안·인증"
project: "Salmonbus"
tags:
  - "Spring Security"
  - "필터"
  - "인터셉터"
aliases:
  - "04. 쌍둥이와 앱 개발기/SBI/필터 vs 인터셉터 - 인가 처리 선택/01. 발단"
  - "04. 쌍둥이와 앱 개발기/SBI/필터 vs 인터셉터 - 인가 처리 선택/02. 필터와 인터셉터는 어디서 실행되나"
  - "04. 쌍둥이와 앱 개발기/SBI/필터 vs 인터셉터 - 인가 처리 선택/03. Spring Security가 필터 기반인 이유"
  - "04. 쌍둥이와 앱 개발기/SBI/필터 vs 인터셉터 - 인가 처리 선택/04. 필터 에러 응답 통일 - AuthenticationEntryPoint"
  - "04. 쌍둥이와 앱 개발기/SBI/필터 vs 인터셉터 - 인가 처리 선택/05. 도메인 레벨 인가는 서비스에서"
  - "04. 쌍둥이와 앱 개발기/SBI/필터 vs 인터셉터 - 인가 처리 선택/07. 내 기준"
draft: true
---

## 발단

logout API를 구현하려는데 SecurityContext에서 memberId를 꺼낼 수가 없었다

JWT Filter가 없어서였는데, 그러면 Filter를 만들어야 하는데 - 문제가 생겼다

인가 에러도 애플리케이션 레벨 에러인데, 왜 ControllerAdvice로 못 잡나
나머지 에러 응답은 다 ApiResponse 포맷으로 통일해뒀는데 인가 에러만 따로 놀면 어색하다

인터셉터로 하면 ControllerAdvice에 잡히고, ArgumentResolver로 @LoginMember 같은 어노테이션도 만들 수 있다
그냥 인터셉터가 낫지 않나?

❓ 근데 Spring Security를 이미 쓰고 있는데 - 필터랑 인터셉터 중 어디서 JWT를 검증해야 할까?

다음으로 이동 -> [[02. 필터와 인터셉터는 어디서 실행되나]]

## 필터와 인터셉터는 어디서 실행되나

## 실행 위치가 다른가?

```
요청
 └-> [Filter Chain]          <- Servlet 레벨, Spring MVC 밖
       └-> DispatcherServlet
             └-> [Interceptor]   <- Spring MVC 안
                   └-> Controller
```

필터는 Servlet 컨테이너 레벨에서 돌아간다
DispatcherServlet 앞에서 실행되기 때문에 Spring의 예외 처리 흐름 밖이다

<br/>

## 그럼 에러 핸들러 차이는?

인터셉터에서 예외를 던지면 DispatcherServlet이 받아서 `@ControllerAdvice`로 넘긴다
필터에서 예외를 던지면 아무도 안 잡는다 - 직접 response에 써야 한다

⚠️ **필터에서 예외 -> ControllerAdvice 우회됨**
Spring MVC가 처리하기 전에 터지기 때문에 예외 핸들러가 개입할 수 없다

<br/>

## 그럼 인터셉터가 무조건 낫나?

인터셉터가 에러 처리는 편하다
ControllerAdvice 한 곳으로 통일되고, ArgumentResolver로 @LoginMember 같은 어노테이션도 만들 수 있다

⚠️ **근데 Spring Security를 쓰면 얘기가 달라진다**
Spring Security 자체가 필터 체인이기 때문

❓ Spring Security는 왜 필터 기반으로 만들어진 걸까?

다음으로 이동 -> [[03. Spring Security가 필터 기반인 이유]]

## Spring Security가 필터 기반인 이유

## Spring Security는 어디서 인가 판단을 하나?

Spring Security가 `authorizeHttpRequests`로 URI별 접근 제어를 하는 곳이 필터 체인이다

```
요청
 └-> [DelegatingFilterProxy]
       └-> [SecurityFilterChain]
             ├-> JwtAuthenticationFilter  <- 여기서 SecurityContextHolder 세팅
             └-> AuthorizationFilter      <- authenticated() 판단
                   └-> DispatcherServlet
```

AuthorizationFilter가 `authenticated()` 판단을 내리는 시점은 DispatcherServlet 앞이다
이때 SecurityContextHolder에 아무것도 없으면 무조건 401을 뱉는다

<br/>

## 인터셉터로 JWT 검증을 하면 어떻게 되나?

인터셉터는 DispatcherServlet 안에서 실행된다
즉 SecurityContextHolder가 비어있는 채로 AuthorizationFilter를 통과해야 한다

Spring Security 설정에서 `.anyRequest().authenticated()`를 걸어두면
인터셉터에 도달하기도 전에 Spring Security가 막아버린다

✨ **결론 - SecurityContextHolder는 필터에서 채워야 한다**
인가 판단이 필터 레벨에서 일어나기 때문에, 인증 정보도 그 전에 심어야 한다

<br/>

### 💬 SecurityContextHolder란?

현재 요청을 처리하는 스레드의 인증 정보를 담는 저장소
ThreadLocal 기반이라 같은 스레드 어디서든 꺼낼 수 있다

```java
SecurityContextHolder.getContext().setAuthentication(authentication);
```

이걸 필터에서 세팅해두면, 컨트롤러에서 `@AuthenticationPrincipal`로 꺼낼 수 있다

❓ 그럼 필터에서 에러가 나면 ControllerAdvice로 못 잡는 문제는 어떻게 해결하나?

다음으로 이동 -> [[04. 필터 에러 응답 통일 - AuthenticationEntryPoint]]

## 필터 에러 응답 통일 - AuthenticationEntryPoint

## ControllerAdvice 없이 에러 응답을 어떻게 맞추나?

Spring Security는 두 가지 인가 실패 상황에 대한 핸들러를 제공한다

| 상황 | 핸들러 |
|---|---|
| 인증 실패 (토큰 없음 / 만료) | `AuthenticationEntryPoint` |
| 인가 실패 (권한 부족) | `AccessDeniedHandler` |

여기서 직접 response에 JSON을 써주면 된다

<br/>

## 구현 방법

```java
@Component
public class CustomAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.getWriter().write(
            objectMapper.writeValueAsString(ApiResponse.error("인증이 필요합니다"))
        );
    }
}
```

✨ **ObjectMapper로 기존 ApiResponse 포맷 직렬화**
하드코딩이 아니라 동일한 응답 객체를 쓰기 때문에 포맷 통일이 가능하다

<br/>

⚠️ **ControllerAdvice를 거치지 않는 건 여전하다**
에러 처리 코드가 두 곳으로 나뉘는 건 감수해야 한다
Spring Security를 쓰는 이상 피하기 어려운 트레이드오프다

<br/>

### 💬 SecurityConfig에 등록하는 방법

```java
http.exceptionHandling(e -> e
    .authenticationEntryPoint(customAuthenticationEntryPoint)
    .accessDeniedHandler(customAccessDeniedHandler)
);
```

❓ 도메인 레벨 인가 (이 리소스의 주인인가?) 는 어디서 처리하나?

다음으로 이동 -> [[05. 도메인 레벨 인가는 서비스에서]]

## 도메인 레벨 인가는 서비스에서

## 소유자 검증은 필터나 인터셉터에서 하면 안 되나?

"이 게시글이 내 게시글인가?"를 확인하려면 DB 조회가 필요하다
인터셉터에서 하면 이런 문제가 생긴다

```
인터셉터  -> Post 조회 (소유자 확인용)   <- 쿼리 1번
서비스    -> Post 조회 (비즈니스 로직용)  <- 쿼리 또 1번 (중복)
```

같은 리소스를 두 번 조회하게 된다

<br/>

## 서비스에서 하면 어떻게 되나?

```java
public void deletePost(Long postId, Long memberId) {
    Post post = postRepository.findById(postId)
        .orElseThrow(PostNotFoundException::new);

    if (!post.isOwnedBy(memberId)) {
        throw new ForbiddenException();
    }

    postRepository.delete(post);
}
```

리소스 조회 + 소유자 확인을 한 번에 처리한다
쿼리 중복 없이 도메인 로직도 서비스에 집중된다

<br/>

✨ **인가 처리 레이어 정리**

```
필터        -> JWT 유효한가? (memberId 심기)
Spring Sec  -> 로그인한 유저인가? (authenticated())
서비스      -> 이 리소스의 주인인가? (도메인 레벨 인가)
```

역할이 명확하게 분리된다

다음으로 이동 -> [[04. 쌍둥이와 앱 개발기/SBI/필터 vs 인터셉터 - 인가 처리 선택/07. 내 기준|07. 내 기준]]

## 내 기준

## 핵심 흐름

```
요청
 └-> JwtAuthenticationFilter (필터)
       ├-> 토큰 없음/만료  ->  AuthenticationEntryPoint  ->  401 ApiResponse
       └-> 토큰 유효  ->  SecurityContextHolder 세팅
             └-> AuthorizationFilter
                   └-> Controller
                         └-> @AuthenticationPrincipal Long memberId
                               └-> Service  ->  소유자 검증
```

<br/>

> Spring Security를 사용하면 필터 기반으로 JWT 인증을 구현하는 편이 인가 처리가 더 단순하고 명확해진다

<br/>

## ❓ 실전 체크리스트

- 인터셉터가 더 나은 경우는?
  - Spring Security를 사용하지 않는 프로젝트
  - ControllerAdvice 통일이 최우선이고 authorizeHttpRequests를 안 쓸 때

- 에러 응답 포맷 통일은 어떻게?
  - `AuthenticationEntryPoint` + `AccessDeniedHandler`에서 ObjectMapper로 ApiResponse 직렬화
  - ControllerAdvice를 거치지 않는 건 트레이드오프로 감수

- 소유자 검증은 어디서?
  - 서비스 레이어 - 리소스 조회와 소유자 확인을 한 번에

- 필터에서 쓸 수 있는 어노테이션 주입은?
  - `@AuthenticationPrincipal` - SecurityContextHolder에 심어둔 값을 꺼냄
