# **02) 환경변수 (kis_devlp.yaml)**

본 환경변수 셋팅은 `03.보안인증키 발급(Oauth > 01) 접근토큰 발급 > ② 샘플코드 (kis_auth.py)`를 사용하는 기준으로 정리하였음

본 환경변수 셋팅은 `03.보안인증키 발급(Oauth > 01) 접근토큰 발급 > ② 샘플코드 (kis_auth.py)`를 사용하는 기준으로 정리하였음

```bash
파일명 : kis_devlp.yaml (파일명은 변경 가능 단, kis_devlp.yaml  파일명 지정하는 부분 수정 필요함)

#홈페이지에서 API서비스 신청시 받은 Appkey, Appsecret 값 설정
#실전투자 (모의투자인 경우 모의투자용 앱키, 앱시크리트 사용)
#my_app: "PSfBQC2VPkovglHMxRdtynzZLQND727OiNQp"
#my_sec: "PSfBQC2VPkovglHMxRdtynzZLQND727OiNQp"

#계좌번호 앞 8자리
my_acct: "43962060"
#계좌번호 뒤 2자리
my_prod: "01"

#실전투자
prod: "https://openapi.koreainvestment.com:9443"
#모의투자
#prod: "https://openapivts.koreainvestment.com:29443"

#디스코드 웹훅 URL
DISCORD_WEBHOOK_URL: ""

my_agent : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"

```

# **03. 보안인증키 발급(Oauth)**

이번 초급 예제에서는 모의계좌를 활용하여 실습을 진행합니다. 사전에 모의계좌 개설까지 완료하셔야 원활한 실습이 가능합니다. 실전 투자에 해당하는 종합계좌로 진행을 원하시는 분은 진행될 예제의 header 내 TR 파라미터 변경을 하시면 똑같이 예제를 활용하실 수 있습니다.

---

서비스 연결을 위해서는 App Key와 App Secret 발급이 필요합니다. 두 가지 암호키를 활용하여 보안인증키 token과 refresh token을 발급 받을 수 있습니다. token 을 통해 신청한 계좌에 접근할 수 있으며, 90일의 만료일이 존재합니다. 만료시 동시에 발급받은 refresh token을 통해 token 발급이 가능합니다.

```cpp
import requests
import json

```

requests와 json 패키지는 python에서 API request를 하기 위한 필수적인 패키지입니다. requests 패키지는 HTTP 요청을 보낼 때, json은 특정 객체를 JSON 데이터로 만들어서 쓰기 위해 활용되는 모듈입니다.

# **01) 접근토큰 발급**

```
APP_KEY = "홈페이지에서 발급받은 App Key"
APP_SECRET = "홈페이지에서 발급받은 App Secret"
URL_BASE = "https://openapivts.koreainvestment.com:29443" #모의투자서비스

```

먼저 발급받은 App Key와 App Secret을 변수에 저장합니다. 본 예제에서는 모의계좌를 활용할 예정이므로 모의투자서비스 주소를 변수에 저장합니다.

```makefile
headers = {"content-type":"application/json"}
body = {"grant_type":"client_credentials",
        "appkey":APP_KEY,
        "appsecret":APP_SECRET}

```

```
PATH = "oauth2/tokenP"

```

REST API는 크게 4가지로 이루어져 있습니다. ①권한 인증 등에 활용되는 header, ②위치를 나타내는 path, ③쿼리문을 활용한 query string, ④requsest 요청에 포함되는 body로 이루어져 있습니다. 일반적으로 ③query string은 GET 방식 ④body는 POST 방식에 활용됩니다.

우리는 POST 방식을 활용하여 보안인증키를 발급받을 예정이므로, headers와 data를 각각 dictionary 형태로 만들어줍니다. 마지막으로 호출할 API 의 위치를 PATH 변수에 저장합니다.

```bash
URL = f"{URL_BASE}/{PATH}"
print(URL)
>>> https://openapivts.koreainvestment.com:29443/oauth2/token

```

URL_BASE와 PATH를 합쳐 URL로 만들어줍니다. 쉽게 생각하면 파일 디렉토리와 같은데, URL_BASE인 상위 모의투자 파일에서 ouath2로 들어가 token이라는 파일로 들어간 것과 같습니다.

```makefile
res = requests.post(URL, headers=headers, data=json.dumps(body))
res.text
>>> '{"access_token":"ACCESS_TOKEN","token_type":"Bearer","expires_in":86400}'

```

이제 request 요청을 해보겠습니다. 위와 같이 POST 요청을 진행하면 보안인증키(access_token)를 받을 수 있습니다.

```python
ACCESS_TOKEN = res.json()["access_token"]
print(ACCESS_TOKEN)
>>>ACCESS_TOKEN

```

받은 인증키를 ACCESS_TOKEN 변수에 저장한 뒤, 본격적으로 주식 조회 및 매매를 시작해보도록 하겠습니다.

---

공식문서

**REST
접근토큰발급(P)[인증-001]호출테스트**

**개별문서 다운로드**

| **Method** | POST | **URL** | /oauth2/tokenP |
| --- | --- | --- | --- |
| **실전 Domain** | https://openapi.koreainvestment.com:9443 | **모의 Domain** | https://openapivts.koreainvestment.com:29443 |
| **실전 TR ID** |  | **모의 TR ID** |  |
| **Format** | JSON | **Content-Type** | application/json; charset=UTF-8 |

# **개요**

`본인 계좌에 필요한 인증 절차로, 인증을 통해 접근 토큰을 부여받아 오픈API 활용이 가능합니다.

1. 접근토큰(access_token)의 유효기간은 24시간 이며(1일 1회발급 원칙) 
   갱신발급주기는 6시간 입니다.(6시간 이내는 기존 발급키로 응답)

2. 접근토큰발급(/oauth2/tokenP) 시 접근토큰값(access_token)과 함께 수신되는 
   접근토큰 유효기간(acess_token_token_expired)을 이용해 접근토큰을 관리하실 수 있습니다.

[참고]

'23.4.28 이후 지나치게 잦은 토큰 발급 요청건을 제어 하기 위해 신규 접근토큰발급 이후 일정시간 이내에 재호출 시에는 직전 토큰값을 리턴하게 되었습니다. 일정시간 이후 접근토큰발급 API 호출 시에는 신규 토큰값을 리턴합니다. 
접근토큰발급 API 호출 및 코드 작성하실 때 해당 사항을 참고하시길 바랍니다.

※ 참고 : 포럼 > 공지사항 >  [수정] [중요] 접근 토큰 발급 변경 안내`

# **요청**

### **Header**

### **Body**

| **Element** | **한글명** | **Type** | **Required** | **Length** | **Description** |
| --- | --- | --- | --- | --- | --- |
| grant_type | 권한부여 Type | String | Y | 18 | client_credentials |
| appkey | 앱키 | String | Y | 36 | 한국투자증권 홈페이지에서 발급받은 appkey (절대 노출되지 않도록 주의해주세요.) |
| appsecret | 앱시크릿키 | String | Y | 180 | 한국투자증권 홈페이지에서 발급받은 appsecret (절대 노출되지 않도록 주의해주세요.) |

# **응답**

### **Header**

### **Body**

| **Element** | **한글명** | **Type** | **Required** | **Length** | **Description** |
| --- | --- | --- | --- | --- | --- |
| access_token | 접근토큰 | String | Y | 350 | OAuth 토큰이 필요한 API 경우 발급한 Access tokenex) "eyJ0eXUxMiJ9.eyJz…..................................."- 일반개인고객/일반법인고객. Access token 유효기간 1일.. 일정시간(6시간) 이내에 재호출 시에는 직전 토큰값을 리턴. OAuth 2.0의 Client Credentials Grant 절차를 준용- 제휴법인. Access token 유효기간 3개월. Refresh token 유효기간 1년. OAuth 2.0의 Authorization Code Grant 절차를 준용 |
| token_type | 접근토큰유형 | String | Y | 20 | 접근토큰유형 : "Bearer"※ API 호출 시, 접근토큰유형 "Bearer" 입력. ex) "Bearer eyJ...." |
| expires_in | 접근토큰 유효기간 | Number | Y | 10 | 유효기간(초)ex) 7776000 |
| access_token_token_expired | 접근토큰 유효기간(일시표시) | String | Y | 50 | 유효기간(년:월:일 시:분:초)ex) "2022-08-30 08:10:10" |

# **예시**

### **Request**

- **Data Class (Python)**

### Data Class (Python)

```python
from dataclasses import dataclass

@dataclass
class RequestHeader:

@dataclass
class RequestBody:
    grant_type: str    #권한부여 Type
    appkey: str    #앱키
    appsecret: str    #앱시크릿키

```

**복사하기**

### **Response**

- **Data Class (Python)**

### Data Class (Python)

`from dataclasses import dataclass
from typing import List, Optional
from decimal import Decimal

@dataclass
class ResponseHeader:

@dataclass
class ResponseBody:
    access_token: str    #접근토큰
    token_type: str    #접근토큰유형
    expires_in: float    #접근토큰 유효기간
    access_token_token_expired: str    #접근토큰 유효기간(일시표시)`

---

**REST
접근토큰폐기(P)[인증-002]호출테스트**

**개별문서 다운로드**

| **Method** | POST | **URL** | /oauth2/revokeP |
| --- | --- | --- | --- |
| **실전 Domain** | https://openapi.koreainvestment.com:9443 | **모의 Domain** | https://openapivts.koreainvestment.com:29443 |
| **실전 TR ID** |  | **모의 TR ID** |  |
| **Format** | JSON | **Content-Type** | application/json; charset=UTF-8 |

# **개요**

 `부여받은 접큰토큰을 더 이상 활용하지 않을 때 사용합니다.`

# **요청**

### **Header**

### **Body**

| **Element** | **한글명** | **Type** | **Required** | **Length** | **Description** |
| --- | --- | --- | --- | --- | --- |
| appkey | 고객 앱Key | String | Y | 36 | 한국투자증권 홈페이지에서 발급받은 appkey (절대 노출되지 않도록 주의해주세요.) |
| appsecret | 고객 앱Secret | String | Y | 180 | 한국투자증권 홈페이지에서 발급받은 appsecret (절대 노출되지 않도록 주의해주세요.) |
| token | 접근토큰 | String | Y | 286 | OAuth 토큰이 필요한 API 경우 발급한 Access token일반고객(Access token 유효기간 1일, OAuth 2.0의 Client Credentials Grant 절차를 준용)법인(Access token 유효기간 3개월, Refresh token 유효기간 1년, OAuth 2.0의 Authorization Code Grant 절차를 준용) |

# **응답**

### **Header**

### **Body**

| **Element** | **한글명** | **Type** | **Required** | **Length** | **Description** |
| --- | --- | --- | --- | --- | --- |
| code | 응답코드 | String | N | 8 | HTTP 응답코드 |
| message | 응답메세지 | String | N | 450 | 응답메세지 |

# **예시**

### **Request**

- **Data Class (Python)**

### Data Class (Python)

```python
from dataclasses import dataclass

@dataclass
class RequestHeader:

@dataclass
class RequestBody:
    appkey: str    #고객 앱Key
    appsecret: str    #고객 앱Secret
    token: str    #접근토큰

```

**복사하기**

### **Response**

- **Data Class (Python)**

### Data Class (Python)

`from dataclasses import dataclass
from typing import List, Optional

@dataclass
class ResponseHeader:

@dataclass
class ResponseBody:
    code: Optional[str] = None    #응답코드
    message: Optional[str] = None    #응답메세지`

# **02) [국내주식] 기본시세 > 주식현재가 시세**

먼저, [국내주식] 기본시세 > 주식현재가 시세를 가져와보겠습니다. [국내주식] 기본시세 > 주식현재가 시세 API는 조회하고 싶은 종목의 현재 정보를 얻는데 사용됩니다. 그럼 시작해보겠습니다.

자동 프로그램 개발시 아래와 같이 API 호출하시고 Input 값은 종목코드(`itm_no`)만 입력하시면 됩니다.

```python
#kis_domstk module 을 찾을 수 없다는 에러가 나는 경우 sys.path에 kis_domstk.py 가 있는 폴더를 추가해준다.
import kis_auth as ka
import kis_domstk as kb

import pandas as pd

import sys

# 토큰 발급
ka.auth()

# [국내주식] 기본시세 > 주식현재가 시세 (종목번호 6자리)
rt_data = kb.get_inquire_price(itm_no="071050")
print(rt_data.stck_prpr+ " " + rt_data.prdy_vrss)    # 현재가, 전일대비

```

get_inquire_price ([국내주식] 기본시세 > 주식현재가 시세 )은 imort 샘플 파일 `kis_domstk.py`에 아래와 같이 정리되어 있으니 필요시 수정하여 사용하시면 됩니다.

```python
##############################################################################################
# [국내주식] 기본시세 > 주식현재가 시세
##############################################################################################
# 주식현재가 시세 Object를 DataFrame 으로 반환
# Input: None (Option) 상세 Input값 변경이 필요한 경우 API문서 참조
# Output: DataFrame (Option) output
def get_inquire_price(div_code="J", itm_no="", tr_cont="", FK100="", NK100="", dataframe=None):  # [국내주식] 기본시세 > 주식현재가 시세
    url = '/uapi/domestic-stock/v1/quotations/inquire-price'
    tr_id = "FHKST01010100" # 주식현재가 시세

    params = {
        "FID_COND_MRKT_DIV_CODE": div_code, # 시장 분류 코드  J : 주식/ETF/ETN, W: ELW
        "FID_INPUT_ISCD": itm_no            #   종목번호 (6자리) ETN의 경우, Q로 시작 (EX. Q500001)
    }
    res = kis._url_fetch(url, tr_id, tr_cont, params)

    # Assuming 'output' is a dictionary that you want to convert to a DataFrame
    current_data = pd.DataFrame(res.getBody().output, index=[0])  # getBody() kis_auth.py 존재

    dataframe = current_data

    return dataframe
```

---

# **04) [국내주식] 기본시세 > 주식현재가 일자별**

[국내주식] 기본시세 > 주식현재가 일자별 시세 를 가져와보겠습니다.[국내주식] 기본시세 > 주식현재가 일자별 API는 조회하고 싶은 종목의 일자별 현재 현재가 정보를 얻는데 사용됩니다.

자동 프로그램 개발시 원하는 종목의 일자별 시세 정보는 아래와 같이 API 호출하시면 됩니다.

```python
#kis_domstk module 을 찾을 수 없다는 에러가 나는 경우 sys.path에 kis_domstk.py 가 있는 폴더를 추가해준다.
import kis_auth as ka
import kis_domstk as kb

import pandas as pd

import sys

# 토큰 발급
ka.auth()

# [국내주식] 기본시세 > 주식현재가 일자별 (종목번호 6자리 + 기간분류코드)
# 기간분류코드    D : (일)최근 30거래일  W : (주)최근 30주   M : (월)최근 30개월
# 수정주가기준이며 수정주가미반영 기준을 원하시면 인자값 adj_prc_code="2" 추가
rt_data = kb.get_inquire_daily_price(itm_no="071050", period_code="M")
print(rt_data)

```

get_inquire_daily_price ([국내주식] 기본시세 > 주식현재가 일자별)는 imort 샘플 파일 `kis_domstk.py`에 아래와 같이 정리되어 있으니 필요시 수정하여 사용하시면 됩니다.

```python
##############################################################################################
# [국내주식] 기본시세 > 주식현재가 일자별  (최근 30일만 조회)
# 주식현재가 일자별 API입니다. 일/주/월별 주가를 확인할 수 있으며 최근 30일(주,별)로 제한되어 있습니다.
##############################################################################################
# 주식현재가 일자별 Object를 DataFrame 으로 반환
# Input: None (Option) 상세 Input값 변경이 필요한 경우 API문서 참조
# Output: DataFrame (Option) output
def get_inquire_daily_price(div_code="J", itm_no="", period_code="D", adj_prc_code="1", tr_cont="", FK100="", NK100="", dataframe=None):  # [국내주식] 기본시세 > 주식현재가 일자별
    url = '/uapi/domestic-stock/v1/quotations/inquire-daily-price'
    tr_id = "FHKST01010400"  # 주식현재가 일자별

    params = {
        "FID_COND_MRKT_DIV_CODE": div_code, # 시장 분류 코드  J : 주식/ETF/ETN, W: ELW
        "FID_INPUT_ISCD": itm_no,           # 종목번호 (6자리) ETN의 경우, Q로 시작 (EX. Q500001)
        "FID_PERIOD_DIV_CODE": period_code, # 기간분류코드 D : (일)최근 30거래일, W : (주)최근 30주, M : (월)최근 30개월
        "FID_ORG_ADJ_PRC": adj_prc_code     # 0 : 수정주가반영, 1 : 수정주가미반영 * 수정주가는 액면분할/액면병합 등 권리 발생 시 과거 시세를 현재 주가에 맞게 보정한 가격
    }
    res = kis._url_fetch(url, tr_id, tr_cont, params)

    # print(res.getBody())  # 오류 원인 확인 필요시 사용
    # Assuming 'output' is a dictionary that you want to convert to a DataFrame
    current_data = pd.DataFrame(res.getBody().output)  # getBody() kis_auth.py 존재

    dataframe = current_data

    return dataframe

```

마지막 편집일시 : 2024년 5월 16일 2:11 오후

---

공식문서

**REST
주식현재가 시세[v1_국내주식-008]호출테스트**

**개별문서 다운로드**

| **Method** | GET | **URL** | /uapi/domestic-stock/v1/quotations/inquire-price |
| --- | --- | --- | --- |
| **실전 Domain** | https://openapi.koreainvestment.com:9443 | **모의 Domain** | https://openapivts.koreainvestment.com:29443 |
| **실전 TR ID** | FHKST01010100 | **모의 TR ID** | FHKST01010100 |
| **Format** |  | **Content-Type** |  |

# **개요**

`주식 현재가 시세 API입니다. 실시간 시세를 원하신다면 웹소켓 API를 활용하세요.

※ 종목코드 마스터파일 파이썬 정제코드는 한국투자증권 Github 참고 부탁드립니다.
   https://github.com/koreainvestment/open-trading-api/tree/main/stocks_info`

# **요청**

### **Header**

| **Element** | **한글명** | **Type** | **Required** | **Length** | **Description** |
| --- | --- | --- | --- | --- | --- |
| content-type | 컨텐츠타입 | String | Y | 40 | application/json; charset=utf-8 |
| authorization | 접근토큰 | String | Y | 350 | OAuth 토큰이 필요한 API 경우 발급한 Access token일반고객(Access token 유효기간 1일, OAuth 2.0의 Client Credentials Grant 절차를 준용)법인(Access token 유효기간 3개월, Refresh token 유효기간 1년, OAuth 2.0의 Authorization Code Grant 절차를 준용) |
| appkey | 앱키 | String | Y | 36 | 한국투자증권 홈페이지에서 발급받은 appkey (절대 노출되지 않도록 주의해주세요.) |
| appsecret | 앱시크릿키 | String | Y | 180 | 한국투자증권 홈페이지에서 발급받은 appkey (절대 노출되지 않도록 주의해주세요.) |
| personalseckey | 고객식별키 | String | N | 180 | [법인 필수] 제휴사 회원 관리를 위한 고객식별키 |
| tr_id | 거래ID | String | Y | 13 | FHKST01010100 |
| tr_cont | 연속 거래 여부 | String | N | 1 | tr_cont를 이용한 다음조회 불가 API |
| custtype | 고객 타입 | String | Y | 1 | B : 법인P : 개인 |
| seq_no | 일련번호 | String | N | 2 | [법인 필수] 001 |
| mac_address | 맥주소 | String | N | 12 | 법인고객 혹은 개인고객의 Mac address 값 |
| phone_number | 핸드폰번호 | String | N | 12 | [법인 필수] 제휴사APP을 사용하는 경우 사용자(회원) 핸드폰번호ex) 01011112222 (하이픈 등 구분값 제거) |
| ip_addr | 접속 단말 공인 IP | String | N | 12 | [법인 필수] 사용자(회원)의 IP Address |
| gt_uid | Global UID | String | N | 32 | [법인 전용] 거래고유번호로 사용하므로 거래별로 UNIQUE해야 함 |

### **Query Parameter**

| **Element** | **한글명** | **Type** | **Required** | **Length** | **Description** |
| --- | --- | --- | --- | --- | --- |
| FID_COND_MRKT_DIV_CODE | 조건 시장 분류 코드 | String | Y | 2 | J:KRX, NX:NXT, UN:통합 |
| FID_INPUT_ISCD | 입력 종목코드 | String | Y | 12 | 종목코드 (ex 005930 삼성전자) // ETN은 종목코드 6자리 앞에 Q 입력 필수 |

# **응답**

### **Header**

| **Element** | **한글명** | **Type** | **Required** | **Length** | **Description** |
| --- | --- | --- | --- | --- | --- |
| content-type | 컨텐츠타입 | String | Y | 40 | application/json; charset=utf-8 |
| tr_id | 거래ID | String | Y | 13 | 요청한 tr_id |
| tr_cont | 연속 거래 여부 | String | N | 1 | tr_cont를 이용한 다음조회 불가 API |
| gt_uid | Global UID | String | N | 32 | [법인 전용] 거래고유번호로 사용하므로 거래별로 UNIQUE해야 함 |

### **Body**

| **Element** | **한글명** | **Type** | **Required** | **Length** | **Description** |
| --- | --- | --- | --- | --- | --- |
| rt_cd | 성공 실패 여부 | String | Y | 1 |  |
| msg_cd | 응답코드 | String | Y | 8 |  |
| msg1 | 응답메세지 | String | Y | 80 |  |
| output | 응답상세 | Object | Y |  |  |
| iscd_stat_cls_code | 종목 상태 구분 코드 | String | Y | 3 | 51 : 관리종목52 : 투자위험53 : 투자경고54 : 투자주의55 : 신용가능57 : 증거금 100%58 : 거래정지59 : 단기과열종목 |
| marg_rate | 증거금 비율 | String | Y | 84 |  |
| rprs_mrkt_kor_name | 대표 시장 한글 명 | String | Y | 40 |  |
| new_hgpr_lwpr_cls_code | 신 고가 저가 구분 코드 | String | Y | 10 |  |
| bstp_kor_isnm | 업종 한글 종목명 | String | Y | 40 |  |
| temp_stop_yn | 임시 정지 여부 | String | Y | 1 |  |
| oprc_rang_cont_yn | 시가 범위 연장 여부 | String | Y | 1 |  |
| clpr_rang_cont_yn | 종가 범위 연장 여부 | String | Y | 1 |  |
| crdt_able_yn | 신용 가능 여부 | String | Y | 1 |  |
| grmn_rate_cls_code | 보증금 비율 구분 코드 | String | Y | 3 |  |
| elw_pblc_yn | ELW 발행 여부 | String | Y | 1 |  |
| stck_prpr | 주식 현재가 | String | Y | 10 |  |
| prdy_vrss | 전일 대비 | String | Y | 10 |  |
| prdy_vrss_sign | 전일 대비 부호 | String | Y | 1 |  |
| prdy_ctrt | 전일 대비율 | String | Y | 82 |  |
| acml_tr_pbmn | 누적 거래 대금 | String | Y | 18 |  |
| acml_vol | 누적 거래량 | String | Y | 18 |  |
| prdy_vrss_vol_rate | 전일 대비 거래량 비율 | String | Y | 84 |  |
| stck_oprc | 주식 시가2 | String | Y | 10 |  |
| stck_hgpr | 주식 최고가 | String | Y | 10 |  |
| stck_lwpr | 주식 최저가 | String | Y | 10 |  |
| stck_mxpr | 주식 상한가 | String | Y | 10 |  |
| stck_llam | 주식 하한가 | String | Y | 10 |  |
| stck_sdpr | 주식 기준가 | String | Y | 10 |  |
| wghn_avrg_stck_prc | 가중 평균 주식 가격 | String | Y | 192 |  |
| hts_frgn_ehrt | HTS 외국인 소진율 | String | Y | 82 |  |
| frgn_ntby_qty | 외국인 순매수 수량 | String | Y | 12 |  |
| pgtr_ntby_qty | 프로그램매매 순매수 수량 | String | Y | 18 |  |
| pvt_scnd_dmrs_prc | 피벗 2차 디저항 가격 | String | Y | 10 |  |
| pvt_frst_dmrs_prc | 피벗 1차 디저항 가격 | String | Y | 10 |  |
| pvt_pont_val | 피벗 포인트 값 | String | Y | 10 |  |
| pvt_frst_dmsp_prc | 피벗 1차 디지지 가격 | String | Y | 10 |  |
| pvt_scnd_dmsp_prc | 피벗 2차 디지지 가격 | String | Y | 10 |  |
| dmrs_val | 디저항 값 | String | Y | 10 |  |
| dmsp_val | 디지지 값 | String | Y | 10 |  |
| cpfn | 자본금 | String | Y | 22 |  |
| rstc_wdth_prc | 제한 폭 가격 | String | Y | 10 |  |
| stck_fcam | 주식 액면가 | String | Y | 11 |  |
| stck_sspr | 주식 대용가 | String | Y | 10 |  |
| aspr_unit | 호가단위 | String | Y | 10 |  |
| hts_deal_qty_unit_val | HTS 매매 수량 단위 값 | String | Y | 10 |  |
| lstn_stcn | 상장 주수 | String | Y | 18 |  |
| hts_avls | HTS 시가총액 | String | Y | 18 |  |
| per | PER | String | Y | 82 |  |
| pbr | PBR | String | Y | 82 |  |
| stac_month | 결산 월 | String | Y | 2 |  |
| vol_tnrt | 거래량 회전율 | String | Y | 82 |  |
| eps | EPS | String | Y | 112 |  |
| bps | BPS | String | Y | 112 |  |
| d250_hgpr | 250일 최고가 | String | Y | 10 |  |
| d250_hgpr_date | 250일 최고가 일자 | String | Y | 8 |  |
| d250_hgpr_vrss_prpr_rate | 250일 최고가 대비 현재가 비율 | String | Y | 84 |  |
| d250_lwpr | 250일 최저가 | String | Y | 10 |  |
| d250_lwpr_date | 250일 최저가 일자 | String | Y | 8 |  |
| d250_lwpr_vrss_prpr_rate | 250일 최저가 대비 현재가 비율 | String | Y | 84 |  |
| stck_dryy_hgpr | 주식 연중 최고가 | String | Y | 10 |  |
| dryy_hgpr_vrss_prpr_rate | 연중 최고가 대비 현재가 비율 | String | Y | 84 |  |
| dryy_hgpr_date | 연중 최고가 일자 | String | Y | 8 |  |
| stck_dryy_lwpr | 주식 연중 최저가 | String | Y | 10 |  |
| dryy_lwpr_vrss_prpr_rate | 연중 최저가 대비 현재가 비율 | String | Y | 84 |  |
| dryy_lwpr_date | 연중 최저가 일자 | String | Y | 8 |  |
| w52_hgpr | 52주일 최고가 | String | Y | 10 |  |
| w52_hgpr_vrss_prpr_ctrt | 52주일 최고가 대비 현재가 대비 | String | Y | 82 |  |
| w52_hgpr_date | 52주일 최고가 일자 | String | Y | 8 |  |
| w52_lwpr | 52주일 최저가 | String | Y | 10 |  |
| w52_lwpr_vrss_prpr_ctrt | 52주일 최저가 대비 현재가 대비 | String | Y | 82 |  |
| w52_lwpr_date | 52주일 최저가 일자 | String | Y | 8 |  |
| whol_loan_rmnd_rate | 전체 융자 잔고 비율 | String | Y | 84 |  |
| ssts_yn | 공매도가능여부 | String | Y | 1 |  |
| stck_shrn_iscd | 주식 단축 종목코드 | String | Y | 9 |  |
| fcam_cnnm | 액면가 통화명 | String | Y | 20 |  |
| cpfn_cnnm | 자본금 통화명 | String | Y | 20 |  |
| apprch_rate | 접근도 | String | Y | 112 |  |
| frgn_hldn_qty | 외국인 보유 수량 | String | Y | 18 |  |
| vi_cls_code | VI적용구분코드 | String | Y | 1 |  |
| ovtm_vi_cls_code | 시간외단일가VI적용구분코드 | String | Y | 1 |  |
| last_ssts_cntg_qty | 최종 공매도 체결 수량 | String | Y | 12 |  |
| invt_caful_yn | 투자유의여부 | String | Y | 1 |  |
| mrkt_warn_cls_code | 시장경고코드 | String | Y | 2 |  |
| short_over_yn | 단기과열여부 | String | Y | 1 |  |
| sltr_yn | 정리매매여부 | String | Y | 1 |  |
| mang_issu_cls_code | 관리종목여부 | String | Y | 1 |  |

# **예시**

### **Request**

- **Data Class (Python)**

### Data Class (Python)

```python
from dataclasses import dataclass

@dataclass
class RequestHeader:
    content-type: str    #컨텐츠타입
    authorization: str    #접근토큰
    appkey: str    #앱키
    appsecret: str    #앱시크릿키
    personalseckey: Optional[str] = None    #고객식별키
    tr_id: str    #거래ID
    tr_cont: Optional[str] = None    #연속 거래 여부
    custtype: str    #고객 타입
    seq_no: Optional[str] = None    #일련번호
    mac_address: Optional[str] = None    #맥주소
    phone_number: Optional[str] = None    #핸드폰번호
    ip_addr: Optional[str] = None    #접속 단말 공인 IP
    gt_uid: Optional[str] = None    #Global UID

@dataclass
class RequestQueryParam:
    FID_COND_MRKT_DIV_CODE: str    #조건 시장 분류 코드
    FID_INPUT_ISCD: str    #입력 종목코드

```

**복사하기**

### **Response**

- **Data Class (Python)**

### Data Class (Python)

`from dataclasses import dataclass
from typing import List, Optional

@dataclass
class ResponseHeader:
    content-type: str    #컨텐츠타입
    tr_id: str    #거래ID
    tr_cont: Optional[str] = None    #연속 거래 여부
    gt_uid: Optional[str] = None    #Global UID

@dataclass
class ResponseBody:
    rt_cd: str    #성공 실패 여부
    msg_cd: str    #응답코드
    msg1: str    #응답메세지
    output: ResponseBodyoutput    #응답상세

@dataclass
class ResponseBodyoutput:
    iscd_stat_cls_code: str    #종목 상태 구분 코드
    marg_rate: str    #증거금 비율
    rprs_mrkt_kor_name: str    #대표 시장 한글 명
    new_hgpr_lwpr_cls_code: str    #신 고가 저가 구분 코드
    bstp_kor_isnm: str    #업종 한글 종목명
    temp_stop_yn: str    #임시 정지 여부
    oprc_rang_cont_yn: str    #시가 범위 연장 여부
    clpr_rang_cont_yn: str    #종가 범위 연장 여부
    crdt_able_yn: str    #신용 가능 여부
    grmn_rate_cls_code: str    #보증금 비율 구분 코드
    elw_pblc_yn: str    #ELW 발행 여부
    stck_prpr: str    #주식 현재가
    prdy_vrss: str    #전일 대비
    prdy_vrss_sign: str    #전일 대비 부호
    prdy_ctrt: str    #전일 대비율
    acml_tr_pbmn: str    #누적 거래 대금
    acml_vol: str    #누적 거래량
    prdy_vrss_vol_rate: str    #전일 대비 거래량 비율
    stck_oprc: str    #주식 시가2
    stck_hgpr: str    #주식 최고가
    stck_lwpr: str    #주식 최저가
    stck_mxpr: str    #주식 상한가
    stck_llam: str    #주식 하한가
    stck_sdpr: str    #주식 기준가
    wghn_avrg_stck_prc: str    #가중 평균 주식 가격
    hts_frgn_ehrt: str    #HTS 외국인 소진율
    frgn_ntby_qty: str    #외국인 순매수 수량
    pgtr_ntby_qty: str    #프로그램매매 순매수 수량
    pvt_scnd_dmrs_prc: str    #피벗 2차 디저항 가격
    pvt_frst_dmrs_prc: str    #피벗 1차 디저항 가격
    pvt_pont_val: str    #피벗 포인트 값
    pvt_frst_dmsp_prc: str    #피벗 1차 디지지 가격
    pvt_scnd_dmsp_prc: str    #피벗 2차 디지지 가격
    dmrs_val: str    #디저항 값
    dmsp_val: str    #디지지 값
    cpfn: str    #자본금
    rstc_wdth_prc: str    #제한 폭 가격
    stck_fcam: str    #주식 액면가
    stck_sspr: str    #주식 대용가
    aspr_unit: str    #호가단위
    hts_deal_qty_unit_val: str    #HTS 매매 수량 단위 값
    lstn_stcn: str    #상장 주수
    hts_avls: str    #HTS 시가총액
    per: str    #PER
    pbr: str    #PBR
    stac_month: str    #결산 월
    vol_tnrt: str    #거래량 회전율
    eps: str    #EPS
    bps: str    #BPS
    d250_hgpr: str    #250일 최고가
    d250_hgpr_date: str    #250일 최고가 일자
    d250_hgpr_vrss_prpr_rate: str    #250일 최고가 대비 현재가 비율
    d250_lwpr: str    #250일 최저가
    d250_lwpr_date: str    #250일 최저가 일자
    d250_lwpr_vrss_prpr_rate: str    #250일 최저가 대비 현재가 비율
    stck_dryy_hgpr: str    #주식 연중 최고가
    dryy_hgpr_vrss_prpr_rate: str    #연중 최고가 대비 현재가 비율
    dryy_hgpr_date: str    #연중 최고가 일자
    stck_dryy_lwpr: str    #주식 연중 최저가
    dryy_lwpr_vrss_prpr_rate: str    #연중 최저가 대비 현재가 비율
    dryy_lwpr_date: str    #연중 최저가 일자
    w52_hgpr: str    #52주일 최고가
    w52_hgpr_vrss_prpr_ctrt: str    #52주일 최고가 대비 현재가 대비
    w52_hgpr_date: str    #52주일 최고가 일자
    w52_lwpr: str    #52주일 최저가
    w52_lwpr_vrss_prpr_ctrt: str    #52주일 최저가 대비 현재가 대비
    w52_lwpr_date: str    #52주일 최저가 일자
    whol_loan_rmnd_rate: str    #전체 융자 잔고 비율
    ssts_yn: str    #공매도가능여부
    stck_shrn_iscd: str    #주식 단축 종목코드
    fcam_cnnm: str    #액면가 통화명
    cpfn_cnnm: str    #자본금 통화명
    apprch_rate: str    #접근도
    frgn_hldn_qty: str    #외국인 보유 수량
    vi_cls_code: str    #VI적용구분코드
    ovtm_vi_cls_code: str    #시간외단일가VI적용구분코드
    last_ssts_cntg_qty: str    #최종 공매도 체결 수량
    invt_caful_yn: str    #투자유의여부
    mrkt_warn_cls_code: str    #시장경고코드
    short_over_yn: str    #단기과열여부
    sltr_yn: str    #정리매매여부
    mang_issu_cls_code: str    #관리종목여부`

---

# **WEBSOCKET해외주식 실시간호가[실시간-021]**

**개별문서 다운로드**

| **Method** | POST | **URL** | /tryitout/HDFSASP0 |
| --- | --- | --- | --- |
| **실전 Domain** | ws://ops.koreainvestment.com:21000 | **모의 Domain** | 모의투자 미지원 |
| **실전 TR ID** | HDFSASP0 | **모의 TR ID** | 모의투자 미지원 |
| **Format** |  | **Content-Type** |  |

# **개요**

`해외주식 실시간호가 API를 이용하여 미국 실시간 10호가(매수/매도) 시세가 무료로 제공됩니다. (미국은 유료시세 제공 X)

아시아 국가의 경우, HTS(efriend Plus) [7781] 시세신청(실시간) 화면에서 유료 서비스 신청 시, 
"해외주식 실시간호가 HDFSASP0" 을 이용하여 아시아국가 유료시세(실시간호가)를 받아보실 수 있습니다. (24.11.29 반영)
(아시아 국가 무료시세는 "해외주식 지연호가(아시아) HDFSASP1" 를 이용하시기 바랍니다.)

※ 미국 : 실시간 무료, 매수/매도 각 10호가 (0분지연, 나스닥 마켓센터에서 거래되는 호가 및 호가 잔량 정보)
※ 아시아(홍콩, 베트남, 중국, 일본) : 실시간 유료 (단, 중국은 HTS[7781]에서 실시간시세 무료로 신청 후 이용 가능)

해당 API로 미국주간거래(10:00~16:00) 시세 조회도 가능합니다.
※ 미국주간거래 실시간 조회 시, 맨 앞자리(R), tr_key 중 시장구분 값을 다음과 같이 입력 → 나스닥: BAQ, 뉴욕: BAY, 아멕스: BAA

[참고자료]

실시간시세(웹소켓) 파이썬 샘플코드는 한국투자증권 Github 참고 부탁드립니다.
https://github.com/koreainvestment/open-trading-api/blob/main/websocket/python/ws_domestic_overseas_all.py

실시간시세(웹소켓) API 사용방법에 대한 자세한 설명은 한국투자증권 Wikidocs 참고 부탁드립니다.
https://wikidocs.net/book/7847 (국내주식 업데이트 완료, 추후 해외주식·국내선물옵션 업데이트 예정)

[미국주식시세 이용시 유의사항]

■ 무료 실시간 시세(나스닥 토탈뷰)를 별도 신청없이 제공하고 있으며, 유료 시세 서비스를 신청하시더라도 OpenAPI의 경우 무료 시세로만 제공하고있습니다. 
 
※ 무료(매수/매도 각 10호가) : 나스닥 마켓센터에서 거래되는 호가 및 호가 잔량 정보
※ 유료(매수/매도 각 1호가) : OpenAPI 서비스 미제공

■ 무료 실시간 시세 서비스는 유료 실시간 시세 서비스 대비 평균 50% 수준에 해당하는 정보이므로 현재가/호가/순간체결량/차트 등에서 일시적·부분적 차이가 
있을 수 있으며 이로 인해 발생하는 손실에 대해서 당사가 책임지지 않습니다.

■ 무료 실시간 시세 서비스의 시가, 저가, 고가, 종가는 유료 실시간 시세 서비스와 다를 수 있으며, 
종목별 과거 데이터(거래량, 시가, 종가, 고가, 차트 데이터 등)는 장 종료 후(오후 12시경) 유료 실시간 시세 서비스 데이터와 동일하게 업데이트됩니다.
(출처: 한국투자증권 외화증권 거래설명서 - https://securities.koreainvestment.com/main/customer/guide/Guide.jsp?&cmd=TF04ag010002¤tPage=1&num=64)`

# **요청**

### **Header**

| **Element** | **한글명** | **Type** | **Required** | **Length** | **Description** |
| --- | --- | --- | --- | --- | --- |
| approval_key | 웹소켓 접속키 | String | Y | 286 | 실시간 (웹소켓) 접속키 발급 API(/oauth2/Approval)를 사용하여 발급받은 웹소켓 접속키 |
| custtype | 고객 타입 | String | Y | 1 | B : 법인 / P : 개인 |
| tr_type | 등록/해제 | String | Y | 1 | "1: 등록, 2:해제" |
| content-type | 컨텐츠타입 | String | Y | 20 | utf-8 |

### **Body**

| **Element** | **한글명** | **Type** | **Required** | **Length** | **Description** |
| --- | --- | --- | --- | --- | --- |
| tr_id | 거래ID | String | Y | 7 | HDFSASP0 |
| tr_key | R거래소명종목코드 | String | Y | 6 | <미국 야간거래 - 무료시세>D+시장구분(3자리)+종목코드예) DNASAAPL : D+NAS(나스닥)+AAPL(애플)[시장구분]NYS : 뉴욕, NAS : 나스닥, AMS : 아멕스<미국 주간거래>R+시장구분(3자리)+종목코드예) RBAQAAPL : R+BAQ(나스닥)+AAPL(애플)[시장구분]BAY : 뉴욕(주간), BAQ : 나스닥(주간). BAA : 아멕스(주간)<아시아국가 - 유료시세>※ 유료시세 신청시에만 유료시세 수신가능"포럼 > FAQ > 해외주식 유료시세 신청방법" 참고R+시장구분(3자리)+종목코드예) RHKS00003 : R+HKS(홍콩)+00003(홍콩중화가스)[시장구분]TSE : 도쿄, HKS : 홍콩,SHS : 상해, SZS : 심천HSX : 호치민, HNX : 하노이 |

# **응답**

### **Header**

### **Body**

| **Element** | **한글명** | **Type** | **Required** | **Length** | **Description** |
| --- | --- | --- | --- | --- | --- |
| RSYM | 실시간종목코드 | Object | Y | 16 | '각 항목사이에는 구분자로 ^ 사용,모든 데이터타입은 String으로 변환되어 push 처리됨' |
| SYMB | 종목코드 | String | Y | 16 |  |
| ZDIV | 소숫점자리수 | String | Y | 1 |  |
| XYMD | 현지일자 | String | Y | 8 |  |
| XHMS | 현지시간 | String | Y | 6 |  |
| KYMD | 한국일자 | String | Y | 8 |  |
| KHMS | 한국시간 | String | Y | 6 |  |
| BVOL | 매수총잔량 | String | Y | 10 |  |
| AVOL | 매도총잔량 | String | Y | 10 |  |
| BDVL | 매수총잔량대비 | String | Y | 10 |  |
| ADVL | 매도총잔량대비 | String | Y | 10 |  |
| PBID1 | 매수호가1 | String | Y | 12 |  |
| PASK1 | 매도호가1 | String | Y | 12 |  |
| VBID1 | 매수잔량1 | String | Y | 10 |  |
| VASK1 | 매도잔량1 | String | Y | 10 |  |
| DBID1 | 매수잔량대비1 | String | Y | 10 |  |
| DASK1 | 매도잔량대비1 | String | Y | 10 |  |
| PBID2 | 매수호가2 | String | Y | 12 |  |
| PASK2 | 매도호가2 | String | Y | 12 |  |
| VBID2 | 매수잔량2 | String | Y | 10 |  |
| VASK2 | 매도잔량2 | String | Y | 10 |  |
| DBID2 | 매수잔량대비2 | String | Y | 10 |  |
| DASK2 | 매도잔량대비2 | String | Y | 10 |  |
| PBID3 | 매수호가3 | String | Y | 12 |  |
| PASK3 | 매도호가3 | String | Y | 12 |  |
| VBID3 | 매수잔량3 | String | Y | 10 |  |
| VASK3 | 매도잔량3 | String | Y | 10 |  |
| DBID3 | 매수잔량대비3 | String | Y | 10 |  |
| DASK3 | 매도잔량대비3 | String | Y | 10 |  |
| PBID3 | 매수호가3 | String | Y | 12 |  |
| PASK3 | 매도호가3 | String | Y | 12 |  |
| VBID3 | 매수잔량3 | String | Y | 10 |  |
| VASK3 | 매도잔량3 | String | Y | 10 |  |
| DBID3 | 매수잔량대비3 | String | Y | 10 |  |
| DASK3 | 매도잔량대비3 | String | Y | 10 |  |
| PBID4 | 매수호가4 | String | Y | 12 |  |
| PASK4 | 매도호가4 | String | Y | 12 |  |
| VBID4 | 매수잔량4 | String | Y | 10 |  |
| VASK4 | 매도잔량4 | String | Y | 10 |  |
| DBID4 | 매수잔량대비4 | String | Y | 10 |  |
| DASK4 | 매도잔량대비4 | String | Y | 10 |  |
| PBID5 | 매수호가5 | String | Y | 12 |  |
| PASK5 | 매도호가5 | String | Y | 12 |  |
| VBID5 | 매수잔량5 | String | Y | 10 |  |
| VASK5 | 매도잔량5 | String | Y | 10 |  |
| DBID5 | 매수잔량대비5 | String | Y | 10 |  |
| DASK5 | 매도잔량대비5 | String | Y | 10 |  |
| PBID6 | 매수호가6 | String | Y | 12 |  |
| PASK6 | 매도호가6 | String | Y | 12 |  |
| VBID6 | 매수잔량6 | String | Y | 10 |  |
| VASK6 | 매도잔량6 | String | Y | 10 |  |
| DBID6 | 매수잔량대비6 | String | Y | 10 |  |
| DASK6 | 매도잔량대비6 | String | Y | 10 |  |
| PBID7 | 매수호가7 | String | Y | 12 |  |
| PASK7 | 매도호가7 | String | Y | 12 |  |
| VBID7 | 매수잔량7 | String | Y | 10 |  |
| VASK7 | 매도잔량7 | String | Y | 10 |  |
| DBID7 | 매수잔량대비7 | String | Y | 10 |  |
| DASK7 | 매도잔량대비7 | String | Y | 10 |  |
| PBID8 | 매수호가8 | String | Y | 12 |  |
| PASK8 | 매도호가8 | String | Y | 12 |  |
| VBID8 | 매수잔량8 | String | Y | 10 |  |
| VASK8 | 매도잔량8 | String | Y | 10 |  |
| DBID8 | 매수잔량대비8 | String | Y | 10 |  |
| DASK8 | 매도잔량대비8 | String | Y | 10 |  |
| PBID9 | 매수호가9 | String | Y | 12 |  |
| PASK9 | 매도호가9 | String | Y | 12 |  |
| VBID9 | 매수잔량9 | String | Y | 10 |  |
| VASK9 | 매도잔량9 | String | Y | 10 |  |
| DBID9 | 매수잔량대비9 | String | Y | 10 |  |
| DASK9 | 매도잔량대비9 | String | Y | 10 |  |
| PBID10 | 매수호가10 | String | Y | 12 |  |
| PASK10 | 매도호가10 | String | Y | 12 |  |
| VBID10 | 매수잔량10 | String | Y | 10 |  |
| VASK10 | 매도잔량10 | String | Y | 10 |  |
| DBID10 | 매수잔량대비10 | String | Y | 10 |  |
| DASK10 | 매도잔량대비10 | String | Y | 10 |  |

# **예시**

### **Request**

- **Data Class (Python)**

### Data Class (Python)

```python
from dataclasses import dataclass

@dataclass
class RequestHeader:
    approval_key: str    #웹소켓 접속키
    custtype: str    #고객 타입
    tr_type: str    #등록/해제
    content-type: str    #컨텐츠타입

@dataclass
class RequestBody:
    tr_id: str    #거래ID
    tr_key: str    #R거래소명종목코드

```

**복사하기**

### **Response**

- **Data Class (Python)**

### Data Class (Python)

`from dataclasses import dataclass
from typing import List, Optional

@dataclass
class ResponseHeader:

@dataclass
class ResponseBody:
    RSYM: ResponseBodyRSYM    #실시간종목코드
    SYMB: str    #종목코드
    ZDIV: str    #소숫점자리수
    XYMD: str    #현지일자
    XHMS: str    #현지시간
    KYMD: str    #한국일자
    KHMS: str    #한국시간
    BVOL: str    #매수총잔량
    AVOL: str    #매도총잔량
    BDVL: str    #매수총잔량대비
    ADVL: str    #매도총잔량대비
    PBID1: str    #매수호가1
    PASK1: str    #매도호가1
    VBID1: str    #매수잔량1
    VASK1: str    #매도잔량1
    DBID1: str    #매수잔량대비1
    DASK1: str    #매도잔량대비1
    PBID2: str    #매수호가2
    PASK2: str    #매도호가2
    VBID2: str    #매수잔량2
    VASK2: str    #매도잔량2
    DBID2: str    #매수잔량대비2
    DASK2: str    #매도잔량대비2
    PBID3: str    #매수호가3
    PASK3: str    #매도호가3
    VBID3: str    #매수잔량3
    VASK3: str    #매도잔량3
    DBID3: str    #매수잔량대비3
    DASK3: str    #매도잔량대비3
    PBID3: str    #매수호가3
    PASK3: str    #매도호가3
    VBID3: str    #매수잔량3
    VASK3: str    #매도잔량3
    DBID3: str    #매수잔량대비3
    DASK3: str    #매도잔량대비3
    PBID4: str    #매수호가4
    PASK4: str    #매도호가4
    VBID4: str    #매수잔량4
    VASK4: str    #매도잔량4
    DBID4: str    #매수잔량대비4
    DASK4: str    #매도잔량대비4
    PBID5: str    #매수호가5
    PASK5: str    #매도호가5
    VBID5: str    #매수잔량5
    VASK5: str    #매도잔량5
    DBID5: str    #매수잔량대비5
    DASK5: str    #매도잔량대비5
    PBID6: str    #매수호가6
    PASK6: str    #매도호가6
    VBID6: str    #매수잔량6
    VASK6: str    #매도잔량6
    DBID6: str    #매수잔량대비6
    DASK6: str    #매도잔량대비6
    PBID7: str    #매수호가7
    PASK7: str    #매도호가7
    VBID7: str    #매수잔량7
    VASK7: str    #매도잔량7
    DBID7: str    #매수잔량대비7
    DASK7: str    #매도잔량대비7
    PBID8: str    #매수호가8
    PASK8: str    #매도호가8
    VBID8: str    #매수잔량8
    VASK8: str    #매도잔량8
    DBID8: str    #매수잔량대비8
    DASK8: str    #매도잔량대비8
    PBID9: str    #매수호가9
    PASK9: str    #매도호가9
    VBID9: str    #매수잔량9
    VASK9: str    #매도잔량9
    DBID9: str    #매수잔량대비9
    DASK9: str    #매도잔량대비9
    PBID10: str    #매수호가10
    PASK10: str    #매도호가10
    VBID10: str    #매수잔량10
    VASK10: str    #매도잔량10
    DBID10: str    #매수잔량대비10
    DASK10: str    #매도잔량대비10

@dataclass
class ResponseBodyRSYM:`

---

[해외주식] 실시간시세

**카테고리 다운로드**

# **WEBSOCKET해외주식 지연호가(아시아)[실시간-008]**

**개별문서 다운로드**

| **Method** | POST | **URL** | /tryitout/HDFSASP1 |
| --- | --- | --- | --- |
| **실전 Domain** | ws://ops.koreainvestment.com:21000 | **모의 Domain** | 제공 안함 |
| **실전 TR ID** | HDFSASP1 | **모의 TR ID** | 모의투자 미지원 |
| **Format** |  | **Content-Type** |  |

# **개요**

`해외주식 지연호가(아시아)의 경우 아시아 무료시세(지연호가)가 제공됩니다.

HTS(efriend Plus) [7781] 시세신청(실시간) 화면에서 유료 서비스 신청 시, 
"해외주식 실시간호가 HDFSASP0" 을 이용하여 아시아국가 유료시세(실시간호가)를 받아보실 수 있습니다. (24.11.29 반영)

※ 지연시세 지연시간 : 홍콩, 베트남, 중국, 일본 - 15분지연

[참고자료]

실시간시세(웹소켓) 파이썬 샘플코드는 한국투자증권 Github 참고 부탁드립니다.
https://github.com/koreainvestment/open-trading-api/blob/main/websocket/python/ws_domestic_overseas_all.py

실시간시세(웹소켓) API 사용방법에 대한 자세한 설명은 한국투자증권 Wikidocs 참고 부탁드립니다.
https://wikidocs.net/book/7847 (국내주식 업데이트 완료, 추후 해외주식·국내선물옵션 업데이트 예정)`

# **요청**

### **Header**

| **Element** | **한글명** | **Type** | **Required** | **Length** | **Description** |
| --- | --- | --- | --- | --- | --- |
| approval_key | 웹소켓 접속키 | String | Y | 286 | 실시간 (웹소켓) 접속키 발급 API(/oauth2/Approval)를 사용하여 발급받은 웹소켓 접속키 |
| custtype | 고객 타입 | String | Y | 1 | B : 법인 / P : 개인 |
| tr_type | 등록/해제 | String | Y | 1 | "1: 등록, 2:해제" |
| content-type | 컨텐츠타입 | String | Y | 20 | utf-8 |

### **Body**

| **Element** | **한글명** | **Type** | **Required** | **Length** | **Description** |
| --- | --- | --- | --- | --- | --- |
| tr_id | 거래ID | String | Y | 7 | HDFSASP1 |
| tr_key | D거래소명종목코드 | String | Y | 6 | <아시아국가 - 무료시세>D+시장구분(3자리)+종목코드예) DHKS00003 : D+HKS(홍콩)+00003(홍콩중화가스)[시장구분]TSE : 도쿄, HKS : 홍콩,SHS : 상해, SZS : 심천HSX : 호치민, HNX : 하노이 |

# **응답**

### **Header**

### **Body**

| **Element** | **한글명** | **Type** | **Required** | **Length** | **Description** |
| --- | --- | --- | --- | --- | --- |
| RSYM | 실시간종목코드 | String | Y | 16 | '각 항목사이에는 구분자로 ^ 사용,모든 데이터타입은 String으로 변환되어 push 처리됨' |
| SYMB | 종목코드 | String | Y | 16 |  |
| ZDIV | 소수점자리수 | String | Y | 1 |  |
| XYMD | 현지일자 | String | Y | 8 |  |
| XHMS | 현지시간 | String | Y | 6 |  |
| KYMD | 한국일자 | String | Y | 8 |  |
| KHMS | 한국시간 | String | Y | 6 |  |
| BVOL | 매수총잔량 | String | Y | 10 |  |
| AVOL | 매도총잔량 | String | Y | 10 |  |
| BDVL | 매수총잔량대비 | String | Y | 10 |  |
| ADVL | 매도총잔량대비 | String | Y | 10 |  |
| PBID1 | 매수호가1 | String | Y | 12 |  |
| PASK1 | 매도호가1 | String | Y | 12 |  |
| VBID1 | 매수잔량1 | String | Y | 10 |  |
| VASK1 | 매도잔량1 | String | Y | 10 |  |
| DBID1 | 매수잔량대비1 | String | Y | 10 |  |
| DASK1 | 매도잔량대비1 | String | Y | 10 |  |

# **예시**

### **Request**

- **Data Class (Python)**

### Data Class (Python)

```python
from dataclasses import dataclass

@dataclass
class RequestHeader:
    approval_key: str    #웹소켓 접속키
    custtype: str    #고객 타입
    tr_type: str    #등록/해제
    content-type: str    #컨텐츠타입

@dataclass
class RequestBody:
    tr_id: str    #거래ID
    tr_key: str    #D거래소명종목코드

```

**복사하기**

### **Response**

- **Data Class (Python)**

### Data Class (Python)

`from dataclasses import dataclass
from typing import List, Optional

@dataclass
class ResponseHeader:

@dataclass
class ResponseBody:
    RSYM: str    #실시간종목코드
    SYMB: str    #종목코드
    ZDIV: str    #소수점자리수
    XYMD: str    #현지일자
    XHMS: str    #현지시간
    KYMD: str    #한국일자
    KHMS: str    #한국시간
    BVOL: str    #매수총잔량
    AVOL: str    #매도총잔량
    BDVL: str    #매수총잔량대비
    ADVL: str    #매도총잔량대비
    PBID1: str    #매수호가1
    PASK1: str    #매도호가1
    VBID1: str    #매수잔량1
    VASK1: str    #매도잔량1
    DBID1: str    #매수잔량대비1
    DASK1: str    #매도잔량대비1`


    005930   KR7005930003삼성전자                                ST1002700130000 NN5YYY YYNNNNNNN0NNNNNNNY0001504000000100001NNN00NNN000000060Y0900000397483680000000001001975061100000000591963700000000077804668500012       0 NYY00239768600023527400028453325565000008.3720250930008903135511NNY
005935   KR7005931001삼성전자우                              ST0002700130000 NN0NNN NNNNNNNNN0NNNNNNNN0001101000000100001NNN00NNN000000060Y0900000040519940000000001001989092500000000081597400000000011946713500012       1 


[국내주식] 종목정보


카테고리 다운로드
REST
주식기본조회[v1_국내주식-067]

호출테스트

개별문서 다운로드
주식기본조회[v1_국내주식-067]정보 Method, URL, 실전 Domain, 모의 Domain, Format, Content-Type
Method	GET	URL	/uapi/domestic-stock/v1/quotations/search-stock-info
실전 Domain	https://openapi.koreainvestment.com:9443	모의 Domain	모의투자 미지원
실전 TR ID	CTPF1002R	모의 TR ID	모의투자 미지원
Format		Content-Type	
개요
주식기본조회 API입니다.
국내주식 종목의 종목상세정보를 확인할 수 있습니다.
요청
Header
주식주문(현금[V1_국내주식-001]) 정보 Element, 한글명, Type, Rquired, Length, Description
Element	한글명	Type	Required	Length	Description
content-type	컨텐츠타입	String	Y	40	application/json; charset=utf-8
authorization	접근토큰	String	Y	350	OAuth 토큰이 필요한 API 경우 발급한 Access token
일반고객(Access token 유효기간 1일, OAuth 2.0의 Client Credentials Grant 절차를 준용)
법인(Access token 유효기간 3개월, Refresh token 유효기간 1년, OAuth 2.0의 Authorization Code Grant 절차를 준용)
appkey	앱키	String	Y	36	한국투자증권 홈페이지에서 발급받은 appkey (절대 노출되지 않도록 주의해주세요.)
appsecret	앱시크릿키	String	Y	180	한국투자증권 홈페이지에서 발급받은 appkey (절대 노출되지 않도록 주의해주세요.)
personalseckey	고객식별키	String	N	180	[법인 필수] 제휴사 회원 관리를 위한 고객식별키
tr_id	거래ID	String	Y	13	CTPF1002R
tr_cont	연속 거래 여부	String	N	1	tr_cont를 이용한 다음조회 불가 API
custtype	고객 타입	String	Y	1	B : 법인
P : 개인
seq_no	일련번호	String	N	2	[법인 필수] 001
mac_address	맥주소	String	N	12	법인고객 혹은 개인고객의 Mac address 값
phone_number	핸드폰번호	String	N	12	[법인 필수] 제휴사APP을 사용하는 경우 사용자(회원) 핸드폰번호
ex) 01011112222 (하이픈 등 구분값 제거)
ip_addr	접속 단말 공인 IP	String	N	12	[법인 필수] 사용자(회원)의 IP Address
gt_uid	Global UID	String	N	32	[법인 전용] 거래고유번호로 사용하므로 거래별로 UNIQUE해야 함
Query Parameter
주식주문(현금[V1_국내주식-001]) 정보 Element, 한글명, Type, Rquired, Length, Description
Element	한글명	Type	Required	Length	Description
PRDT_TYPE_CD	상품유형코드	String	Y	3	300: 주식, ETF, ETN, ELW
301 : 선물옵션
302 : 채권
306 : ELS'
PDNO	상품번호	String	Y	12	종목번호 (6자리)
ETN의 경우, Q로 시작 (EX. Q500001)
응답
Header
주식주문(현금[V1_국내주식-001]) 정보 Element, 한글명, Type, Rquired, Length, Description
Element	한글명	Type	Required	Length	Description
content-type	컨텐츠타입	String	Y	40	application/json; charset=utf-8
tr_id	거래ID	String	Y	13	요청한 tr_id
tr_cont	연속 거래 여부	String	N	1	tr_cont를 이용한 다음조회 불가 API
gt_uid	Global UID	String	N	32	[법인 전용] 거래고유번호로 사용하므로 거래별로 UNIQUE해야 함
Body
주식주문(현금[V1_국내주식-001]) 정보 Element, 한글명, Type, Rquired, Length, Description
Element	한글명	Type	Required	Length	Description
rt_cd	성공 실패 여부	String	Y	1	
msg_cd	응답코드	String	Y	8	
msg1	응답메세지	String	Y	80	
output	응답상세1	Object	Y		
pdno

상품번호	String	Y	12	
prdt_type_cd

상품유형코드	String	Y	3	
mket_id_cd

시장ID코드	String	Y	3	AGR.농축산물파생
BON.채권파생
CMD.일반상품시장
CUR.통화파생
ENG.에너지파생
EQU.주식파생
ETF.ETF파생
IRT.금리파생
KNX.코넥스
KSQ.코스닥
MTL.금속파생
SPI.주가지수파생
STK.유가증권
scty_grp_id_cd

증권그룹ID코드	String	Y	2	BC.수익증권
DR.주식예탁증서
EF.ETF
EN.ETN
EW.ELW
FE.해외ETF
FO.선물옵션
FS.외국주권
FU.선물
FX.플렉스 선물
GD.금현물
IC.투자계약증권
IF.사회간접자본투융자회사
KN.코넥스주권
MF.투자회사
OP.옵션
RT.부동산투자회사
SC.선박투자회사
SR.신주인수권증서
ST.주권
SW.신주인수권증권
TC.신탁수익증권
excg_dvsn_cd

거래소구분코드	String	Y	2	01.한국증권
02.증권거래소
03.코스닥
04.K-OTC
05.선물거래소
06.CME
07.EUREX
21.금현물
50.미국주간
51.홍콩
52.상해B
53.심천
54.홍콩거래소
55.미국
56.일본
57.상해A
58.심천A
59.베트남
61.장전시간외시장
64.경쟁대량매매
65.경매매시장
81.시간외단일가시장
setl_mmdd

결산월일	String	Y	4	
lstg_stqt

상장주수	String	Y	19	
lstg_cptl_amt

상장자본금액	String	Y	19	
cpta

자본금	String	Y	19	
papr

액면가	String	Y	19	
issu_pric

발행가격	String	Y	19	
kospi200_item_yn

코스피200종목여부	String	Y	1	
scts_mket_lstg_dt

유가증권시장상장일자	String	Y	8	
scts_mket_lstg_abol_dt

유가증권시장상장폐지일자	String	Y	8	
kosdaq_mket_lstg_dt

코스닥시장상장일자	String	Y	8	
kosdaq_mket_lstg_abol_dt

코스닥시장상장폐지일자	String	Y	8	
frbd_mket_lstg_dt

프리보드시장상장일자	String	Y	8	
frbd_mket_lstg_abol_dt

프리보드시장상장폐지일자	String	Y	8	
reits_kind_cd

리츠종류코드	String	Y	1	
etf_dvsn_cd

ETF구분코드	String	Y	2	
oilf_fund_yn

유전펀드여부	String	Y	1	
idx_bztp_lcls_cd

지수업종대분류코드	String	Y	3	
idx_bztp_mcls_cd

지수업종중분류코드	String	Y	3	
idx_bztp_scls_cd

지수업종소분류코드	String	Y	3	
stck_kind_cd

주식종류코드	String	Y	3	000.해당사항없음
101.보통주
201.우선주
202.2우선주
203.3우선주
204.4우선주
205.5우선주
206.6우선주
207.7우선주
208.8우선주
209.9우선주
210.10우선주
211.11우선주
212.12우선주
213.13우선주
214.14우선주
215.15우선주
216.16우선주
217.17우선주
218.18우선주
219.19우선주
220.20우선주
301.후배주
401.혼합주
mfnd_opng_dt

뮤추얼펀드개시일자	String	Y	8	
mfnd_end_dt

뮤추얼펀드종료일자	String	Y	8	
dpsi_erlm_cncl_dt

예탁등록취소일자	String	Y	8	
etf_cu_qty

ETFCU수량	String	Y	10	
prdt_name

상품명	String	Y	60	
prdt_name120

상품명120	String	Y	120	
prdt_abrv_name

상품약어명	String	Y	60	
std_pdno

표준상품번호	String	Y	12	
prdt_eng_name

상품영문명	String	Y	60	
prdt_eng_name120

상품영문명120	String	Y	120	
prdt_eng_abrv_name

상품영문약어명	String	Y	60	
dpsi_aptm_erlm_yn

예탁지정등록여부	String	Y	1	
etf_txtn_type_cd

ETF과세유형코드	String	Y	2	
etf_type_cd

ETF유형코드	String	Y	2	
lstg_abol_dt

상장폐지일자	String	Y	8	
nwst_odst_dvsn_cd

신주구주구분코드	String	Y	2	
sbst_pric

대용가격	String	Y	19	
thco_sbst_pric

당사대용가격	String	Y	19	
thco_sbst_pric_chng_dt

당사대용가격변경일자	String	Y	8	
tr_stop_yn

거래정지여부	String	Y	1	
admn_item_yn

관리종목여부	String	Y	1	
thdt_clpr

당일종가	String	Y	19	
bfdy_clpr

전일종가	String	Y	19	
clpr_chng_dt

종가변경일자	String	Y	8	
std_idst_clsf_cd

표준산업분류코드	String	Y	6	
std_idst_clsf_cd_name

표준산업분류코드명	String	Y	130	표준산업소분류코드
000000 해당사항없음
010101 작물 재배업
010102 축산업
010103 작물재배 및 축산 복합농업
010104 작물재배 및 축산 관련 서비스업
010105 수렵 및 관련 서비스업
010201 임업
010301 어로 어업
010302 양식어업 및 어업관련 서비스업
020501 석탄 광업
020502 원유 및 천연가스 채굴업
020601 철 광업
020602 비철금속 광업
020701 토사석 광업
020702 기타 비금속광물 광업
020801 광업 지원 서비스업
031001 도축, 육류 가공 및 저장 처리업
031002 수산물 가공 및 저장 처리업
031003 과실, 채소 가공 및 저장 처리업
031004 동물성 및 식물성 유지 제조업
031005 낙농제품 및 식용빙과류 제조업
031006 곡물가공품, 전분 및 전분제품 제조업
031007 기타 식품 제조업
031008 동물용 사료 및 조제식품 제조업
031101 알콜음료 제조업
031102 비알콜음료 및 얼음 제조업
031201 담배 제조업
031301 방적 및 가공사 제조업
031302 직물직조 및 직물제품 제조업
031303 편조원단 및 편조제품 제조업
031304 섬유제품 염색, 정리 및 마무리 가공업
031309 기타 섬유제품 제조업
031401 봉제의복 제조업
031402 모피가공 및 모피제품 제조업
031403 편조의복 제조업
031404 의복 액세서리 제조업
031501 가죽, 가방 및 유사제품 제조업
031502 신발 및 신발부분품 제조업
031601 제재 및 목재 가공업
031602 나무제품 제조업
031603 코르크 및 조물 제품 제조업
031701 펄프, 종이 및 판지 제조업
031702 골판지, 종이 상자 및 종이용기 제조업
031709 기타 종이 및 판지 제품 제조업
031801 인쇄 및 인쇄관련 산업
031802 기록매체 복제업
031901 코크스 및 연탄 제조업
031902 석유 정제품 제조업
032001 기초화학물질 제조업
032002 비료 및 질소화합물 제조업
032003 합성고무 및 플라스틱 물질 제조업
032004 기타 화학제품 제조업
032005 화학섬유 제조업
032101 기초 의약물질 및 생물학적 제제 제조업
032102 의약품 제조업
032103 의료용품 및 기타 의약관련제품 제조업
032201 고무제품 제조업
032202 플라스틱제품 제조업
032301 유리 및 유리제품 제조업
032302 도자기 및 기타 요업제품 제조업
032303 시멘트, 석회, 플라스터 및 그 제품 제조업
032309 기타 비금속 광물제품 제조업
032401 1차 철강 제조업
032402 1차 비철금속 제조업
032403 금속 주조업
032501 구조용 금속제품, 탱크 및 증기발생기 제조업
032502 무기 및 총포탄 제조업
032509 기타 금속가공제품 제조업
032601 반도체 제조업
032602 전자부품 제조업
032603 컴퓨터 및 주변장치 제조업
032604 통신 및 방송 장비 제조업
032605 영상 및 음향기기 제조업
032606 마그네틱 및 광학 매체 제조업
032701 의료용 기기 제조업
032702 측정, 시험, 항해, 제어 및 기타 정밀기기 제조업; ?
032703 안경, 사진장비 및 기타 광학기기 제조업
032704 시계 및 시계부품 제조업
032801 전동기, 발전기 및 전기 변환 · 공급 · 제어 장치
032802 일차전지 및 축전지 제조업
032803 절연선 및 케이블 제조업
032804 전구 및 조명장치 제조업
032805 가정용 기기 제조업
032809 기타 전기장비 제조업
032901 일반 목적용 기계 제조업
032902 특수 목적용 기계 제조업
033001 자동차용 엔진 및 자동차 제조업
033002 자동차 차체 및 트레일러 제조업
033003 자동차 부품 제조업
033101 선박 및 보트 건조업
033102 철도장비 제조업
033103 항공기,우주선 및 부품 제조업
033109 그외 기타 운송장비 제조업
033201 가구 제조업
033301 귀금속 및 장신용품 제조업
033302 악기 제조업
033303 운동 및 경기용구 제조업
033304 인형,장난감 및 오락용품 제조업
033309 그외 기타 제품 제조업
043501 전기업
043502 가스 제조 및 배관공급업
043503 증기, 냉온수 및 공기조절 공급업
043601 수도사업
053701 하수, 폐수 및 분뇨 처리업
053801 폐기물 수집운반업
053802 폐기물 처리업
053803 금속 및 비금속 원료 재생업
053901 환경 정화 및 복원업
064101 건물 건설업
064102 토목 건설업
064201 기반조성 및 시설물 축조관련 전문공사업
064202 건물설비 설치 공사업
064203 전기 및 통신 공사업
064204 실내건축 및 건축 마무리 공사업
064205 건설장비 운영업
074501 자동차 판매업
074502 자동차 부품 및 내장품 판매업
074503 모터사이클 및 부품 판매업
074601 상품 중개업
074602 산업용 농축산물 및 산동물 도매업
074603 음·식료품 및 담배 도매업
074604 가정용품 도매업
074605 기계장비 및 관련 물품 도매업
074606 건축자재, 철물 및 난방장치 도매업
074607 기타 전문 도매업
074608 상품 종합 도매업
074701 종합 소매업
074702 음·식료품 및 담배 소매업
074703 정보통신장비 소매업
074704 섬유, 의복, 신발 및 가죽제품 소매업
074705 기타 가정용품 소매업
074706 문화, 오락 및 여가 용품 소매업
074707 연료 소매업
074708 기타 상품 전문 소매업
074709 무점포 소매업
084901 철도운송업
084902 육상 여객 운송업
084903 도로 화물 운송업
084904 소화물 전문 운송업
084905 파이프라인 운송업
085001 해상 운송업
085002 내륙 수상 및 항만내 운송업
085101 정기 항공 운송업
085102 부정기 항공 운송업
085201 보관 및 창고업
085209 기타 운송관련 서비스업
095501 숙박시설 운영업
095509 기타 숙박업
095601 음식점업
095602 주점 및 비알콜음료점업
105801 서적, 잡지 및 기타 인쇄물 출판업
105802 소프트웨어 개발 및 공급업
105901 영화, 비디오물, 방송프로그램 제작 및 배급업
105902 오디오물 출판 및 원판 녹음업
106001 라디오 방송업
106002 텔레비전 방송업
106101 우편업
106102 전기통신업
106201 컴퓨터 프로그래밍, 시스템 통합 및 관리업
106301 자료처리, 호스팅, 포털 및 기타 인터넷 정보매개서?
106309 기타 정보 서비스업
116401 은행 및 저축기관
116402 투자기관
116409 기타 금융업
116501 보험업
116502 재 보험업
116503 연금 및 공제업
116601 금융지원 서비스업
116602 보험 및 연금관련 서비스업
126801 부동산 임대 및 공급업
126802 부동산 관련 서비스업
126901 운송장비 임대업
126902 개인 및 가정용품 임대업
126903 산업용 기계 및 장비 임대업
126904 무형재산권 임대업
137001 자연과학 및 공학 연구개발업
137002 인문 및 사회과학 연구개발업
137101 법무관련 서비스업
137102 회계 및 세무관련 서비스업
137103 광고업
137104 시장조사 및 여론조사업
137105 회사본부, 지주회사 및 경영컨설팅 서비스업
137201 건축기술, 엔지니어링 및 관련기술 서비스업
137209 기타 과학기술 서비스업
137301 수의업
137302 전문디자인업
137303 사진 촬영 및 처리업
137309 그외 기타 전문, 과학 및 기술 서비스업
147401 사업시설 유지관리 서비스업
147402 건물·산업설비 청소 및 방제 서비스업
147403 조경 관리 및 유지 서비스업
147501 인력공급 및 고용알선업
147502 여행사 및 기타 여행보조 서비스업
147503 경비, 경호 및 탐정업
147509 기타 사업지원 서비스업
158401 입법 및 일반 정부 행정
158402 사회 및 산업정책 행정
158403 외무 및 국방 행정
158404 사법 및 공공질서 행정
158405 사회보장 행정
168501 초등 교육기관
168502 중등 교육기관
168503 고등 교육기관
168504 특수학교, 외국인학교 및 대안학교
168505 일반 교습 학원
168506 기타 교육기관
168507 교육지원 서비스업
178601 병원
178602 의원
178603 공중 보건 의료업
178609 기타 보건업
178701 거주 복지시설 운영업
178702 비거주 복지시설 운영업
189001 창작 및 예술관련 서비스업
189002 도서관, 사적지 및 유사 여가관련 서비스업
189101 스포츠 서비스업
189102 유원지 및 기타 오락관련 서비스업
199401 산업 및 전문가 단체
199402 노동조합
199409 기타 협회 및 단체
199501 기계 및 장비 수리업
199502 자동차 및 모터사이클 수리업
199503 개인 및 가정용품 수리업
199601 미용, 욕탕 및 유사 서비스업
199609 그외 기타 개인 서비스업
209701 가구내 고용활동
209801 자가 소비를 위한 가사 생산 활동
209802 자가 소비를 위한 가사 서비스 활동
219901 국제 및 외국기관
idx_bztp_lcls_cd_name

지수업종대분류코드명	String	Y	60	표준산업대분류코드
00 해당사항없음
01 농업, 임업 및 어업
02 광업
03 제조업
04 전기, 가스, 증기 및 수도사업
05 하수-폐기물 처리, 원료재생 및환경복원업
06 건설업
07 도매 및 소매업
08 운수업
09 숙박 및 음식점업
10 출판, 영상, 방송통신 및 정보서비스업
11 금융 및 보험업
12 부동산업 및 임대업
13 전문, 과학 및 기술 서비스업
14 사업시설관리 및 사업지원서비스업
15 공공행정, 국방 및 사회보장 행정
16 교육 서비스업
17 보건업 및 사회복지 서비스업
18 예술, 스포츠 및 여가관련 서비스업
19 협회 및 단체, 수리 및 기타 개인 서비스업
20 가구내 고용활동 및 달리 분류되지 않은 자가소비생산활동
21 국제 및 외국기관
idx_bztp_mcls_cd_name

지수업종중분류코드명	String	Y	60	표준산업중분류코드
0000 해당사항없음
0101 농업
0102 임업
0103 어업
0205 석탄, 원유 및 천연가스 광업
0206 금속 광업
0207 비금속광물 광업; 연료용 제외
0208 광업 지원 서비스업
0310 식료품 제조업
0311 음료 제조업
0312 담배 제조업
0313 섬유제품 제조업; 의복제외
0314 의복, 의복액세서리 및 모피제품제조업
0315 가죽, 가방 및 신발 제조업
0316 목재 및 나무제품 제조업;가구제외
0317 펄프, 종이 및 종이제품 제조업
0318 인쇄 및 기록매체 복제업
0319 코크스, 연탄 및 석유정제품 제조업
0320 화학물질 및 화학제품 제조업;의약품 제외
0321 의료용 물질 및 의약품 제조업
0322 고무제품 및 플라스틱제품 제조업
0323 비금속 광물제품 제조업
0324 1차 금속 제조업
0325 금속가공제품 제조업;기계 및가구 제외
0326 전자부품, 컴퓨터, 영상, 음향 및 통신장비 제조업
0327 의료, 정밀, 광학기기 및 시계 제조업
0328 전기장비 제조업
0329 기타 기계 및 장비 제조업
0330 자동차 및 트레일러 제조업
0331 기타 운송장비 제조업
0332 가구 제조업
0333 기타 제품 제조업
0435 전기, 가스, 증기 및 공기조절 공급업
0436 수도사업
0537 하수, 폐수 및 분뇨 처리업
0538 폐기물 수집운반, 처리 및 원료재생업
0539 환경 정화 및 복원업
0641 종합 건설업
0642 전문직별 공사업
0745 자동차 및 부품 판매업
0746 도매 및 상품중개업
0747 소매업; 자동차 제외
0849 육상운송 및 파이프라인 운송업
0850 수상 운송업
0851 항공 운송업
0852 창고 및 운송관련 서비스업
0955 숙박업
0956 음식점 및 주점업
1058 출판업
1059 영상·오디오 기록물 제작 및 배급업
1060 방송업
1061 통신업
1062 컴퓨터 프로그래밍, 시스템 통합및 관리업
1063 정보서비스업
1164 금융업
1165 보험 및 연금업
1166 금융 및 보험 관련 서비스업
1268 부동산업
1269 임대업;부동산 제외
1370 연구개발업
1371 전문서비스업
1372 건축기술, 엔지니어링 및 기타과학기술 서비스업
1373 기타 전문, 과학 및 기술 서비스업
1474 사업시설 관리 및 조경 서비스업
1475 사업지원 서비스업
1584 공공행정, 국방 및 사회보장 행정
1685 교육 서비스업
1786 보건업
1787 사회복지 서비스업
1890 창작, 예술 및 여가관련 서비스업
1891 스포츠 및 오락관련 서비스업
1994 협회 및 단체
1995 수리업
1996 기타 개인 서비스업
2097 가구내 고용활동
2098 달리 분류되지 않은 자가소비를 위한가구의 재화 및 서비스 생산활동
2199 국제 및 외국기관
idx_bztp_scls_cd_name

지수업종소분류코드명	String	Y	60	표준산업소분류코드 참조
ocr_no

OCR번호	String	Y	4	
crfd_item_yn

크라우드펀딩종목여부	String	Y	1	
elec_scty_yn

전자증권여부	String	Y	1	
issu_istt_cd

발행기관코드	String	Y	5	
etf_chas_erng_rt_dbnb

ETF추적수익율배수	String	Y	19	
etf_etn_ivst_heed_item_yn

ETFETN투자유의종목여부	String	Y	1	
stln_int_rt_dvsn_cd

대주이자율구분코드	String	Y	2	
frnr_psnl_lmt_rt

외국인개인한도비율	String	Y	24	
lstg_rqsr_issu_istt_cd

상장신청인발행기관코드	String	Y	5	
lstg_rqsr_item_cd

상장신청인종목코드	String	Y	12	
trst_istt_issu_istt_cd

신탁기관발행기관코드	String	Y	5	
cptt_trad_tr_psbl_yn

NXT 거래종목여부	String	Y	1	NXT 거래가능한 종목은 Y, 그 외 종목은 N
nxt_tr_stop_yn

NXT 거래정지여부	String	Y	1	NXT 거래종목 중 거래정지가 된 종목은 Y, 그 외 모든 종목은 N
예시
Request
Data Class (Python)
Data Class (Python)
from dataclasses import dataclass

@dataclass
class RequestHeader:
    content-type: str    #컨텐츠타입
    authorization: str    #접근토큰
    appkey: str    #앱키
    appsecret: str    #앱시크릿키
    personalseckey: Optional[str] = None    #고객식별키
    tr_id: str    #거래ID
    tr_cont: Optional[str] = None    #연속 거래 여부
    custtype: str    #고객 타입
    seq_no: Optional[str] = None    #일련번호
    mac_address: Optional[str] = None    #맥주소
    phone_number: Optional[str] = None    #핸드폰번호
    ip_addr: Optional[str] = None    #접속 단말 공인 IP
    gt_uid: Optional[str] = None    #Global UID

@dataclass
class RequestQueryParam:
    PRDT_TYPE_CD: str    #상품유형코드
    PDNO: str    #상품번호

복사하기
Response
Data Class (Python)
Data Class (Python)
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class ResponseHeader:
    content-type: str    #컨텐츠타입
    tr_id: str    #거래ID
    tr_cont: Optional[str] = None    #연속 거래 여부
    gt_uid: Optional[str] = None    #Global UID

@dataclass
class ResponseBody:
    rt_cd: str    #성공 실패 여부
    msg_cd: str    #응답코드
    msg1: str    #응답메세지
    output: ResponseBodyoutput    #응답상세1

@dataclass
class ResponseBodyoutput:
    pdno: str    #상품번호
    prdt_type_cd: str    #상품유형코드
    mket_id_cd: str    #시장ID코드
    scty_grp_id_cd: str    #증권그룹ID코드
    excg_dvsn_cd: str    #거래소구분코드
    setl_mmdd: str    #결산월일
    lstg_stqt: str    #상장주수
    lstg_cptl_amt: str    #상장자본금액
    cpta: str    #자본금
    papr: str    #액면가
    issu_pric: str    #발행가격
    kospi200_item_yn: str    #코스피200종목여부
    scts_mket_lstg_dt: str    #유가증권시장상장일자
    scts_mket_lstg_abol_dt: str    #유가증권시장상장폐지일자
    kosdaq_mket_lstg_dt: str    #코스닥시장상장일자
    kosdaq_mket_lstg_abol_dt: str    #코스닥시장상장폐지일자
    frbd_mket_lstg_dt: str    #프리보드시장상장일자
    frbd_mket_lstg_abol_dt: str    #프리보드시장상장폐지일자
    reits_kind_cd: str    #리츠종류코드
    etf_dvsn_cd: str    #ETF구분코드
    oilf_fund_yn: str    #유전펀드여부
    idx_bztp_lcls_cd: str    #지수업종대분류코드
    idx_bztp_mcls_cd: str    #지수업종중분류코드
    idx_bztp_scls_cd: str    #지수업종소분류코드
    stck_kind_cd: str    #주식종류코드
    mfnd_opng_dt: str    #뮤추얼펀드개시일자
    mfnd_end_dt: str    #뮤추얼펀드종료일자
    dpsi_erlm_cncl_dt: str    #예탁등록취소일자
    etf_cu_qty: str    #ETFCU수량
    prdt_name: str    #상품명
    prdt_name120: str    #상품명120
    prdt_abrv_name: str    #상품약어명
    std_pdno: str    #표준상품번호
    prdt_eng_name: str    #상품영문명
    prdt_eng_name120: str    #상품영문명120
    prdt_eng_abrv_name: str    #상품영문약어명
    dpsi_aptm_erlm_yn: str    #예탁지정등록여부
    etf_txtn_type_cd: str    #ETF과세유형코드
    etf_type_cd: str    #ETF유형코드
    lstg_abol_dt: str    #상장폐지일자
    nwst_odst_dvsn_cd: str    #신주구주구분코드
    sbst_pric: str    #대용가격
    thco_sbst_pric: str    #당사대용가격
    thco_sbst_pric_chng_dt: str    #당사대용가격변경일자
    tr_stop_yn: str    #거래정지여부
    admn_item_yn: str    #관리종목여부
    thdt_clpr: str    #당일종가
    bfdy_clpr: str    #전일종가
    clpr_chng_dt: str    #종가변경일자
    std_idst_clsf_cd: str    #표준산업분류코드
    std_idst_clsf_cd_name: str    #표준산업분류코드명
    idx_bztp_lcls_cd_name: str    #지수업종대분류코드명
    idx_bztp_mcls_cd_name: str    #지수업종중분류코드명
    idx_bztp_scls_cd_name: str    #지수업종소분류코드명
    ocr_no: str    #OCR번호
    crfd_item_yn: str    #크라우드펀딩종목여부
    elec_scty_yn: str    #전자증권여부
    issu_istt_cd: str    #발행기관코드
    etf_chas_erng_rt_dbnb: str    #ETF추적수익율배수
    etf_etn_ivst_heed_item_yn: str    #ETFETN투자유의종목여부
    stln_int_rt_dvsn_cd: str    #대주이자율구분코드
    frnr_psnl_lmt_rt: str    #외국인개인한도비율
    lstg_rqsr_issu_istt_cd: str    #상장신청인발행기관코드
    lstg_rqsr_item_cd: str    #상장신청인종목코드
    trst_istt_issu_istt_cd: str    #신탁기관발행기관코드
    cptt_trad_tr_psbl_yn: str    #NXT 거래종목여부
    nxt_tr_stop_yn: str    #NXT 거래정지여부
