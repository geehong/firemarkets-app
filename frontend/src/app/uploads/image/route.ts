import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const imageUrl = formData.get('imageUrl') as string | null
        const postType = formData.get('postType') as string || 'posts'
        const slug = formData.get('slug') as string || 'untitled'

        let buffer: Buffer
        let originalName: string

        if (file) {
            buffer = Buffer.from(await file.arrayBuffer())
            originalName = file.name
        } else if (imageUrl) {
            try {
                const response = await fetch(imageUrl)
                if (!response.ok) throw new Error('Failed to fetch remote image')
                const arrayBuffer = await response.arrayBuffer()
                buffer = Buffer.from(arrayBuffer)

                // Get filename from URL
                const urlPath = new URL(imageUrl).pathname
                originalName = path.basename(urlPath) || 'remote_image.jpg'
            } catch (e) {
                return NextResponse.json(
                    { error: 'Failed to fetch external image' },
                    { status: 400 }
                )
            }
        } else {
            return NextResponse.json(
                { error: 'File or imageUrl is required' },
                { status: 400 }
            )
        }

        // Processing with Sharp to WebP
        const ext = '.webp'
        const baseName = path.basename(originalName, path.extname(originalName))

        // Create SEO friendly filename: {slug}_{date}_{clean_filename}.webp
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
        const cleanBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '_')

        const fileName = `${slug}_${date}_${cleanBaseName}${ext}`

        // Determine upload directory: public/images/posts/{postType}
        const uploadDir = path.join(process.cwd(), 'public', 'images', 'posts', postType)

        // Ensure directory exists
        await mkdir(uploadDir, { recursive: true })

        const filePath = path.join(uploadDir, fileName)

        // Convert and Save as WebP
        await sharp(buffer)
            .webp({ quality: 80 })
            .toFile(filePath)

        // Return Public URL
        const publicUrl = `/images/posts/${postType}/${fileName}`

        return NextResponse.json({ success: true, url: publicUrl })

    } catch (error) {
        console.error('Upload Error:', error)
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        )
    }
}
