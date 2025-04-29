import { HttpException, HttpStatus } from '@nestjs/common';

import { Res } from '@libs/utils/res/res.interface';
import { ResImpl } from '@libs/utils/res/res.implement';

export class ResException extends HttpException {
    constructor(res: Res) {
        super(new ResImpl(res), HttpStatus.BAD_REQUEST);
    }
}
