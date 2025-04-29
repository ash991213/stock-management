import { ValidationError, ValidationPipe, Injectable } from '@nestjs/common';

import { Res } from '@libs/utils/res/res.interface';
import { ResException } from '@libs/utils/res/res.exception';

import { INVALID_PARAM } from '@libs/utils/const/error.const';

interface ValidationErrorDetails {
    parameter: string;
    value: any;
    reason: string[];
}

@Injectable()
export class ValidationErrorHandlingPipe extends ValidationPipe {
    private static validationErrorHandling(upperProperty: string | null, errors: ValidationError[]): ValidationErrorDetails[] {
        return errors.flatMap((error: ValidationError): ValidationErrorDetails[] => {
            const property: string = (upperProperty ? `${upperProperty} - ` : '') + error.property;
            const value: any = error.value || null;
            const reason: string[] = error.constraints ? Object.values(error.constraints) : [];

            let errorList: ValidationErrorDetails[] = reason.length > 0 ? [{ parameter: property, value, reason }] : [];

            if (error.children && error.children.length > 0) {
                const childrenErrorList: ValidationErrorDetails[] = this.validationErrorHandling(property, error.children);
                errorList = [...errorList, ...childrenErrorList];
            }

            return errorList;
        });
    }

    private static validationErrorThrow(errorType: Res, errors: ValidationError[]) {
        return new ResException({
            ...errorType,
            ...{ data: { list: this.validationErrorHandling(null, errors) } },
        });
    }

    private static validationParamErrorThrow(errors: ValidationError[]) {
        return ValidationErrorHandlingPipe.validationErrorThrow(INVALID_PARAM, errors);
    }

    constructor() {
        super({
            transform: true,
            transformOptions: { enableImplicitConversion: true },
            whitelist: true,
            disableErrorMessages: false,
            exceptionFactory: ValidationErrorHandlingPipe.validationParamErrorThrow,
        });
    }
}
