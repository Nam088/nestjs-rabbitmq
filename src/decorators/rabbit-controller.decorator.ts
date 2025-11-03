import { SetMetadata } from '@nestjs/common';

export const RABBIT_CONTROLLER_KEY = 'RABBIT_CONTROLLER';

export function RabbitController(): ClassDecorator {
    return SetMetadata(RABBIT_CONTROLLER_KEY, true);
}
