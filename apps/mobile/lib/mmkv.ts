import { MMKV } from "react-native-mmkv";

/**
 * Global MMKV instance — used as TanStack Query cache persister.
 * Fast synchronous storage, survives app kills.
 * No financial data in logs: MMKV is not backed up to iCloud/Google.
 */
export const storage = new MMKV({ id: "fintrack-query-cache" });
