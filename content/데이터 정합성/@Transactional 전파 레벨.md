---
title: "@Transactional 전파 레벨"
date: 2026-06-08
area: hard-skill
category: "데이터 정합성"
project: "Salmonbus"
tags:
  - "Spring"
  - "트랜잭션"
  - "JPA"
aliases:
  - "04. 쌍둥이와 앱 개발기/SBI/@Transactional 전파 레벨/01. 발단"
draft: true
---

## 발단

MOCK 환경에서 테스트 클래스에 `@Transactional`을 달았을 때, 서비스의 `@Transactional`이 테스트 트랜잭션에 합류한다는 걸 알게 됐다

왜 합류하는 걸까? 전파 레벨이 어떻게 동작하는 걸까?
