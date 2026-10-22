---
title: "애플 로그인 - OAuth2 vs OIDC"
date: 2026-06-15
area: hard-skill
draft: true
category: "보안·인증"
tags:
  - "Spring"
  - "OAuth2"
  - "OIDC"
aliases:
  - "04. 쌍둥이와 앱 개발기/SBI/애플 로그인 - OAuth2 vs OIDC/01. 발단"
  - "04. 쌍둥이와 앱 개발기/SBI/애플 로그인 - OAuth2 vs OIDC/02. 애플 로그인은 왜 강제되나"
  - "04. 쌍둥이와 앱 개발기/SBI/애플 로그인 - OAuth2 vs OIDC/03. OAuth2가 뭔가"
  - "04. 쌍둥이와 앱 개발기/SBI/애플 로그인 - OAuth2 vs OIDC/04. 그럼 OAuth2에 안전한 로그인을 추가할 순 없나?"
  - "04. 쌍둥이와 앱 개발기/SBI/애플 로그인 - OAuth2 vs OIDC/05. Swift와 Spring 구현"
  - "04. 쌍둥이와 앱 개발기/SBI/애플 로그인 - OAuth2 vs OIDC/06. 내 기준"
  - "하드 스킬/프로젝트/SBI/애플 로그인 - OAuth2 vs OIDC"
---
## 발단

App Store에 이미 올라가 있는 앱에 커뮤니티 서버를 붙여야 한다

커뮤니티를 하려다보니 사용자 식별이 필요했고, 간단히 소셜로그인을 구현하려고 했다

<br/>

 쌍둥이랑 전화하다 들었는데, 앱스토어에 올리려면 애플 로그인이 필수라고 했다

보안이슈인가? 컨셉인가? 대기업의 횡포..? 이유가 궁금했다

<br/>

그리고 소셜 로그인이라길래 처음엔 단순하게 생각했다

이것도 구글, 카카오 처럼 OAuth2 라이브러리 그냥 갖다 쓰면 금방이겠다~ 생각했다

<br/>

그래서 두가지를 알아보려고 한다

❓ **애플 로그인이 실제로 강제되는지 (심사 규칙)**

❓ **애플 로그인은 어떻게 구현하는지**

---

---

## 애플 로그인은 왜 강제되나

### 공식문서를 한 번 봐보자

App Store 심사 가이드라인에 **4.8 Login Services** 항목이 있었다

```
Apps that use a third-party or social login service (such as Facebook Login, 
Google Sign-In, Log in with X, Sign In with LinkedIn, Login with Amazon, or 
WeChat Login) to set up or authenticate the user’s primary account with the app 
must also offer as an equivalent option another login service with the following
features:

- the login service limits data collection to the user’s name and email address;
- the login service allows users to keep their email address private as part of setting up their account; and
- the login service does not collect interactions with your app for advertising purposes without consent.

A user’s primary account is the account they establish with your app for the 
purposes of identifying themselves, signing in, and accessing your features and
associated services.
```


구글, 페이스북, X 같은 서드파티 소셜 로그인으로 주 계정을 만들면  
**프라이버시 기능을 갖춘 대체 로그인**을 함께 제공해야 한다

<br/>

#### ❓ **프라이버시  기능을 갖춘 대체 로그인이 뭔데..?**

✨ **이름과 이메일만 수집**

구글 로그인 같은 경우 생년월일, 프로필 사진, 연락처 같은 더 많은 데이터를 가져올 수 있다

이를 막지 않으면 심사에 통과하지 않는 모양이다

<br/>

✨ **사용자가 이메일을 숨길 수 있게 함**

애플은 `Hide My Email` 같은 기능을 제공한다  
(애플로그인 그냥 쓰라는 거 아닌가...?)

아무튼 사용자가 실제 이메일 대신 랜덤 릴레이 주소를 쓸 수 있다.

랜덤 릴레이 주소는 `x7k2m9p@privaterelay.appleid.com` 이런 형태인데,  
앱이 중간에서 이메일을 오용하는 것을 방지하기 위해서이다

만약 릴레이 주소로 이메일을 발송하면 애플서버에서 가로챈 후 실제 주소로 이메일을 전달한다

<br/>

✨ **동의 없이 광고용으로 앱 사용 기록을 수집하지 않음**

내가 페이스북 로그인으로 쇼핑앱에 가입했는데,  
이 쇼핑앱에서 '운동화' 라고 검색하면, 페이스북 앱 광고에 운동화 관련이 뜨게 되는 것  

이런 것이 동의 없이 광고용으로 앱 사용 기록을 수집하는 것이다


<br/>

---

### 어떤 로그인이 이 조건을 충족할까?

Sign in with Apple이 이 조건을 충족한다..

그래서 보통 소셜 로그인할 때 애플 로그인을 구현하는 이유이다

<br/>

⚠️ **그리고 과거엔 애플 로그인 자체가 강제였다**

지금은 `동등한 프라이버시를 보장하는 대체 로그인` 으로 완화됐다

단 그 조건을 만족하는 가장 쉬운 인증 방식이 애플 로그인이다

<br/>

---
### 예외도 있나?

기업용/교육용 앱, 특정 서드파티 서비스 전용 클라이언트 앱 등은 면제된다고 한다

바리바리는 일반 소비자용 소셜 로그인 앱이라 면제 대상이 아니었다


---

<br/>

### 참고

- [App Store Review Guidelines - 4.8 Login Services](https://developer.apple.com/app-store/review/guidelines/#login-services)

---

---

## OAuth2가 뭔가

### OAuth2 가 뭔가?

#### 라이브러리? 프로토콜?

```
프로토콜  : 어떻게 통신할지 정한 규칙 (명세서)
라이브러리 : 그 규칙을 코드로 구현해둔 것
```

`OAuth2`는 토큰을 어떻게 발급하고, 어떻게 전달하고, 어떻게 검증할지를 정한 규칙이다

`Spring Security OAuth2 Client`는 그 규칙을 구현한 라이브러리다

<br/>

⚠️ **OAuth2를 쓴다는 말은 위 두가지 개념을 잘 알고 사용해야 한다**

팀원들과 명확히 표현하면 아래와 같이 해석이 가능해진다

- OAuth2 프로토콜 흐름을 따른다 (규칙 준수)
- Spring Security OAuth2 같은 라이브러리를 사용한다 (구현체 사용)

<br/>

---
### OAuth2 의 목적

OAuth2는 Authorization (인가) 프로토콜이다

`이 앱에게 내 리소스 접근 권한을 위임한다` 가 핵심 목표이다

<br/>

대표 예시가 `구글 캘린더 권한을 외부 앱에 넘기기`다

여기서 외부 앱은 바리바리가 된다

```
[사용자] 바리바리가 내 구글 캘린더를 읽게 허락
[구글] 바리바리에게 access token 발급
[바리바리] 그 토큰으로 캘린더 API 호출
```

여기서 바리바리가 알 수 있는 건 **요청자가 누구인지(인증)** 가 아니라

캘린더에 **접근할 권한(인가)이 있는지** 이다

<br/>

#### 💬 인증 vs 인가?

- 인증(Authentication) : 너 누구야? (신원 확인)
- 인가(Authorization) : 너 뭐 할 수 있어? (권한 확인)

로그인은 인증인데, OAuth2는 인가다


<br/>

⚠️ **결론은 OAuth2는 원래 로그인용이 아니다**

OAuth2가 주는 access token은 권한에 대한 정보이다

`이 토큰을 가진 사람 = 로그인한 사용자`라고 착각하면 안 되는데,  
토큰이 누구 것인지, 누가 발급받았는지를 OAuth2 자체는 보장하지 않기 때문이다

<br/>


---

### 근데 OAuth2로 로그인을 하면 안 되나?

OAuth2가 퍼지면서 사람들이 이걸 로그인에도 갖다 쓰기 시작했다

```
구글 OAuth2로 access token 받음
→ 그 토큰으로 구글 사용자 정보 API 호출
→ 이메일 꺼내서 로그인 처리
```


<br/>

#### 문제가 세 가지 있었다


⚠️ **사용자 정보 API 엔드포인트가 제각각ㅇㅣ다**

- 구글   : /oauth2/v1/userinfo
- 페이스북 : /me
- 트위터  : /1.1/account/verify_credentials.json

<br/>

⚠️ **토큰이 진짜 이 사용자 것인지 검증 방법이 없다**

access token 탈취해서 다른 앱에서 쓰는 공격 가능

<br/>


⚠️ **토큰이 내 앱용으로 발급된 건지 확인이 불가능하다**

A 앱에서 발급받은 access token 을 B 앱에서 사용할 수 있게 된다

<br/>

---

### 그럼 OIDC를 안 쓰는 소셜 로그인도 있나?

카카오가 대표적이다

```
카카오 로그인:
  OAuth2 access token 받음
  -> /v2/user/me API 따로 호출
  -> 사용자 정보 받아옴
  (ID Token 없이 동작)
```

카카오도 OpenID Connect를 지원하긴 하는데 옵션이다

안 써도 로그인이 된다

<br/>

⚠️ **그치만 안전하지 않다**

```
OAuth2 만으로 로그인:
  이 토큰이 탈취된 건 아닌지?        -> 서명 검증 없음
  이 토큰이 우리 앱용인지?           -> aud 없음
  사용자 정보 API 응답이 진짜인지?    -> 보장 없음
```

근데 표준화된 보안 보장이 없다

<br/>

---

### 참고

- [RFC 6749 - The OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749)

---

---

## 그럼 OAuth2에 안전한 로그인을 추가할 순 없나?

### OAuth2 + 인증 = OIDC

OAuth2를 로그인에 쓰는 건 되긴 했는데 표준이 없고 보안 위험이 있었다

그래서 OAuth2로 로그인을 안전하게 하는 표준을 만든 게 OIDC다

<br/>

#### 일단 OIDC 가 뭘까?

**OpenID Connect**의 약자다

```
2005년   OpenID 1.0 등장
		여러 사이트에서 하나의 신원으로 로그인하자
			→ 근데 보안 문제 많았고 잘 안 퍼짐

2012년   OAuth 2.0 등장
		비밀번호 안 주고 권한만 위임하자
			→ 구글, 페이스북이 채택하면서 급속도로 퍼짐

2014년   OpenID Connect 등장
		OAuth2가 이미 다 퍼졌으니 그 위에 신원 확인만 추가로 하자
			→ ID Token 추가
```

OAuth2로 토큰 받는 김에, 신원 증명(ID Token)도 같이 받자는 표준이다

<br/>

OAuth2의 access token은 권한에 대한 정보였다

OIDC는 여기에 `ID Token` 이라는 JWT 를 추가로 준다

이 `ID Token` 에 요청자가 누구인지에 대한 정보가 담겨있다

```
OAuth2  : access token  -> "이거 할 권한 있음"
OIDC    : ID Token       -> "이 사람은 sub=000123 이 사람임"
```

<br/>

❓ **이메일을 주면 식별이 되지 않나?**

이메일은 변경 위험이 있기 때문에 고유한 식별값을 따로 두는 것이다

<br/>

---

### 애플 로그인은 어느 쪽인가?

애플 로그인은 OIDC 기반이다

그럼 `Spring Security OAuth2 Client` 써서 구현하면 되려나? 싶었다

그리고 실제로 대부분은 된다

<br/>

✨ **Spring OAuth2 Client 자동 처리**

- 애플 로그인 페이지로 리다이렉트
- code 받아서 토큰으로 교환
- ID Token 파싱, 사용자 정보 추출


<br/>

근데 이와 다른 애플만의 비표준 동작 몇가지가 있다

⚠️ **client_secret을 JWT로 직접 만들어 서명해야 함**

애플 서버에서 인증/인가 요청을 어떤 서버가 보내고 있는지 알 필요가 있다

이때 필요한게 `client_secret` 이다

일반 OAuth2는 발급받은 고정 문자열을 그냥 쓴다

근데 애플은 요청할 때마다 JWT를 직접 생성하고 서명해서 client_secret 자리에 넣어야 한다

Spring은 고정값을 쓰는 걸로 설계되어 있어서 이 부분은 직접 처리해야 한다

```
일반 : client_secret = "abc123xyz"           ← 고정 문자열 복붙
애플  : client_secret = JWT { 발급시각, 만료시각, 서명 }   ← 매 요청마다 새로 생성
```

<br/>

⚠️ **이메일을 첫 로그인 때만 줌**

```
1회차 로그인 : { sub: "000123", email: "user@gmail.com" }
2회차 로그인 : { sub: "000123" }   ← email 없음
```

그래서 첫 로그인 때 반드시 DB에 저장해둬야 한다

<br/>

⚠️ **재로그인 시 응답 형태가 표준과 다름**

```
표준 OIDC    : 매번 code → 서버가 토큰으로 교환
애플 재로그인 : 이미 인증된 사용자면 바로 id_token만 줌 (code 교환 생략)
```

Spring은 항상 code를 받아서 교환하는 흐름을 가정해서 이 경우를 직접 처리해야 함

<br/>

---

### 결론

지금은 공식문서 기반으로 직접 구현했다

나중에 다른 소셜 로그인(구글 등)을 추가해보고 Spring OAuth2 Client 흐름에 익숙해지면  
비표준 3가지만 쏙쏙 대체하는 방식으로도 고민해볼 예정이다

<br/>

### 참고

- [OpenID Connect - How Connect Works](https://openid.net/developers/how-connect-works/)
- [OpenID Connect Core 1.0 - ID Token](https://openid.net/specs/openid-connect-core-1_0.html#IDToken)

---

---

## Swift와 Spring 구현

### 전체 흐름

```
[1] Swift 앱 -> Apple : 로그인 요청 (nonce 포함)
[2] Apple -> Swift 앱 : identityToken (ID Token, JWT) 발급
[3] Swift 앱 -> 우리 서버 : identityToken 전달
[4] 우리 서버 -> Apple 공개키로 서명 검증 + 클레임 검증
[5] 검증 통과 -> sub로 회원 식별 -> 우리 서비스 JWT 발급
```

<br/>

---
### Swift 구현

`AuthenticationServices` 프레임워크의 `ASAuthorizationAppleIDProvider`를 쓴다

```swift
import AuthenticationServices

let provider = ASAuthorizationAppleIDProvider()
let request = provider.createRequest()
request.requestedScopes = [.fullName, .email]
request.nonce = sha256(rawNonce)   // 재전송 공격 방지용

let controller = ASAuthorizationController(authorizationRequests: [request])
controller.delegate = self
controller.performRequests()
```

콜백에서 identityToken을 꺼내 서버로 보낸다

```swift
func authorizationController(controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization) {
    guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
          let tokenData = credential.identityToken,
          let token = String(data: tokenData, encoding: .utf8) else { return }

    // token(JWT)을 우리 서버로 POST
}
```

<br/>

---
### Spring (서버) 구현

identityToken(JWT)을 믿어도 되는지 검증한다

<br/>

✨ **공개키는 애플에서 받아온다**

```
GET https://appleid.apple.com/auth/keys
```

JWKS 형태로 공개키가 여러 개 온다

```json
{
  "keys": [
    {
      "kty": "RSA",
      "kid": "W6WcOKB",
      "use": "sig",
      "alg": "RS256",
      "n": "2Zc5d0...(엄청 긴 문자열)",
      "e": "AQAB"
    },
    {
      "kty": "RSA",
      "kid": "fh6Bs8C",
      "use": "sig",
      "alg": "RS256",
      "n": "pZc3d1...(엄청 긴 문자열)",
      "e": "AQAB"
    }
  ]
}
```

ID Token Header 에서 `kid` 의 값과 일치하는 키를 고른다
그리고 `n`, `e` 값으로 RSA 공개키를 만들고,  
이 공개키로 ID Token 서명을 `RS256` 으로 서명 검증(위조/변조 검증)한다

<br/>

검증할 클레임은 네 가지다

```
iss == https://appleid.apple.com   // 발급자가 애플인가
aud == 내 앱 bundle id              // 내 앱한테 발급된 게 맞나
exp 만료 안 됨                       // 10분 유효
nonce 일치                          // 내가 보낸 요청에 대한 응답인가
```

<br/>

검증을 통과하면 payload의 `sub`로 회원을 식별하고

우리 서비스 자체 JWT를 발급해서 이후 인증에 쓴다

<br/>

---

### 참고

- [Implementing User Authentication with Sign in with Apple (Swift)](https://developer.apple.com/documentation/authenticationservices/implementing-user-authentication-with-sign-in-with-apple)
- [Sign in with Apple REST API - Verifying a User](https://developer.apple.com/documentation/signinwithapplerestapi/verifying-a-user)
- [Fetch Apple's public key (JWKS)](https://developer.apple.com/documentation/signinwithapplerestapi/fetch-apple-s-public-key-for-verifying-token-signature)
- [Generate and validate tokens](https://developer.apple.com/documentation/signinwithapplerestapi/generate-and-validate-tokens)

---

---

## 내 기준

### 핵심 흐름

```
심사 4.8        -> 소셜 로그인 쓰면 프라이버시 대체 로그인 필수
                   -> 애플 로그인이 표준 답

OAuth2          -> 인가(권한 위임), 로그인용 아님
OIDC            -> OAuth2 + ID Token(신원 증명) = 로그인용
애플 로그인      -> OIDC 기반, 단 비표준 동작 있음

서버가 할 일     -> ID Token을 애플 공개키로 검증 -> sub로 식별
```


<br/>

### 이번에 세운 기준

✨ **소셜 로그인 = OAuth2 라고 모호하게 표현하지 않는다**

✨ **로그인은 OIDC, 권한 위임은 OAuth2로 구분한다**

✨ **라이브러리를 쓰기 전에 이 라이브러리가 표준 OIDC를 가정하는가를 먼저 확인한다**

✨ **인증 토큰을 받으면 발급자/대상/만료/서명을 검증한다**


<br/>

소셜 로그인의 구조를 라이브러리가 전부 지원해주지 않는다

라이브러리가 안 맞으면 공식문서 기반으로 프로토콜을 직접 이해하며 구현해야 할 필요가 있다
