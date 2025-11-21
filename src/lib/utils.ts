// 단순 클래스 병합 함수 (외부 의존성 없이 동작)
type ClassValue = string | number | null | undefined | false | ClassValue[];

function flattenClasses(input: ClassValue, acc: string[]) {
  if (Array.isArray(input)) {
    input.forEach((item) => flattenClasses(item, acc));
  } else if (input || input === 0) {
    acc.push(String(input));
  }
}

export function cn(...inputs: ClassValue[]): string {
  const acc: string[] = [];
  inputs.forEach((i) => flattenClasses(i, acc));
  return acc.join(" ");
}
