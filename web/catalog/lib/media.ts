export function photoUrl(userId: number, n: 1 | 2 | 3 | 4) {
  return `/media/${userId}/photo/${n}`;
}