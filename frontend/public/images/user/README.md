# 아바타 템플릿 모음

이 폴더에는 다양한 아바타 템플릿들이 포함되어 있습니다.

## 파일 구조

```
user/
├── avatar-template.html    # 전체 아바타 템플릿 미리보기
├── avatar-styles.css       # 아바타 CSS 스타일
├── adminavatar.png         # 관리자 아바타 이미지
└── old/                    # 이전 아바타 파일들
```

## 사용 방법

### 1. HTML에서 직접 사용

```html
<link rel="stylesheet" href="/images/user/avatar-styles.css">
<div class="avatar avatar1"></div>
<div class="avatar avatar2"></div>
```

### 2. React 컴포넌트로 사용

```tsx
import AvatarTemplate from '@/components/ui/AvatarTemplate';

// 기본 사용
<AvatarTemplate variant="avatar1" />

// 크기 조정
<AvatarTemplate variant="avatar7" size={32} />

// 클릭 이벤트
<AvatarTemplate 
  variant="avatar3" 
  size={50} 
  onClick={() => console.log('아바타 클릭!')} 
/>
```

## 사용 가능한 아바타 변형

| 변형 | 설명 | 색상 |
|------|------|------|
| `avatar1` | 그라데이션 원형 | 보라-파랑 |
| `avatar2` | 분할 색상 | 핑크-빨강 |
| `avatar3` | 석양 | 핑크-노랑 |
| `avatar4` | 바다 | 청록-보라 |
| `avatar5` | 숲 | 연두-핑크 |
| `avatar6` | 로봇 얼굴 | 회색 + 파란 눈 |
| `avatar7` | 웃는 얼굴 | 주황 + 😊 |
| `avatar8` | 패턴 | 빨간 줄무늬 |
| `avatar9` | 원 안의 원 | 초록 + 흰 원 |
| `avatar10` | 별 | 보라 + ⭐ |
| `avatar11` | 그라데이션 | 빨강-청록 |
| `avatar12` | 그라데이션 | 연두-연두 |
| `avatar13` | 그라데이션 | 주황-주황 |
| `avatar14` | 그라데이션 | 보라-보라 |
| `avatar15` | 그라데이션 | 핑크-빨강 |

## 커스터마이징

### 크기 변경
```css
.avatar {
    width: 32px;  /* 원하는 크기 */
    height: 32px;
}
```

### 색상 변경
```css
.avatar-custom {
    background: linear-gradient(45deg, #your-color1, #your-color2);
}
```

### 호버 효과 비활성화
```css
.avatar.no-hover:hover {
    transform: none;
}
```

## 미리보기

`avatar-template.html` 파일을 브라우저에서 열어서 모든 아바타를 미리볼 수 있습니다.


