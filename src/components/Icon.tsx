type IconName =
    | 'logo'
    | 'cart'
    | 'box'
    | 'plus'
    | 'refresh'
    | 'search'
    | 'upload'
    | 'pdf'
    | 'photo'
    | 'back'
    | 'sparkle'
    | 'currency'
    | 'percent'
    | 'calendar'
    | 'camera'
    | 'list'
    | 'eye'
    | 'download'
    | 'edit'
    | 'trash'
    | 'folder';

type Props = {
    name: IconName;
    className?: string;
};

export function Icon({ name, className }: Props) {
    const common = 'stroke-current';

    switch (name) {
        case 'logo':
            return (
                <svg className={className} viewBox='0 0 24 24' fill='none' strokeWidth='1.8'>
                    <path className={common} d='M4 7.5A3.5 3.5 0 0 1 7.5 4h7a3.5 3.5 0 0 1 3.5 3.5v0A3.5 3.5 0 0 1 14.5 11H13' />
                    <path className={common} d='M4 16.5A3.5 3.5 0 0 0 7.5 20h7a3.5 3.5 0 0 0 3.5-3.5v0A3.5 3.5 0 0 0 14.5 13H11' />
                    <path className={common} d='M8 12h2.5' />
                    <circle className={common} cx='8' cy='12' r='0.9' />
                    <circle className={common} cx='12' cy='12' r='0.9' />
                </svg>
            );
        case 'cart':
            return (
                <svg className={className} viewBox='0 0 24 24' fill='none' strokeWidth='1.8'>
                    <path className={common} d='M4 5h2l1.4 9h9.2L18 8H7.2' />
                    <circle className={common} cx='9.5' cy='18.5' r='1.2' />
                    <circle className={common} cx='15.5' cy='18.5' r='1.2' />
                </svg>
            );
        case 'box':
            return (
                <svg className={className} viewBox='0 0 24 24' fill='none' strokeWidth='1.8'>
                    <path className={common} d='M5 7.5 12 4l7 3.5-7 3.5-7-3.5Z' />
                    <path className={common} d='m5 7.5 7 3.5v8L5 15.5v-8Z' />
                    <path className={common} d='m19 7.5-7 3.5v8l7-3.5v-8Z' />
                </svg>
            );
        case 'plus':
            return (
                <svg className={className} viewBox='0 0 24 24' fill='none' strokeWidth='1.8'>
                    <path className={common} d='M12 5v14' />
                    <path className={common} d='M5 12h14' />
                </svg>
            );
        case 'refresh':
            return (
                <svg className={className} viewBox='0 0 24 24' fill='none' strokeWidth='1.8'>
                    <path className={common} d='M21 12a9 9 0 1 1-3.4-7' />
                    <path className={common} d='M21 5v6h-6' />
                </svg>
            );
        case 'search':
            return (
                <svg className={className} viewBox='0 0 24 24' fill='none' strokeWidth='1.8'>
                    <circle className={common} cx='11' cy='11' r='6' />
                    <path className={common} d='m16.5 16.5 3 3' />
                </svg>
            );
        case 'upload':
            return (
                <svg className={className} viewBox='0 0 24 24' fill='none' strokeWidth='1.8'>
                    <path className={common} d='M12 16V5' />
                    <path className={common} d='m7 9 5-4 5 4' />
                    <path className={common} d='M5 16.5V19h14v-2.5' />
                </svg>
            );
        case 'pdf':
            return (
                <svg className={className} viewBox='0 0 24 24' fill='none' strokeWidth='1.8'>
                    <path className={common} d='M7 4h7l4 4v12H7z' />
                    <path className={common} d='M14 4v4h4' />
                    <path className={common} d='M9.5 13H11c.8 0 1.5.7 1.5 1.5S11.8 16 11 16H9.5v-3Z' />
                    <path className={common} d='M14 13h2' />
                    <path className={common} d='M14 16h2' />
                </svg>
            );
        case 'photo':
            return (
                <svg className={className} viewBox='0 0 24 24' fill='none' strokeWidth='1.8'>
                    <path className={common} d='M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z' />
                    <circle className={common} cx='9' cy='10' r='1.5' />
                    <path className={common} d='m6 17 3.5-3.5a1 1 0 0 1 1.4 0L14 17l2.5-2.5a1 1 0 0 1 1.4 0L20 17' />
                </svg>
            );
        case 'back':
            return (
                <svg className={className} viewBox='0 0 24 24' fill='none' strokeWidth='1.8'>
                    <path className={common} d='m10 6-6 6 6 6' />
                    <path className={common} d='M20 12H5' />
                </svg>
            );
        case 'sparkle':
            return (
                <svg className={className} viewBox='0 0 24 24' fill='none' strokeWidth='1.8'>
                    <path className={common} d='M12 3v4' />
                    <path className={common} d='M12 17v4' />
                    <path className={common} d='M3 12h4' />
                    <path className={common} d='M17 12h4' />
                    <path className={common} d='m7.8 7.8 1.8 1.8' />
                    <path className={common} d='m14.4 14.4 1.8 1.8' />
                    <path className={common} d='m7.8 16.2 1.8-1.8' />
                    <path className={common} d='m14.4 9.6 1.8-1.8' />
                    <circle className={common} cx='12' cy='12' r='2.2' />
                </svg>
            );
        case 'currency':
            return (
                <svg className={className} viewBox='0 0 24 24' fill='none' strokeWidth='1.8'>
                    <path className={common} d='M10 5.5h3.5a3.5 3.5 0 0 1 0 7H10' />
                    <path className={common} d='M10 4v16' />
                    <path className={common} d='M6 12h7.5' />
                </svg>
            );
        case 'percent':
            return (
                <svg className={className} viewBox='0 0 24 24' fill='none' strokeWidth='1.8'>
                    <path className={common} d='m6 18 12-12' />
                    <circle className={common} cx='8.5' cy='8' r='2' />
                    <circle className={common} cx='15.5' cy='16' r='2' />
                </svg>
            );
        case 'calendar':
            return (
                <svg className={className} viewBox='0 0 24 24' fill='none' strokeWidth='1.8'>
                    <rect className={common} x='4' y='5' width='16' height='15' rx='2' />
                    <path className={common} d='M8 3v4' />
                    <path className={common} d='M16 3v4' />
                    <path className={common} d='M4 10h16' />
                </svg>
            );
        case 'camera':
            return (
                <svg className={className} viewBox='0 0 24 24' fill='none' strokeWidth='1.8'>
                    <path className={common} d='M4 8a2 2 0 0 1 2-2h2l1.2-1.5a1.5 1.5 0 0 1 1.2-.5h3.2a1.5 1.5 0 0 1 1.2.5L16 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z' />
                    <circle className={common} cx='12' cy='12.5' r='3.25' />
                </svg>
            );
        case 'list':
            return (
                <svg className={className} viewBox='0 0 24 24' fill='none' strokeWidth='1.8'>
                    <path className={common} d='M7 7h12' />
                    <path className={common} d='M7 12h12' />
                    <path className={common} d='M7 17h12' />
                    <circle className={common} cx='4.5' cy='7' r='0.9' />
                    <circle className={common} cx='4.5' cy='12' r='0.9' />
                    <circle className={common} cx='4.5' cy='17' r='0.9' />
                </svg>
            );
        case 'eye':
            return (
                <svg className={className} viewBox='0 0 24 24' fill='none' strokeWidth='1.8'>
                    <path className={common} d='M2.5 12S6.5 6 12 6s9.5 6 9.5 6-4 6-9.5 6S2.5 12 2.5 12Z' />
                    <circle className={common} cx='12' cy='12' r='2.6' />
                </svg>
            );
        case 'download':
            return (
                <svg className={className} viewBox='0 0 24 24' fill='none' strokeWidth='1.8'>
                    <path className={common} d='M12 4v11' />
                    <path className={common} d='m7 11.5 5 5 5-5' />
                    <path className={common} d='M5 19h14' />
                </svg>
            );
        case 'edit':
            return (
                <svg className={className} viewBox='0 0 24 24' fill='none' strokeWidth='1.8'>
                    <path className={common} d='m14.5 5 4 4L8.5 19H5v-3.5Z' />
                    <path className={common} d='m13 6.5 4 4' />
                </svg>
            );
        case 'trash':
            return (
                <svg className={className} viewBox='0 0 24 24' fill='none' strokeWidth='1.8'>
                    <path className={common} d='M5 7h14' />
                    <path className={common} d='M10 11v6' />
                    <path className={common} d='M14 11v6' />
                    <path className={common} d='M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7' />
                    <path className={common} d='M7 7.5 7.6 18a1.5 1.5 0 0 0 1.5 1.4h5.8A1.5 1.5 0 0 0 16.4 18L17 7.5' />
                </svg>
            );
        case 'folder':
            return (
                <svg className={className} viewBox='0 0 24 24' fill='none' strokeWidth='1.8'>
                    <path className={common} d='M4 8a2 2 0 0 1 2-2h3l1.6 2.2H19a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' />
                    <path className={common} d='M4 10h17' />
                </svg>
            );
        default:
            return null;
    }
}
