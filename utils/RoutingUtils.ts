const isDynamicPathSegment = (path: string): boolean => {
    return path.startsWith(':');
};

const getPathSchema = (string: string): Array<null | string> => {
    if (string === '/') {
        return ['/'];
    }

    const res: Array<null | string> = [];
    let spliited = string.split('/');
    spliited.forEach((seg) => {
        if (isDynamicPathSegment(seg)) res.push(null);
        else res.push(seg);
    });
    return res;
};

export { isDynamicPathSegment, getPathSchema };
