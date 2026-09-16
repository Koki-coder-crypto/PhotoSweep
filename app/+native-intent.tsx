import { safeNativePath } from "../src/domain/navigation";
export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}) {
  return safeNativePath(path);
}
