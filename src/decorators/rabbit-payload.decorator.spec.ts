import { RabbitPayload, resolveRabbitPayload } from './rabbit-payload.decorator';
import 'reflect-metadata';

describe('RabbitPayload Decorator', () => {
    it('should be defined', () => {
        expect(RabbitPayload).toBeDefined();
    });

    it('should return null when message is falsy', () => {
        const ctx: any = { switchToRpc: () => ({ getData: () => null }) };
        const result = resolveRabbitPayload(undefined, ctx);

        expect(result).toBeNull();
    });

    it('should parse JSON from message.content buffer', () => {
        const payload = { id: 1, name: 'test' };
        const msg = { content: Buffer.from(JSON.stringify(payload)) };
        const ctx: any = { switchToRpc: () => ({ getData: () => msg }) };

        const result = resolveRabbitPayload(undefined, ctx);

        expect(result).toEqual(payload);
    });

    it('should extract property from parsed JSON when path provided', () => {
        const payload = { id: 2, name: 'alice' };
        const msg = { content: Buffer.from(JSON.stringify(payload)) };
        const ctx: any = { switchToRpc: () => ({ getData: () => msg }) };

        const name = resolveRabbitPayload('name', ctx);

        expect(name).toBe('alice');
    });

    it('should return raw string if JSON parse fails', () => {
        const raw = 'not-json';
        const msg = { content: Buffer.from(raw) };
        const ctx: any = { switchToRpc: () => ({ getData: () => msg }) };

        const result = resolveRabbitPayload(undefined, ctx);

        expect(result).toBe(raw);
    });

    it('should return message itself when no content field', () => {
        const msg = { id: 3, name: 'bob' };
        const ctx: any = { switchToRpc: () => ({ getData: () => msg }) };

        const full = resolveRabbitPayload(undefined, ctx);
        const id = resolveRabbitPayload('id', ctx);

        expect(full).toEqual(msg);
        expect(id).toBe(3);
    });
});
