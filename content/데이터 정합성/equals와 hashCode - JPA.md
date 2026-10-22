---
title: "equals와 hashCode - JPA"
date: 2026-06-08
area: hard-skill
category: "데이터 정합성"
project: "Salmonbus"
tags:
  - "JPA"
  - "Hibernate"
  - "Java"
aliases:
  - "04. 쌍둥이와 앱 개발기/SBI/equals와 hashCode - JPA/01. 발단"
draft: true
---

## 발단

JPA 엔티티를 컬렉션에 담거나 비교할 때 `equals`와 `hashCode`를 어떻게 구현해야 할까?

Hibernate proxy, null id 처리, 1차 캐시 동일성 보장이 얽혀있다
