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
    author_email?: string
    content: string
    created_at: string
    status: string // Added status field
    likes_count: number
    replies?: Comment[]
    post?: {
        id: number
        title: string
        slug: string
    }
}

export const fetchComments = async (postId: number): Promise<Comment[]> => {
    try {
        return await apiClient.getPostComments(postId)
    } catch (error) {
        console.error('Failed to fetch comments', error)
        throw error
    }
}

export const createComment = async (postId: number, content: string, parentId?: number): Promise<Comment> => {
    try {
        return await apiClient.createPostComment(postId, { content, parent_id: parentId })
    } catch (error) {
        console.error('Failed to create comment', error)
        throw error
    }
}

export interface AdminCommentListResponse {
    comments: Comment[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export const getAdminComments = async (
    page: number = 1,
    limit: number = 20,
    status?: string,
    search?: string
): Promise<AdminCommentListResponse> => {
    return await apiClient.getAdminComments({ page, limit, status, search }) as unknown as AdminCommentListResponse;
};

export const updateCommentStatus = async (commentId: number, status: string) => {
    return await apiClient.updateCommentStatus(commentId, status);
};

export const deleteComment = async (commentId: number) => {
    return await apiClient.deletePostComment(commentId);
};
