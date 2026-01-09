import { apiClient } from '@/lib/api';

export interface PostTag {
    id: number;
    name: string;
    slug: string;
    usage_count: number;
    created_at: string;
}

export interface PostTagListResponse {
    tags: PostTag[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export const getAdminTags = async (
    page: number = 1,
    limit: number = 20,
    search?: string,
    sortBy: string = 'usage_count',
    order: 'asc' | 'desc' = 'desc'
): Promise<PostTagListResponse> => {
    return await apiClient.getAdminTags({ page, limit, search, sort_by: sortBy, order }) as unknown as PostTagListResponse;
};

export const createTag = async (name: string, slug: string): Promise<PostTag> => {
    return await apiClient.createTag({ name, slug });
};

export const updateTag = async (tagId: number, name?: string, slug?: string): Promise<PostTag> => {
    return await apiClient.updateTag(tagId, { name, slug });
};

export const deleteTag = async (tagId: number) => {
    return await apiClient.deleteTag(tagId);
};
