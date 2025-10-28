// 아바타 관련 유틸리티 함수들

// 사용 가능한 아바타 변형들 (adminavatar.png 제외)
export const AVATAR_VARIANTS = [
  'avatar1', 'avatar2', 'avatar3', 'avatar4', 'avatar5',
  'avatar6', 'avatar7', 'avatar8', 'avatar9', 'avatar10',
  'avatar11', 'avatar12', 'avatar13', 'avatar14', 'avatar15'
] as const;

export type AvatarVariant = typeof AVATAR_VARIANTS[number];

/**
 * 사용자 ID를 기반으로 일관된 랜덤 아바타를 선택합니다.
 * 같은 사용자는 항상 같은 아바타를 가집니다.
 */
export function getRandomAvatarForUser(userId: number): AvatarVariant {
  // 사용자 ID를 시드로 사용하여 일관된 랜덤 선택
  const seed = userId * 2654435761; // 큰 소수를 곱해서 분산
  const index = Math.abs(seed) % AVATAR_VARIANTS.length;
  return AVATAR_VARIANTS[index];
}

/**
 * 사용자명을 기반으로 일관된 랜덤 아바타를 선택합니다.
 */
export function getRandomAvatarForUsername(username: string): AvatarVariant {
  // 사용자명의 해시값을 시드로 사용
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    const char = username.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit 정수로 변환
  }
  const index = Math.abs(hash) % AVATAR_VARIANTS.length;
  return AVATAR_VARIANTS[index];
}

/**
 * 아바타 URL이 유효한지 확인합니다.
 */
export function isValidAvatarUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  // adminavatar.png는 제외
  if (url.includes('adminavatar.png')) return false;
  // 빈 문자열이나 기본값들 제외
  if (url === '' || url === 'default' || url === 'null') return false;
  return true;
}


