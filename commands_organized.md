docker-compose restart nginx-proxy-manager

    cd /home/geehong/firemarkets-app && cat .env
    ```
    # .env
    #mysql settiing
    DB_HOSTNAME=db # Docker 네트워크 내에서 MySQL 서비스의 이름 (localhost가 아님)
    DB_DATABASE=markets
    DB_USERNAME=geehong
    DB_PASSWORD=Power6100
    DB_ROOT_PASSWORD=Power6740 # MySQL root 계정 비밀번호

    # PostgreSQL Settings
    DB_HOSTNAME_PG=db_postgres
    DB_PORT_PG=5432
    DB_DATABASE_PG=markets
    DB_USERNAME_PG=geehong
    DB_PASSWORD_PG=Power6100

    # Secret Key for Backend
    SECRET_KEY=f4b3e2a1d0c9b8a7968574635241f0e9d8c7b6a594837261e0f9d8c7b6a5

    EODHD_API_KEY=6851fda9861c01.75472022 # https://eodhd.com/api/fundamentals/AAPL.US?api_token=demo&fmt=json
    ALPHA_VANTAGE_API_KEY_1=MJ965EHM5S48YVCV
    ALPHA_VANTAGE_API_KEY_2=ZYIWDUTRJ5VDSMMF
    ALPHA_VANTAGE_API_KEY_3=4D6E0FWKL4IZ0UFV

    FMP_API_KEY=uwuvgPqE1bzAKJB1LAdkerZdp273Bvk1
    COIN_MARKET_API_KEY=e0d46b45-86dd-4756-81c6-a26391122391
    TOKEN_METRICS_API_KEY=tm-ca31b6c6-3eae-4929-837a-bec0fb1e664e
    COIN_GECKO_API_KEY=CG-aiuQjnSAoeVfuhbY1Q9uZysu
    #app.tokenmetrics.com
    # Crypto API Keys
    COINMARKETCAP_API_KEY=e0d46b45-86dd-4756-81c6-a26391122391
    BINANCE_API_KEY=your_binance_api_key_here
    BINANCE_SECRET_KEY=your_binance_secret_key_here
    COINBASE_API_KEY=your_coinbase_apiey_here
    COINBASE_SECRET_KEY=your_coinbase_secret_key_here
    TWELVEDATA_API_KEY=7d438a1ad6ed4ebfaea69eb965fe7e83 #https://twelvedata.com/
    TIINGO_API_KEY=6ad65759391ef22e0dccb8d2b171769c782c4853
    POLYGON_API_KEY=tUWX3e7_Z_ppi90QUsiogmxTbwuWnpa_

    ALPACA_API_KEY=PK6JPW2J1JY4GDVZ7HLD
    ALPACA_SECRET_KEY = OWLQA1QX7Wa79PhiDPTQdb0pHDbl0mUJOUT65QD7

    FINNHUB_API_KEY=d2t3t79r01qkuv3j6p30d2t3t79r01qkuv3j6p3g
    FINNHUB_SECRET_KEY = d2t3t79r01qkuv3j6p4g
    
### 컨테이너 상태 확인
```bash
firemarkets.net
docker-compose ps


NAME                                  IMAGE                                                                     COMMAND                   SERVICE                  CREATED          STATUS                  PORTS
fire_markets_adminer                  adminer:latest                                                            "entrypoint.sh docke…"   adminer                  47 hours ago     Up 47 hours             0.0.0.0:5054->8080/tcp, [::]:5054->8080/tcp
fire_markets_backend                  firemarkets-app-backend                                                   "uvicorn app.main:ap…"   backend                  17 hours ago     Up 17 hours (healthy)   0.0.0.0:8001->8000/tcp, [::]:8001->8000/tcp
fire_markets_data_processor           firemarkets-app-data_processor                                            "python -m app.servi…"   data_processor           47 hours ago     Up 47 hours             8000/tcp
fire_markets_db_postgres              postgres:15-alpine                                                        "docker-entrypoint.s…"   db_postgres              47 hours ago     Up 47 hours (healthy)   5432/tcp
fire_markets_frontend                 firemarkets-app-frontend                                                  "docker-entrypoint.s…"   frontend                 14 minutes ago   Up 13 minutes           0.0.0.0:3006->3000/tcp, [::]:3006->3000/tcp
fire_markets_redis                    redis:7-alpine                                                            "docker-entrypoint.s…"   redis                    47 hours ago     Up 47 hours (healthy)   6379/tcp
fire_markets_scheduler                firemarkets-app-scheduler                                                 "python -m app.servi…"   scheduler                47 hours ago     Up 47 hours             8000/tcp
fire_markets_websocket_broadcaster    firemarkets-app-websocket_broadcaster                                     "python -m app.servi…"   websocket_broadcaster    47 hours ago     Up 25 hours             8000/tcp
fire_markets_websocket_orchestrator   sha256:7fa8176180184081f032a0d727a26594eceda3a40ded2bb2792d0f4d4c739448   "sh -c 'cd /app && p…"   websocket_orchestrator   29 hours ago     Up 28 hours             8000/tcp
nginx-proxy-manager                   jc21/nginx-proxy-manager:latest                                           "/init"                   nginx-proxy-manager      47 hours ago     Up 25 hours             0.0.0.0:80-81->80-81/tcp, [::]:80-81->80-81/tcp, 0.0.0.0:443->443/tcp, [::]:443->443/tcp
portainer                             portainer/portainer-ce:latest                                             "/portainer"              portainer                47 hours ago     Up 47 hours             0.0.0.0:8000->8000/tcp, [::]:8000->8000/tcp, 0.0.0.0:9000->9000/tcp, [::]:9000->9000/tcp, 0.0.0.0:9443->9443/tcp, [::]:9443->9443/tcp

docker-compose --profile processing stop scheduler && docker-compose --profile processing rm -f scheduler && docker-compose --profile processing up -d --build scheduler

docker-compose --profile processing stop data_processor && docker-compose --profile processing rm -f data_processor && docker-compose --profile processing up -d --build data_processor

docker-compose --profile processing stop websocket_broadcaster && docker-compose --profile processing rm -f websocket_broadcaster && docker-compose --profile processing up -d --build websocket_broadcaster

docker-compose --profile processing stop websocket_orchestrator && docker-compose --profile processing rm -f websocket_orchestrator && docker-compose --profile processing up -d --build websocket_orchestrator


docker-compose --profile processing stop backend && docker-compose --profile processing rm -f backend && docker-compose --profile processing up -d --build backend

docker-compose --profile processing stop frontend && docker-compose --profile processing rm -f frontend && docker-compose --profile processing up -d --build frontend

docker-compose --profile processing stop backend && docker-compose --profile processing rm -f backend && docker-compose --profile processing up -d --build backend



docker-compose restart scheduler
docker-compose restart backend
docker-compose restart frontend
docker-compose up -d --build frontend
npm run build
docker-compose restart nginx-proxy-manager
docker-compose restart data_processor
docker-compose restart websocket_orchestrator
docker-compose restart websocket_broadcaster
docker-compose restart adminer


docker-compose logs data_processor --tail 50 -f
docker-compose logs websocket_orchestrator --tail 50 -f
docker-compose logs websocket_broadcaster --tail 50 -f
docker-compose logs scheduler --tail 50 -f
docker-compose logs backend --tail 50 -f
docker-compose logs db_postgres --tail 50 -f

docker-compose logs frontend --tail 50 -f
docker-compose logs adminer --tail 50 -f


docker-compose logs data_processor --since 1h 2>&1 | grep -E "(error|ERROR|exception|Exception|failed|Failed)" | tail -50
docker-compose logs websocket_orchestrator --since 1h 2>&1 | grep -E "(error|ERROR|exception|Exception|failed|Failed)" | tail -50

docker-compose logs backend --since 1h 2>&1 | grep -E "(error|ERROR|exception|Exception|failed|Failed)" | tail -50
docker-compose logs db_postgres --since 1h 2>&1 | grep -E "(error|ERROR|exception|Exception|failed|Failed)" | tail -50
docker-compose logs frontend --since 1h 2>&1 | grep -E "(error|ERROR|exception|Exception|failed|Failed)" | tail -50
docker-compose logs websocket_broadcaster --since 1h 2>&1 | grep -E "(error|ERROR|exception|Exception|failed|Failed)" | tail -50

        