import React from "react";

export const KoreaFlag: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" {...props}>
        <rect fill="#FFFFFF" width="36" height="36" />
        <path fill="#CD2E3A" d="M33.655 2.345c-2.88-2.88-9.053-2.05-18.064 6.962L5.297 19.6C-.89 25.79-1.295 31.758 2.345 35.397c3.64 3.639 9.608 3.235 15.796-2.952l10.294-10.293c9.011-9.012 9.842-15.184 6.962-18.064-1.252-1.252-4.04-1.22-8.324 1.35C31.55 5.093 32.748 3.252 33.655 2.345z" />
        <path fill="#0047A0" d="M15.59 9.308L5.298 19.6c-4.32 4.318-5.38 8.655-3.649 10.386 1.73 1.73 6.068.67 10.387-3.65l10.293-10.292c-5.918 3.013-10.686.077-13.435-1.571-3.692-2.215-2.257-5.975-.417-7.815 1.777-1.78 6.45-3.14 8.683.582-4.212-3.864-7.514-4.25-11.57-1.932z" />
        <circle fill="#CD2E3A" cx="18" cy="18" r="12" display="none" />
        <g id="taeguk">
            <path fill="#CD2E3A" d="M18 18c0-3.314 2.686-6 6-6s6 2.686 6 6-2.686 6-6 6-6-2.686-6-6z" />
            <path fill="#0047A0" d="M18 18c0 3.314-2.686 6-6 6s-6-2.686-6-6 2.686-6 6-6 6 2.686 6 6z" />
        </g>
    </svg>
);
// Note: This is a simplified "concept" flag. I will assume a standard icon or just use text "KO/EN" if SVGs are too complex to inline perfectly without checking visually. 
// Better approach: Basic text first to ensure functionality, then polish.
// Wait, user asked for "Flag button". I should provide proper SVGs.
