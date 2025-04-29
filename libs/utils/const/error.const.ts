import { Res } from '@libs/utils/res/res.interface';

// * common
export const SUCCESS: Res = { code: 0, message: '성공' };
export const INVALID_PARAM: Res = { code: 1, message: '잘못된 파라미터 입니다.' };
export const INTERNAL_SERVER_ERROR: Res = { code: 2, message: '내부 서버 오류가 발생했습니다.' };
export const WRONG_APPROACH: Res = { code: 3, message: '요청 경로를 찾을 수 없습니다.' };
export const NOT_HAVE_ACCESS: Res = { code: 4, message: '접근 권한이 없습니다.' };
export const BAD_GATEWAY: Res = { code: 5, message: '요청 리소스에 연결할 수 없습니다.' };
export const GATEWAY_TIMEOUT: Res = { code: 6, message: '요청 시간이 초과 되었습니다.' };
export const UNAUTHORIZED_ERROR: Res = { code: 7, message: '인증되지 않은 요청입니다.' };

// * redis
export const REDIS_CONNECTION_FAILED: Res = { code: 1001, message: 'Redis 서버에 연결을 실패했습니다.' };
export const REDIS_GET_FAILED: Res = { code: 1002, message: 'Redis 서버에 데이터를 조회하는데 실패했습니다.' };
export const REDIS_SET_FAILED: Res = { code: 1003, message: 'Redis 서버에 데이터를 저장하는데 실패했습니다.' };
export const REDIS_DEL_FAILED: Res = { code: 1004, message: 'Redis 서버에 데이터를 제거하는데 실패했습니다.' };
export const REDIS_EXPIRE_ALL_KEYS_FAILED: Res = { code: 1005, message: 'Redis 서버에 모든 데이터를 제거하는데 실패했습니다.' };
export const REDIS_LOCK_ACQUIRE_FAILED: Res = { code: 1006, message: 'Redis 서버에 락을 획득하는데 실패했습니다.' };
export const REDIS_PUBLISH_FAILED: Res = { code: 1008, message: 'Redis 채널에 메시지를 전송하는데 실패했습니다.' };

// * db
export const DB_SELECT_FAILED: Res = { code: 2001, message: '데이터베이스 서버에 데이터를 조회하는데 실패했습니다.' };
export const DB_UPDATE_FAILED: Res = { code: 2002, message: '데이터베이스 서버에 데이터를 변경하는데 실패했습니다.' };

// * stock service
export const OUT_OF_STOCK: Res = { code: 3001, message: '재고가 부족합니다.' };
export const STOCK_NOT_FOUND: Res = { code: 3002, message: '존재하지 않는 상품 재고입니다.' };
export const STOCK_UPDATE_FAILED: Res = { code: 3003, message: '재고 변경에 실패했습니다.' };
