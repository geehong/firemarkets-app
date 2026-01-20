
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getType } from 'mime';

export async function GET(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    // Await params if necessary (Next.js 15+ might require it, but 14 is fine. Safe to extract.)
    // params.path is an array of path segments
    const pathSegments = params.path; 
    
    if (!pathSegments || pathSegments.length === 0) {
        return new NextResponse("File path not provided", { status: 400 });
    }

    // Construct the file path securely
    // We assume the images are stored in public/images/posts
    const filePath = path.join(process.cwd(), 'public', 'images', 'posts', ...pathSegments);

    // Security check: Ensure the resolved path is within the public/images/posts directory
    const publicDir = path.join(process.cwd(), 'public', 'images', 'posts');
    if (!filePath.startsWith(publicDir)) {
        return new NextResponse("Access denied", { status: 403 });
    }

    try {
        // Check if file exists
        await fs.access(filePath);

        // Read file
        const fileBuffer = await fs.readFile(filePath);

        // Determine content type
        const contentType = getType(filePath) || 'application/octet-stream';

        // Return response with file
        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error("Error serving image:", error);
        return new NextResponse("File not found", { status: 404 });
    }
}
