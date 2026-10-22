---
title: "로그인할 때마다 DB Full Scan을 하고 있다?"
date: 2026-06-30
area: hard-skill
category: "성능·확장성"
project: "Salmonbus"
tags:
  - "DB"
  - "인덱스"
  - "성능"
aliases:
  - "04. 쌍둥이와 앱 개발기/SBI/로그인할 때마다 db full scan을 하고있다?/01. 발단"
  - "04. 쌍둥이와 앱 개발기/SBI/로그인할 때마다 db full scan을 하고있다?/02. Full Scan이란"
  - "04. 쌍둥이와 앱 개발기/SBI/로그인할 때마다 db full scan을 하고있다?/03. B-Tree와 디스크 IO"
  - "04. 쌍둥이와 앱 개발기/SBI/로그인할 때마다 db full scan을 하고있다?/04. Cardinality와 Selectivity"
  - "04. 쌍둥이와 앱 개발기/SBI/로그인할 때마다 db full scan을 하고있다?/05. Covering Index"
  - "04. 쌍둥이와 앱 개발기/SBI/로그인할 때마다 db full scan을 하고있다?/06. 내 기준"
draft: true
---

## 발단

인덱스 개념을 공부하던 중에 내 프로젝트는 어떻게 굴러가나 궁금했다

가장 최근 PR 에서 소셜 로그인을 구현했고,  
매번 로그인할 때마다 `memberRepository.findBySocialId`가 호출되는 구조였다

<br/>

목데이터 10,000건 정도 넣어놓고 EXPLAIN ANALYZE 를 돌렸더니 **15.9ms**가 나왔다

```
-> Filter: (`member`.social_id = 'apple.user000100')  (cost=1003 rows=1) (actual time=6.02..15.9 rows=1 loops=1)
-> Table scan on member  (cost=1003 rows=9791) (actual time=1.41..8.46 rows=10000 loops=1)
```

### 💬 EXPLAIN ANALYZE 출력 키워드 분석

```
-> Filter: (social_id = 'apple.user000100')  (cost=1003 rows=1) (actual time=6.02..15.9 rows=1 loops=1)
-> Table scan on member                       (cost=1003 rows=9791) (actual time=1.41..8.46 rows=10000 loops=1)
```

| 키워드 | 의미 |
|---|---|
| `cost=1003` | 옵티마이저가 예측한 비용 (단위는 임의적, 절댓값보다 상대 비교용) |
| `rows=9791` | 옵티마이저 예측 스캔 행 수 (통계 기반 추정값) |
| `actual time=1.41..8.46` | 첫 번째 행을 반환하기까지 1.41ms, 전체 완료까지 8.46ms |
| `rows=10000` | 실제로 스캔한 행 수 |
| `loops=1` | 이 단계가 실행된 횟수 (중첩 루프 조인에서 여러 번 실행될 수 있음) |

위 출력에서 두 줄이 있는 이유 - 옵티마이저가 실행을 두 단계로 나눴다

1. `Table scan on member` - 테이블 전체를 읽는다 (10,000행 스캔)
2. `Filter` - 읽은 행 중 social_id 조건에 맞는 것만 추린다 (1행 반환)

이 조회는...분명 Full Scan 일 것이다..

---

다음으로 이동 -> [[02. Full Scan이란]]

## Full Scan이란

## DB는 값을 어떻게 찾는가?

인덱스가 없으면 DB는 첫 번째 행부터 마지막 행까지 전부 읽는다

이것이 Full Scan이다

<br/>

MySQL은 데이터를 디스크에 **페이지** 단위로 저장한다 (InnoDB 기준 1페이지 = 16KB)

Full Scan은 이 페이지를 처음부터 끝까지 순서대로 다 읽는다

<br/>

💬 **아까처럼 아무런 조치 없이 select * from member where social_id = 'apple.xxx' 를 하면 어떻게 될까?**

10,000 명의 회원이 있다면 10,000명 전체를 읽는다

<br/>

---

## 💬 내 쿼리가 어떻게 돌아가는지 확인하는 방법?

몇명을 읽고 어떻게 동작하는지는 어떻게 확인할 수 있을까?

✨ **쿼리 앞에 EXPLAIN 을 붙이면 된다**

```sql
EXPLAIN SELECT * FROM member WHERE social_id = 'apple.user001';
```


<br/>

```
+----+-------------+--------+------------+------+---------------+------+---------+------+------+----------+-------------+
| id | select_type | table  | partitions | type | possible_keys | key  | key_len | ref  | rows | filtered | Extra       |
+----+-------------+--------+------------+------+---------------+------+---------+------+------+----------+-------------+
|  1 | SIMPLE      | member | NULL       | ALL  | NULL          | NULL | NULL    | NULL | 9791 |     0.01 | Using where |
+----+-------------+--------+------------+------+---------------+------+---------+------+------+----------+-------------+
1 row in set, 1 warning (0.06 sec)
```

| 컬럼    | 인덱스 없음      | 인덱스 있음               |
| ----- | ----------- | -------------------- |
| type  | ALL         | ref                  |
| key   | NULL        | idx_member_social_id |
| rows  | 10000       | 1                    |
| Extra | Using where | NULL                 |

`ALL`이 보이면 Full Scan이다

<br/>

❓ **잠만, type 등급엔 어떤게 있을까?**

| type   | 의미                                                | 예시                          |
| ------ | ------------------------------------------------- | --------------------------- |
| ALL    | Full Table Scan - 전체 행을 읽는다                       | 인덱스 없는 WHERE 조건             |
| index  | Full Index Scan - 인덱스 전체를 읽는다. ALL보다는 작지만 여전히 느리다 | ORDER BY indexed_col        |
| range  | 인덱스 범위 스캔 - 특정 범위만 읽는다                            | WHERE id > 100, BETWEEN, IN |
| ref    | 비고유 인덱스로 동등 조건 조회                                 | WHERE social_id = ?         |
| eq_ref | 조인에서 PK나 Unique 인덱스로 정확히 1행 매칭                    | JOIN ON a.id = b.id         |
| const  | PK나 Unique 인덱스로 상수 조건 - 1행이 보장된다                  | WHERE id = 1                |

### 💬 "인덱스를 안 탄다"는 것의 의미

EXPLAIN에서 `key = NULL`이거나 `type = ALL`이면 인덱스를 안 탄 것이다

인덱스가 존재해도 옵티마이저가 사용하지 않기로 판단하면 안 탄다

Cardinality가 낮아 Full Scan이 더 빠르다고 판단하거나, 함수/형변환으로 인덱스 키와 값이 달라지거나, Leftmost Prefix Rule을 위반한 경우가 대표적이다

<br/>

### 💬 type 등급 각각 어떤 상황인가?

- `ALL` - 인덱스 없이 `WHERE social_id = ?` 처럼 인덱스 없는 컬럼 조회
- `index` - `ORDER BY id` 처럼 정렬 목적으로 인덱스 전체를 순회할 때
- `range` - `WHERE id BETWEEN 1 AND 100` 또는 `WHERE expires_at > NOW()` 처럼 범위 조회
- `ref` - `WHERE social_id = 'apple.xxx'` 처럼 비고유 인덱스로 동등 조건 조회
- `eq_ref` - `JOIN ON a.member_id = b.id` 처럼 조인에서 상대 테이블의 PK/Unique로 1건 매칭
- `const` - `WHERE id = 5` 처럼 PK나 Unique 인덱스로 상수와 비교해 1건이 보장될 때


<br/>

### 💬 rows가 실제 데이터 수와 다른 이유는?

EXPLAIN을 돌렸을 때 실제 10,000건인데 `rows: 9791`이 나왔다

EXPLAIN의 `rows`는 정확한 카운트가 아니라 **InnoDB 통계 기반 추정값**이다

InnoDB는 전체 테이블을 직접 세는 대신 일부 페이지를 샘플링해서 행 수를 계산한다

매번 정확한 카운트를 하려면 그 자체가 Full Scan이기 때문이다

```sql
-- 통계를 다시 수집해서 추정값을 실제 값에 가깝게 맞춘다
ANALYZE TABLE member;
```

<br/>

⚠️ **EXPLAIN의 rows로 성능을 단정짓지 않는다**

추정값이라 오차가 있다 - 옵티마이저의 실행 계획 판단 근거로만 참고한다

실제 실행 시간과 스캔 행 수를 보려면 `EXPLAIN ANALYZE`를 쓴다

```sql
-- actual time과 실제 rows를 함께 보여준다
EXPLAIN ANALYZE SELECT * FROM member WHERE social_id = 'apple.user000100';
```

<br/>

### 💬 Extra 컬럼엔 뭐가 있을까?

| Extra           | 의미                                          |
| --------------- | ------------------------------------------- |
| Using where     | WHERE 절로 행을 필터링한다                           |
| Using index     | Covering Index - 테이블 접근 없이 인덱스만 읽는다         |
| Using filesort  | 인덱스로 정렬할 수 없어 별도 정렬 작업이 발생한다                |
| Using temporary | 임시 테이블을 만들어 처리한다. GROUP BY, DISTINCT 등에서 발생 |
| NULL            | 특이사항 없음                                     |

Extra 의 의미? 인덱스를 타고나서 추가작업을 뭘 했는가? 인지?

짱


---

❓ **인덱스를 걸면 왜 빨라지는가**

다음으로 이동 -> [[03. B-Tree와 디스크 IO]]

## B-Tree와 디스크 IO

## 인덱스를 걸면 왜 빨라지는가?

인덱스는 B-Tree 구조로 컬럼 값을 정렬해서 별도로 저장한다

찾을 때 트리를 타고 내려가면 O(log N)으로 끝난다

Full Scan이 O(N)인 것과 비교하면 데이터가 많을수록 차이가 커진다

```
          'apple.user500'
         /               \
'apple.user250'     'apple.user750'
    /      \             /      \
...        ...         ...      ...
```

### 💬 B-Tree 탐색할 때 노드 이동마다 I/O가 발생하나?

이론적으로는 각 레벨 이동마다 1번의 I/O다

B-Tree 깊이가 3이면 최대 3번의 I/O

하지만 실제로는 InnoDB **Buffer Pool** (메모리 캐시) 덕분에 훨씬 적다

자주 접근하는 페이지는 Buffer Pool에 올라와 있어서 디스크를 읽지 않는다

Root 노드와 상위 노드는 거의 항상 Buffer Pool에 있어 실질적으로 1-2번의 disk I/O로 끝나는 경우가 많다

<br/>

### 💬 Clustered Index란?

InnoDB에서 PK는 특별하다

데이터 자체가 PK 순서대로 정렬되어 디스크에 저장된다 -> 이게 Clustered Index다

`WHERE id = 5`는 B-Tree 탐색 후 바로 그 페이지에 데이터가 있다 -> Random I/O가 없다


### 💬 Clustered Index에서 id=5를 찾을 때 Random I/O가 없는 이유

"pk 5의 위치를 모르니까 Random I/O가 발생하지 않을까?" 라는 의문이 들 수 있다

B-Tree 탐색 자체가 그 위치를 찾는 과정이다 - 탐색이 끝나면 리프 노드를 알게 된다

핵심은 **Clustered Index에서 리프 노드 = 실제 데이터**라는 점이다

```
Clustered Index (PK B-Tree)
Root → Branch → Leaf(id=5의 실제 row 데이터)
                  ↑
              여기가 데이터 자체
```

B-Tree를 타고 내려가면 리프 노드에 실제 row가 있다 -> 추가 I/O 없음

<br/>

반면 Secondary Index는 다르다

```
Secondary Index (social_id B-Tree)
Root → Branch → Leaf(social_id값, PK=5)
                       ↑
                   PK만 있음, 실제 데이터 없음
                   -> PK=5로 Clustered Index를 다시 탐색해야 함
                   -> 이 두 번째 탐색이 Random I/O
```

Random I/O는 "인덱스 탐색 후 다시 다른 곳에서 데이터를 가져와야 할 때" 발생한다

Clustered Index는 리프 노드에 데이터가 있으니 추가 탐색이 없다


<br/>

Secondary Index (social_id 같은 것)는 B-Tree에서 PK를 먼저 찾고, 그 PK로 Clustered Index를 한 번 더 탐색해서 실제 데이터를 가져온다

이 두 번째 탐색을 **PK 룩업**이라 한다

```
Secondary Index (social_id B-Tree)
-> social_id 값 찾기 -> PK(id) 획득
-> Clustered Index (PK B-Tree)
-> 실제 row 반환
```

---

❓ **인덱스를 걸어도 오히려 느려지는 경우가 있을까**

다음으로 이동 -> [[04. Cardinality와 Selectivity]]

## Cardinality와 Selectivity

## 인덱스를 걸면 항상 빠를까?

`login_provider`에 인덱스를 걸었더니 EXPLAIN에서 `type: ref`가 나왔다

그런데 `rows: 10000`이었다

인덱스를 탔는데 왜 full scan 이랑 차이가 없을까?

<br/>

⚠️ **Cardinality가 낮은 컬럼의 인덱스는 오히려 느릴 수 있다**

우선 개념을 먼저 정리해보자

**Cardinality** - 컬럼에 존재하는 distinct 값의 수  
예를 들어, login_provider 는 apple, google, kakao 3개라서 distinct 가 3이다

**Selectivity** - Cardinality ÷ 전체 행 수 * 100
선택도 라고 하며, % 로 표현한다


```sql
SHOW INDEX FROM member;
-- Cardinality 컬럼으로 각 인덱스의 선택도 확인
```

| 컬럼             | Cardinality | Selectivity | 결과               |
| -------------- | ----------- | ----------- | ---------------- |
| social_id      | 10,000      | 100%        | 1행 반환 -> 효과적     |
| login_provider | 3           | 0.0003%     | 3,333행 반환 -> 무의미 |

<br/>

### 💬 왜 낮은 Cardinality 인덱스가 오히려 느린가?

디스크 I/O는 두 종류다

✨ **Sequential I/O** - 페이지를 순서대로 읽는다

Full Scan이 하는 방식이다. OS가 다음 페이지를 미리 올려놓는다 (Read-Ahead)

<br/>

✨ **Random I/O** - 인덱스가 가리키는 위치를 여기저기서 점프하며 읽는다

인덱스는 `social_id` 기준으로 정렬되어 있지만, 실제 데이터 파일에서 행들은 삽입 순서로 흩어져 있다  
인덱스가 알려주는 위치를 하나씩 점프하며 읽어야 한다

`login_provider = 'APPLE'`이면 3,333행을 Random I/O로 점프하며 읽어야 한다

전체 페이지를 Sequential하게 읽는 Full Scan이 이 경우엔 더 빠르다

<br/>

Sequential 하게 읽을지, 인덱스를 타서 Random IO 로 읽을지는 옵티마이저가 최적화하는 방식에 달려있다

이렇게 옵티마이저가 Cardinality를 보고 인덱스 쓰면 손해다 판단하면 인덱스를 무시한다

---

❓ **PK 룩업 자체를 없앨 수는 없을까**

다음으로 이동 -> [[05. Covering Index]]

## Covering Index

## PK 룩업 자체를 없애려면?

인덱스 탐색 후 PK 룩업 -> 실제 행 가져오기 단계에서 Random I/O가 발생한다

SELECT에 필요한 컬럼이 전부 인덱스 안에 있으면 이 단계를 건너뛸 수 있다

이게 Covering Index다

<br/>

✨ **InnoDB Secondary Index는 (인덱스 컬럼, PK)를 함께 저장한다**

`social_id` 인덱스는 내부적으로 `(social_id, id)`를 저장하고 있다

`SELECT id FROM member WHERE social_id = ?`는 인덱스만 읽고 끝난다 -> PK 룩업 없음

JWT 발급에 필요한 건 `id` 하나뿐이라 이 방식을 딱 적용할 수 있었다

```sql
-- Covering Index - Extra: Using index
EXPLAIN ANALYZE SELECT id FROM member WHERE social_id = 'apple.user000100';
-- actual time=0.057ms

-- 일반 Index 조회 - Extra: NULL (PK 룩업 발생)
EXPLAIN ANALYZE SELECT * FROM member WHERE social_id = 'apple.user000100';
-- actual time=0.168ms

-- Full Scan 비교 (IGNORE INDEX)
EXPLAIN ANALYZE SELECT * FROM member IGNORE INDEX (idx_member_social_id)
WHERE social_id = 'apple.user000100';
-- actual time=15.9ms, rows=10000
```

### 💬 기존 findBySocialId는 왜 entity를 반환했나?

기존 코드의 `findBySocialId`는 `Optional<MemberJpaEntity>` - 전체 엔티티를 반환했다

Spring Data JPA의 `findBy...` 메서드는 기본적으로 선언된 엔티티 타입을 반환하기 때문이다

기존에는 회원 존재 여부 확인뿐 아니라 이름, 이메일 등 전체 정보가 필요한 흐름이 있었다

하지만 JWT 발급에는 `id`만 필요하다는 걸 파악했고, `@Query`로 id만 반환하는 `findIdBySocialId`로 변경했다

```java
// 변경 전 - 전체 엔티티 반환 (SELECT * → PK 룩업 발생)
Optional<MemberJpaEntity> findBySocialId(String socialId);

// 변경 후 - id만 반환 (Covering Index 활용)
@Query("SELECT m.id FROM MemberJpaEntity m WHERE m.socialId = :socialId")
Optional<Long> findIdBySocialId(String socialId);
```

<br/>

인덱스에 없는 컬럼이 하나라도 있으면 무조건 PK 룩업이 발생한다

EXPLAIN Extra에 `Using index`가 뜨면 Covering Index가 작동한 것이다

---

다음으로 이동 -> [[04. 쌍둥이와 앱 개발기/SBI/로그인할 때마다 db full scan을 하고있다?/06. 내 기준|06. 내 기준]]

## 내 기준

```
조회 쿼리 발생
    |
    v
Cardinality 높은가? (Selectivity > ~10%)
    |
   YES -> 조회 빈도 높은가?
              |
             YES -> 인덱스 건다
              |
              NO -> 인덱스 안 건다 (쓰기 오버헤드만 생김)
    |
    NO -> 인덱스 안 건다 (Full Scan이 더 빠를 수 있음)
              |
              v
         SELECT 컬럼이 인덱스 안에 있는가?
              |
             YES -> Covering Index로 설계 (PK 룩업 제거)
```

<br/>

> Cardinality 높고 조회 빈도 높은 컬럼에만 인덱스를 건다
> 
> SELECT 컬럼을 인덱스 안으로 좁히면 PK 룩업까지 없앨 수 있다

<br/>

❓ **실전 체크리스트**

- EXPLAIN에서 `type = ALL`이 보이면 Full Scan이다 - 인덱스 후보를 검토한다
- `rows`가 크면 인덱스가 있어도 효과가 없다는 뜻이다 - Cardinality를 확인한다
- `key = NULL`이면 인덱스를 안 탄 것이다 - 쿼리 조건과 인덱스 컬럼이 일치하는지 확인한다
- 복합 인덱스에서 첫 번째 컬럼 없이 두 번째 컬럼만 조건에 쓰면 인덱스를 못 탄다
- `Extra: Using index`가 뜨면 Covering Index다 - PK 룩업이 없다
- `SELECT *`는 Covering Index를 깨뜨린다 - 필요한 컬럼만 SELECT한다
- 인덱스는 쓰기(INSERT/UPDATE/DELETE)마다 B-Tree를 갱신하는 오버헤드가 있다 - 남발하지 않는다
