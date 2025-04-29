export const fairLockScript = `
local current = redis.call('lindex', KEYS[1], 0)
if current == ARGV[1] then
  local result = redis.call('set', KEYS[2], ARGV[1], 'PX', ARGV[2], 'NX')
  if result then
    redis.call('lpop', KEYS[1])
    return result
  end
end
return nil
`;

export const unlockScript = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;
