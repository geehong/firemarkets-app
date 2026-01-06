# backend/app/services/news_clustering_service.py
from typing import List, Dict
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.models.blog import Post
import logging

logger = logging.getLogger(__name__)

class NewsClusteringService:
    """뉴스 클러스터링 엔진 (TF-IDF + Cosine Similarity)"""
    
    def __init__(self, similarity_threshold: float = 0.5):
        self.vectorizer = TfidfVectorizer(stop_words='english')
        self.threshold = similarity_threshold

    def cluster_posts(self, posts: List[Post]) -> List[List[Post]]:
        """
        뉴스 기사 리스트를 받아서 유사한 주제끼리 그룹화하여 반환
        """
        if not posts:
            return []
        
        # 1. 문서 텍스트 추출 (제목 + 본문 일부) - 제목 가중치 높임
        documents = []
        valid_posts = []
        
        for p in posts:
            title = p.title.get('en') if isinstance(p.title, dict) else str(p.title)
            # content is not used for clustering raw news from cryptopanic usually because it's empty or brief
            # mainly use title for breaking news clustering
            documents.append(title) 
            valid_posts.append(p)
            
        if not documents:
            return []

        try:
            # 2. TF-IDF 행렬 생성
            tfidf_matrix = self.vectorizer.fit_transform(documents)
            
            # 3. 코사인 유사도 계산
            similarity_matrix = cosine_similarity(tfidf_matrix)
            
            # 4. 클러스터링 (단순 연결 요소 알고리즘 변형)
            visited = [False] * len(valid_posts)
            clusters = []
            
            for i in range(len(valid_posts)):
                if visited[i]:
                    continue
                
                # 새로운 클러스터 시작
                current_cluster = [valid_posts[i]]
                visited[i] = True
                
                # 유사도가 높은 기사들을 같은 클러스터로 묶음
                for j in range(i + 1, len(valid_posts)):
                    if not visited[j]:
                        if similarity_matrix[i][j] >= self.threshold:
                            current_cluster.append(valid_posts[j])
                            visited[j] = True
                
                clusters.append(current_cluster)
                
            logger.info(f"Clustering complete: {len(posts)} posts -> {len(clusters)} clusters")
            return clusters
            
        except Exception as e:
            logger.error(f"Clustering failed: {e}")
            # 실패 시 각 기사를 개별 클러스터로 반환
            return [[p] for p in valid_posts]
