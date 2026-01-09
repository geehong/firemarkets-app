'use client'

import React, { useState, useEffect } from 'react'
import { fetchComments, createComment, Comment } from '@/api/comments'
import { useAuth } from '@/hooks/auth/useAuthNew'
import { formatDistanceToNow } from 'date-fns'
import { ko, enUS } from 'date-fns/locale'

interface PostCommentsProps {
    postId: number
    locale: string
}

export default function PostComments({ postId, locale }: PostCommentsProps) {
    const { user, isAuthenticated } = useAuth()
    const [comments, setComments] = useState<Comment[]>([])
    const [newComment, setNewComment] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadComments()
    }, [postId])

    const loadComments = async () => {
        try {
            setIsLoading(true)
            const data = await fetchComments(postId)
            setComments(data)
        } catch (err) {
            console.error('Failed to load comments', err)
            setError('Failed to load comments.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newComment.trim()) return

        try {
            setIsSubmitting(true)
            setError(null)
            await createComment(postId, newComment)
            setNewComment('')
            await loadComments() // Reload to see new comment (or we could append specifically)
        } catch (err) {
            console.error('Failed to post comment', err)
            setError('Failed to post comment. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const dateLocale = locale === 'ko' ? ko : enUS

    if (isLoading) return <div className="text-center py-4 text-gray-500">Loading comments...</div>

    return (
        <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-8">
            <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-gray-100">
                Comments ({comments.length})
            </h3>

            {/* Comment Form */}
            <div className="mb-8 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                {isAuthenticated ? (
                    <form onSubmit={handleSubmit}>
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                                </div>
                            </div>
                            <div className="flex-grow">
                                <textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder={locale === 'ko' ? "댓글을 작성하세요..." : "Write a comment..."}
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none min-h-[80px]"
                                    disabled={isSubmitting}
                                />
                                <div className="mt-2 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={!newComment.trim() || isSubmitting}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isSubmitting ? 'Posting...' : (locale === 'ko' ? '댓글 달기' : 'Post Comment')}
                                    </button>
                                </div>
                                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                            </div>
                        </div>
                    </form>
                ) : (
                    <div className="text-center py-2 text-gray-500 dark:text-gray-400">
                        Please <a href={`/${locale}/auth/login`} className="text-blue-600 hover:underline">log in</a> to leave a comment.
                    </div>
                )}
            </div>

            {/* Comments List */}
            <div className="space-y-6">
                {comments.length > 0 ? (
                    comments.map((comment) => (
                        <div key={comment.id} className="flex gap-4">
                            <div className="flex-shrink-0">
                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold">
                                    {comment.author_name?.charAt(0).toUpperCase() || '?'}
                                </div>
                            </div>
                            <div className="flex-grow">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                                        {comment.author_name}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: dateLocale })}
                                    </span>
                                </div>
                                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm">
                                    {comment.content}
                                </div>
                                {/* Reply button could go here */}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 text-gray-400 dark:text-gray-500 italic">
                        No comments yet. Be the first to share your thoughts!
                    </div>
                )}
            </div>
        </div>
    )
}
