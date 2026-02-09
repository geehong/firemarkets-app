# FireMarkets 애드센스 승인 코드 조사 보고서

> **작성일:** 2026년 2월 9일  
> **조사 범위:** `frontend/src` 전체 코드베이스

---

## 🔍 조사 결과 요약

| 항목 | 상태 | 비고 |
|------|:----:|------|
| About Us 페이지 | ❌ **없음** | `/about` 경로 미존재 |
| Contact 페이지 | ❌ **없음** | `/contact` 경로 미존재 |
| 투자 면책조항 (Footer) | ❌ **없음** | `AppFooter.tsx`에 미포함 |
| Coming Soon 페이지 | ⚠️ **2개** | Admin 전용 (일반 유저 접근 불가) |
| No Data 메시지 | ⚠️ **12개** | 데이터 없을 시 표시되는 컴포넌트들 |
| robots.txt | ✅ 정상 | 적절히 구현됨 |
| sitemap.xml | ✅ 정상 | 동적 생성, 잘 구현됨 |
| 블로그 SSR | ✅ 정상 | `generateMetadata` 사용 중 |
| 다국어 (i18n) | ✅ 정상 | ko/en 모두 241줄로 동일 |

---

## 1. 🚨 즉시 조치 필요 사항

### 1.1 About Us 페이지 없음

**조사 결과:** `/about` 또는 `/about-us` 경로가 존재하지 않습니다.

```
find_by_name 결과: 0개 파일 발견
SearchDirectory: /home/geehong/firemarkets-app/frontend/src/app
Pattern: *about*
```

**수정 필요:**
- `frontend/src/app/[locale]/(service)/about/page.tsx` 신규 생성 필요
- 사이트 목적, 운영팀 소개, 전문성 기술

---

### 1.2 Contact 페이지 없음

**조사 결과:** `/contact` 경로가 존재하지 않습니다.

```
find_by_name 결과: 0개 파일 발견
SearchDirectory: /home/geehong/firemarkets-app/frontend/src/app
Pattern: *contact*
```

**수정 필요:**
- `frontend/src/app/[locale]/(service)/contact/page.tsx` 신규 생성 필요
- 이메일 주소 또는 문의 폼 포함

---

### 1.3 AppFooter.tsx에 투자 면책조항 없음

**조사 파일:** `frontend/src/layout/AppFooter.tsx` (94줄)

**현재 상태:**
```tsx
// 현재 Footer 내용 (line 22-24)
<span className="text-sm text-gray-500 dark:text-gray-400">
    © {currentYear} FireMarkets. All rights reserved.
</span>
```

> [!WARNING]
> 투자 면책조항(Disclaimer)이 전혀 포함되어 있지 않습니다.  
> 금융(YMYL) 사이트에서 필수 요소입니다.

**수정 필요:** 아래 내용을 Footer에 추가
```tsx
<p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center md:text-left">
    본 사이트의 정보는 투자 권유가 아니며, 투자 손실에 대한 책임을 지지 않습니다.
    <br className="hidden md:block" />
    This is not financial advice. We are not responsible for any investment losses.
</p>
```

---

## 2. ⚠️ 주의 필요 사항

### 2.1 "Coming Soon" 페이지 발견 (2개)

**발견 위치:**

| 파일 경로 | 내용 |
|----------|------|
| `admin/post/category/page.tsx` | "Category management features are currently under development." |
| `admin/config/user/page.tsx` | Coming Soon 텍스트 |

**위험도:** 🟡 **낮음**
- 이 페이지들은 **Admin 전용** (로그인 + 관리자 권한 필요)
- 일반 사용자 및 검색봇 접근 불가
- 사이드바에서 `roles: ['admin', 'super_admin']` 조건으로 필터링됨

**권장 조치:**
- 현재 상태 유지 가능 (Admin 전용이므로)
- 또는 해당 메뉴를 AppSidebar.tsx에서 주석 처리

---

### 2.2 "No Data" 메시지가 표시될 수 있는 컴포넌트 (12개)

**발견된 파일들:**

| 파일 | 라인 | 표시 메시지 |
|------|------|-------------|
| `components/assets/FinancialsTab.tsx` | 388 | "No data available for this section" |
| `components/tables/SparklineTable.tsx` | 48, 667 | "No data", "No data available" |
| `components/tables/TableBase.tsx` | 46 | emptyMessage 기본값 "No data" |
| `components/tables/RealtimePriceTable.tsx` | 358 | "No data available" |
| `components/charts/onchaincharts/OnChainChart.tsx` | 807 | "데이터가 없습니다." / "No data available." |
| `components/analysis/quantitative/QuantitativePairTrading.tsx` | 64 | "No data available for selected pair." |
| `components/analysis/speculative/FearAndGreedGauge.tsx` | 64 | label: 'No Data' (fallback) |
| `components/analysis/views/FundamentalAnalysisView.tsx` | 12 | "No Data Available" |

**위험도:** 🟡 **중간**
- 실제 데이터가 있으면 표시되지 않음
- 데이터베이스에 데이터가 충분히 채워져 있는지 확인 필요

**권장 조치:**
1. 모든 주요 자산에 OHLCV 데이터가 있는지 확인
2. 빈 데이터 발생 시 "데이터 로딩 중" 또는 해당 섹션 숨기기 고려

---

## 3. ✅ 정상 확인된 항목

### 3.1 robots.ts

**파일:** `frontend/src/app/robots.ts` (13줄)

```typescript
export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: '/private/',
        },
        sitemap: 'https://firemarkets.net/sitemap.xml',
    }
}
```

✅ 적절히 구현됨

---

### 3.2 sitemap.ts

**파일:** `frontend/src/app/sitemap.ts` (175줄)

- ✅ 동적 포스트 URL 생성
- ✅ 다국어 (ko/en) 경로 지원
- ✅ 온체인 메트릭 경로 포함
- ✅ 태그 페이지 포함
- ✅ `revalidate: 3600` (1시간마다 갱신)

---

### 3.3 블로그 상세 페이지 SSR

**파일:** `frontend/src/app/[locale]/(service)/blog/[slug]/page.tsx` (58줄)

```typescript
// Server-side metadata generation ✅
export async function generateMetadata({ params }): Promise<Metadata> {
    const blog = await getBlogData(slug);
    return {
        title: `${title} | FireMarkets Blog`,
        description: desc,
    }
}

// Server-side page render ✅
export default async function BlogDetailPage({ params }) {
    const blog = await getBlogData(slug);
    // ...
}
```

✅ 서버사이드 렌더링 적용됨 - 검색봇이 콘텐츠를 읽을 수 있음

---

### 3.4 다국어 (i18n) 파일 일관성

```bash
$ wc -l ko.json en.json
  241 ko.json
  241 en.json
  482 total
```

✅ 두 언어 파일의 줄 수가 동일하여 누락된 번역이 없을 가능성 높음

---

## 4. 🔶 OnChain 페이지 참고 사항

**파일:** `frontend/src/app/[locale]/(service)/onchain/[...slug]/page.tsx`

```typescript
export default async function OnChainPage({ params }: PageProps) {
    const { locale, slug } = await params;
    return (
        <div className="p-6">
            <OnChainMainView locale={locale} />  // "use client" 컴포넌트
        </div>
    );
}
```

**참고:**
- 페이지 자체는 서버 컴포넌트이나, 실제 콘텐츠는 `OnChainMainView` (클라이언트 컴포넌트)에서 렌더링
- 온체인 데이터 차트들은 클라이언트 사이드에서 API 호출 후 렌더링
- SEO 측면에서 메타데이터 추가를 고려할 수 있음

---

## 5. 📝 액션 아이템 (우선순위 순)

### 🔴 필수 (애드센스 승인 전 완료)

| # | 작업 | 대상 파일 | 예상 작업량 |
|---|------|----------|------------|
| 1 | **투자 면책조항 추가** | `layout/AppFooter.tsx` | 5분 |
| 2 | **About 페이지 생성** | `app/[locale]/(service)/about/page.tsx` | 30분 |
| 3 | **Contact 페이지 생성** | `app/[locale]/(service)/contact/page.tsx` | 20분 |
| 4 | **Footer/Sidebar에 링크 추가** | `AppFooter.tsx`, `AppSidebar.tsx` | 10분 |

### 🟡 권장 (승인 확률 향상)

| # | 작업 | 설명 |
|---|------|------|
| 5 | 빈 데이터 컴포넌트 개선 | "No Data" 대신 관련 콘텐츠로 대체 또는 숨김 |
| 6 | OnChain 페이지 메타데이터 | 각 메트릭 페이지에 `generateMetadata` 추가 |
| 7 | 블로그 콘텐츠 확보 | 양질의 분석 글 10개 이상 게시 |

---

## 6. 기존 면책조항 참고

`FireMarketsAnalysis.tsx` 컴포넌트 하단에 이미 면책조항이 있습니다:

```tsx
// line 565-567
<p className="text-[10px] text-slate-400 italic">
    * Not financial advice. Data for informational purposes only.
</p>
```

이 내용을 참고하여 **글로벌 Footer에도 동일한 면책조항**을 추가하면 됩니다.

---

*이 보고서는 FireMarkets 코드베이스 조사 결과입니다.*
