import { NactGuard, NactGuardFunc } from "../../../guard";
import { GUARDS_VAR_NAME } from "../../../nact-constants/";
import { createWareDecorator } from "./global";

const useGuard = createWareDecorator<NactGuardFunc | NactGuard | { new (): NactGuard }>(GUARDS_VAR_NAME);
export { useGuard };
