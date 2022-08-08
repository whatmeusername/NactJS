import { createParamRoute } from '../Utils';
import NactRequest from '../../request';

const Ip = createParamRoute(function (req: NactRequest) {
    return req.ip;
});

export default Ip;
