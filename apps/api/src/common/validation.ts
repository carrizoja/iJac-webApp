import { ValidationPipe } from '@nestjs/common';
import { ValidationError as ClassValidatorError } from 'class-validator';
import { ValidationError } from './errors';

function toFieldErrors(errors: ClassValidatorError[]): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const error of errors) {
    const [first] = Object.values(error.constraints ?? {});
    if (first) {
      fieldErrors[error.property] = first;
    }
  }
  return fieldErrors;
}

/**
 * Global request validation. Failures surface as `ValidationError`, so the
 * response carries per-field `fieldErrors` like service-level validation does.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
    exceptionFactory: (errors) => {
      const fieldErrors = toFieldErrors(errors);
      const message = Object.values(fieldErrors).join(', ') || 'Validation failed';
      return new ValidationError(message, fieldErrors);
    },
  });
}
