import { createParamRoute } from '../Utils';
import NactRequest from '../../request';

const Req = createParamRoute(function (req: NactRequest) {
    return req;
});

export default Req;
