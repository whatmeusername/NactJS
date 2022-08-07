import type { ChildRouteSchema } from '../index';

const isDynamicPathSegment = (path: string): boolean => {
    return path.startsWith(':');
};

const parseNameFromDynamic = (path: string): string => {
    return path.slice(1);
};

const getPathSchema = (string: string): ChildRouteSchema => {
    if (string === '/') {
        return ['/'];
    }

    const res: ChildRouteSchema = [];
    let spliited = string.split('/');
    spliited.forEach((seg) => {
        if (isDynamicPathSegment(seg)) res.push({ name: parseNameFromDynamic(seg) });
        else res.push(seg);
    });
    return res;
};

export { isDynamicPathSegment, getPathSchema };
