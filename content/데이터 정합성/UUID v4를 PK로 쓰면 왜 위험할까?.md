---
title: "UUID v4를 PK로 쓰면 왜 위험할까?"
date: 2026-06-30
area: hard-skill
category: "데이터 정합성"
tags:
  - "DB"
  - "UUID"
  - "인덱스"
aliases:
  - "02. 고민/Java/UUID v4를 PK로 쓰면 왜 위험할까?/01. 페이지 분할이란"
  - "02. 고민/Java/UUID v4를 PK로 쓰면 왜 위험할까?/02. UUID v4 vs v7 vs AUTO_INCREMENT"
  - "02. 고민/Java/UUID v4를 PK로 쓰면 왜 위험할까?/03. 내 기준"
draft: true
---

## 페이지 분할이란

> B-Tree 리프 노드가 꽉 찬 상태에서 중간에 INSERT하면 페이지를 쪼개야 한다. 이게 Page Split이다

---

## 왜 일어나는가

InnoDB는 데이터를 16KB 페이지 단위로 저장한다

리프 노드 하나가 꽉 찼는데 중간에 값을 넣어야 하면 페이지를 분할한다

```
[Before] 꽉 찬 리프 노드
┌─────────────────────────┐
│ 10 | 20 | 30 | 40 | 50 │
└─────────────────────────┘

INSERT 35

[After] 중간값(30)을 부모로 올리고 분할
            ┌────┐
            │ 30 │
            └────┘
           /      \
┌──────────┐    ┌───────────┐
│ 10 | 20  │    │ 35 | 40 | 50 │
└──────────┘    └───────────┘
```

분할된 페이지는 절반이 비어있다 -> 이게 단편화(Fragmentation)다

<br/>

## AUTO_INCREMENT는 왜 Page Split이 적은가

항상 B-Tree 맨 오른쪽 끝에 추가된다

```
[1] → [2] → [3] → ... → [N] → [새 페이지]
```

기존 페이지를 쪼갤 일 없이 오른쪽에 페이지를 붙이면 끝난다

다음으로 이동 -> [[02. UUID v4 vs v7 vs AUTO_INCREMENT]]

## UUID v4 vs v7 vs AUTO_INCREMENT

## UUID v4가 위험한 이유

UUID v4는 완전 랜덤이다

INSERT할 때마다 B-Tree의 임의 위치에 꽂힌다

```
INSERT 'f47ac10b...'  →  중간 어딘가
INSERT '550e8400...'  →  앞쪽 어딘가
INSERT '6ba7b810...'  →  뒤쪽 어딘가
```

기존 페이지가 꽉 찬 상태에서 중간에 꽂히면 Page Split 발생

10만 건을 넣으면 10만 번 랜덤 INSERT -> Page Split 누적 -> 단편화 심화

⚠️ **단편화가 쌓이면 실제 데이터보다 훨씬 많은 디스크 공간을 쓰고, 같은 데이터를 읽는 데 더 많은 I/O가 발생한다**

<br/>

## 세 가지 비교

| | AUTO_INCREMENT | UUID v4 | UUID v7 |
|---|---|---|---|
| 크기 | 8 bytes | 16 bytes | 16 bytes |
| 정렬 | 순차 | 랜덤 | 시간순 정렬 |
| Page Split | 거의 없음 | 매번 | 거의 없음 |
| 전역 유일성 | DB 단위만 | 어디서나 | 어디서나 |
| 예측 가능성 | 순차 노출 | 예측 불가 | 예측 불가 |
| ID 선생성 | 불가 | 가능 | 가능 |

<br/>

### 💬 UUID v7이 v4보다 나은 이유

UUID v7은 앞부분에 타임스탬프가 포함되어 있어 시간순으로 정렬된다

INSERT가 항상 오른쪽 끝에 추가되므로 Page Split이 발생하지 않는다

v4의 전역 유일성 장점은 유지하면서 Page Split 문제를 해결한다

<br/>

### 💬 UUID v7 vs AUTO_INCREMENT 트레이드오프

✨ **UUID v7을 선택할 때** - 분산 시스템(여러 DB 서버, 마이크로서비스) / 보안상 순차 ID 노출을 피하고 싶을 때 / 앱에서 ID를 미리 생성해야 할 때

⚠️ **UUID v7의 단점** - 16 bytes로 BIGINT보다 2배 크다 -> 모든 Secondary Index 크기도 2배

다음으로 이동 -> [[02. 고민/Java/UUID v4를 PK로 쓰면 왜 위험할까?/03. 내 기준|03. 내 기준]]

## 내 기준

> 단일 DB + 내부 API면 AUTO_INCREMENT. 분산 환경이거나 ID를 외부에 노출해야 한다면 UUID v7

---

❓ 실전 체크리스트

- UUID v4를 PK로 쓰고 있다면 -> Page Split과 단편화를 의심한다
- 분산 DB 없이 단일 MySQL이면 AUTO_INCREMENT가 성능상 우위
- UUID가 필요한 경우 v4 대신 v7을 선택한다 (Page Split 없음)
- UUID를 쓴다면 VARCHAR(36) 대신 BINARY(16)으로 저장한다 (인덱스 크기 절감)
