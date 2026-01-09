import { apiClient } from '@/lib/api'

export interface Comment {
    id: number
    post_id: number
    user_id: number
    user?: {
        id: number
        username: string
        email: string
    }
    author_name: string
    content: string
    created_at: string
    replies?: Comment[]
    likes_count: number
}

export const fetchComments = async (postId: number): Promise<Comment[]> => {
    try {
        return await apiClient.getPostComments(postId)
    } catch (error) {
        throw error
    }
}

export const createComment = async (postId: number, content: string, parentId?: number) => {
    try {
        return await apiClient.createPostComment(postId, {
            content,
            parent_id: parentId
        })
    } catch (error) {
        throw error
    }
}
