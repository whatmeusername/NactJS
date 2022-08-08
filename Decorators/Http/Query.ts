import { createParamRoute } from '../Utils';
import NactRequest from '../../request';

const Query = createParamRoute(function (req: NactRequest) {
    return req.urldata.query;
});

export default Query;
