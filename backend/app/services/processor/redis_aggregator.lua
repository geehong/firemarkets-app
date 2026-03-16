-- Redis Lua script to aggregate ticks into OHLCV candles
-- KEYS[1]: candle_key (e.g., "realtime:bars:1m:1:202603161025")
-- ARGV[1]: price (float)
-- ARGV[2]: volume (float)
-- ARGV[3]: updated_at (timestamp string or number)

local price = tonumber(ARGV[1])
local volume = tonumber(ARGV[2])
local updated_at = ARGV[3]

local candle = redis.call('HMGET', KEYS[1], 'open', 'high', 'low', 'close', 'volume')
local open = tonumber(candle[1])
local high = tonumber(candle[2])
local low = tonumber(candle[3])
local close = tonumber(candle[4])
local current_volume = tonumber(candle[5]) or 0

if not open then
    -- New candle
    redis.call('HMSET', KEYS[1], 
        'open', price, 
        'high', price, 
        'low', price, 
        'close', price, 
        'volume', volume,
        'updated_at', updated_at
    )
else
    -- Update existing candle
    if price > high then high = price end
    if price < low then low = price end
    
    redis.call('HMSET', KEYS[1],
        'high', high,
        'low', low,
        'close', price,
        'volume', current_volume + volume,
        'updated_at', updated_at
    )
end

-- Set TTL for 2 days (172800 seconds) to save memory
redis.call('EXPIRE', KEYS[1], 172800)

return 1
