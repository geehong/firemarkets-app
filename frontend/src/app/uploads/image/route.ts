import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File
        const postType = formData.get('postType') as string || 'posts'
        const slug = formData.get('slug') as string || 'untitled'

        if (!file) {
            return NextResponse.json(
                { error: 'File is required' },
                { status: 400 }
            )
        }

        const buffer = Buffer.from(await file.arrayBuffer())

        // Sanitize filename for SEO
        // Remove special chars, spaces to underscores, keep extension
        const originalName = file.name
        const ext = path.extname(originalName) || '.jpg'
        const baseName = path.basename(originalName, ext)

        // Create SEO friendly filename: {slug}_{date}_{clean_filename}{ext}
        // Date format: YYYYMMDD
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
        const cleanBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '_') // only alphanumeric

        const fileName = `${slug}_${date}_${cleanBaseName}${ext}`

        // Determine upload directory: public/images/posts/{postType}
        const uploadDir = path.join(process.cwd(), 'public', 'images', 'posts', postType)

        // Ensure directory exists
        try {
            await mkdir(uploadDir, { recursive: true })
        } catch (e) {
            // Ignore error if it already exists
        }

        const filePath = path.join(uploadDir, fileName)

        // Write file
        await writeFile(filePath, buffer)

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
