import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
// @ts-ignore
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

        // [Fix for Standalone Mode]
        // If running in standalone mode (or if .next/standalone exists), we might need to copy the file there too
        // because the server might be serving from there.
        try {
            const standaloneDir = path.join(process.cwd(), '.next', 'standalone', 'public', 'images', 'posts', postType)
            // Check if standalone/public exists (simple heuristic)
            // We blindly try to write if we are not already IN standalone dir
            if (!process.cwd().includes('standalone')) {
                 // Try to create dir and copy
                 await mkdir(standaloneDir, { recursive: true }).catch(() => {})
                 const standaloneFilePath = path.join(standaloneDir, fileName)
                 // We can re-use sharp or just copy file
                 // await fs.copyFile(filePath, standaloneFilePath) // fs/promises needed
                 // Let's just use sharp again or copy
                 await sharp(buffer).webp({ quality: 80 }).toFile(standaloneFilePath).catch((e: any) => console.log('Standalone copy skipped:', e.message))
            }
        } catch (e) {
            // Ignore errors for standalone copy
            console.log('Standalone sync check skipped')
        }

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
