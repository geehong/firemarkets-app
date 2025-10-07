-- Update menus table with OnChain indicators metadata from OnChainIndicators.json
-- This script uses the exact content from the JSON file with ["user", "admin"] permissions maintained

-- Update MVRV Z-Score metadata
UPDATE menus 
SET menu_metadata = '{
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
WHERE name = 'mvrv_z_score' AND source_type = 'dynamic';

-- Update NUPL metadata
UPDATE menus 
SET menu_metadata = '{
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
WHERE name = 'nupl' AND source_type = 'dynamic';

-- Update Realized Cap metadata
UPDATE menus 
SET menu_metadata = '{
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
WHERE name = 'realized_cap' AND source_type = 'dynamic';

-- Update Thermo Cap metadata
UPDATE menus 
SET menu_metadata = '{
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
WHERE name = 'thermo_cap' AND source_type = 'dynamic';

-- Update Realized Price metadata
UPDATE menus 
SET menu_metadata = '{
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
WHERE name = 'realized_price' AND source_type = 'dynamic';

-- Update True Market Mean metadata
UPDATE menus 
SET menu_metadata = '{
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
WHERE name = 'true_market_mean' AND source_type = 'dynamic';

-- Update AVIV metadata
UPDATE menus 
SET menu_metadata = '{
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
WHERE name = 'aviv' AND source_type = 'dynamic';

-- Update SOPR metadata
UPDATE menus 
SET menu_metadata = '{
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
WHERE name = 'sopr' AND source_type = 'dynamic';

-- Update CDD 90DMA metadata
UPDATE menus 
SET menu_metadata = '{
  "description": {
    "title": {
      "ko": "코인 소멸 일수 (CDD-90DMA): 장기 보유자의 활동 추적",
      "en": "Coin Days Destroyed (CDD-90DMA): Tracking the Activity of Long-Term Holders"
    },
    "introduction": {
      "ko": "CDD는 거래되는 코인의 양에 보유 기간을 곱한 값으로, 오래된 코인의 움직임에 더 큰 가중치를 둡니다. 90일 이동 평균은 이 데이터의 추세를 보여줍니다. 장기 보유자(스마트 머니)의 행동을 파악하는 데 사용됩니다.",
      "en": "CDD multiplies the amount of coins in a transaction by their holding period, giving more weight to the movement of older coins. The 90-day moving average shows the trend of this data. It is used to understand the behavior of long-term holders (smart money)."
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
              "ko": "장기 보유자들이 코인을 대량으로 이동시키거나 판매하고 있음을 의미하며, 종종 시장 고점 부근에서 나타납니다.",
              "en": "Indicates that long-term holders are moving or selling a large volume of their coins, often seen near market tops."
            }
          },
          {
            "term": {
              "ko": "낮은 값",
              "en": "Low Value"
            },
            "explanation": {
              "ko": "장기 보유자들이 코인을 축적하고 있음을 의미하며, 약세장이나 축적 기간 동안 나타납니다.",
              "en": "Signifies that long-term holders are accumulating coins, which occurs during bear markets or accumulation phases."
            }
          }
        ]
      }
    ]
  },
  "permissions": ["user", "admin"]
}'::jsonb
WHERE name = 'cdd_90dma' AND source_type = 'dynamic';

-- Update HODL Waves Supply metadata
UPDATE menus 
SET menu_metadata = '{
  "description": {
    "title": {
      "ko": "HODL 웨이브: 비트코인 공급량의 연령 분포 시각화",
      "en": "HODL Waves: Visualizing the Age Distribution of Bitcoin''s Supply"
    },
    "introduction": {
      "ko": "HODL 웨이브는 유통되는 비트코인 공급량을 보유 기간별로 구분하여 시각화한 차트입니다. 이를 통해 시장 참여자들의 보유 행태와 세대 교체를 거시적으로 파악할 수 있습니다.",
      "en": "HODL Waves is a chart that visualizes the distribution of the circulating Bitcoin supply by holding period. It provides a macroscopic view of the holding behavior of market participants and generational shifts."
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
              "ko": "따뜻한 색(단기 보유자) 확장",
              "en": "Expansion of Warm Colors (Short-Term Holders)"
            },
            "explanation": {
              "ko": "오래된 코인들이 새로운 보유자에게 이동하고 있음을 의미하며, 강세장 후반부나 시장 고점에서 나타납니다.",
              "en": "Indicates that older coins are moving to new holders, which occurs in the later stages of a bull market or at market tops."
            }
          },
          {
            "term": {
              "ko": "차가운 색(장기 보유자) 확장",
              "en": "Expansion of Cool Colors (Long-Term Holders)"
            },
            "explanation": {
              "ko": "코인들이 움직이지 않고 성숙해가고 있음을 의미하며, 약세장 동안의 축적을 나타냅니다. 이는 다음 강세장의 잠재적 에너지를 축적하는 과정입니다.",
              "en": "Signifies that coins are not moving and are maturing, indicating accumulation during a bear market. This process builds potential energy for the next bull run."
            }
          }
        ]
      }
    ]
  },
  "permissions": ["user", "admin"]
}'::jsonb
WHERE name = 'hodl_waves_supply' AND source_type = 'dynamic';

-- Update NRPL BTC metadata
UPDATE menus 
SET menu_metadata = '{
  "description": {
    "title": {
      "ko": "순 실현 손익 (NRPL): 시장의 일일 수익성 측정",
      "en": "Net Realized Profit/Loss (NRPL): Measuring the Market''s Daily Profitability"
    },
    "introduction": {
      "ko": "NRPL은 특정일에 온체인 상에서 이동한 모든 코인들의 순 이익 또는 손실(USD 기준)을 계산합니다. 이는 시장 참여자들이 집단적으로 이익을 실현하고 있는지, 아니면 손실을 감수하고 있는지를 보여주는 일일 감정 지표입니다.",
      "en": "NRPL calculates the net profit or loss (in USD) of all coins that moved on-chain on a given day. It is a daily sentiment indicator showing whether market participants are collectively realizing profits or taking losses."
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
              "ko": "양수 값 (이익)",
              "en": "Positive Value (Profit)"
            },
            "explanation": {
              "ko": "시장이 전반적으로 이익을 실현하고 있으며, 강세장에서 주로 나타납니다.",
              "en": "The market is realizing profits on aggregate, primarily seen in bull markets."
            }
          },
          {
            "term": {
              "ko": "음수 값 (손실)",
              "en": "Negative Value (Loss)"
            },
            "explanation": {
              "ko": "시장이 손실을 실현하고 있으며, 공포, 투매, 항복을 나타냅니다. 극심한 음수 값은 종종 시장 바닥을 형성합니다.",
              "en": "The market is realizing losses, indicating fear, panic selling, and capitulation. Extreme negative values often form market bottoms."
            }
          }
        ]
      }
    ]
  },
  "permissions": ["user", "admin"]
}'::jsonb
WHERE name = 'nrpl_btc' AND source_type = 'dynamic';

-- Update Hash Rate metadata
UPDATE menus 
SET menu_metadata = '{
  "description": {
    "title": {
      "ko": "해시레이트: 비트코인 네트워크의 건강과 보안",
      "en": "Hash Rate: The Health and Security of the Bitcoin Network"
    },
    "introduction": {
      "ko": "해시레이트는 비트코인 네트워크에서 채굴자들이 사용하는 총 연산 능력을 나타냅니다. 높은 해시레이트는 네트워크가 강력하고 안전하며, 공격하기 어렵다는 것을 의미합니다. 이는 네트워크 건강의 가장 기본적인 지표입니다.",
      "en": "Hash Rate represents the total computational power used by miners on the Bitcoin network. A high hash rate means the network is strong, secure, and difficult to attack. It is the most fundamental indicator of network health."
    },
    "sections": [
      {
        "heading": {
          "ko": "해석",
          "en": "Interpretation"
        },
        "content": {
          "ko": "일반적으로 해시레이트의 장기적인 상승은 네트워크에 대한 채굴자들의 신뢰와 투자가 증가하고 있음을 나타내는 긍정적인 신호입니다. 급격한 하락은 채굴자들이 운영을 중단하고 있음을 의미할 수 있으며, 이는 종종 가격 하락과 관련이 있습니다.",
          "en": "Generally, a long-term rise in the hash rate is a positive sign, indicating increasing miner confidence and investment in the network. A sharp drop can mean miners are shutting down operations, which is often associated with a price decline."
        }
      }
    ]
  },
  "permissions": ["user", "admin"]
}'::jsonb
WHERE name = 'hashrate' AND source_type = 'dynamic';

-- Update Difficulty metadata
UPDATE menus 
SET menu_metadata = '{
  "description": {
    "title": {
      "ko": "채굴 난이도: 비트코인의 안정적인 공급 조절 장치",
      "en": "Mining Difficulty: Bitcoin''s Stable Supply Adjustment Mechanism"
    },
    "introduction": {
      "ko": "채굴 난이도는 새로운 블록을 찾는 것이 얼마나 어려운지를 나타내는 척도입니다. 약 2주(2016 블록)마다 조정되어 블록 생성 시간을 평균 10분으로 유지합니다. 이는 해시레이트 변화에 따라 자동으로 조절됩니다.",
      "en": "Mining difficulty is a measure of how hard it is to find a new block. It adjusts approximately every two weeks (2016 blocks) to maintain an average block creation time of 10 minutes. It automatically adjusts in response to changes in the hash rate."
    },
    "sections": [
      {
        "heading": {
          "ko": "해석",
          "en": "Interpretation"
        },
        "content": {
          "ko": "난이도 상승은 더 많은 채굴자들이 네트워크에 참여하고 있음을 의미하며, 이는 네트워크의 건강함을 나타냅니다. 난이도 하락은 채굴자들이 네트워크를 떠나고 있음을 의미하며, 약세장의 신호일 수 있습니다. ''난이도 리본''과 같은 지표는 난이도 이동 평균을 사용하여 채굴자 항복과 매수 기회를 식별합니다.",
          "en": "A rising difficulty means more miners are joining the network, indicating its health. A falling difficulty means miners are leaving the network and can be a bearish signal. Indicators like the ''Difficulty Ribbon'' use moving averages of difficulty to identify miner capitulation and buying opportunities."
        }
      }
    ]
  },
  "permissions": ["user", "admin"]
}'::jsonb
WHERE name = 'difficulty' AND source_type = 'dynamic';

-- Update Miner Reserves metadata
UPDATE menus 
SET menu_metadata = '{
  "description": {
    "title": {
      "ko": "채굴자 보유량: 주요 공급자의 매도 압력 측정",
      "en": "Miner Reserves: Gauging Selling Pressure from Key Suppliers"
    },
    "introduction": {
      "ko": "채굴자 보유량은 알려진 모든 채굴자 지갑에 보관된 비트코인의 총량을 추적합니다. 채굴자들은 지속적으로 새로운 코인을 공급하는 주체이므로, 이들의 보유량 변화는 시장의 주요 매도 압력을 예측하는 데 중요한 단서가 됩니다.",
      "en": "Miner Reserves track the total amount of Bitcoin held in all known miner wallets. Since miners are the constant source of new coin supply, changes in their reserves provide crucial clues for predicting major selling pressure in the market."
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
              "ko": "보유량 증가",
              "en": "Increasing Reserves"
            },
            "explanation": {
              "ko": "채굴자들이 채굴한 코인을 즉시 팔지 않고 축적하고 있음을 의미하며, 이는 미래 가격 상승을 기대하는 긍정적인 신호입니다.",
              "en": "Indicates that miners are accumulating the coins they''ve mined instead of selling immediately, a positive sign suggesting they anticipate future price increases."
            }
          },
          {
            "term": {
              "ko": "보유량 감소",
              "en": "Decreasing Reserves"
            },
            "explanation": {
              "ko": "채굴자들이 시장에 코인을 판매하고 있음을 의미하며, 이는 매도 압력을 증가시켜 가격에 하방 압력으로 작용할 수 있습니다.",
              "en": "Means that miners are selling their coins on the market, which increases selling pressure and can exert downward pressure on the price."
            }
          }
        ]
      }
    ]
  },
  "permissions": ["user", "admin"]
}'::jsonb
WHERE name = 'miner_reserves' AND source_type = 'dynamic';

-- Update Open Interest Futures metadata
UPDATE menus 
SET menu_metadata = '{
  "description": {
    "title": {
      "ko": "선물 미결제 약정: 시장의 레버리지와 변동성 측정",
      "en": "Futures Open Interest: Measuring Market Leverage and Volatility"
    },
    "introduction": {
      "ko": "선물 미결제 약정은 아직 청산되지 않은 모든 선물 계약의 총 가치입니다. 이는 파생상품 시장에 유입된 자본의 양을 나타내며, 레버리지 수준과 잠재적 변동성을 가늠하는 척도로 사용됩니다.",
      "en": "Futures Open Interest is the total value of all futures contracts that have not yet been settled. It represents the amount of capital flowing into the derivatives market and is used as a gauge of leverage levels and potential volatility."
    },
    "sections": [
      {
        "heading": {
          "ko": "해석",
          "en": "Interpretation"
        },
        "content": {
          "ko": "미결제 약정의 증가는 새로운 자본이 시장에 유입되고 있음을 의미하며, 종종 현재의 가격 추세를 강화합니다. 반면, 가격 변동과 함께 미결제 약정이 급격히 감소하는 것은 대규모 청산(롱 스퀴즈 또는 숏 스퀴즈)을 의미할 수 있습니다. 높은 미결제 약정은 시장이 과도한 레버리지 상태에 있어 변동성이 커질 수 있음을 시사합니다.",
          "en": "An increase in open interest means new capital is entering the market, often reinforcing the current price trend. Conversely, a sharp decrease in open interest accompanied by price volatility can indicate a large-scale liquidation (a long or short squeeze). High open interest suggests the market is over-leveraged and could become highly volatile."
        }
      }
    ]
  },
  "permissions": ["user", "admin"]
}'::jsonb
WHERE name = 'open_interest_futures' AND source_type = 'dynamic';

-- Update ETF BTC Total metadata
UPDATE menus 
SET menu_metadata = '{
  "description": {
    "title": {
      "ko": "ETF 총 비트코인 보유량: 기관 투자 수요의 바로미터",
      "en": "Total Bitcoin Holdings in ETFs: A Barometer for Institutional Demand"
    },
    "introduction": {
      "ko": "이 지표는 전 세계 모든 현물 비트코인 ETF가 보유하고 있는 비트코인의 총량을 추적합니다. 이는 전통 금융 시장의 자본이 비트코인으로 유입되는 가장 직접적인 통로 중 하나로, 기관 투자자들의 수요와 심리를 반영합니다.",
      "en": "This metric tracks the total amount of Bitcoin held by all spot Bitcoin ETFs worldwide. It is one of the most direct channels for capital from traditional financial markets to flow into Bitcoin, reflecting the demand and sentiment of institutional investors."
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
              "ko": "순유입 / 보유량 증가",
              "en": "Net Inflows / Increasing Holdings"
            },
            "explanation": {
              "ko": "기관 투자자들의 강력한 매수 수요를 나타내며, 시장에 긍정적인 신호로 작용합니다.",
              "en": "Indicates strong buying demand from institutional investors, acting as a positive signal for the market."
            }
          },
          {
            "term": {
              "ko": "순유출 / 보유량 감소",
              "en": "Net Outflows / Decreasing Holdings"
            },
            "explanation": {
              "ko": "기관 투자자들의 관심이 감소하거나 차익 실현이 발생하고 있음을 나타내며, 시장에 부정적인 신호로 작용할 수 있습니다.",
              "en": "Suggests waning interest or profit-taking from institutional investors, which can act as a negative signal for the market."
            }
          }
        ]
      }
    ]
  },
  "permissions": ["user", "admin"]
}'::jsonb
WHERE name = 'etf_btc_total' AND source_type = 'dynamic';

-- Verify updates
SELECT name, menu_metadata 
FROM menus 
WHERE source_type = 'dynamic' 
AND name IN (
  'mvrv_z_score', 'nupl', 'realized_cap', 'thermo_cap', 'realized_price', 
  'true_market_mean', 'aviv', 'sopr', 'cdd_90dma', 'hodl_waves_supply', 
  'nrpl_btc', 'hashrate', 'difficulty', 'miner_reserves', 'open_interest_futures', 
  'etf_btc_total'
)
ORDER BY name;
