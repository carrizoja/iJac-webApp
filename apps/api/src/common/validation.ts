import { ValidationPipe } from '@nestjs/common';
import { ValidationError as ClassValidatorError } from 'class-validator';
import { ValidationError } from './errors';

interface FlattenedErrors {
  fieldErrors: Record<string, string>;
  messages: string[];
}

/**
 * Flattens (possibly nested) class-validator errors into dotted field keys
 * (`issuer.cuit`, `items.0.amount`). `fieldErrors` keeps the first constraint
 * message per field; `messages` lists every constraint message prefixed by its
 * parent path, matching Nest's default validation message.
 */
function flatten(
  errors: ClassValidatorError[],
  parentPath = '',
  out: FlattenedErrors = { fieldErrors: {}, messages: [] },
): FlattenedErrors {
  for (const error of errors) {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;
    const constraints = Object.values(error.constraints ?? {});
    const hasChildren = (error.children ?? []).length > 0;

    if (constraints.length > 0) {
      out.fieldErrors[path] = constraints[0];
      out.messages.push(...constraints.map((m) => (parentPath ? `${parentPath}.${m}` : m)));
    } else if (!hasChildren) {
      out.fieldErrors[path] = `${error.property} is invalid`;
      out.messages.push(`${path} is invalid`);
    }
    if (hasChildren) {
      flatten(error.children ?? [], path, out);
    }
  }
  return out;
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
      const { fieldErrors, messages } = flatten(errors);
      return new ValidationError(messages.join(', ') || 'Validation failed', fieldErrors);
    },
  });
}
