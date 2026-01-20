
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Simple helper to get content type based on extension
function getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.webp': return 'image/webp';
        case '.png': return 'image/png';
        case '.jpg':
        case '.jpeg': return 'image/jpeg';
        case '.gif': return 'image/gif';
        case '.svg': return 'image/svg+xml';
        default: return 'application/octet-stream';
    }
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> }
) {
    const { path: pathSegments } = await context.params;
    
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
        const contentType = getContentType(filePath);

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
