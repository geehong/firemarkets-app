export interface ShortcodeMatch {
    type: 'chart' | 'table'
    props: Record<string, string>
    raw: string
}

export interface ContentPart {
    type: 'html' | 'shortcode'
    content?: string
    shortcode?: ShortcodeMatch
}

export function parseShortcodes(content: string): ContentPart[] {
    // RexExp for [chart ...] and [table ...]
    // Matches optional <p> wrapper, then [chart type="bar" ...] or [table data="..."]
    // Captures the tag name (chart|table) and the attributes string
    const regex = /(?:<p>)?\s*\[(chart|table)\s+(.*?)\]\s*(?:<\/p>)?/g

    const parts: ContentPart[] = []
    let lastIndex = 0
    let match

    while ((match = regex.exec(content)) !== null) {
        // Add preceding HTML
        if (match.index > lastIndex) {
            parts.push({
                type: 'html',
                content: content.slice(lastIndex, match.index)
            })
        }

        const tagName = match[1] as 'chart' | 'table'
        const attributesString = match[2]
        const props = parseAttributes(attributesString)

        parts.push({
            type: 'shortcode',
            shortcode: {
                type: tagName,
                props,
                raw: match[0]
            }
        })

        lastIndex = regex.lastIndex
    }

    // Add remaining HTML
    if (lastIndex < content.length) {
        parts.push({
            type: 'html',
            content: content.slice(lastIndex)
        })
    }

    return parts
}

function parseAttributes(attributesString: string): Record<string, string> {
    const props: Record<string, string> = {}
    // Match key="value" pattern
    // Careful with spaces inside quotes
    const regex = /(\w+)="([^"]*)"/g
    let match

    while ((match = regex.exec(attributesString)) !== null) {
        props[match[1]] = match[2]
    }

    return props
}
