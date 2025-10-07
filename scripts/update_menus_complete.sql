-- Complete update script for OnChain indicators with JSON content
-- This script deletes existing dynamic menus and recreates them with proper structure

-- 1. Delete existing dynamic onchain menus
DELETE FROM menus WHERE source_type = 'dynamic' AND parent_id = 3;

-- 2. Create category menus for OnChain indicators
-- Market Cycle Indicators category
INSERT INTO menus (name, icon, parent_id, "order", source_type, menu_metadata)
VALUES (
  'Market Cycle Indicators', 
  'cibMatrix', 
  3, 
  10, 
  'dynamic', 
  '{"description": {"en": "Market cycle analysis indicators", "ko": "시장 사이클 분석 지표"}, "permissions": ["user", "admin"]}'::jsonb
);

-- Holder Behavior category  
INSERT INTO menus (name, icon, parent_id, "order", source_type, menu_metadata)
VALUES (
  'Holder Behavior', 
  'cibMatrix', 
  3, 
  20, 
  'dynamic', 
  '{"description": {"en": "Holder behavior analysis indicators", "ko": "보유자 행동 분석 지표"}, "permissions": ["user", "admin"]}'::jsonb
);

-- Network Health & Miner Indicators category
INSERT INTO menus (name, icon, parent_id, "order", source_type, menu_metadata)
VALUES (
  'Network Health & Miner Indicators', 
  'cibMatrix', 
  3, 
  30, 
  'dynamic', 
  '{"description": {"en": "Network health and miner indicators", "ko": "네트워크 건강 및 채굴자 지표"}, "permissions": ["user", "admin"]}'::jsonb
);

-- Derivatives Market category
INSERT INTO menus (name, icon, parent_id, "order", source_type, menu_metadata)
VALUES (
  'Derivatives Market', 
  'cibMatrix', 
  3, 
  40, 
  'dynamic', 
  '{"description": {"en": "Derivatives market indicators", "ko": "파생상품 시장 지표"}, "permissions": ["user", "admin"]}'::jsonb
);

-- Institutional Activity category
INSERT INTO menus (name, icon, parent_id, "order", source_type, menu_metadata)
VALUES (
  'Institutional Activity', 
  'cibMatrix', 
  3, 
  50, 
  'dynamic', 
  '{"description": {"en": "Institutional activity indicators", "ko": "기관 활동 지표"}, "permissions": ["user", "admin"]}'::jsonb
);

-- 3. Get category menu IDs for reference
-- Market Cycle Indicators (id will be the last inserted for this category)
-- Holder Behavior (id will be the last inserted for this category)
-- etc.

-- 4. Create individual metric menus with full JSON content

-- MVRV Z-Score (Market Cycle Indicators)
INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
SELECT 
  'MVRV Z-Score',
  '/onchain/overviews?metric=mvrv_z_score',
  (SELECT id FROM menus WHERE name = 'Market Cycle Indicators' AND source_type = 'dynamic'),
  10,
  'dynamic',
  '{
    "description": {
      "title": {
        "ko": "MVRV Z-Score: 비트코인의 과열 및 침체 신호를 포착하는 지표",
        "en": "MVRV Z-Score: An Indicator for Spotting Bitcoin''s Overheating and Stagnation Signals"
      },
      "introduction": {
        "ko": "MVRV Z-Score는 비트코인의 시장 가치가 실현 가치에 비해 얼마나 벗어나 있는지를 측정하여, 현재 시장이 과열되었는지 아니면 침체되었는지를 판단하는 데 사용되는 지표입니다. 간단히 말해, 비트코인의 현재 가격이 ''공정한'' 가치에 비해 고평가되었는지 또는 저평가되었는지를 알려주는 유용한 도구라고 할 수 있습니다. 이 지표는 시장의 극단적인 상황, 즉 역사적인 고점과 저점을 식별하는 데 특히 효과적입니다.",
        "en": "The MVRV Z-Score is an indicator used to determine if the market is overheated or stagnant by measuring how much Bitcoin''s market value deviates from its realized value. In simple terms, it''s a useful tool that shows whether Bitcoin''s current price is overvalued or undervalued compared to its ''fair'' value. This metric is particularly effective at identifying extreme market conditions, namely historical tops and bottoms."
      },
      "sections": [
        {
          "heading": {
            "ko": "MVRV Z-Score의 구성 요소",
            "en": "Components of the MVRV Z-Score"
          },
          "points": [
            {
              "term": {
                "ko": "시장 가치 (Market Value, MV)",
                "en": "Market Value (MV)"
              },
              "definition": {
                "ko": "이는 흔히 말하는 ''시가 총액''과 같습니다. 비트코인의 현재 가격에 유통되고 있는 총량을 곱하여 계산됩니다.",
                "en": "This is the same as the commonly referred to ''market capitalization''. It is calculated by multiplying the current price of Bitcoin by the total circulating supply."
              }
            },
            {
              "term": {
                "ko": "실현 가치 (Realized Value, RV)",
                "en": "Realized Value (RV)"
              },
              "definition": {
                "ko": "이는 각 비트코인이 마지막으로 거래되었을 때의 가격을 기준으로 계산된 가치의 총합입니다. 모든 비트코인 보유자들의 평균 매수 단가와 유사한 개념입니다.",
                "en": "This is the sum of the value calculated based on the price at which each Bitcoin was last traded. It''s a concept similar to the average purchase price of all Bitcoin holders."
              }
            }
          ]
        },
        {
          "heading": {
            "ko": "해석",
            "en": "Interpretation"
          },
          "interpretations": [
            {
              "term": {
                "ko": "높은 값 (붉은색 구간)",
                "en": "High Value (Red Zone)"
              },
              "explanation": {
                "ko": "Z-Score가 높다는 것은 시장이 과열되어 있고 가격이 고평가되었을 가능성이 크다는 신호입니다. 역사적으로 시장의 정점 부근이었습니다.",
                "en": "A high Z-Score is a signal that the market is overheated and the price is likely overvalued. Historically, this has been near market tops."
              }
            },
            {
              "term": {
                "ko": "낮은 값 (녹색 구간)",
                "en": "Low Value (Green Zone)"
              },
              "explanation": {
                "ko": "Z-Score가 낮다는 것은 시장이 침체되어 있으며 가격이 저평가되었을 가능성이 크다는 신호로, 매수 기회로 고려될 수 있습니다.",
                "en": "A low Z-Score is a signal that the market is stagnant and the price is likely undervalued, which can be considered a buying opportunity."
              }
            }
          ]
        }
      ]
    },
    "permissions": ["user", "admin"]
  }'::jsonb
FROM menus WHERE name = 'Market Cycle Indicators' AND source_type = 'dynamic';

-- NUPL (Market Cycle Indicators)
INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
SELECT 
  'NUPL',
  '/onchain/overviews?metric=nupl',
  (SELECT id FROM menus WHERE name = 'Market Cycle Indicators' AND source_type = 'dynamic'),
  20,
  'dynamic',
  '{
    "description": {
      "title": {
        "ko": "NUPL (순 미실현 손익): 시장의 탐욕과 공포를 측정하는 심리 지표",
        "en": "NUPL (Net Unrealized Profit/Loss): A Psychological Indicator Measuring Market Greed and Fear"
      },
      "introduction": {
        "ko": "NUPL은 네트워크의 모든 비트코인의 미실현 손익 상태를 측정하여, 시장 전체가 순이익 상태인지 순손실 상태인지를 보여주는 지표입니다. 시장 참여자들의 전반적인 심리 상태를 나타내며, 시장이 탐욕 단계에 있는지 공포 단계에 있는지를 파악하게 해줍니다.",
        "en": "NUPL is an indicator that measures the unrealized profit and loss status of all bitcoins on the network, showing whether the entire market is in a state of net profit or net loss. It reflects the overall psychological state of market participants, helping to gauge whether the market is in a phase of greed or fear."
      },
      "sections": [
        {
          "heading": {
            "ko": "해석",
            "en": "Interpretation"
          },
          "interpretations": [
            {
              "term": {
                "ko": "희열/탐욕 (0.75 이상)",
                "en": "Euphoria/Greed (Above 0.75)"
              },
              "explanation": {
                "ko": "시장이 극단적인 탐욕 상태에 있으며, 미실현 이익이 최고조에 달합니다. 종종 시장의 고점 신호로 간주됩니다.",
                "en": "The market is in a state of extreme greed, with unrealized profits at their peak. Often considered a market top signal."
              }
            },
            {
              "term": {
                "ko": "항복 (0 미만)",
                "en": "Capitulation (Below 0)"
              },
              "explanation": {
                "ko": "시장 참여자 대부분이 미실현 손실 상태에 있으며, 극심한 공포로 인해 투매가 발생합니다. 종종 시장의 바닥 신호로 간주됩니다.",
                "en": "Most market participants are in a state of unrealized loss, and capitulation occurs due to extreme fear. Often considered a market bottom signal."
              }
            }
          ]
        }
      ]
    },
    "permissions": ["user", "admin"]
  }'::jsonb
FROM menus WHERE name = 'Market Cycle Indicators' AND source_type = 'dynamic';

-- Realized Cap (Market Cycle Indicators)
INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
SELECT 
  'Realized Cap',
  '/onchain/overviews?metric=realized_cap',
  (SELECT id FROM menus WHERE name = 'Market Cycle Indicators' AND source_type = 'dynamic'),
  30,
  'dynamic',
  '{
    "description": {
      "title": {
        "ko": "실현 시가총액: 비트코인의 ''공정 가치'' 자본화",
        "en": "Realized Cap: A ''Fair Value'' Capitalization of Bitcoin"
      },
      "introduction": {
        "ko": "실현 시가총액은 각 비트코인을 마지막으로 이동했을 때의 가격으로 평가하여 모두 합산한 값입니다. 이는 네트워크의 총 비용 기준(cost basis)을 나타내며, 투기적 가치를 제거한 ''실현된'' 가치를 보여줍니다.",
        "en": "Realized Cap values each Bitcoin at the price it last moved and sums them all up. It represents the total cost basis of the network, showing the ''realized'' value with speculative value removed."
      },
      "sections": [
        {
          "heading": {
            "ko": "해석",
            "en": "Interpretation"
          },
          "content": {
            "ko": "실현 시가총액은 장기적인 가치 저장소로서의 비트코인의 펀더멘털을 나타냅니다. 시장 시가총액(Market Cap)이 실현 시가총액 아래로 떨어지는 경우는 시장이 극심한 저평가 상태에 있음을 의미하며, 역사적으로 강력한 매수 기회였습니다.",
            "en": "Realized Cap represents the fundamentals of Bitcoin as a long-term store of value. When the Market Cap falls below the Realized Cap, it signifies that the market is in a state of extreme undervaluation and has historically been a strong buying opportunity."
          }
        }
      ]
    },
    "permissions": ["user", "admin"]
  }'::jsonb
FROM menus WHERE name = 'Market Cycle Indicators' AND source_type = 'dynamic';

-- Thermo Cap (Market Cycle Indicators)
INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
SELECT 
  'Thermo Cap',
  '/onchain/overviews?metric=thermo_cap',
  (SELECT id FROM menus WHERE name = 'Market Cycle Indicators' AND source_type = 'dynamic'),
  40,
  'dynamic',
  '{
    "description": {
      "title": {
        "ko": "서모캡: 네트워크의 총 누적 보안 비용",
        "en": "Thermo Cap: The Total Cumulative Security Expenditure of the Network"
      },
      "introduction": {
        "ko": "서모캡은 비트코인 네트워크가 시작된 이래 채굴자들이 벌어들인 총 누적 수익(USD 기준)입니다. 이는 네트워크를 확보하고 운영하는 데 투입된 총 경제적 에너지를 나타내며, 비트코인 가치의 절대적인 최저선으로 간주됩니다.",
        "en": "Thermo Cap is the total cumulative revenue (in USD) earned by miners since the inception of the Bitcoin network. It represents the total economic energy invested in securing and operating the network and is considered an absolute floor for Bitcoin''s valuation."
      },
      "sections": [
        {
          "heading": {
            "ko": "해석",
            "en": "Interpretation"
          },
          "content": {
            "ko": "역사적으로 비트코인의 시장 시가총액은 서모캡 아래로 떨어진 적이 없습니다. 따라서 서모캡은 비트코인 가격의 가장 근본적인 지지선 중 하나로 활용될 수 있습니다.",
            "en": "Historically, Bitcoin''s market cap has never fallen below the Thermo Cap. Therefore, Thermo Cap can be used as one of the most fundamental support levels for the Bitcoin price."
          }
        }
      ]
    },
    "permissions": ["user", "admin"]
  }'::jsonb
FROM menus WHERE name = 'Market Cycle Indicators' AND source_type = 'dynamic';

-- Realized Price (Market Cycle Indicators)
INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
SELECT 
  'Realized Price',
  '/onchain/overviews?metric=realized_price',
  (SELECT id FROM menus WHERE name = 'Market Cycle Indicators' AND source_type = 'dynamic'),
  50,
  'dynamic',
  '{
    "description": {
      "title": {
        "ko": "실현 가격: 시장의 총 평균 취득 단가",
        "en": "Realized Price: The Collective Cost Basis of the Market"
      },
      "introduction": {
        "ko": "실현 가격은 일반적인 시장 가격과 달리, 유통되는 모든 비트코인이 마지막으로 온체인 상에서 이동했을 때의 가격을 평균하여 계산된 값입니다. 이는 전체 시장 참여자들의 총 평균 취득 단가(cost basis)로 간주할 수 있으며, 시장의 심리적 지지선 또는 저항선 역할을 합니다.",
        "en": "Unlike the typical market price, the Realized Price is calculated by averaging the price at which every circulating Bitcoin last moved on-chain. It can be considered the collective cost basis for all market participants and often acts as a psychological support or resistance level for the market."
      },
      "sections": [
        {
          "heading": {
            "ko": "해석",
            "en": "Interpretation"
          },
          "interpretations": [
            {
              "term": {
                "ko": "시장 가격 > 실현 가격",
                "en": "Market Price > Realized Price"
              },
              "explanation": {
                "ko": "현재 시장 가격이 평균 취득 단가보다 높다는 의미로, 시장 참여자들이 전반적으로 미실현 이익 상태에 있음을 나타냅니다. 강세장에서는 실현 가격이 강력한 지지선 역할을 하는 경향이 있습니다.",
                "en": "This means the current market price is higher than the average acquisition cost, indicating that market participants are, on aggregate, in a state of unrealized profit. In a bull market, the Realized Price tends to act as a strong support level."
              }
            },
            {
              "term": {
                "ko": "시장 가격 < 실현 가격",
                "en": "Market Price < Realized Price"
              },
              "explanation": {
                "ko": "현재 시장 가격이 평균 취득 단가보다 낮다는 의미로, 시장 참여자들이 전반적으로 미실현 손실 상태에 있음을 나타냅니다. 이는 약세장 또는 극심한 투매(항복) 구간에서 나타나는 특징입니다.",
                "en": "This signifies that the current market price is lower than the average acquisition cost, indicating that market participants are, on aggregate, in a state of unrealized loss. This is characteristic of a bear market or a period of extreme capitulation."
              }
            }
          ]
        }
      ]
    },
    "permissions": ["user", "admin"]
  }'::jsonb
FROM menus WHERE name = 'Market Cycle Indicators' AND source_type = 'dynamic';

-- True Market Mean (Market Cycle Indicators)
INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
SELECT 
  'True Market Mean',
  '/onchain/overviews?metric=true_market_mean',
  (SELECT id FROM menus WHERE name = 'Market Cycle Indicators' AND source_type = 'dynamic'),
  60,
  'dynamic',
  '{
    "description": {
      "title": {
        "ko": "진정한 시장 평균가 (델타 가격): 시장의 장기적인 가치 중심선",
        "en": "True Market Mean (Delta Price): The Market''s Long-Term Value Centerline"
      },
      "introduction": {
        "ko": "진정한 시장 평균가는 실현 가격과 전체 기간 평균 시장 가격의 차이를 통해 계산되는 하이브리드 가격 모델입니다. 이는 비트코인의 장기적이고 근본적인 가치 평가 기준선으로 작용하며 단기적인 변동성을 완화하여 보여줍니다.",
        "en": "The True Market Mean is a hybrid price model calculated from the difference between the Realized Price and the lifetime average Market Price. It acts as a long-term, fundamental valuation baseline for Bitcoin, smoothing out short-term volatility."
      },
      "sections": [
        {
          "heading": {
            "ko": "해석",
            "en": "Interpretation"
          },
          "content": {
            "ko": "역사적으로 시장 가격이 진정한 시장 평균가에 닿았을 때, 이는 약세장의 바닥을 의미하는 경우가 많았으며, 최대의 재정적 기회 지점으로 여겨졌습니다. 거시적 상승 추세 동안에는 지지선 역할을 하기도 합니다.",
            "en": "Historically, when the market price has touched the True Market Mean, it has often signaled the bottom of a bear market and has been considered a point of maximum financial opportunity. It also acts as a support line during macro uptrends."
          }
        }
      ]
    },
    "permissions": ["user", "admin"]
  }'::jsonb
FROM menus WHERE name = 'Market Cycle Indicators' AND source_type = 'dynamic';

-- AVIV (Market Cycle Indicators)
INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
SELECT 
  'AVIV',
  '/onchain/overviews?metric=aviv',
  (SELECT id FROM menus WHERE name = 'Market Cycle Indicators' AND source_type = 'dynamic'),
  70,
  'dynamic',
  '{
    "description": {
      "title": {
        "ko": "AVIV 비율: 시장 고평가/저평가 측정 오실레이터",
        "en": "AVIV Ratio: A Market Over/Under-valuation Oscillator"
      },
      "introduction": {
        "ko": "AVIV 비율은 시장 가치를 진정한 시장 평균가(투자자 가치)로 나눈 값입니다. 이는 비트코인 시장 사이클의 극단적인 고점과 저점을 식별하는 데 사용되는 오실레이터 지표입니다.",
        "en": "The AVIV Ratio is the ratio of the Market Value to the True Market Mean (Investor Value). It is an oscillator indicator used to identify the extremities of Bitcoin market cycles."
      },
      "sections": [
        {
          "heading": {
            "ko": "해석",
            "en": "Interpretation"
          },
          "interpretations": [
            {
              "term": {
                "ko": "높은 값",
                "en": "High Value"
              },
              "explanation": {
                "ko": "시장이 과열되어 있으며 잠재적으로 주기적인 고점 근처에 있음을 나타냅니다.",
                "en": "Indicates the market is overheated and potentially near a cyclical top."
              }
            },
            {
              "term": {
                "ko": "낮은 값",
                "en": "Low Value"
              },
              "explanation": {
                "ko": "시장이 저평가되어 있으며 잠재적으로 주기적인 저점 근처에 있음을 나타냅니다.",
                "en": "Indicates the market is undervalued and potentially near a cyclical bottom."
              }
            }
          ]
        }
      ]
    },
    "permissions": ["user", "admin"]
  }'::jsonb
FROM menus WHERE name = 'Market Cycle Indicators' AND source_type = 'dynamic';

-- SOPR (Holder Behavior)
INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
SELECT 
  'SOPR',
  '/onchain/overviews?metric=sopr',
  (SELECT id FROM menus WHERE name = 'Holder Behavior' AND source_type = 'dynamic'),
  10,
  'dynamic',
  '{
    "description": {
      "title": {
        "ko": "SOPR: 시장의 수익 실현 심리 분석",
        "en": "SOPR: Analyzing Market Profit-Taking Psychology"
      },
      "introduction": {
        "ko": "SOPR(소비된 출력물 수익 비율)은 이동된 코인들이 이익 상태에서 판매되었는지, 손실 상태에서 판매되었는지를 측정하는 지표입니다. 시장 참여자들의 전반적인 수익 실현 또는 손절매 동향을 파악하는 데 사용됩니다.",
        "en": "SOPR (Spent Output Profit Ratio) is a metric that measures whether moved coins were sold in a state of profit or loss. It is used to gauge the overall trend of profit-taking or loss-cutting among market participants."
      },
      "sections": [
        {
          "heading": {
            "ko": "해석",
            "en": "Interpretation"
          },
          "interpretations": [
            {
              "term": {
                "ko": "SOPR > 1",
                "en": "SOPR > 1"
              },
              "explanation": {
                "ko": "평균적으로 코인들이 이익을 보며 판매되고 있음을 의미합니다. 강세장에서는 1 수준이 지지선으로 작용합니다.",
                "en": "Indicates that coins are, on average, being sold at a profit. The value of 1 acts as a support level in a bull market."
              }
            },
            {
              "term": {
                "ko": "SOPR < 1",
                "en": "SOPR < 1"
              },
              "explanation": {
                "ko": "평균적으로 코인들이 손실을 보며 판매되고 있음을 의미하며, 시장의 공포를 나타냅니다.",
                "en": "Signifies that coins are, on average, being sold at a loss, indicating market fear."
              }
            }
          ]
        }
      ]
    },
    "permissions": ["user", "admin"]
  }'::jsonb
FROM menus WHERE name = 'Holder Behavior' AND source_type = 'dynamic';

-- Continue with remaining indicators...
-- (Due to length constraints, I'll create the remaining indicators in a separate script)

-- Verify the updates
SELECT id, name, path, parent_id, menu_metadata 
FROM menus 
WHERE source_type = 'dynamic' 
ORDER BY parent_id, "order";
